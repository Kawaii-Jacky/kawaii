param(
    [string]$Broker = "mqtt.astroy.xyz",
    [int]$Port = 443,
    [string]$Protocol = "wss",
    [string]$Path = "/mqtt"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$node = (Get-Command node).Source
$cli = Join-Path $env:APPDATA "npm\node_modules\mqttx-cli\bin\index.js"

function Read-Macro([string]$file, [string]$name) {
    $line = Get-Content -LiteralPath $file | Where-Object { $_ -match "^\s*#define\s+$name\s+" } | Select-Object -First 1
    if (-not $line) { throw "Missing firmware macro: $name" }
    $value = ([regex]::Match($line, '"([^"]+)"')).Groups[1].Value
    if ([string]::IsNullOrWhiteSpace($value)) { throw "Empty firmware macro: $name" }
    return $value
}

function Publish-Json([string]$user, [string]$password, [string]$kind, [hashtable]$body) {
    $payload = $body | ConvertTo-Json -Compress -Depth 6
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = @($payload | & $node $cli pub -h $Broker -p $Port -l $Protocol --path $Path -V 3.1.1 `
        -u $user -P $password -i "mqttx-$user-$kind-sim" `
        -t "devices/$user/$kind" -s -q 1 `
        --maximum-reconnect-times 2 -rp 1000 2>&1)
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction
    $text = $output -join "`n"
    if ($exitCode -ne 0 -or $text -match 'Not authorized|Connection refused|\bError:') {
        throw "MQTTX publish failed for $user/$kind"
    }
}

function Publish-Telemetry([string]$user, [string]$password, [hashtable]$data, [int]$sequence) {
    Publish-Json $user $password "status" @{
        schema = 1
        device = $user
        status = "online"
        ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    }
    $telemetry = @{
        schema = 1
        device = $user
        ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
        seq = $sequence
    }
    foreach ($key in $data.Keys) { $telemetry[$key] = $data[$key] }
    Publish-Json $user $password "telemetry" $telemetry
}

$mpptPassword = Read-Macro "$root\ESP32_MPPT\mppt_config.h" "MPPT_MQTT_PASSWORD"
$espPassword = Read-Macro "$root\loT\loT\device_config.h" "DEVICE_MQTT_PASSWORD"
$efPassword = Read-Macro "$root\EF\config.h" "MQTT_PASSWORD"
$seed = [int][DateTimeOffset]::UtcNow.ToUnixTimeSeconds()

try {
    Publish-Telemetry "mppt-001" $mpptPassword @{
        power_input = 42.6; battery_percent = 76; current_input = 2.34
        buck_current = 3.08; buck_power = 38.1; voltage_input = 18.2
        buck_voltage = 12.4; temperature = 31; pwm = 96; fan = 1
        enable_fan = 1; mode = 1; daily_energy = 126.4; total_energy = 490700.2
        buck_efficiency = 89.4; days_running = 18.2; voltage_battery_min = 10.0
        voltage_battery_max = 14.4; current_charging = 3.5; temperature_fan = 60
    } $seed
    Publish-Telemetry "esp32-001" $espPassword @{
        dht_temperature = 22.4; dht_humidity = 43.0; utc_temperature = 21.9
        output_voltage = 12.18; output_current = 2.1; power_output = 25.6
        rain_analog = 872; rain_detected = $false; heater = $false; heater_mode = $true
        fan = $true; fan_mode = $true; fan_threshold = 40; mosfet = $true
        camera = $false; cameraDurationMinutes = 180; bluetooth = $false; roof = "closed"; roofPosition = 0
    } ($seed + 1)
    Publish-Telemetry "ef-001" $efPassword @{
        humidity = 72; servo = $true; servoMoving = $false; led = $true
        heater = $false; heater_mode = $true; angle = 150; maxAngle = 300
        brightness = 68; humi_threshold = 70; heater_power = 50
    } ($seed + 2)
    Write-Output "MQTTX firmware simulation published telemetry for 3 devices."
}
finally {
    $mpptPassword = $null
    $espPassword = $null
    $efPassword = $null
}
