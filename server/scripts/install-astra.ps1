[CmdletBinding()]
param(
    [string]$WslDistribution = "Ubuntu2404",
    [switch]$EnableCloudflare,
    [switch]$ConfigureAliyunPnvs,
    [switch]$SkipStart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$serverRoot = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $serverRoot
$envExample = Join-Path $serverRoot ".env.example"
$envFile = Join-Path $serverRoot ".env"

function ConvertFrom-SecureValue([Security.SecureString]$Value) {
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

function Read-ValidatedSecret([string]$Label, [int]$MinimumLength, [switch]$FirmwareSafe) {
    while ($true) {
        $first = ConvertFrom-SecureValue (Read-Host "$Label (minimum $MinimumLength characters)" -AsSecureString)
        $second = ConvertFrom-SecureValue (Read-Host "Repeat $Label" -AsSecureString)
        if ($first.Length -lt $MinimumLength) {
            Write-Warning "$Label is too short."
            continue
        }
        if ($first -ne $second) {
            Write-Warning "The two values do not match."
            continue
        }
        if ($FirmwareSafe -and $first -notmatch '^[A-Za-z0-9._~-]+$') {
            Write-Warning "$Label may contain only letters, digits, dot, underscore, tilde, and hyphen."
            continue
        }
        return $first
    }
}

function Read-EmailAddress {
    while ($true) {
        $value = (Read-Host "Administrator email").Trim().ToLowerInvariant()
        try {
            $parsed = [Net.Mail.MailAddress]::new($value)
            if ($parsed.Address -eq $value) { return $value }
        } catch {}
        Write-Warning "Enter a valid email address."
    }
}

function New-RandomToken([int]$Bytes = 48) {
    $buffer = New-Object byte[] $Bytes
    [Security.Cryptography.RandomNumberGenerator]::Fill($buffer)
    return [Convert]::ToBase64String($buffer).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

function Protect-SecretPath([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) { return }
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent().Name
    $item = Get-Item -LiteralPath $Path
    $rights = if ($item.PSIsContainer) { "(OI)(CI)(F)" } else { "(F)" }
    $arguments = @(
        $Path,
        "/inheritance:r",
        "/grant:r",
        "${identity}:$rights",
        "*S-1-5-18:$rights",
        "*S-1-5-32-544:$rights"
    )
    if ($item.PSIsContainer) { $arguments += @("/T", "/C") }
    & icacls.exe @arguments | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Failed to restrict access to secret path: $Path" }
}

function Set-EnvValue([string]$Key, [string]$Value) {
    $escaped = [Regex]::Escape($Key)
    if ($script:envText -match "(?m)^$escaped=") {
        $script:envText = [Regex]::Replace($script:envText, "(?m)^$escaped=.*$", "$Key=$Value")
    } else {
        $script:envText += "`r`n$Key=$Value"
    }
}

function Set-CMacro([string]$Path, [string]$Macro, [string]$Value) {
    $text = [IO.File]::ReadAllText($Path)
    $pattern = '(?m)^\s*#define\s+' + [Regex]::Escape($Macro) + '\s+"[^"]*"'
    if ($text -notmatch $pattern) { throw "Missing firmware macro: $Macro ($Path)" }
    $replacement = '#define ' + $Macro + ' "' + $Value + '"'
    $text = [Regex]::Replace($text, $pattern, $replacement)
    [IO.File]::WriteAllText($Path, $text, [Text.UTF8Encoding]::new($false))
}

function Set-CMacroIfPresent([string]$Path, [string]$Macro, [string]$Value) {
    if (Test-Path -LiteralPath $Path) { Set-CMacro $Path $Macro $Value }
}

if (-not (Test-Path -LiteralPath $envExample)) { throw "Missing $envExample" }
if (Test-Path -LiteralPath $envFile) {
    $answer = (Read-Host ".env already exists. Type YES to overwrite it").Trim()
    if ($answer -ne "YES") { throw "Installation cancelled; existing configuration was not changed." }
}

Write-Host "`n=== Required ASTRA credentials ===" -ForegroundColor Cyan
$postgresPassword = Read-ValidatedSecret "PostgreSQL password" 16 -FirmwareSafe
$adminEmail = Read-EmailAddress
$adminPassword = Read-ValidatedSecret "Administrator password" 9 -FirmwareSafe
$superAdminPassword = ""
if ($adminEmail -ne "123@qq.com") {
    $superAdminPassword = Read-ValidatedSecret "Reserved super administrator 123@qq.com password" 9 -FirmwareSafe
}
$configureSmtp = (Read-Host "Configure SMTP email verification? [Y/n]").Trim()
$smtpHost = ""
$smtpPort = "587"
$smtpUsername = ""
$smtpPassword = ""
$smtpFrom = ""
$smtpStartTls = "1"
$smtpSsl = "0"
if (-not $configureSmtp -or $configureSmtp -match '^[Yy]$') {
    $smtpHost = (Read-Host "SMTP host").Trim()
    if (-not $smtpHost) { throw "SMTP host is required." }
    $smtpPortInput = (Read-Host "SMTP port [587]").Trim()
    if ($smtpPortInput) { $smtpPort = $smtpPortInput }
    $parsedSmtpPort = 0
    if (-not [int]::TryParse($smtpPort, [ref]$parsedSmtpPort) -or $parsedSmtpPort -lt 1 -or $parsedSmtpPort -gt 65535) { throw "SMTP port is invalid." }
    $smtpUsername = (Read-Host "SMTP username").Trim()
    $smtpPassword = Read-ValidatedSecret "SMTP app password" 1 -FirmwareSafe
    $smtpFrom = (Read-Host "SMTP sender address [$smtpUsername]").Trim()
    if (-not $smtpFrom) { $smtpFrom = $smtpUsername }
    try { $null = [Net.Mail.MailAddress]::new($smtpFrom) } catch { throw "SMTP sender address is invalid." }
    $smtpSecurity = (Read-Host "SMTP security: starttls, ssl, or none [starttls]").Trim().ToLowerInvariant()
    if (-not $smtpSecurity) { $smtpSecurity = "starttls" }
    switch ($smtpSecurity) {
        "starttls" { $smtpStartTls = "1"; $smtpSsl = "0" }
        "ssl" { $smtpStartTls = "0"; $smtpSsl = "1" }
        "none" { $smtpStartTls = "0"; $smtpSsl = "0" }
        default { throw "SMTP security must be starttls, ssl, or none." }
    }
}
$backendPassword = Read-ValidatedSecret "backend-controller MQTT password" 12 -FirmwareSafe
$mpptPassword = Read-ValidatedSecret "mppt-001 MQTT password" 12 -FirmwareSafe
$espPassword = Read-ValidatedSecret "esp32-001 MQTT password" 12 -FirmwareSafe
$efPassword = Read-ValidatedSecret "ef-001 MQTT password" 12 -FirmwareSafe
$backupPassword = Read-ValidatedSecret "Backup encryption passphrase" 24
$displayName = (Read-Host "Administrator display name [ASTRA Administrator]").Trim()
if (-not $displayName) { $displayName = "ASTRA Administrator" }
$cors = (Read-Host "CORS origins [https://astroy.xyz,https://www.astroy.xyz]").Trim()
if (-not $cors) { $cors = "https://astroy.xyz,https://www.astroy.xyz" }
$firmwareFiles = @(
    (Join-Path $projectRoot "ESP32_MPPT\mppt_config.h"),
    (Join-Path $projectRoot "loT\loT\device_config.h"),
    (Join-Path $projectRoot "EF\config.h")
)
$hasFirmware = @($firmwareFiles | Where-Object { Test-Path -LiteralPath $_ }).Count -gt 0
$wifiSsid = ""
$wifiPassword = ""
if ($hasFirmware) {
    $wifiSsid = (Read-Host "Shared device Wi-Fi SSID").Trim()
    if (-not $wifiSsid -or $wifiSsid -notmatch '^[A-Za-z0-9._~-]+$') { throw "Wi-Fi SSID is required and must use firmware-safe characters." }
    $wifiPassword = Read-ValidatedSecret "Shared device Wi-Fi password" 8 -FirmwareSafe
}

$script:envText = [IO.File]::ReadAllText($envExample)
Set-EnvValue "POSTGRES_PASSWORD" $postgresPassword
Set-EnvValue "AUTH_SECRET" (New-RandomToken 48)
Set-EnvValue "AUTH_COOKIE_SECURE" "1"
Set-EnvValue "AUTH_DEBUG_CODES" "0"
Set-EnvValue "ADMIN_EMAIL" $adminEmail
Set-EnvValue "ADMIN_PASSWORD" $adminPassword
Set-EnvValue "SUPER_ADMIN_PASSWORD" $superAdminPassword
Set-EnvValue "ADMIN_DISPLAY_NAME" $displayName
Set-EnvValue "ADMIN_PASSWORD_SYNC" "1"
Set-EnvValue "SMTP_HOST" $smtpHost
Set-EnvValue "SMTP_PORT" $smtpPort
Set-EnvValue "SMTP_USERNAME" $smtpUsername
Set-EnvValue "SMTP_PASSWORD" $smtpPassword
Set-EnvValue "SMTP_FROM" $smtpFrom
Set-EnvValue "SMTP_STARTTLS" $smtpStartTls
Set-EnvValue "SMTP_SSL" $smtpSsl
Set-EnvValue "MQTT_PASSWORD" $backendPassword
Set-EnvValue "SMS_WEBHOOK_TOKEN" (New-RandomToken 32)
Set-EnvValue "CORS_ORIGINS" $cors

if ($ConfigureAliyunPnvs) {
    Write-Host "`n=== Aliyun PNVS ===" -ForegroundColor Cyan
    Set-EnvValue "SMS_GATEWAY_MODE" "aliyun_pnvs"
    Set-EnvValue "ALIYUN_PNVS_ACCESS_KEY_ID" (Read-Host "AccessKey ID").Trim()
    Set-EnvValue "ALIYUN_PNVS_ACCESS_KEY_SECRET" (ConvertFrom-SecureValue (Read-Host "AccessKey Secret" -AsSecureString))
    Set-EnvValue "ALIYUN_PNVS_SIGN_NAME" (Read-Host "Sign name").Trim()
    Set-EnvValue "ALIYUN_PNVS_TEMPLATE_CODE" (Read-Host "Template code").Trim()
}

if ($EnableCloudflare) {
    $cloudflareToken = ConvertFrom-SecureValue (Read-Host "Cloudflare Tunnel token" -AsSecureString)
    if (-not $cloudflareToken) { throw "Cloudflare Tunnel token is required." }
    $secretDirectory = Join-Path $serverRoot ".secrets"
    [IO.Directory]::CreateDirectory($secretDirectory) | Out-Null
    [IO.File]::WriteAllText((Join-Path $secretDirectory "cloudflared.token"), $cloudflareToken + "`n", [Text.UTF8Encoding]::new($false))
    Set-EnvValue "CLOUDFLARED_TOKEN_FILE" "./.secrets/cloudflared.token"
    $cloudflareToken = $null
}

[IO.File]::WriteAllText($envFile, $script:envText, [Text.UTF8Encoding]::new($false))
Protect-SecretPath $envFile
Set-CMacroIfPresent (Join-Path $projectRoot "ESP32_MPPT\mppt_config.h") "MPPT_MQTT_PASSWORD" $mpptPassword
Set-CMacroIfPresent (Join-Path $projectRoot "ESP32_MPPT\mppt_config.h") "MPPT_WIFI_SSID" $wifiSsid
Set-CMacroIfPresent (Join-Path $projectRoot "ESP32_MPPT\mppt_config.h") "MPPT_WIFI_PASSWORD" $wifiPassword
Set-CMacroIfPresent (Join-Path $projectRoot "loT\loT\device_config.h") "DEVICE_MQTT_PASSWORD" $espPassword
Set-CMacroIfPresent (Join-Path $projectRoot "loT\loT\device_config.h") "DEVICE_WIFI_SSID" $wifiSsid
Set-CMacroIfPresent (Join-Path $projectRoot "loT\loT\device_config.h") "DEVICE_WIFI_PASSWORD" $wifiPassword
Set-CMacroIfPresent (Join-Path $projectRoot "EF\config.h") "MQTT_PASSWORD" $efPassword
Set-CMacroIfPresent (Join-Path $projectRoot "EF\config.h") "WIFI_SSID" $wifiSsid
Set-CMacroIfPresent (Join-Path $projectRoot "EF\config.h") "WIFI_PASSWORD" $wifiPassword
Set-CMacroIfPresent (Join-Path $projectRoot "CameraWebServer\CameraWebServer\camera_config.h") "CAMERA_WIFI_SSID" $wifiSsid
Set-CMacroIfPresent (Join-Path $projectRoot "CameraWebServer\CameraWebServer\camera_config.h") "CAMERA_WIFI_PASS" $wifiPassword
Set-CMacroIfPresent (Join-Path $projectRoot "电动平场板控制\电动平场板控制.ino") "WIFI_SSID" $wifiSsid
Set-CMacroIfPresent (Join-Path $projectRoot "电动平场板控制\电动平场板控制.ino") "WIFI_PASSWORD" $wifiPassword

$linuxServerRoot = (& wsl.exe -d $WslDistribution -- wslpath -a $serverRoot).Trim()
if (-not $linuxServerRoot) { throw "Could not convert the project path to a WSL path." }
& wsl.exe -d $WslDistribution -- docker info *> $null
if ($LASTEXITCODE -ne 0) {
    & wsl.exe -d $WslDistribution -u root -- bash "${linuxServerRoot}/wsl-start-docker.sh"
    if ($LASTEXITCODE -ne 0) { throw "Failed to start Docker before credential setup." }
}

$passwdTemp = Join-Path $serverRoot "mosquitto\passwd.install"
$passwdFinal = Join-Path $serverRoot "mosquitto\passwd"
try {
    [IO.File]::WriteAllLines($passwdTemp, @(
        "backend-controller:$backendPassword",
        "mppt-001:$mpptPassword",
        "esp32-001:$espPassword",
        "ef-001:$efPassword"
    ), [Text.UTF8Encoding]::new($false))
    & wsl.exe -d $WslDistribution -- docker run --rm -v "${linuxServerRoot}/mosquitto:/mosquitto/config" eclipse-mosquitto:2 mosquitto_passwd -U /mosquitto/config/passwd.install
    if ($LASTEXITCODE -ne 0) { throw "Failed to hash Mosquitto passwords." }
    Move-Item -LiteralPath $passwdTemp -Destination $passwdFinal -Force
} finally {
    if (Test-Path -LiteralPath $passwdTemp) { Remove-Item -LiteralPath $passwdTemp -Force }
}
Protect-SecretPath $passwdFinal
Protect-SecretPath (Join-Path $serverRoot ".secrets")

$backupPassword | & wsl.exe -d $WslDistribution -u root -- bash "${linuxServerRoot}/scripts/install-backup-secret.sh"
if ($LASTEXITCODE -ne 0) { throw "Failed to install the backup passphrase." }

if (-not $SkipStart) {
    & wsl.exe -d $WslDistribution -u root -- bash "${linuxServerRoot}/wsl-start-docker.sh"
    if ($LASTEXITCODE -ne 0) { throw "Failed to start the Docker daemon." }
    $services = "postgres mosquitto sms-gateway service-control api admin-console web intro-web"
    if ($EnableCloudflare) { $services += " cloudflared" }
    if ($linuxServerRoot.Contains("'")) { throw "The project path must not contain a single quote." }
    $quotedRoot = "'$linuxServerRoot'"
    $command = "cd $quotedRoot && docker compose -f docker-compose.yml -f docker-compose.wsl.yml up -d --build $services"
    & wsl.exe -d $WslDistribution -- bash -lc $command
    if ($LASTEXITCODE -ne 0) { throw "Docker Compose failed to start ASTRA." }

    $healthy = $false
    for ($i = 0; $i -lt 30; $i++) {
        try {
            $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -TimeoutSec 3
            if ($health.ok -and $health.database -eq "postgresql" -and $health.mqtt) { $healthy = $true; break }
        } catch {}
        Start-Sleep -Seconds 2
    }
    if (-not $healthy) { throw "ASTRA did not pass the health check. Inspect docker compose logs." }
    $openapi = Invoke-RestMethod -Uri "http://127.0.0.1:8080/openapi.json" -TimeoutSec 5
    if ($openapi.paths.PSObject.Properties.Name -notcontains "/api/v1/auth/profile") { throw "Authentication API verification failed." }
}

$postgresPassword = $adminPassword = $superAdminPassword = $smtpPassword = $backendPassword = $mpptPassword = $espPassword = $efPassword = $backupPassword = $wifiPassword = $null
Write-Host "`nASTRA installation and validation completed." -ForegroundColor Green
Write-Host "Frontend: http://127.0.0.1:8000/"
Write-Host "Admin:    http://127.0.0.1:8100/"
Write-Host "Next: run mqttx-firmware-sim.ps1 and mqttx-command-roundtrip.ps1."
