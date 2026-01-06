from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from .models import SyncEntryChange


@dataclass(frozen=True)
class VaultUserRecord:
    user_id: UUID
    token_hash: str
    created_at: datetime
    revoked_at: datetime | None = None


@dataclass(frozen=True)
class VaultDeviceRecord:
    device_id: str
    user_id: UUID
    device_name: str
    created_at: datetime
    last_seen_at: datetime | None = None


@dataclass(frozen=True)
class VaultInviteToken:
    token_hash: str
    created_at: datetime
    expires_at: datetime | None = None
    used_by_user: UUID | None = None


@dataclass(frozen=True)
class VaultEntryRecord:
    sequence_id: int
    entry: SyncEntryChange
    source_device_id: str
    received_at: datetime
