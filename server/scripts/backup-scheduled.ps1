$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$secretFile = Join-Path $root ".secrets\backup-passphrase.dpapi"
$backupDirectory = Join-Path $root "backups"
$statusFile = Join-Path $backupDirectory "last-backup-status.json"

if (-not (Test-Path -LiteralPath $secretFile)) {
    throw "DPAPI backup credential is missing: $secretFile"
}

$secure = ConvertTo-SecureString (Get-Content -LiteralPath $secretFile -Raw)
$bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
$plain = $null
$restoreDirectory = "/tmp/astroy-scheduled-restore-$PID"

try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    if ([string]::IsNullOrWhiteSpace($plain)) {
        throw "DPAPI backup credential decrypted to an empty value"
    }

    & wsl.exe -e ln -sfn "/mnt/d/h2o/remote astro/server" /tmp/astroy-server
    if ($LASTEXITCODE -ne 0) { throw "Unable to prepare the WSL server path" }

    $backupCommand = 'IFS= read -r ASTROY_BACKUP_PASSPHRASE; export ASTROY_BACKUP_PASSPHRASE; exec /tmp/astroy-server/scripts/backup.sh'
    $backupOutput = $plain | & wsl.exe -e bash -lc $backupCommand
    if ($LASTEXITCODE -ne 0) { throw "Encrypted backup command failed" }
    $linuxBackup = ($backupOutput | Select-Object -Last 1).Trim()
    if ([string]::IsNullOrWhiteSpace($linuxBackup)) { throw "Backup command returned no output path" }

    & wsl.exe -e rm -rf $restoreDirectory
    $restoreCommand = 'IFS= read -r ASTROY_BACKUP_PASSPHRASE; export ASTROY_BACKUP_PASSPHRASE; exec /tmp/astroy-server/scripts/restore-backup.sh "$1" "$2"'
    $null = $plain | & wsl.exe -e bash -lc $restoreCommand astroy-restore $linuxBackup $restoreDirectory
    if ($LASTEXITCODE -ne 0) { throw "Encrypted backup restore test failed" }

    $integrity = (& wsl.exe -e python3 -c "import sqlite3; print(sqlite3.connect('$restoreDirectory/astroy.db').execute('pragma integrity_check').fetchone()[0])").Trim()
    if ($LASTEXITCODE -ne 0 -or $integrity -ne "ok") { throw "SQLite backup integrity check failed" }

    $latest = Get-ChildItem -LiteralPath $backupDirectory -Filter "astroy-*.tar.gz.enc" -File |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1
    if (-not $latest) { throw "The encrypted backup file was not found on Windows" }

    $status = [ordered]@{
        ok = $true
        completedAt = (Get-Date).ToUniversalTime().ToString("o")
        backup = $latest.Name
        sizeBytes = $latest.Length
        sqliteIntegrity = $integrity
    } | ConvertTo-Json
    [IO.File]::WriteAllText($statusFile, $status, [Text.UTF8Encoding]::new($false))
    Write-Output "ASTRA backup completed: $($latest.Name)"
}
finally {
    & wsl.exe -e rm -rf $restoreDirectory 2>$null
    if ($bstr -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
    $plain = $null
}
