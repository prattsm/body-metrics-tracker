from __future__ import annotations

from uuid import UUID
import re
import zlib

_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_BASE = len(_ALPHABET)
_GROUP_SIZE = 6
_CHECKSUM_DIGITS = 2
_SEPARATOR_RE = re.compile(r"[\s-]+")


def encode_friend_code(user_id: UUID) -> str:
    base = encode_friend_code_compact(user_id)
    return _format_code(base, None)


def encode_friend_code_compact(user_id: UUID) -> str:
    return _encode_base58(user_id.bytes)


def decode_friend_code(code: str) -> UUID:
    cleaned = code.strip()
    if not cleaned:
        raise ValueError("Empty friend code")
    try:
        return UUID(cleaned)
    except ValueError:
        pass
    base, checksum = _split_code(cleaned)
    if checksum is not None and checksum != _checksum(base):
        raise ValueError("Invalid friend code")
    return _decode_base58(base)


def _encode_base58(data: bytes) -> str:
    num = int.from_bytes(data, "big")
    if num == 0:
        return "1" * len(data)
    encoded = ""
    while num > 0:
        num, rem = divmod(num, _BASE)
        encoded = _ALPHABET[rem] + encoded
    padding = len(data) - len(data.lstrip(b"\0"))
    return "1" * padding + encoded


def _decode_base58(value: str) -> UUID:
    num = 0
    for char in value:
        try:
            digit = _ALPHABET.index(char)
        except ValueError as exc:
            raise ValueError("Invalid friend code") from exc
        num = num * _BASE + digit
    raw = num.to_bytes((num.bit_length() + 7) // 8, "big") if num else b""
    padding = len(value) - len(value.lstrip("1"))
    raw = b"\0" * padding + raw
    if len(raw) != 16:
        raise ValueError("Invalid friend code")
    return UUID(bytes=raw)


def _split_code(value: str) -> tuple[str, str | None]:
    has_separators = bool(_SEPARATOR_RE.search(value))
    parts = [part for part in _SEPARATOR_RE.split(value) if part]
    if not parts:
        raise ValueError("Invalid friend code")
    checksum = None
    if has_separators and len(parts) >= 2 and parts[-1].isdigit() and len(parts[-1]) == _CHECKSUM_DIGITS:
        checksum = parts.pop()
    base = "".join(parts)
    if not base:
        raise ValueError("Invalid friend code")
    return base, checksum


def _format_code(value: str, checksum: str | None) -> str:
    groups = [value[i : i + _GROUP_SIZE] for i in range(0, len(value), _GROUP_SIZE)]
    if checksum:
        groups.append(checksum)
    return "-".join(groups)


def _checksum(value: str) -> str:
    crc = zlib.crc32(value.encode("utf-8"))
    modulus = 10**_CHECKSUM_DIGITS
    return f"{crc % modulus:0{_CHECKSUM_DIGITS}d}"
