#!/usr/bin/env bash
set -euo pipefail

PASSPHRASE_FILE="${ASTROY_BACKUP_PASSPHRASE_FILE:-/root/.astroy-backup-passphrase}"
IFS= read -r PASSPHRASE
if [[ ${#PASSPHRASE} -lt 24 ]]; then
  echo "ASTRA backup passphrase must contain at least 24 characters." >&2
  exit 2
fi

umask 077
printf '%s' "$PASSPHRASE" > "$PASSPHRASE_FILE"
chmod 600 "$PASSPHRASE_FILE"
unset PASSPHRASE
echo "ASTRA backup credential installed with root-only permissions."
