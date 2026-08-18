$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
docker compose version | Out-Null
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
docker compose -f docker-compose.release.yml up -d --remove-orphans
docker compose -f docker-compose.release.yml ps
