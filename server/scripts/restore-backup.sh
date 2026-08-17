#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: ASTROY_BACKUP_PASSPHRASE=... $0 <backup.tar.gz.enc> <output-directory>" >&2
  exit 2
fi

PASSPHRASE="${ASTROY_BACKUP_PASSPHRASE:-}"
if [[ -z "$PASSPHRASE" ]]; then
  echo "ASTROY_BACKUP_PASSPHRASE is required." >&2
  exit 2
fi

BACKUP_FILE="$1"
OUTPUT_DIR="$2"
if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: $BACKUP_FILE" >&2
  exit 2
fi

umask 077
mkdir -p "$OUTPUT_DIR"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 \
  -pass env:ASTROY_BACKUP_PASSPHRASE -in "$BACKUP_FILE" | tar -xzf - -C "$OUTPUT_DIR"

echo "Backup decrypted into: $OUTPUT_DIR"
echo "Review manifest.txt before replacing any live files."
