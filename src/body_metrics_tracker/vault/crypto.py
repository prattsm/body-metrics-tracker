from __future__ import annotations

import base64
import json
import secrets
from typing import Any
from uuid import UUID

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF

AAD_PREFIX = b"body-metrics-vault"
NONCE_BYTES = 12


class VaultCryptoError(RuntimeError):
    pass


def load_master_key(raw: str) -> bytes:
    if not raw:
        raise VaultCryptoError("VAULT_MASTER_KEY is required for persistent storage")
    for decoder in (base64.b64decode, bytes.fromhex):
        try:
            key = decoder(raw)
        except Exception:
            continue
        if len(key) == 32:
            return key
    raise VaultCryptoError("VAULT_MASTER_KEY must be 32 bytes (base64 or hex)")


def derive_user_key(master_key: bytes, user_id: UUID) -> bytes:
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=AAD_PREFIX + str(user_id).encode("utf-8"),
    )
    return hkdf.derive(master_key)


def encrypt_payload(payload: dict[str, Any], user_key: bytes) -> str:
    plaintext = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    nonce = secrets.token_bytes(NONCE_BYTES)
    ciphertext = AESGCM(user_key).encrypt(nonce, plaintext, AAD_PREFIX)
    return base64.b64encode(nonce + ciphertext).decode("ascii")


def decrypt_payload(blob: str, user_key: bytes) -> dict[str, Any]:
    raw = base64.b64decode(blob.encode("ascii"))
    if len(raw) <= NONCE_BYTES:
        raise VaultCryptoError("Encrypted payload is truncated")
    nonce = raw[:NONCE_BYTES]
    ciphertext = raw[NONCE_BYTES:]
    plaintext = AESGCM(user_key).decrypt(nonce, ciphertext, AAD_PREFIX)
    return json.loads(plaintext.decode("utf-8"))
