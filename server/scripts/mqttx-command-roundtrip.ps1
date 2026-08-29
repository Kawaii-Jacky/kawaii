param(
    [string]$Broker = "mqtt.astroy.xyz",
    [int]$Port = 443,
    [ValidateSet("mqtt", "mqtts", "ws", "wss")][string]$Protocol = "wss",
    [string]$Path = "/mqtt",
    [string]$ControllerId = "default",
    [string]$CredentialFile = "",
    [switch]$AllowDefaultController
)

# Compatibility entry point. The comprehensive test now lives in
# mqttx-e2e-contract-test.ps1 and covers every frontend command, correlated
# ACKs, a negative ACK, ACL write isolation, offline LWT, and reconnect.
$script = Join-Path $PSScriptRoot "mqttx-e2e-contract-test.ps1"
$arguments = @{
    Broker = $Broker
    Port = $Port
    Protocol = $Protocol
    Path = $Path
    ControllerId = $ControllerId
    CredentialFile = $CredentialFile
    StartSimulator = $true
}
if ($AllowDefaultController) { $arguments.AllowDefaultController = $true }
& $script @arguments
