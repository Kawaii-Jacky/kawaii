# ASTRA encrypted backups

The backup contains a PostgreSQL custom-format dump, the retained SQLite
migration source, Mosquitto password hashes, the Mosquitto ACL, and the
device-credential vault key. The vault key is included only inside the
passphrase-encrypted archive so encrypted credential rows remain usable after
a disaster recovery. The archive intentionally excludes `.env`, Cloudflare
credentials, and the plaintext controller configuration.

Run from WSL with a passphrase supplied only for the current shell:

```bash
cd '/mnt/d/h2o/remote astro/server'
read -s -p 'Backup passphrase: ' ASTROY_BACKUP_PASSPHRASE
export ASTROY_BACKUP_PASSPHRASE
echo
./scripts/backup.sh
unset ASTROY_BACKUP_PASSPHRASE
```

Test decryption into a temporary directory without changing the live system:

```bash
read -s -p 'Backup passphrase: ' ASTROY_BACKUP_PASSPHRASE
export ASTROY_BACKUP_PASSPHRASE
echo
./scripts/restore-backup.sh ./backups/<backup-file> /tmp/astroy-restore-test
unset ASTROY_BACKUP_PASSPHRASE
```

Store the passphrase in a password manager. Losing it makes the encrypted
backup unrecoverable. Keep an encrypted copy away from the host running ASTRA.

The live vault key is stored in the Docker `credential-vault` named volume,
not on the Windows/NTFS project directory where Linux mode `0600` cannot be
enforced reliably. It must never be committed to Git, copied into a release
package, placed in a normal database export, or stored next to an unencrypted
backup. Restoring the PostgreSQL dump without restoring the matching
`credential-vault.key` makes saved device credentials permanently unreadable.
Restore the key into `/run/astra-vault/credential-vault.key` in the admin
console volume, set mode `0600`, and restart the admin console. Delete the
temporary restore directory when verification is complete because it contains
sensitive backup material.

## Scheduled Windows backup

`scripts/backup-scheduled.ps1` reads a Windows DPAPI-protected credential,
creates an encrypted backup, performs a full restore test, and records only
non-secret status metadata in `backups/last-backup-status.json`. The credential
can only be decrypted by the Windows account that created it.

## Retention and disk-space policy

`backup.sh` keeps encrypted archives for `ASTROY_BACKUP_RETENTION_DAYS`
(default 14 days) and refuses to create a new archive when free space in the
backup filesystem is below `ASTROY_BACKUP_MIN_FREE_GB` (default 5 GB). The
result is written to `backups/last-backup-status.json`; low space is recorded
with `ok:false` and `reason:"low_disk_space"` for monitoring and alerting.

Low-space failures also call the API container's operational email notifier.
Set `ALERT_EMAIL_TO` to a comma-separated receiver list, or leave it unset to
use enabled administrator emails already stored in the database. SMTP must be
configured with the existing `SMTP_*` variables.

`scripts/start-astra-wsl.sh` installs `scripts/astroy.crontab` idempotently;
the default job runs at 03:00 every day and performs a PostgreSQL dump plus a
restore/integrity check before reporting success.
