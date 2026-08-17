param(
    [string]$Broker = "mqtt.astroy.xyz",
    [int]$Port = 443,
    [string]$Protocol = "wss",
    [string]$Path = "/mqtt"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$serverRoot = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node).Source
$cli = Join-Path $env:APPDATA "npm\node_modules\mqttx-cli\bin\index.js"
$processes = @()
$files = @()

function Read-Macro([string]$file, [string]$name) {
    $line = Get-Content -LiteralPath $file | Where-Object { $_ -match "^\s*#define\s+$name\s+" } | Select-Object -First 1
    if (-not $line) { throw "Missing firmware macro: $name" }
    $value = ([regex]::Match($line, '"([^"]+)"')).Groups[1].Value
    if ([string]::IsNullOrWhiteSpace($value)) { throw "Empty firmware macro: $name" }
    return $value
}

function Read-Env([string]$name) {
    $line = Get-Content -LiteralPath "$serverRoot\.env" | Where-Object { $_ -match "^$name=" } | Select-Object -Last 1
    if (-not $line) { throw "Missing environment setting: $name" }
    return ($line -split "=", 2)[1]
}

function Start-Subscriber([string]$user, [string]$password, [string]$topic, [string]$clientId, [string]$label) {
    $stdout = Join-Path $env:TEMP "$label.out"
    $stderr = Join-Path $env:TEMP "$label.err"
    Remove-Item -LiteralPath $stdout, $stderr -ErrorAction SilentlyContinue
    $script:files += $stdout, $stderr
    $arguments = @(
        $cli, "sub", "-h", $Broker, "-p", $Port, "-l", $Protocol,
        "--path", $Path, "-V", "3.1.1", "-u", $user, "-P", $password,
        "-i", $clientId, "-t", $topic, "-q", "1", "--output-mode", "clean",
        "-rp", "1000", "--maximum-reconnect-times", "5"
    )
    $process = Start-Process -FilePath $node -ArgumentList $arguments `
        -RedirectStandardOutput $stdout -RedirectStandardError $stderr `
        -PassThru -WindowStyle Hidden
    $script:processes += $process
    return @{ Process = $process; Output = $stdout; Error = $stderr }
}

function Publish-Json([string]$user, [string]$password, [string]$clientId, [string]$topic, [hashtable]$body) {
    $payload = $body | ConvertTo-Json -Compress -Depth 6
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = @($payload | & $node $cli pub -h $Broker -p $Port -l $Protocol --path $Path -V 3.1.1 `
        -u $user -P $password -i $clientId -t $topic -s -q 1 `
        --maximum-reconnect-times 2 -rp 1000 2>&1)
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction
    $text = $output -join "`n"
    if ($exitCode -ne 0 -or $text -match 'Not authorized|Connection refused|\bError:') {
        throw "MQTTX publish failed for $user on $topic"
    }
}

function Stop-Client($client) {
    if ($client -and $client.Process -and -not $client.Process.HasExited) {
        Stop-Process -Id $client.Process.Id -Force -ErrorAction SilentlyContinue
        $client.Process.WaitForExit(3000) | Out-Null
    }
}

$backendPassword = Read-Env "MQTT_PASSWORD"
$devices = @(
    @{ User = "mppt-001"; Password = Read-Macro "$projectRoot\ESP32_MPPT\mppt_config.h" "MPPT_MQTT_PASSWORD"; Command = "fan"; Args = @{ state = $true } },
    @{ User = "esp32-001"; Password = Read-Macro "$projectRoot\loT\loT\device_config.h" "DEVICE_MQTT_PASSWORD"; Command = "fan"; Args = @{ state = $true } },
    @{ User = "ef-001"; Password = Read-Macro "$projectRoot\EF\config.h" "MQTT_PASSWORD"; Command = "brightness"; Args = @{ value = 128 } }
)

try {
    $marker = "mqttx-roundtrip-$([guid]::NewGuid().ToString('N'))"
    $ackClient = Start-Subscriber "backend-controller" $backendPassword "devices/+/reported" "mqttx-backend-ack" "mqttx-backend-ack"
    foreach ($device in $devices) {
        $device.Client = Start-Subscriber $device.User $device.Password "devices/$($device.User)/command" "mqttx-$($device.User)-firmware" "mqttx-$($device.User)-command"
    }
    Start-Sleep -Seconds 6

    foreach ($device in $devices) {
        $command = @{ schema = 1; id = $marker; device = $device.User; command = $device.Command } + $device.Args
        Publish-Json "backend-controller" $backendPassword "mqttx-backend-$($device.User)" "devices/$($device.User)/command" $command
    }
    Start-Sleep -Seconds 3
    foreach ($device in $devices) {
        $received = Get-Content -LiteralPath $device.Client.Output -Raw -ErrorAction SilentlyContinue
        $errors = Get-Content -LiteralPath $device.Client.Error -Raw -ErrorAction SilentlyContinue
        if ($received -notmatch [regex]::Escape($marker)) {
            throw "MQTTX command was not received by $($device.User): $errors"
        }
        Publish-Json $device.User $device.Password "mqttx-$($device.User)-ack" "devices/$($device.User)/reported" @{
            schema = 1; id = $marker; device = $device.User; ok = $true
            ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
            result = @{ simulated = $true }
        }
    }
    Start-Sleep -Seconds 3
    $ackOutput = Get-Content -LiteralPath $ackClient.Output -Raw -ErrorAction SilentlyContinue
    foreach ($device in $devices) {
        if ($ackOutput -notmatch [regex]::Escape($device.User) -or $ackOutput -notmatch [regex]::Escape($marker)) {
            throw "MQTTX ACK was not observed for $($device.User)"
        }
    }

    # Simulate all three devices losing their sessions, then reconnect with the
    # same client IDs and prove that commands are received after reconnection.
    foreach ($device in $devices) { Stop-Client $device.Client }
    Start-Sleep -Seconds 2
    $reconnectMarker = "mqttx-reconnect-$([guid]::NewGuid().ToString('N'))"
    foreach ($device in $devices) {
        $device.Reconnected = Start-Subscriber $device.User $device.Password "devices/$($device.User)/command" "mqttx-$($device.User)-firmware" "mqttx-$($device.User)-reconnected"
    }
    Start-Sleep -Seconds 6
    foreach ($device in $devices) {
        Publish-Json "backend-controller" $backendPassword "mqttx-backend-reconnect-$($device.User)" "devices/$($device.User)/command" @{
            schema = 1; id = $reconnectMarker; device = $device.User; command = "reconnect_test"
        }
    }
    Start-Sleep -Seconds 3
    foreach ($device in $devices) {
        $received = Get-Content -LiteralPath $device.Reconnected.Output -Raw -ErrorAction SilentlyContinue
        $errors = Get-Content -LiteralPath $device.Reconnected.Error -Raw -ErrorAction SilentlyContinue
        if ($received -notmatch [regex]::Escape($reconnectMarker)) {
            throw "MQTTX reconnect verification failed for $($device.User): $errors"
        }
    }
    Write-Output "MQTTX validation passed: 3 devices received commands, returned ACKs, disconnected, and reconnected."
}
finally {
    foreach ($process in $processes) {
        if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
    }
    Remove-Item -LiteralPath $files -ErrorAction SilentlyContinue
    $backendPassword = $null
    foreach ($device in $devices) { $device.Password = $null }
}
