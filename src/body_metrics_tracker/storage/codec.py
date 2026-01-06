from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID

from body_metrics_tracker.core.models import (
    FriendLink,
    LengthUnit,
    MeasurementEntry,
    SyncSettings,
    UserProfile,
    WeightUnit,
    utc_now,
)


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


def encode_sync_settings(settings: SyncSettings) -> dict[str, Any]:
    return {
        "enabled": settings.enabled,
        "vault_url": settings.vault_url,
        "user_token": settings.user_token,
        "device_id": settings.device_id,
        "device_name": settings.device_name,
        "vault_cert_path": settings.vault_cert_path,
        "allow_insecure_http": settings.allow_insecure_http,
        "auto_sync_enabled": settings.auto_sync_enabled,
        "auto_sync_interval_minutes": settings.auto_sync_interval_minutes,
        "last_sync_at": _encode_datetime(settings.last_sync_at) if settings.last_sync_at else None,
    }


def decode_sync_settings(payload: dict[str, Any]) -> SyncSettings:
    last_sync = payload.get("last_sync_at")
    interval = payload.get("auto_sync_interval_minutes")
    return SyncSettings(
        enabled=bool(payload.get("enabled", False)),
        vault_url=payload.get("vault_url"),
        user_token=payload.get("user_token"),
        device_id=payload.get("device_id"),
        device_name=payload.get("device_name"),
        vault_cert_path=payload.get("vault_cert_path"),
        allow_insecure_http=bool(payload.get("allow_insecure_http", False)),
        auto_sync_enabled=bool(payload.get("auto_sync_enabled", False)),
        auto_sync_interval_minutes=int(interval) if interval else 15,
        last_sync_at=_decode_datetime(last_sync) if last_sync else None,
    )


def encode_profile(profile: UserProfile) -> dict[str, Any]:
    weight_unit = profile.weight_unit
    if not isinstance(weight_unit, WeightUnit):
        weight_unit = WeightUnit(str(weight_unit))
    waist_unit = profile.waist_unit
    if not isinstance(waist_unit, LengthUnit):
        waist_unit = LengthUnit(str(waist_unit))
    return {
        "user_id": str(profile.user_id),
        "display_name": profile.display_name,
        "weight_unit": weight_unit.value,
        "waist_unit": waist_unit.value,
        "waist_convention_label": profile.waist_convention_label,
        "timezone": profile.timezone,
        "track_waist": profile.track_waist,
        "accent_color": profile.accent_color,
        "dark_mode": profile.dark_mode,
        "goal_weight_kg": profile.goal_weight_kg,
        "goal_weight_band_kg": profile.goal_weight_band_kg,
        "goal_waist_cm": profile.goal_waist_cm,
        "goal_waist_band_cm": profile.goal_waist_band_cm,
        "sync_settings": encode_sync_settings(profile.sync_settings),
        "friends": [encode_friend(friend) for friend in profile.friends],
    }


def decode_profile(payload: dict[str, Any]) -> UserProfile:
    return UserProfile(
        user_id=UUID(payload["user_id"]),
        display_name=payload.get("display_name", "User"),
        weight_unit=WeightUnit(payload.get("weight_unit", WeightUnit.LB.value)),
        waist_unit=LengthUnit(payload.get("waist_unit", LengthUnit.IN.value)),
        waist_convention_label=payload.get("waist_convention_label", "smallest point"),
        timezone=payload.get("timezone", "local"),
        track_waist=bool(payload.get("track_waist", False)),
        accent_color=payload.get("accent_color", "#4f8cf7"),
        dark_mode=bool(payload.get("dark_mode", False)),
        goal_weight_kg=payload.get("goal_weight_kg"),
        goal_weight_band_kg=payload.get("goal_weight_band_kg"),
        goal_waist_cm=payload.get("goal_waist_cm"),
        goal_waist_band_cm=payload.get("goal_waist_band_cm"),
        sync_settings=decode_sync_settings(payload.get("sync_settings", {})),
        friends=[decode_friend(item) for item in payload.get("friends", [])],
    )


def encode_friend(friend: FriendLink) -> dict[str, Any]:
    return {
        "friend_id": str(friend.friend_id),
        "display_name": friend.display_name,
        "status": friend.status,
        "created_at": _encode_datetime(friend.created_at),
    }


def decode_friend(payload: dict[str, Any]) -> FriendLink:
    created_at = payload.get("created_at")
    return FriendLink(
        friend_id=UUID(payload["friend_id"]),
        display_name=payload.get("display_name", "Friend"),
        status=payload.get("status", "invited"),
        created_at=_decode_datetime(created_at) if created_at else utc_now(),
    )


def encode_entry(entry: MeasurementEntry) -> dict[str, Any]:
    return {
        "entry_id": str(entry.entry_id),
        "user_id": str(entry.user_id),
        "measured_at": _encode_datetime(entry.measured_at),
        "date_local": _encode_date(entry.date_local),
        "weight_kg": entry.weight_kg,
        "waist_cm": entry.waist_cm,
        "note": entry.note,
        "created_at": _encode_datetime(entry.created_at),
        "updated_at": _encode_datetime(entry.updated_at),
        "is_deleted": entry.is_deleted,
        "deleted_at": _encode_datetime(entry.deleted_at) if entry.deleted_at else None,
        "version": entry.version,
    }


def decode_entry(payload: dict[str, Any]) -> MeasurementEntry:
    return MeasurementEntry(
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
        deleted_at=_decode_datetime(payload["deleted_at"]) if payload.get("deleted_at") else None,
        version=int(payload.get("version", 1)),
    )
