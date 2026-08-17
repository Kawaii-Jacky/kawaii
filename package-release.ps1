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

$sourceRoots = @("remote-astro-service", "remote-observatory-frontend", "server")
$rootPrefix = $root.TrimEnd("\") + "\"
$blockedSegments = @(".git", ".venv", ".secrets", "backups", "data", "__pycache__")
$blockedNames = @(".env", "*.secret", "*.secrets", "*.token", "*.key", "*.pem", "passwd*", "*secrets-checklist*.md", "*.bak", "*.backup")

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
                [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                    $archive, $_.FullName, $relative, [IO.Compression.CompressionLevel]::Optimal
                ) | Out-Null
            }
        }
    }
} finally {
    $archive.Dispose()
    $stream.Dispose()
}

Move-Item -LiteralPath $temporary -Destination $Output -Force
Write-Output $Output
