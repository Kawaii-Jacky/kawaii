"""Encrypted storage for controller and device MQTT credentials."""
from __future__ import annotations

import base64
import json
import os
import secrets
import uuid
from pathlib import Path
from typing import Any

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


CREDENTIAL_VAULT_KEY_FILE = Path(os.getenv("CREDENTIAL_VAULT_KEY_FILE", "/run/astra-vault/credential-vault.key"))


def credential_vault_key() -> bytes:
    CREDENTIAL_VAULT_KEY_FILE.parent.mkdir(parents=True, exist_ok=True)
    if not CREDENTIAL_VAULT_KEY_FILE.exists():
        temporary = CREDENTIAL_VAULT_KEY_FILE.with_name(f".{CREDENTIAL_VAULT_KEY_FILE.name}.{uuid.uuid4().hex}.tmp")
        try:
            temporary.write_text(base64.urlsafe_b64encode(secrets.token_bytes(32)).decode("ascii") + "\n", encoding="ascii")
            temporary.chmod(0o600)
            temporary.replace(CREDENTIAL_VAULT_KEY_FILE)
        finally:
            temporary.unlink(missing_ok=True)
    try:
        key = base64.urlsafe_b64decode(CREDENTIAL_VAULT_KEY_FILE.read_text(encoding="ascii").strip())
    except (OSError, ValueError) as exc:
        raise RuntimeError("Credential vault key file is invalid") from exc
    if len(key) != 32:
        raise RuntimeError("Credential vault key must contain exactly 32 bytes")
    return key


def encrypt_controller_credentials(controller_id: str, credentials: dict[str, Any]) -> tuple[str, str]:
    nonce = secrets.token_bytes(12)
    plaintext = json.dumps(credentials, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    associated_data = f"astra-controller-credentials:{controller_id}:v1".encode("utf-8")
    ciphertext = AESGCM(credential_vault_key()).encrypt(nonce, plaintext, associated_data)
    return (
        base64.urlsafe_b64encode(nonce).decode("ascii"),
        base64.urlsafe_b64encode(ciphertext).decode("ascii"),
    )


def decrypt_controller_credentials(controller_id: str, nonce_text: str, ciphertext_text: str) -> dict[str, Any]:
    try:
        nonce = base64.urlsafe_b64decode(nonce_text)
        ciphertext = base64.urlsafe_b64decode(ciphertext_text)
        associated_data = f"astra-controller-credentials:{controller_id}:v1".encode("utf-8")
        plaintext = AESGCM(credential_vault_key()).decrypt(nonce, ciphertext, associated_data)
        document = json.loads(plaintext.decode("utf-8"))
    except Exception as exc:
        raise RuntimeError("Stored controller credentials cannot be decrypted") from exc
    if not isinstance(document, dict) or not isinstance(document.get("devices"), list):
        raise RuntimeError("Stored controller credentials have an invalid structure")
    return document
