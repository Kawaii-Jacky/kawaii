param(
    [string]$Output = ""
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
if ([string]::IsNullOrWhiteSpace($Output)) {
    $Output = Join-Path $root ("ASTRA-release-{0}.zip" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
} elseif (-not [IO.Path]::IsPathRooted($Output)) {
    $Output = Join-Path $root $Output
}

$sourceRoots = @("remote-astro-service", "remote-observatory-frontend", "apps", "server", "loT", "ESP32_MPPT", "EF")
$rootPrefix = $root.TrimEnd("\") + "\"
$blockedSegments = @(".git", ".venv", ".secrets", "backups", "data", "__pycache__", "node_modules", "target", "gen")
$blockedNames = @(".env", "*.secret", "*.secrets", "*.token", "*.key", "*.pem", "passwd*", "*secrets-checklist*.md", "*.bak", "*.backup")
$sanitizedFirmwareHeaders = @(
    "loT/loT/device_config.h",
    "ESP32_MPPT/mppt_config.h",
    "EF/config.h"
)

function Test-BlockedPath([string]$RelativePath) {
    $segments = $RelativePath -split "[\\/]"
    if ($segments | Where-Object { $blockedSegments -contains $_ }) { return $true }
    $name = $segments[-1]
    foreach ($pattern in $blockedNames) {
        if ($name -like $pattern) { return $true }
    }
    return $false
}

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$temporary = "$Output.tmp"
Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
$stream = [IO.File]::Open($temporary, [IO.FileMode]::CreateNew)
$archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create, $false)
try {
    foreach ($sourceName in $sourceRoots) {
        $source = Join-Path $root $sourceName
        if (-not (Test-Path -LiteralPath $source -PathType Container)) { continue }
        Get-ChildItem -LiteralPath $source -Recurse -File | ForEach-Object {
            $relative = $_.FullName.Substring($rootPrefix.Length).Replace("\", "/")
            if (-not (Test-BlockedPath $relative)) {
                if ($sanitizedFirmwareHeaders -contains $relative) {
                    $content = Get-Content -LiteralPath $_.FullName -Raw
                    $content = [regex]::Replace(
                        $content,
                        '(?m)^(\s*#define\s+\w*(?:PASSWORD|SECRET|TOKEN)\w*\s+)"[^"]*"',
                        '$1"CHANGE_ME"'
                    )
                    $entry = $archive.CreateEntry($relative, [IO.Compression.CompressionLevel]::Optimal)
                    $writer = New-Object IO.StreamWriter($entry.Open(), (New-Object Text.UTF8Encoding($false)))
                    try { $writer.Write($content) } finally { $writer.Dispose() }
                } else {
                    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                        $archive, $_.FullName, $relative, [IO.Compression.CompressionLevel]::Optimal
                    ) | Out-Null
                }
            }
        }
    }
} finally {
    $archive.Dispose()
    $stream.Dispose()
}

$verification = [IO.Compression.ZipFile]::OpenRead($temporary)
try {
    foreach ($relative in $sanitizedFirmwareHeaders) {
        $entry = $verification.GetEntry($relative)
        if (-not $entry) { continue }
        $reader = New-Object IO.StreamReader($entry.Open())
        try { $content = $reader.ReadToEnd() } finally { $reader.Dispose() }
        if ($content -match '(?m)^\s*#define\s+\w*(?:PASSWORD|SECRET|TOKEN)\w*\s+"(?!CHANGE_ME")[^"]+"') {
            throw "Release verification found a literal firmware credential in $relative"
        }
    }
} finally {
    $verification.Dispose()
}

Move-Item -LiteralPath $temporary -Destination $Output -Force
$hash = (Get-FileHash -LiteralPath $Output -Algorithm SHA256).Hash.ToLowerInvariant()
Set-Content -LiteralPath "$Output.sha256" -Value "$hash  $(Split-Path $Output -Leaf)" -Encoding ascii
Write-Output $Output
Write-Output "$Output.sha256"
