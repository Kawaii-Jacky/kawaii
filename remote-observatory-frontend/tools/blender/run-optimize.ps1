param(
  [string]$Blender = "D:\Blender\blender.exe",
  [string]$InputModel = "",
  [string]$OutputModel = "$PSScriptRoot\..\..\assets\models\observatory-web.glb",
  [string]$BlendOutput = "$PSScriptRoot\observatory-web.blend",
  [int]$MaxTexture = 512
)

$ErrorActionPreference = "Stop"

if (-not $InputModel) {
  $InputModel = Get-ChildItem -LiteralPath "D:\Wechat_Save\xwechat_files\wxid_e74e8l6x5ydu22_b4cc\msg\file\2026-08" -Filter "*.glb" -File |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1 -ExpandProperty FullName
}

if (-not (Test-Path -LiteralPath $Blender)) {
  throw "Blender not found: $Blender"
}

if (-not (Test-Path -LiteralPath $InputModel)) {
  throw "Input GLB not found: $InputModel"
}

& $Blender --background --factory-startup --python "$PSScriptRoot\optimize_observatory.py" -- `
  --input $InputModel `
  --output $OutputModel `
  --blend-output $BlendOutput `
  --max-texture $MaxTexture

if ($LASTEXITCODE -ne 0) {
  throw "Blender optimization failed with exit code $LASTEXITCODE"
}
