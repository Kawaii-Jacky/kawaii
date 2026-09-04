[CmdletBinding()]
param(
    [string]$WslDistribution = "Ubuntu2404",
    [string]$LinuxServerRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$serverRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $serverRoot "logs"
$logPath = Join-Path $logDirectory "autostart.log"

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
function Write-StartupLog([string]$Message) {
    $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ssK"), $Message
    Add-Content -LiteralPath $logPath -Value $line -Encoding UTF8
}

try {
    if (-not $LinuxServerRoot) {
        $LinuxServerRoot = (& wsl.exe -d $WslDistribution -- wslpath -a $serverRoot).Trim()
        if ($LASTEXITCODE -ne 0 -or -not $LinuxServerRoot) {
            throw "Unable to convert the server path for WSL distribution '$WslDistribution'."
        }
    }
    if ($LinuxServerRoot.Contains("'")) {
        throw "The Linux server path must not contain a single quote."
    }

    Write-StartupLog "Starting ASTRA server services via WSL distribution '$WslDistribution'."
    Write-StartupLog "Frontend containers and browser applications are not launched by this task."
    $command = "cd '$LinuxServerRoot' && bash ./scripts/start-astra-server-wsl.sh"
    & wsl.exe -d $WslDistribution -u root -- bash -lc $command 2>&1 |
        ForEach-Object { Add-Content -LiteralPath $logPath -Value ("  " + $_) -Encoding UTF8 }
    $exitCode = $LASTEXITCODE
    if ($exitCode -ne 0) {
        Write-StartupLog "ASTRA startup failed with exit code $exitCode."
        exit $exitCode
    }
    Write-StartupLog "ASTRA startup completed successfully."
    exit 0
} catch {
    Write-StartupLog ("ASTRA startup failed: " + $_.Exception.Message)
    exit 1
}
