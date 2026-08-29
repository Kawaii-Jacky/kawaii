param(
    [string]$Broker = "mqtt.astroy.xyz",
    [int]$Port = 443,
    [ValidateSet("mqtt", "mqtts", "ws", "wss")][string]$Protocol = "wss",
    [string]$Path = "/mqtt",
    [string]$ControllerId = "default",
    [string]$CredentialFile = "",
    [switch]$AllowDefaultController,
    [ValidateRange(2, 3600)][int]$IntervalSeconds = 5,
    [ValidateRange(0, 86400)][int]$DurationSeconds = 0,
    [ValidateSet("normal", "negative-ack")][string]$Scenario = "normal",
    [string]$StopFile = "",
    [string]$ReadyFile = "",
    [string]$ClientSuffix = ""
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$serverRoot = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
$cli = Join-Path $env:APPDATA "npm\node_modules\mqttx-cli\bin\index.js"
if (-not (Test-Path -LiteralPath $cli)) { throw "MQTTX CLI is not installed for the current user" }
if ($ControllerId -eq "default" -and -not $AllowDefaultController) {
    throw "Refusing to impersonate the real default controller. Use a dedicated test controller, or pass -AllowDefaultController explicitly."
}

$topicBase = if ($ControllerId -eq "default") { "devices" } else { "controllers/$ControllerId/devices" }
$runtime = Join-Path $env:TEMP "astra-mqttx-sim-$([guid]::NewGuid().ToString('N'))"
$clientSuffix = if ([string]::IsNullOrWhiteSpace($ClientSuffix)) { ([guid]::NewGuid().ToString('N')).Substring(0, 12) } else { $ClientSuffix.Trim() }
$subscribers = @{}
$sequence = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$startedAt = Get-Date
$negativeAckSent = $false

function Read-Macro([string]$file, [string]$name) {
    $line = Get-Content -LiteralPath $file | Where-Object { $_ -match "^\s*#define\s+$name\s+" } | Select-Object -First 1
    if (-not $line) { throw "Missing firmware macro: $name" }
    $value = ([regex]::Match($line, '"([^"]+)"')).Groups[1].Value
    if ([string]::IsNullOrWhiteSpace($value) -or $value -like "CHANGE_ME*") { throw "Firmware credential is not configured: $name" }
    $value
}

function Read-Env([string]$name) {
    $line = Get-Content -LiteralPath (Join-Path $serverRoot ".env") | Where-Object { $_ -match "^$([regex]::Escape($name))=" } | Select-Object -Last 1
    if (-not $line) { throw "Missing environment setting: $name" }
    ($line -split "=", 2)[1]
}

function Resolve-Credentials {
    if ($CredentialFile) {
        $resolved = (Resolve-Path -LiteralPath $CredentialFile).Path
        $config = [IO.File]::ReadAllText($resolved, (New-Object Text.UTF8Encoding($false))) | ConvertFrom-Json
        $deviceRows = @{}
        foreach ($item in @($config.devices)) { if ($item.device_id) { $deviceRows[[string]$item.device_id] = $item } }
        return @{
            'esp32-001' = @{ username = [string]$deviceRows['esp32-001'].username; password = [string]$deviceRows['esp32-001'].password }
            'mppt-001' = @{ username = [string]$deviceRows['mppt-001'].username; password = [string]$deviceRows['mppt-001'].password }
            'ef-001' = @{ username = [string]$deviceRows['ef-001'].username; password = [string]$deviceRows['ef-001'].password }
        }
        if ($config.controller_id -and $config.controller_id -ne $ControllerId) { throw "Credential file controller_id does not match -ControllerId" }
        return @{
            "esp32-001" = @{ username = [string]$config.devices.'esp32-001'.username; password = [string]$config.devices.'esp32-001'.password }
            "mppt-001" = @{ username = [string]$config.devices.'mppt-001'.username; password = [string]$config.devices.'mppt-001'.password }
            "ef-001" = @{ username = [string]$config.devices.'ef-001'.username; password = [string]$config.devices.'ef-001'.password }
        }
    }
    if ($ControllerId -ne "default") { throw "-CredentialFile is required for a non-default controller" }
    return @{
        "esp32-001" = @{ username = "esp32-001"; password = Read-Macro "$projectRoot\loT\loT\device_config.h" "DEVICE_MQTT_PASSWORD" }
        "mppt-001" = @{ username = "mppt-001"; password = Read-Macro "$projectRoot\ESP32_MPPT\mppt_config.h" "MPPT_MQTT_PASSWORD" }
        "ef-001" = @{ username = "ef-001"; password = Read-Macro "$projectRoot\EF\config.h" "MQTT_PASSWORD" }
    }
}

function New-MqttxOptions([string]$device, [hashtable]$credential) {
    $file = Join-Path $runtime "$device.options.json"
    $common = @{
        hostname = $Broker; port = $Port; protocol = $Protocol; path = $Path
        mqttVersion = 4; username = $credential.username; password = $credential.password
        maximumReconnectTimes = 5; reconnectPeriod = 1000
    }
    $json = @{ pub = $common; sub = $common } | ConvertTo-Json -Depth 5
    [IO.File]::WriteAllText($file, $json, (New-Object Text.UTF8Encoding($false)))
    $file
}

function Publish-Json([string]$device, [string]$kind, [hashtable]$body, [switch]$Retain) {
    $topic = "$topicBase/$device/$kind"
    $payload = $body | ConvertTo-Json -Compress -Depth 8
    $arguments = @($cli, "pub", "--load-options", $script:subscribers[$device].Options, "-V", "3.1.1", "-i", "mqttx-sim-$ControllerId-$device-pub-$clientSuffix", "-t", $topic, "-q", "1", "-s")
    if ($Retain) { $arguments += "-r" }
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = @($payload | & $node @arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previous
    $message = $output -join "`n"
    if ($exitCode -ne 0 -or $message -match 'Not authorized|Connection refused|\bError:') {
        throw "MQTTX publish failed for $device/$kind"
    }
}

function Publish-MultiJson([string]$device, [string]$kind, [object[]]$bodies) {
    if (-not $bodies -or $bodies.Count -eq 0) { return }
    $topic = "$topicBase/$device/$kind"
    $payload = (($bodies | ForEach-Object { $_ | ConvertTo-Json -Compress -Depth 8 }) -join "`n")
    $arguments = @($cli, "pub", "--load-options", $script:subscribers[$device].Options, "-V", "3.1.1", "-i", "mqttx-sim-$ControllerId-$device-batch-$clientSuffix", "-t", $topic, "-q", "1", "-s", "-M")
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = @($payload | & $node @arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previous
    $message = $output -join "`n"
    if ($exitCode -ne 0 -or $message -match 'Not authorized|Connection refused|\bError:') {
        throw "MQTTX multiline publish failed for $device/$kind"
    }
}

function Start-ChildProcess([string]$filePath, [object[]]$argumentList, [string]$stdout, [string]$stderr) {
    $startInfo = New-Object Diagnostics.ProcessStartInfo
    $startInfo.FileName = $filePath
    $startInfo.Arguments = (($argumentList | ForEach-Object { [char]34 + ([string]$_) + [char]34 }) -join ' ')
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    if ($stdout) { $startInfo.RedirectStandardOutput = $true }
    if ($stderr) { $startInfo.RedirectStandardError = $true }
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $startInfo
    [void]$process.Start()
    if ($stdout) {
        $process.add_OutputDataReceived({
            param($sender, $eventArgs)
            if ($eventArgs.Data) { Add-Content -LiteralPath $stdout -Value $eventArgs.Data }
        })
        $process.BeginOutputReadLine()
    }
    if ($stderr) {
        $process.add_ErrorDataReceived({
            param($sender, $eventArgs)
            if ($eventArgs.Data) { Add-Content -LiteralPath $stderr -Value $eventArgs.Data }
        })
        $process.BeginErrorReadLine()
    }
    $process
}

function Start-DeviceSubscriber([string]$device, [string]$optionsFile) {
    $stdout = Join-Path $runtime "$device.commands.log"
    $stderr = Join-Path $runtime "$device.commands.err"
    New-Item -ItemType File -Path $stdout -Force | Out-Null
    New-Item -ItemType File -Path $stderr -Force | Out-Null
    $offline = '{"schema":1,"device":"' + $device + '","status":"offline"}'
    $offlineArgument = '"' + ($offline -replace '"', '\"') + '"'
    $arguments = @(
        $cli, "sub", "--load-options", $optionsFile, "-V", "3.1.1",
        "-i", "mqttx-sim-$ControllerId-$device-$clientSuffix", "-t", "$topicBase/$device/command", "-q", "1",
        # MQTTX's clean mode emits a multi-line packet object.  The simulator
        # consumes one JSON payload per line, so keep the default output mode:
        # it includes a short topic header followed by the payload on one line.
        "-Wt", "$topicBase/$device/status", "-Wm", $offlineArgument, "-Wq", "1", "-Wr"
    )
    $process = Start-ChildProcess $node $arguments $stdout $stderr
    @{ Process = $process; Output = $stdout; Error = $stderr; Offset = 0; Options = $optionsFile }
}

function New-Ack([string]$device, $command, [bool]$ok, [string]$error = "") {
    $ack = @{
        schema = 1; device = $device; id = [string]$command.id; command = [string]$command.command
        ok = $ok; ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        result = @{ simulated = $true }
    }
    if ($error) { $ack.error = $error }
    $ack
}

$state = @{
    "esp32-001" = @{
        dht_temperature = 22.4; dht_humidity = 43.0; utc_temperature = 21.9
        output_voltage = 12.18; output_current = 2.1; power_output = 25.6
        rain_analog = 872; rain_detected = $false; heater = $false; heater_mode = $true
        fan = $true; fan_mode = $true; fan_threshold = 40; mosfet = $true
        camera = $false; cameraDurationMinutes = 180; bluetooth = $false
        roof = "closed"; roofPosition = 0.0
    }
    "mppt-001" = @{
        power_input = 42.6; battery_percent = 76; current_input = 2.34; buck_current = 3.08
        buck_power = 38.1; voltage_input = 18.2; buck_voltage = 12.4; temperature = 31
        pwm = 96; fan = 1; enable_fan = 1; mode = 1; daily_energy = 126.4
        total_energy = 490700.2; buck_efficiency = 89.4; days_running = 18.2
        voltage_battery_min = 10.0; voltage_battery_max = 14.4; current_charging = 3.5; temperature_fan = 60
    }
    "ef-001" = @{
        humidity = 72; servo = $false; servoMoving = $false; led = $false; heater = $false
        heater_mode = $true; angle = 0.0; maxAngle = 300; brightness = 68
        humi_threshold = 70; heater_power = 50
    }
}
$roofTarget = 0.0
$servoTarget = 0.0

function Apply-Command([string]$device, $command) {
    $name = [string]$command.command
    if (-not $command.id -or $command.device -ne $device) { return New-Ack $device $command $false "invalid command envelope" }
    if ($Scenario -eq "negative-ack" -and -not $script:negativeAckSent) {
        $script:negativeAckSent = $true
        return New-Ack $device $command $false "simulated negative acknowledgement"
    }
    try {
        if ($device -eq "esp32-001") {
            switch ($name) {
                "mosfet" { $state[$device].mosfet = [bool]$command.state }
                "heater" { $state[$device].heater = [bool]$command.state }
                "heater_mode" { $state[$device].heater_mode = [bool]$command.enabled }
                "fan" { $state[$device].fan = [bool]$command.state }
                "fan_mode" { $state[$device].fan_mode = [bool]$command.enabled }
                "fan_threshold" { $state[$device].fan_threshold = [int]$command.value }
                "camera" { $state[$device].camera = [bool]$command.state }
                "camera_timer" { $state[$device].cameraDurationMinutes = [int]$command.minutes }
                "bluetooth" { $state[$device].bluetooth = [bool]$command.state }
                "motor_forward" { $script:roofTarget = 100.0; $state[$device].roof = "moving" }
                "motor_reverse" { $script:roofTarget = 0.0; $state[$device].roof = "moving" }
                "motor_stop" { $script:roofTarget = [double]$state[$device].roofPosition; $state[$device].roof = "unknown" }
                "onstep" { if (-not $state[$device].bluetooth) { throw "OnStep Bluetooth is not connected" } }
                "debug" { }
                "terminal" { }
                default { throw "unsupported command" }
            }
        } elseif ($device -eq "mppt-001") {
            switch ($name) {
                "fan" { $state[$device].fan = [int][bool]$command.fan }
                "enable_fan" { $state[$device].enable_fan = [int][bool]$command.enable_fan }
                "mode" { $state[$device].mode = [int]$command.mode }
                "voltage_battery_min" { $state[$device].voltage_battery_min = [double]$command.voltage_battery_min }
                "voltage_battery_max" { $state[$device].voltage_battery_max = [double]$command.voltage_battery_max }
                "current_charging" { $state[$device].current_charging = [double]$command.current_charging }
                "temperature_fan" { $state[$device].temperature_fan = [double]$command.temperature_fan }
                "settings" { foreach ($key in "voltage_battery_min", "voltage_battery_max", "current_charging", "temperature_fan") { $state[$device][$key] = [double]$command.$key } }
                "debug" { }
                "terminal" { }
                default { throw "unsupported command" }
            }
        } else {
            switch ($name) {
                "servo" { if ($null -ne $command.angle) { $state[$device].maxAngle = [double]$command.angle }; $script:servoTarget = if ([bool]$command.state) { [double]$state[$device].maxAngle } else { 0.0 }; $state[$device].servoMoving = $true }
                "led" { $state[$device].led = [bool]$command.state; if ($null -ne $command.brightness) { $state[$device].brightness = [int]$command.brightness } }
                "heater" { $state[$device].heater = [bool]$command.state; $state[$device].heater_mode = $false }
                "heater_mode" { $state[$device].heater_mode = [bool]$command.enabled }
                "brightness" { $state[$device].brightness = [int]$command.value }
                "humi_threshold" { $state[$device].humi_threshold = [int]$command.value }
                "angle" { $state[$device].maxAngle = [int]$command.value }
                "heater_power" { $state[$device].heater_power = [int]$command.value }
                "debug" { }
                "terminal" { }
                default { throw "unsupported command" }
            }
        }
        New-Ack $device $command $true
    } catch {
        New-Ack $device $command $false $_.Exception.Message
    }
}

function Process-Commands {
    foreach ($device in $subscribers.Keys) {
        $subscriber = $subscribers[$device]
        $acks = @()
        $lines = @(Get-Content -LiteralPath $subscriber.Output -ErrorAction SilentlyContinue)
        if ($lines.Count -le $subscriber.Offset) { continue }
        for ($index = $subscriber.Offset; $index -lt $lines.Count; $index++) {
            $line = $lines[$index].Trim()
            if (-not $line.StartsWith("{")) { continue }
            try {
                $command = $line | ConvertFrom-Json
                $ack = Apply-Command $device $command
                if ($ack.id) { $acks += $ack }
            } catch {
                Write-Warning "Ignored malformed $device command payload"
            }
        }
        $subscriber.Offset = $lines.Count
        if ($acks.Count) { Publish-MultiJson $device "reported" $acks }
    }
}

function Step-State {
    $phase = ((Get-Date) - $startedAt).TotalSeconds
    $state["esp32-001"].dht_temperature = [math]::Round(22.4 + [math]::Sin($phase / 20) * 1.2, 2)
    $state["esp32-001"].dht_humidity = [math]::Round(43 + [math]::Cos($phase / 24) * 3, 2)
    $state["mppt-001"].power_input = [math]::Round(42.6 + [math]::Sin($phase / 18) * 5, 3)
    $state["mppt-001"].buck_power = [math]::Round($state["mppt-001"].power_input * 0.894, 3)
    $state["ef-001"].humidity = [math]::Round($state["esp32-001"].dht_humidity, 1)
    $position = [double]$state["esp32-001"].roofPosition
    if ([math]::Abs($position - $roofTarget) -gt 0.01) {
        $position += [math]::Sign($roofTarget - $position) * [math]::Min(10, [math]::Abs($roofTarget - $position))
        $state["esp32-001"].roofPosition = $position
        $state["esp32-001"].roof = if ($position -eq 0) { "closed" } elseif ($position -eq 100) { "open" } else { "moving" }
    }
    $angle = [double]$state["ef-001"].angle
    if ([math]::Abs($angle - $servoTarget) -gt 0.01) {
        $angle += [math]::Sign($servoTarget - $angle) * [math]::Min(30, [math]::Abs($servoTarget - $angle))
        $state["ef-001"].angle = $angle
        $state["ef-001"].servoMoving = $angle -ne $servoTarget
        $state["ef-001"].servo = $angle -gt 0
    }
}

function Publish-AllTelemetry {
    foreach ($device in "esp32-001", "mppt-001", "ef-001") {
        $script:sequence++
        $payload = @{ schema = 1; device = $device; ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"); seq = $sequence }
        foreach ($key in $state[$device].Keys) { $payload[$key] = $state[$device][$key] }
        Publish-Json $device "telemetry" $payload
    }
}

$credentials = Resolve-Credentials
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
try {
    foreach ($device in "esp32-001", "mppt-001", "ef-001") {
        if ([string]::IsNullOrWhiteSpace($credentials[$device].username) -or [string]::IsNullOrWhiteSpace($credentials[$device].password)) { throw "Incomplete credentials for $device" }
        $options = New-MqttxOptions $device $credentials[$device]
        $subscribers[$device] = Start-DeviceSubscriber $device $options
    }
    Start-Sleep -Seconds 4
    foreach ($device in "esp32-001", "mppt-001", "ef-001") {
        Publish-Json $device "status" @{ schema = 1; device = $device; status = "online"; ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ") } -Retain
    }
    if ($ReadyFile) {
        $readyParent = Split-Path -Parent $ReadyFile
        if ($readyParent) { New-Item -ItemType Directory -Path $readyParent -Force | Out-Null }
        New-Item -ItemType File -Path $ReadyFile -Force | Out-Null
    }
    do {
        Process-Commands
        Step-State
        Publish-AllTelemetry
        Start-Sleep -Seconds $IntervalSeconds
    } while (($DurationSeconds -eq 0 -or ((Get-Date) - $startedAt).TotalSeconds -lt $DurationSeconds) -and (-not $StopFile -or -not (Test-Path -LiteralPath $StopFile)))
}
finally {
    foreach ($subscriber in $subscribers.Values) {
        if ($subscriber.Process -and -not $subscriber.Process.HasExited) { Stop-Process -Id $subscriber.Process.Id -Force -ErrorAction SilentlyContinue }
    }
    # ProcessStartInfo children can outlive the parent when MQTTX is waiting
    # in reconnect mode. Kill only this run's uniquely suffixed clients.
    try {
        Get-CimInstance Win32_Process -ErrorAction Stop |
            Where-Object { $_.Name -eq 'node.exe' -and [string]$_.CommandLine -like ('*mqttx-sim-' + $ControllerId + '-*' + $clientSuffix + '*') } |
            ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    } catch { }
    Start-Sleep -Milliseconds 500
    Remove-Item -LiteralPath $runtime -Recurse -Force -ErrorAction SilentlyContinue
    foreach ($device in $credentials.Keys) { $credentials[$device].password = $null }
}
