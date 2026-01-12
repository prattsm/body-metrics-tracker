from __future__ import annotations

import base64
import json
from uuid import UUID

LINK_CODE_PREFIX = "bmtlink:v1:"


def encode_link_code(user_id: UUID) -> str:
    payload = {"user_id": str(user_id)}
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    encoded = base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")
    return f"{LINK_CODE_PREFIX}{encoded}"


def decode_link_code(value: str) -> UUID:
    if not value:
        raise ValueError("Missing link code")
    text = value.strip()
    if text.startswith(LINK_CODE_PREFIX):
        text = text[len(LINK_CODE_PREFIX) :]
    if text.startswith("{"):
        payload = json.loads(text)
    else:
        padding = "=" * (-len(text) % 4)
        raw = base64.urlsafe_b64decode(text + padding)
        payload = json.loads(raw.decode("utf-8"))
    user_id = payload.get("user_id")
    if not user_id:
        raise ValueError("Link code missing user_id")
    return UUID(user_id)
