from __future__ import annotations

from uuid import UUID

_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_BASE = len(_ALPHABET)


def encode_friend_code(user_id: UUID) -> str:
    data = user_id.bytes
    num = int.from_bytes(data, "big")
    if num == 0:
        return "1" * len(data)
    encoded = ""
    while num > 0:
        num, rem = divmod(num, _BASE)
        encoded = _ALPHABET[rem] + encoded
    padding = len(data) - len(data.lstrip(b"\0"))
    return "1" * padding + encoded


def decode_friend_code(code: str) -> UUID:
    cleaned = code.strip()
    if not cleaned:
        raise ValueError("Empty friend code")
    try:
        return UUID(cleaned)
    except ValueError:
        pass
    num = 0
    for char in cleaned:
        try:
            value = _ALPHABET.index(char)
        except ValueError as exc:
            raise ValueError("Invalid friend code") from exc
        num = num * _BASE + value
    raw = num.to_bytes((num.bit_length() + 7) // 8, "big") if num else b""
    padding = len(cleaned) - len(cleaned.lstrip("1"))
    raw = b"\0" * padding + raw
    if len(raw) != 16:
        raise ValueError("Invalid friend code")
    return UUID(bytes=raw)
