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
OUTPUT_DIR="$(cd "$OUTPUT_DIR" && pwd -P)"

# Do not hand an encrypted archive directly to tar.  A compromised or
# accidentally selected archive could contain ../ paths, absolute paths, or
# symlinks that escape the requested restore directory.  The small streaming
# extractor below accepts only regular files/directories and resolves every
# destination before writing it underneath OUTPUT_DIR.
DECRYPTED_ARCHIVE="$(mktemp)"
trap 'rm -f "$DECRYPTED_ARCHIVE"' EXIT
openssl enc -d -aes-256-cbc -pbkdf2 -iter 250000 \
  -pass env:ASTROY_BACKUP_PASSPHRASE -in "$BACKUP_FILE" -out "$DECRYPTED_ARCHIVE"
python3 - "$OUTPUT_DIR" "$DECRYPTED_ARCHIVE" <<'PY'
import os
import sys
import tarfile
from pathlib import Path, PurePosixPath

root = Path(sys.argv[1]).resolve()
archive_path = Path(sys.argv[2])
root.mkdir(parents=True, exist_ok=True)
seen = set()

def safe_target(name: str) -> Path:
    if not name or "\x00" in name:
        raise SystemExit("Backup contains an invalid path.")
    posix = PurePosixPath(name)
    if posix.is_absolute() or any(part == ".." for part in posix.parts):
        raise SystemExit("Backup contains a path outside the restore directory.")
    parts = [part for part in posix.parts if part not in ("", ".")]
    if not parts:
        return root
    target = (root.joinpath(*parts)).resolve()
    if target != root and root not in target.parents:
        raise SystemExit("Backup contains a path outside the restore directory.")
    return target

with tarfile.open(archive_path, mode="r:gz") as archive:
    for member in archive:
        target = safe_target(member.name)
        key = str(target)
        if key in seen:
            raise SystemExit("Backup contains duplicate archive entries.")
        seen.add(key)
        if member.isdir():
            target.mkdir(parents=True, exist_ok=True)
            continue
        if not member.isfile():
            raise SystemExit("Backup contains an unsupported link or special file.")
        target.parent.mkdir(parents=True, exist_ok=True)
        source = archive.extractfile(member)
        if source is None:
            raise SystemExit("Backup contains an unreadable file entry.")
        with target.open("wb") as destination:
            while True:
                block = source.read(1024 * 1024)
                if not block:
                    break
                destination.write(block)
        os.chmod(target, 0o600)
PY

echo "Backup decrypted into: $OUTPUT_DIR"
echo "Review manifest.txt before replacing any live files."
