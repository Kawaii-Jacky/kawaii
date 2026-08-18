param([switch]$BuildLocal)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not (Get-Command wsl -ErrorAction SilentlyContinue)) { throw 'WSL2 is required for the Windows installer' }
$wslRoot = (& wsl wslpath -a ($root -replace '\\','/')).Trim()
if ([string]::IsNullOrWhiteSpace($wslRoot)) { throw 'Unable to resolve the WSL project path' }
$args = if ($BuildLocal) { '--build-local' } else { '' }
& wsl --cd $wslRoot bash -lc "./deploy/install.sh $args"
if ($LASTEXITCODE -ne 0) { throw "WSL installer failed with exit code $LASTEXITCODE" }
