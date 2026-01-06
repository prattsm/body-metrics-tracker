from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any
from uuid import UUID

from body_metrics_tracker.core.models import MeasurementEntry


def _encode_datetime(value: datetime) -> str:
    return value.isoformat()


def _decode_datetime(value: str) -> datetime:
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        raise ValueError("Timestamp must be timezone-aware")
    return dt


def _encode_date(value: date | None) -> str | None:
    return value.isoformat() if value else None


def _decode_date(value: str | None) -> date | None:
    if value is None:
        return None
    return date.fromisoformat(value)


@dataclass(frozen=True)
class InviteRequest:
    invite_token: str
    device_name: str
    user_id: UUID | None = None
    device_id: str | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "invite_token": self.invite_token,
            "device_name": self.device_name,
            "user_id": str(self.user_id) if self.user_id else None,
            "device_id": self.device_id,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "InviteRequest":
        return cls(
            invite_token=str(payload["invite_token"]),
            device_name=str(payload["device_name"]),
            user_id=UUID(payload["user_id"]) if payload.get("user_id") else None,
            device_id=payload.get("device_id"),
        )


@dataclass(frozen=True)
class InviteResponse:
    user_id: UUID
    user_token: str
    expires_at: datetime | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": str(self.user_id),
            "user_token": self.user_token,
            "expires_at": _encode_datetime(self.expires_at) if self.expires_at else None,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "InviteResponse":
        expires_at = payload.get("expires_at")
        return cls(
            user_id=UUID(payload["user_id"]),
            user_token=str(payload["user_token"]),
            expires_at=_decode_datetime(expires_at) if expires_at else None,
        )


@dataclass(frozen=True)
class SyncEntryChange:
    entry_id: UUID
    user_id: UUID
    measured_at: datetime
    date_local: date | None
    weight_kg: float
    waist_cm: float | None
    note: str | None
    created_at: datetime
    updated_at: datetime
    is_deleted: bool
    deleted_at: datetime | None
    version: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "entry_id": str(self.entry_id),
            "user_id": str(self.user_id),
            "measured_at": _encode_datetime(self.measured_at),
            "date_local": _encode_date(self.date_local),
            "weight_kg": self.weight_kg,
            "waist_cm": self.waist_cm,
            "note": self.note,
            "created_at": _encode_datetime(self.created_at),
            "updated_at": _encode_datetime(self.updated_at),
            "is_deleted": self.is_deleted,
            "deleted_at": _encode_datetime(self.deleted_at) if self.deleted_at else None,
            "version": self.version,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "SyncEntryChange":
        deleted_at = payload.get("deleted_at")
        return cls(
            entry_id=UUID(payload["entry_id"]),
            user_id=UUID(payload["user_id"]),
            measured_at=_decode_datetime(payload["measured_at"]),
            date_local=_decode_date(payload.get("date_local")),
            weight_kg=float(payload["weight_kg"]),
            waist_cm=float(payload["waist_cm"]) if payload.get("waist_cm") is not None else None,
            note=payload.get("note"),
            created_at=_decode_datetime(payload["created_at"]),
            updated_at=_decode_datetime(payload["updated_at"]),
            is_deleted=bool(payload.get("is_deleted", False)),
            deleted_at=_decode_datetime(deleted_at) if deleted_at else None,
            version=int(payload.get("version", 1)),
        )

    @classmethod
    def from_entry(cls, entry: MeasurementEntry) -> "SyncEntryChange":
        return cls(
            entry_id=entry.entry_id,
            user_id=entry.user_id,
            measured_at=entry.measured_at,
            date_local=entry.date_local,
            weight_kg=entry.weight_kg,
            waist_cm=entry.waist_cm,
            note=entry.note,
            created_at=entry.created_at,
            updated_at=entry.updated_at,
            is_deleted=entry.is_deleted,
            deleted_at=entry.deleted_at,
            version=entry.version,
        )

    def to_entry(self) -> MeasurementEntry:
        return MeasurementEntry(
            entry_id=self.entry_id,
            user_id=self.user_id,
            measured_at=self.measured_at,
            date_local=self.date_local,
            weight_kg=self.weight_kg,
            waist_cm=self.waist_cm,
            note=self.note,
            created_at=self.created_at,
            updated_at=self.updated_at,
            is_deleted=self.is_deleted,
            deleted_at=self.deleted_at,
            version=self.version,
        )


@dataclass(frozen=True)
class SyncPushRequest:
    user_id: UUID
    device_id: str
    since: datetime | None
    changes: list[SyncEntryChange]

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": str(self.user_id),
            "device_id": self.device_id,
            "since": _encode_datetime(self.since) if self.since else None,
            "changes": [change.to_dict() for change in self.changes],
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "SyncPushRequest":
        since = payload.get("since")
        return cls(
            user_id=UUID(payload["user_id"]),
            device_id=str(payload["device_id"]),
            since=_decode_datetime(since) if since else None,
            changes=[SyncEntryChange.from_dict(item) for item in payload.get("changes", [])],
        )


@dataclass(frozen=True)
class SyncPushResponse:
    server_time: datetime
    accepted_count: int
    next_since: datetime

    def to_dict(self) -> dict[str, Any]:
        return {
            "server_time": _encode_datetime(self.server_time),
            "accepted_count": self.accepted_count,
            "next_since": _encode_datetime(self.next_since),
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "SyncPushResponse":
        return cls(
            server_time=_decode_datetime(payload["server_time"]),
            accepted_count=int(payload.get("accepted_count", 0)),
            next_since=_decode_datetime(payload["next_since"]),
        )


@dataclass(frozen=True)
class SyncPullRequest:
    user_id: UUID
    device_id: str
    since: datetime | None

    def to_dict(self) -> dict[str, Any]:
        return {
            "user_id": str(self.user_id),
            "device_id": self.device_id,
            "since": _encode_datetime(self.since) if self.since else None,
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "SyncPullRequest":
        since = payload.get("since")
        return cls(
            user_id=UUID(payload["user_id"]),
            device_id=str(payload["device_id"]),
            since=_decode_datetime(since) if since else None,
        )


@dataclass(frozen=True)
class SyncPullResponse:
    server_time: datetime
    changes: list[SyncEntryChange]
    next_since: datetime

    def to_dict(self) -> dict[str, Any]:
        return {
            "server_time": _encode_datetime(self.server_time),
            "changes": [change.to_dict() for change in self.changes],
            "next_since": _encode_datetime(self.next_since),
        }

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "SyncPullResponse":
        return cls(
            server_time=_decode_datetime(payload["server_time"]),
            changes=[SyncEntryChange.from_dict(item) for item in payload.get("changes", [])],
            next_since=_decode_datetime(payload["next_since"]),
        )
