[CmdletBinding()]
param(
    [string]$WslDistribution = "Ubuntu2404",
    [string]$TaskName = "ASTRA-Server-Autostart",
    [ValidateRange(0, 3600)]
    [int]$RandomDelaySeconds = 45,
    [switch]$RunAsSystem,
    [switch]$Remove
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$serverRoot = Split-Path -Parent $PSScriptRoot
$launcher = Join-Path $PSScriptRoot "start-astra-on-boot.ps1"
if (-not (Test-Path -LiteralPath $launcher)) { throw "Missing startup launcher: $launcher" }

$isAdministrator = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole(
    [Security.Principal.WindowsBuiltInRole]::Administrator
)
if (-not $isAdministrator) {
    throw "Run PowerShell as Administrator to register a machine-start scheduled task."
}

if ($Remove) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
    Write-Host "Removed scheduled task '$TaskName'."
    exit 0
}

if (-not (Get-Command wsl.exe -ErrorAction SilentlyContinue)) { throw "wsl.exe is required." }
$linuxServerRoot = (& wsl.exe -d $WslDistribution -- wslpath -a $serverRoot).Trim()
if ($LASTEXITCODE -ne 0 -or -not $linuxServerRoot) {
    throw "WSL distribution '$WslDistribution' is unavailable or the server path cannot be converted."
}
if ($linuxServerRoot.Contains("'")) { throw "The Linux server path must not contain a single quote." }

$escapedLauncher = $launcher.Replace('"', '\"')
$escapedDistro = $WslDistribution.Replace('"', '\"')
$escapedLinuxRoot = $linuxServerRoot.Replace('"', '\"')
$arguments = "-NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$escapedLauncher`" -WslDistribution `"$escapedDistro`" -LinuxServerRoot `"$escapedLinuxRoot`""
$action = New-ScheduledTaskAction -Execute (Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe") -Argument $arguments -WorkingDirectory $serverRoot
$trigger = if ($RandomDelaySeconds -gt 0) {
    New-ScheduledTaskTrigger -AtStartup -RandomDelay (New-TimeSpan -Seconds $RandomDelaySeconds)
} else {
    New-ScheduledTaskTrigger -AtStartup
}
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Hours 1)
$principal = if ($RunAsSystem) {
    New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
} else {
    $currentUser = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    New-ScheduledTaskPrincipal -UserId $currentUser -LogonType S4U -RunLevel Highest
}

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force | Out-Null
Write-Host "Installed scheduled task '$TaskName'."
Write-Host "WSL distribution: $WslDistribution"
Write-Host "Run context: $(if ($RunAsSystem) { 'SYSTEM' } else { [Security.Principal.WindowsIdentity]::GetCurrent().Name + ' (S4U)' })"
Write-Host "Startup log: $(Join-Path $serverRoot 'logs\autostart.log')"
Write-Host "Check status: Get-ScheduledTask -TaskName '$TaskName' | Get-ScheduledTaskInfo"
Write-Host "Remove:       .\scripts\install-autostart.ps1 -Remove"
