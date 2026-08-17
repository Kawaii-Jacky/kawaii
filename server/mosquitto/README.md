# Mosquitto identity and ACL setup

Copy `acl.conf` into the Mosquitto configuration directory and enable password
authentication. The password database is local to the server and must not be
checked into Git:

```bash
sudo mosquitto_passwd -c /etc/mosquitto/passwd mppt-001
sudo mosquitto_passwd    /etc/mosquitto/passwd esp32-001
sudo mosquitto_passwd    /etc/mosquitto/passwd ef-001
sudo mosquitto_passwd    /etc/mosquitto/passwd backend-controller
sudo chmod 600 /etc/mosquitto/passwd
```

Use four different strong passwords. Put the resulting values into the three
local, uncommitted firmware configuration files and the backend secret store:
`MPPT_MQTT_PASSWORD`, `DEVICE_MQTT_PASSWORD`, `MQTT_PASSWORD`, and the
backend's `backend-controller` password.

Add the following to `mosquitto.conf` (paths may differ in Docker):

```conf
allow_anonymous false
password_file /etc/mosquitto/passwd
acl_file /etc/mosquitto/acl.conf
per_listener_settings true
listener 1883
protocol mqtt
listener 9001
protocol websockets
```

The Cloudflare Tunnel should expose only the WebSocket listener (`9001`) at
`mqtt.astroy.xyz/mqtt`; keep the native MQTT listener private to the host or
Docker network. After changing ACLs, restart Mosquitto and verify each account
with MQTTX or `mosquitto_pub/sub`.

For Docker Compose, create the mounted password file from the host before starting the stack:

```powershell
docker run --rm -it -v "${PWD}\mosquitto:/mosquitto/config" eclipse-mosquitto:2 mosquitto_passwd -c /mosquitto/config/passwd mppt-001
docker run --rm -it -v "${PWD}\mosquitto:/mosquitto/config" eclipse-mosquitto:2 mosquitto_passwd /mosquitto/config/passwd esp32-001
docker run --rm -it -v "${PWD}\mosquitto:/mosquitto/config" eclipse-mosquitto:2 mosquitto_passwd /mosquitto/config/passwd ef-001
docker run --rm -it -v "${PWD}\mosquitto:/mosquitto/config" eclipse-mosquitto:2 mosquitto_passwd /mosquitto/config/passwd backend-controller

On the formal Linux host, set the bind-mounted authentication files to the
Mosquitto image UID/GID before the first start (and after restoring a backup):

```bash
sudo ./scripts/prepare-mosquitto-permissions.sh
```

The default image account is `1883:1883`. WSL files stored below `/mnt/c` or
`/mnt/d` may still report a harmless ownership warning because DrvFS does not
preserve Linux ownership in the same way; do not use that warning as the
production permission check.
```
