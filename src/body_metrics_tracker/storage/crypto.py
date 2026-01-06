from __future__ import annotations

import base64
import secrets
from typing import Any

from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

AAD = b"body-metrics-tracker"
DEFAULT_KDF_ITERATIONS = 310_000
SALT_BYTES = 16
NONCE_BYTES = 12


class StorageError(RuntimeError):
    pass


def _b64encode(raw: bytes) -> str:
    return base64.b64encode(raw).decode("ascii")


def _b64decode(value: str) -> bytes:
    return base64.b64decode(value.encode("ascii"))


def derive_key(passphrase: str, salt: bytes, iterations: int) -> bytes:
    if not passphrase:
        raise StorageError("Passphrase must not be empty")
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations,
    )
    return kdf.derive(passphrase.encode("utf-8"))


def encrypt_bytes(plaintext: bytes, passphrase: str, iterations: int = DEFAULT_KDF_ITERATIONS) -> dict[str, Any]:
    salt = secrets.token_bytes(SALT_BYTES)
    key = derive_key(passphrase, salt, iterations)
    nonce = secrets.token_bytes(NONCE_BYTES)
    ciphertext = AESGCM(key).encrypt(nonce, plaintext, AAD)
    return {
        "version": 1,
        "kdf": {
            "name": "pbkdf2-sha256",
            "salt": _b64encode(salt),
            "iterations": iterations,
        },
        "cipher": {
            "name": "aes-256-gcm",
            "nonce": _b64encode(nonce),
            "ciphertext": _b64encode(ciphertext),
        },
    }


def decrypt_bytes(container: dict[str, Any], passphrase: str) -> bytes:
    try:
        version = int(container["version"])
        kdf = container["kdf"]
        cipher = container["cipher"]
    except (KeyError, TypeError, ValueError) as exc:
        raise StorageError("Invalid encrypted container format") from exc

    if version != 1:
        raise StorageError(f"Unsupported container version: {version}")

    kdf_name = kdf.get("name")
    cipher_name = cipher.get("name")
    if kdf_name != "pbkdf2-sha256" or cipher_name != "aes-256-gcm":
        raise StorageError("Unsupported encryption parameters")

    try:
        salt = _b64decode(kdf["salt"])
        iterations = int(kdf["iterations"])
        nonce = _b64decode(cipher["nonce"])
        ciphertext = _b64decode(cipher["ciphertext"])
    except (KeyError, ValueError, TypeError) as exc:
        raise StorageError("Invalid encryption parameters") from exc

    key = derive_key(passphrase, salt, iterations)
    try:
        return AESGCM(key).decrypt(nonce, ciphertext, AAD)
    except InvalidTag as exc:
        raise StorageError("Incorrect passphrase or corrupted data") from exc

