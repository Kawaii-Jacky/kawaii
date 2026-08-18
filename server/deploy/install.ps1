param([switch]$BuildLocal)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
docker compose version | Out-Null
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
if ($BuildLocal) { docker compose -f docker-compose.release.yml up -d --build --remove-orphans }
else { docker compose -f docker-compose.release.yml up -d --remove-orphans }
docker compose -f docker-compose.release.yml ps
