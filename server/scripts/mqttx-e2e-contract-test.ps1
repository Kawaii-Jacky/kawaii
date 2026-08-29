param(
    [string]$Broker = "mqtt.astroy.xyz",
    [int]$Port = 443,
    [ValidateSet("mqtt", "mqtts", "ws", "wss")][string]$Protocol = "wss",
    [string]$Path = "/mqtt",
    [string]$ControllerId = "default",
    [string]$CredentialFile = "",
    [switch]$AllowDefaultController,
    [switch]$StartSimulator
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$serverRoot = Split-Path -Parent $PSScriptRoot
$node = (Get-Command node -ErrorAction Stop).Source
$cli = Join-Path $env:APPDATA "npm\node_modules\mqttx-cli\bin\index.js"
$simulatorScript = Join-Path $PSScriptRoot "mqttx-full-device-sim.ps1"
if (-not (Test-Path -LiteralPath $cli)) { throw "MQTTX CLI is not installed for the current user" }
if ($ControllerId -eq "default" -and -not $AllowDefaultController) { throw "Use a dedicated test controller or pass -AllowDefaultController explicitly" }

$topicBase = if ($ControllerId -eq "default") { "devices" } else { "controllers/$ControllerId/devices" }
$runtime = Join-Path $env:TEMP "astra-mqttx-e2e-$([guid]::NewGuid().ToString('N'))"
$processes = @()
$publishers = @{}
$simulator = $null
$stopFile = Join-Path $runtime "stop"
$readyFile = Join-Path $runtime "sim.ready"
$clientSuffix = ([guid]::NewGuid().ToString('N')).Substring(0, 12)

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
        $config = [IO.File]::ReadAllText((Resolve-Path -LiteralPath $CredentialFile), (New-Object Text.UTF8Encoding($false))) | ConvertFrom-Json
        $deviceRows = @{}
        foreach ($item in @($config.devices)) { if ($item.device_id) { $deviceRows[[string]$item.device_id] = $item } }
        $backendConfig = if ($config.backend_controller) { $config.backend_controller } else { $config.backend }
        return @{
            backend = @{ username = [string]$backendConfig.username; password = [string]$backendConfig.password }
            'esp32-001' = @{ username = [string]$deviceRows['esp32-001'].username; password = [string]$deviceRows['esp32-001'].password }
            'mppt-001' = @{ username = [string]$deviceRows['mppt-001'].username; password = [string]$deviceRows['mppt-001'].password }
            'ef-001' = @{ username = [string]$deviceRows['ef-001'].username; password = [string]$deviceRows['ef-001'].password }
        }
        return @{
            backend = @{ username = [string]$(if ($config.backend_controller) { $config.backend_controller.username } else { $config.backend.username }); password = [string]$(if ($config.backend_controller) { $config.backend_controller.password } else { $config.backend.password }) }
            "esp32-001" = @{ username = [string]$config.devices.'esp32-001'.username; password = [string]$config.devices.'esp32-001'.password }
            "mppt-001" = @{ username = [string]$config.devices.'mppt-001'.username; password = [string]$config.devices.'mppt-001'.password }
            "ef-001" = @{ username = [string]$config.devices.'ef-001'.username; password = [string]$config.devices.'ef-001'.password }
        }
    }
    if ($ControllerId -ne "default") { throw "-CredentialFile is required for a non-default controller" }
    return @{
        backend = @{ username = "backend-controller"; password = Read-Env "MQTT_PASSWORD" }
        "esp32-001" = @{ username = "esp32-001"; password = Read-Macro "$projectRoot\loT\loT\device_config.h" "DEVICE_MQTT_PASSWORD" }
        "mppt-001" = @{ username = "mppt-001"; password = Read-Macro "$projectRoot\ESP32_MPPT\mppt_config.h" "MPPT_MQTT_PASSWORD" }
        "ef-001" = @{ username = "ef-001"; password = Read-Macro "$projectRoot\EF\config.h" "MQTT_PASSWORD" }
    }
}

function New-Options([string]$name, [hashtable]$credential) {
    $file = Join-Path $runtime "$name.options.json"
    $common = @{
        hostname = $Broker; port = $Port; protocol = $Protocol; path = $Path; mqttVersion = 4
        username = $credential.username; password = $credential.password; maximumReconnectTimes = 3; reconnectPeriod = 1000
    }
    $json = @{ pub = $common; sub = $common } | ConvertTo-Json -Depth 5
    [IO.File]::WriteAllText($file, $json, (New-Object Text.UTF8Encoding($false)))
    $file
}

function Publish([string]$options, [string]$topic, [hashtable]$body) {
    $payload = $body | ConvertTo-Json -Compress -Depth 8
    $arguments = @($cli, "pub", "--load-options", $options, "-V", "3.1.1", "-i", "mqttx-e2e-$([guid]::NewGuid().ToString('N').Substring(0,12))", "-t", $topic, "-q", "1", "-s", "--maximum-reconnect-times", "2")
    $startInfo = New-Object Diagnostics.ProcessStartInfo
    $startInfo.FileName = $node
    $startInfo.Arguments = (($arguments | ForEach-Object { '"' + ([string]$_).Replace('"', '\"') + '"' }) -join " ")
    $startInfo.UseShellExecute = $false; $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardInput = $true; $startInfo.RedirectStandardOutput = $true; $startInfo.RedirectStandardError = $true
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $startInfo
    [void]$process.Start()
    $process.StandardInput.Write($payload); $process.StandardInput.Close()
    if (-not $process.WaitForExit(15000)) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        throw "MQTTX publish timed out for $topic"
    }
    $output = ($process.StandardOutput.ReadToEnd(), $process.StandardError.ReadToEnd()) -join "`n"
    $exitCode = $process.ExitCode
    if ($exitCode -ne 0 -or $output -match 'Not authorized|Connection refused|\bError:') {
        $safeOutput = (($output -split "`r?`n" | Select-Object -Last 3) -join " | ")
        throw "MQTTX publish failed for $topic ($safeOutput)"
    }
}

function Publish-Batch([string]$options, [string]$topic, [object[]]$bodies) {
    if (-not $bodies -or $bodies.Count -eq 0) { return }
    $payload = (($bodies | ForEach-Object { $_ | ConvertTo-Json -Compress -Depth 8 }) -join "`n")
    $arguments = @($cli, "pub", "--load-options", $options, "-V", "3.1.1", "-i", "mqttx-e2e-batch-$clientSuffix", "-t", $topic, "-q", "1", "-s", "-M", "--maximum-reconnect-times", "2")
    $previous = $ErrorActionPreference
    $ErrorActionPreference = "Continue"
    $output = @($payload | & $node @arguments 2>&1)
    $exitCode = $LASTEXITCODE
    $ErrorActionPreference = $previous
    $message = $output -join "`n"
    if ($exitCode -ne 0 -or $message -match 'Not authorized|Connection refused|\bError:') {
        throw "MQTTX batch publish failed for $topic"
    }
}

function Try-Publish([string]$options, [string]$topic, [hashtable]$body) {
    try { Publish $options $topic $body; return $true } catch { return $false }
}

function Start-Publisher([string]$options, [string]$topic, [string]$label) {
    $startInfo = New-Object Diagnostics.ProcessStartInfo
    $startInfo.FileName = $node
    # -lm relies on an interactive TTY and drops lines when stdin is a
    # redirected Windows pipe.  -s -M is the documented piped multiline mode
    # and queues every line until the WSS connection is ready.
    $arguments = @($cli, "pub", "--load-options", $options, "-V", "3.1.1", "-i", "mqttx-e2e-$label-$clientSuffix", "-t", $topic, "-q", "1", "-s", "-M", "--maximum-reconnect-times", "0")
    $startInfo.Arguments = (($arguments | ForEach-Object { '"' + ([string]$_).Replace('"', '\"') + '"' }) -join " ")
    $startInfo.UseShellExecute = $false; $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardInput = $true; $startInfo.RedirectStandardOutput = $true; $startInfo.RedirectStandardError = $true
    $process = New-Object Diagnostics.Process; $process.StartInfo = $startInfo; [void]$process.Start()
    $script:processes += $process
    Start-Sleep -Seconds 2
    if ($process.HasExited) { throw "MQTTX long-lived publisher failed for $topic" }
    $process
}

function Send-Publisher($publisher, [hashtable]$body) {
    $publisher.StandardInput.WriteLine(($body | ConvertTo-Json -Compress -Depth 8))
    $publisher.StandardInput.Flush()
}

function Stop-Publisher($publisher) {
    if (-not $publisher -or $publisher.HasExited) { return }
    $publisher.StandardInput.Close()
    if (-not $publisher.WaitForExit(45000)) { Stop-Process -Id $publisher.Id -Force -ErrorAction SilentlyContinue; throw "MQTTX multiline publisher timed out" }
    try { $null = $publisher.StandardOutput.ReadToEnd(); $null = $publisher.StandardError.ReadToEnd() } catch { }
}

function Start-Subscriber([string]$options, [string[]]$topics, [string]$label) {
    $stdout = Join-Path $runtime "$label.out"
    $stderr = Join-Path $runtime "$label.err"
    New-Item -ItemType File -Path $stdout -Force | Out-Null
    New-Item -ItemType File -Path $stderr -Force | Out-Null
    # Keep MQTTX's default subscriber format so payloads remain one-line JSON.
    # --output-mode clean is a multi-line packet dump and is not suitable for
    # the line-oriented ACK/telemetry assertions below.
    $arguments = @($cli, "sub", "--load-options", $options, "-V", "3.1.1", "-i", "mqttx-e2e-$label-$clientSuffix", "-q", "1")
    foreach ($topic in $topics) { $arguments += @("-t", $topic) }
    $process = Start-Process -FilePath $node -ArgumentList $arguments -RedirectStandardOutput $stdout -RedirectStandardError $stderr -PassThru -WindowStyle Hidden
    $script:processes += $process
    @{ Process = $process; Output = $stdout; Error = $stderr }
}

function Wait-ForText([string]$file, [string]$pattern, [int]$timeoutSeconds = 30) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    do {
        $text = Get-Content -LiteralPath $file -Raw -ErrorAction SilentlyContinue
        if ($text -match $pattern) { return $text }
        Start-Sleep -Milliseconds 300
    } while ((Get-Date) -lt $deadline)
    throw "Timed out waiting for MQTTX output pattern: $pattern"
}

function Start-SimulatorProcess {
    Remove-Item -LiteralPath $stopFile -Force -ErrorAction SilentlyContinue
    $quotedSimulator = '"' + $simulatorScript + '"'
    $args = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $quotedSimulator, "-Broker", $Broker, "-Port", $Port, "-Protocol", $Protocol, "-ControllerId", $ControllerId, "-IntervalSeconds", "2", "-StopFile", $stopFile, "-ReadyFile", $readyFile)
    if (-not [string]::IsNullOrWhiteSpace($Path)) { $args += @("-Path", $Path) }
    if ($CredentialFile) { $args += @("-CredentialFile", ('"' + (Resolve-Path -LiteralPath $CredentialFile).Path + '"')) }
    $args += @("-ClientSuffix", $clientSuffix)
    if ($AllowDefaultController) { $args += "-AllowDefaultController" }
    Start-Process -FilePath "powershell.exe" -ArgumentList $args -PassThru -WindowStyle Hidden
}

function Stop-SimulatorChildren {
    # A simulator can be blocked in a reconnecting MQTTX process when the
    # parent receives the stop request.  Kill only processes carrying this
    # run's unique suffix so an interrupted test cannot leave clients behind
    # or touch another operator's MQTTX session.
    try {
        Get-CimInstance Win32_Process -ErrorAction Stop |
            Where-Object { $_.Name -eq "node.exe" -and [string]$_.CommandLine -like "*mqttx-sim-$ControllerId-*$clientSuffix*" } |
            ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    } catch { }
}

function Stop-SimulatorProcess($process) {
    if ($process -and -not $process.HasExited) {
        New-Item -ItemType File -Path $stopFile -Force | Out-Null
        if (-not $process.WaitForExit(15000)) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue }
    }
    Stop-SimulatorChildren
}

function Wait-ForFile([string]$file, [System.Diagnostics.Process]$process, [int]$timeoutSeconds = 60) {
    $deadline = (Get-Date).AddSeconds($timeoutSeconds)
    do {
        if (Test-Path -LiteralPath $file) { return }
        if ($process -and $process.HasExited) { throw "MQTTX simulator exited before becoming ready" }
        Start-Sleep -Milliseconds 300
    } while ((Get-Date) -lt $deadline)
    throw "Timed out waiting for MQTTX simulator readiness"
}

function Command-Payload([string]$device, [string]$command, [hashtable]$commandArgs) {
    $payload = @{ schema = 1; id = [guid]::NewGuid().ToString(); device = $device; ts = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss.fffZ"); command = $command }
    foreach ($key in $commandArgs.Keys) { $payload[$key] = $commandArgs[$key] }
    $payload
}

$commands = @(
    @{ d="esp32-001"; c="mosfet"; a=@{state=1} },
    @{ d="esp32-001"; c="heater_mode"; a=@{enabled=$false} },
    @{ d="esp32-001"; c="heater"; a=@{state=$true} },
    @{ d="esp32-001"; c="fan_mode"; a=@{enabled=$false} },
    @{ d="esp32-001"; c="fan"; a=@{state=$true} },
    @{ d="esp32-001"; c="fan_threshold"; a=@{value=45} },
    @{ d="esp32-001"; c="camera_timer"; a=@{minutes=180} },
    @{ d="esp32-001"; c="camera"; a=@{state=$true} },
    @{ d="esp32-001"; c="bluetooth"; a=@{state=$true} },
    @{ d="esp32-001"; c="onstep"; a=@{action=1} },
    @{ d="esp32-001"; c="motor_forward"; a=@{} },
    @{ d="esp32-001"; c="motor_stop"; a=@{} },
    @{ d="esp32-001"; c="motor_reverse"; a=@{} },
    @{ d="esp32-001"; c="debug"; a=@{} },
    @{ d="esp32-001"; c="terminal"; a=@{value="HELP"} },
    @{ d="mppt-001"; c="fan"; a=@{fan=$true} },
    @{ d="mppt-001"; c="enable_fan"; a=@{enable_fan=$true} },
    @{ d="mppt-001"; c="mode"; a=@{mode=1} },
    @{ d="mppt-001"; c="voltage_battery_min"; a=@{voltage_battery_min=10.0} },
    @{ d="mppt-001"; c="voltage_battery_max"; a=@{voltage_battery_max=14.4} },
    @{ d="mppt-001"; c="current_charging"; a=@{current_charging=3.5} },
    @{ d="mppt-001"; c="temperature_fan"; a=@{temperature_fan=60} },
    @{ d="mppt-001"; c="settings"; a=@{voltage_battery_min=10.0;voltage_battery_max=14.4;current_charging=3.5;temperature_fan=60} },
    @{ d="mppt-001"; c="debug"; a=@{debug=$true} },
    @{ d="mppt-001"; c="terminal"; a=@{value="STATUS"} },
    @{ d="ef-001"; c="servo"; a=@{state=$true;angle=120} },
    @{ d="ef-001"; c="led"; a=@{state=$true;brightness=50} },
    @{ d="ef-001"; c="heater"; a=@{state=$true} },
    @{ d="ef-001"; c="heater_mode"; a=@{enabled=$true} },
    @{ d="ef-001"; c="brightness"; a=@{value=68} },
    @{ d="ef-001"; c="humi_threshold"; a=@{value=70} },
    @{ d="ef-001"; c="angle"; a=@{value=300} },
    @{ d="ef-001"; c="heater_power"; a=@{value=50} },
    @{ d="ef-001"; c="debug"; a=@{} },
    @{ d="ef-001"; c="terminal"; a=@{value="STATUS"} }
)

$credentials = Resolve-Credentials
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
try {
    $options = @{}
    foreach ($name in $credentials.Keys) {
        if ([string]::IsNullOrWhiteSpace($credentials[$name].username) -or [string]::IsNullOrWhiteSpace($credentials[$name].password)) { throw "Incomplete credentials for $name" }
        $options[$name] = New-Options $name $credentials[$name]
    }
    $reported = Start-Subscriber $options.backend @("$topicBase/+/reported") "reported"
    $status = Start-Subscriber $options.backend @("$topicBase/+/status") "status"
    $telemetry = Start-Subscriber $options.backend @("$topicBase/+/telemetry") "telemetry"
    if ($StartSimulator) {
        $simulator = Start-SimulatorProcess
        Wait-ForFile $readyFile $simulator 90
    }
    $expected = @{}
    $batches = @{
        "esp32-001" = @()
        "mppt-001" = @()
        "ef-001" = @()
    }
    foreach ($entry in $commands) {
        $payload = Command-Payload $entry.d $entry.c $entry.a
        $expected[$payload.id] = @{ device=$entry.d; command=$entry.c }
        $batches[$entry.d] += $payload
    }
    foreach ($device in "esp32-001", "mppt-001", "ef-001") {
        Publish-Batch $options.backend "$topicBase/$device/command" $batches[$device]
    }
    # The simulator publishes through MQTTX over WSS and batches ACKs per
    # device; allow the initial TLS/MQTT handshakes and three device batches
    # to complete on a slower CI/WSL host.
    $deadline = (Get-Date).AddSeconds(120)
    do {
        $lines = @(Get-Content -LiteralPath $reported.Output -ErrorAction SilentlyContinue)
        $acks = @{}
        foreach ($line in $lines) {
            try { $item = $line | ConvertFrom-Json; if ($item.id) { $acks[[string]$item.id] = $item } } catch { }
        }
        if (($expected.Keys | Where-Object { -not $acks.ContainsKey($_) }).Count -eq 0) { break }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    $missing = @($expected.Keys | Where-Object { -not $acks.ContainsKey($_) })
    if ($missing.Count) { throw "Missing $($missing.Count) command acknowledgements" }
    foreach ($id in $expected.Keys) {
        $ack = $acks[$id]; $want = $expected[$id]
        if ($ack.device -ne $want.device -or $ack.command -ne $want.command -or $ack.ok -ne $true) { throw "Invalid ACK for $($want.device)/$($want.command)" }
    }

    $invalid = Command-Payload "esp32-001" "unsupported" @{}
    Publish-Batch $options.backend "$topicBase/esp32-001/command" @($invalid)
    $negativeText = Wait-ForText $reported.Output ('"id":"' + [regex]::Escape($invalid.id) + '"') 120
    $negativeLine = @($negativeText -split "`r?`n" | Where-Object { $_ -match [regex]::Escape($invalid.id) })[-1] | ConvertFrom-Json
    if ($negativeLine.ok -ne $false) { throw "Unsupported command did not return a negative ACK" }

    # Prove cross-device and backend write ACLs by looking for unique markers
    # on an authorized backend subscription. A denied publisher may not receive
    # an MQTT 3.1.1 error, so absence at the authorized observer is authoritative.
    $crossMarker = "acl-cross-$([guid]::NewGuid().ToString('N'))"
    Publish $options.'esp32-001' "$topicBase/mppt-001/telemetry" @{ device="mppt-001"; power_input=1; marker=$crossMarker }
    $crossPublished = $true
    $backendMarker = "acl-backend-$([guid]::NewGuid().ToString('N'))"
    Publish $options.backend "$topicBase/ef-001/telemetry" @{ device="ef-001"; humidity=50; marker=$backendMarker }
    $backendPublished = $true
    Start-Sleep -Seconds 3
    $telemetryText = Get-Content -LiteralPath $telemetry.Output -Raw -ErrorAction SilentlyContinue
    if ($crossPublished -and $telemetryText -match [regex]::Escape($crossMarker)) { throw "MQTT ACL allowed a cross-device telemetry publish" }
    if ($backendPublished -and $telemetryText -match [regex]::Escape($backendMarker)) { throw "MQTT ACL allowed a backend telemetry publish" }

    if ($StartSimulator) {
        Stop-SimulatorProcess $simulator
        $simulator = $null
        foreach ($device in "esp32-001", "mppt-001", "ef-001") {
            $offlinePattern = '(?:"device":"' + [regex]::Escape($device) + '"[^\r\n]*"status":"offline"|"status":"offline"[^\r\n]*"device":"' + [regex]::Escape($device) + '")'
            Wait-ForText $status.Output $offlinePattern 20 | Out-Null
        }
        Remove-Item -LiteralPath $stopFile -Force -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $readyFile -Force -ErrorAction SilentlyContinue
        $simulator = Start-SimulatorProcess
        Wait-ForFile $readyFile $simulator 90
        foreach ($device in "esp32-001", "mppt-001", "ef-001") {
            $onlinePattern = '(?:"device":"' + [regex]::Escape($device) + '"[^\r\n]*"status":"online"|"status":"online"[^\r\n]*"device":"' + [regex]::Escape($device) + '")'
            Wait-ForText $status.Output $onlinePattern 20 | Out-Null
        }
    }
    Write-Output "MQTTX E2E passed: $($commands.Count) commands, correlated ACKs, negative ACK, ACL write isolation, offline LWT, and reconnect."
}
finally {
    Stop-SimulatorProcess $simulator
    foreach ($publisher in $publishers.Values) { Stop-Publisher $publisher }
    foreach ($process in $processes) { if ($process -and -not $process.HasExited) { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } }
    Remove-Item -LiteralPath $runtime -Recurse -Force -ErrorAction SilentlyContinue
    foreach ($entry in $credentials.Values) { $entry.password = $null }
}
