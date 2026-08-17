# ASTRA reliability controls

## Authentication rate limits

Rate-limit buckets are stored in PostgreSQL/SQLite as HMAC hashes; raw email
addresses, phone numbers and IP addresses are not written to the bucket table.
Defaults:

- login: 5 failures per account and 20 failures per source IP in 15 minutes;
- verification delivery: 5 per target and 20 per source IP per hour;
- verification checks: 10 per target and 30 per source IP in 15 minutes;
- each individual verification code is invalidated after 5 failed checks;
- the SMS gateway independently allows 5 sends per phone number per hour.

Override with `AUTH_LOGIN_FAILURE_LIMIT`, `AUTH_LOGIN_FAILURE_IP_LIMIT`,
`AUTH_LOGIN_FAILURE_WINDOW_SECONDS`, `AUTH_VERIFICATION_SEND_TARGET_LIMIT`,
`AUTH_VERIFICATION_SEND_IP_LIMIT`, `AUTH_VERIFICATION_SEND_WINDOW_SECONDS`,
`AUTH_VERIFICATION_CHECK_TARGET_LIMIT`, `AUTH_VERIFICATION_CHECK_IP_LIMIT`,
`AUTH_VERIFICATION_CHECK_WINDOW_SECONDS`, `SMS_SEND_LIMIT` and
`SMS_SEND_WINDOW_SECONDS`.

## Device reliability

- An enabled device with a previous heartbeat/telemetry timestamp is marked
  offline after `DEVICE_OFFLINE_SECONDS` (default 120 seconds).
- Offline and recovery events are persisted in `device_alerts` and emitted on
  the authenticated SSE stream. `GET /api/v1/alerts` returns alert history.
- Commands are persisted before publish and retain the exact MQTT payload.
- Missing or negative ACKs retry after `COMMAND_RETRY_SECONDS` (default 5), up
  to `COMMAND_MAX_ATTEMPTS` (default 3). Exhaustion changes the command to
  `failed` and emits an operational alert.

## Operational email alerts

SMTP uses the existing `SMTP_*` settings. Recipients are resolved in this
order:

1. comma-separated `ALERT_EMAIL_TO`;
2. `ADMIN_EMAIL`;
3. enabled administrator email addresses already stored in the users table.

Set `OPERATIONAL_EMAIL_ALERTS=0` only for isolated tests. Low disk backup
failures invoke the same alert module from the API container. The Aliyun PNVS
template remains verification-only and is deliberately not reused for system
alerts.

## MQTTX acceptance

```powershell
& "D:\h2o\remote astro\server\scripts\mqttx-firmware-sim.ps1"
& "D:\h2o\remote astro\server\scripts\mqttx-command-roundtrip.ps1"
```

The first script publishes online status and telemetry for all three devices.
The second verifies command delivery, reported ACKs, explicit disconnect and
reconnection using the same client IDs through `wss://mqtt.astroy.xyz/mqtt`.

## Linux Mosquitto ownership

Before the first formal Linux start, and after restoring a backup:

```bash
sudo ./scripts/prepare-mosquitto-permissions.sh
```

This sets the bind-mounted password and ACL files to the Mosquitto image
account (`1883:1883`). WSL/DrvFS ownership warnings are not a production
permission acceptance result.
