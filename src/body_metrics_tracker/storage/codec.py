from __future__ import annotations

from datetime import date, datetime
from typing import Any
from uuid import UUID, uuid4

from body_metrics_tracker.core.models import (
    FriendLink,
    LengthUnit,
    MeasurementEntry,
    ReminderRule,
    SharedEntry,
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
        "avatar_b64": profile.avatar_b64,
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
        "friends": [encode_friend(friend) for friend in profile.friends],
        "relay_url": profile.relay_url,
        "relay_token": profile.relay_token,
        "relay_last_checked_at": _encode_datetime(profile.relay_last_checked_at)
        if profile.relay_last_checked_at
        else None,
        "relay_last_history_pull_at": _encode_datetime(profile.relay_last_history_pull_at)
        if profile.relay_last_history_pull_at
        else None,
        "relay_last_history_push_at": _encode_datetime(profile.relay_last_history_push_at)
        if profile.relay_last_history_push_at
        else None,
        "last_reminder_seen_at": _encode_datetime(profile.last_reminder_seen_at)
        if profile.last_reminder_seen_at
        else None,
        "self_reminders": [encode_reminder(rule) for rule in profile.self_reminders],
    }


def decode_profile(payload: dict[str, Any]) -> UserProfile:
    reminders_payload = payload.get("self_reminders")
    if isinstance(reminders_payload, list):
        reminders = [decode_reminder(rule) for rule in reminders_payload]
    else:
        reminders = _legacy_reminders(payload)
    return UserProfile(
        user_id=UUID(payload["user_id"]),
        display_name=payload.get("display_name", "User"),
        avatar_b64=payload.get("avatar_b64"),
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
        friends=[decode_friend(item) for item in payload.get("friends", [])],
        relay_url=payload.get("relay_url"),
        relay_token=payload.get("relay_token"),
        relay_last_checked_at=_decode_datetime(payload.get("relay_last_checked_at"))
        if payload.get("relay_last_checked_at")
        else None,
        relay_last_history_pull_at=_decode_datetime(payload.get("relay_last_history_pull_at"))
        if payload.get("relay_last_history_pull_at")
        else None,
        relay_last_history_push_at=_decode_datetime(payload.get("relay_last_history_push_at"))
        if payload.get("relay_last_history_push_at")
        else None,
        last_reminder_seen_at=_decode_datetime(payload.get("last_reminder_seen_at"))
        if payload.get("last_reminder_seen_at")
        else None,
        self_reminders=reminders,
    )


def encode_reminder(rule: ReminderRule) -> dict[str, Any]:
    return {
        "reminder_id": str(rule.reminder_id),
        "message": rule.message,
        "time": rule.time,
        "days": list(rule.days),
        "enabled": rule.enabled,
        "last_sent_at": _encode_datetime(rule.last_sent_at) if rule.last_sent_at else None,
        "last_seen_at": _encode_datetime(rule.last_seen_at) if rule.last_seen_at else None,
    }


def decode_reminder(payload: dict[str, Any]) -> ReminderRule:
    reminder_id = payload.get("reminder_id")
    try:
        reminder_uuid = UUID(reminder_id) if reminder_id else uuid4()
    except (TypeError, ValueError):
        reminder_uuid = uuid4()
    last_sent_at = payload.get("last_sent_at")
    last_seen_at = payload.get("last_seen_at")
    return ReminderRule(
        reminder_id=reminder_uuid,
        message=payload.get("message", "Time to log your weight today."),
        time=payload.get("time", "08:00"),
        days=list(payload.get("days", [0, 1, 2, 3, 4, 5, 6])),
        enabled=bool(payload.get("enabled", True)),
        last_sent_at=_decode_datetime(last_sent_at) if last_sent_at else None,
        last_seen_at=_decode_datetime(last_seen_at) if last_seen_at else None,
    )


def _legacy_reminders(payload: dict[str, Any]) -> list[ReminderRule]:
    if not payload.get("self_reminder_enabled"):
        return []
    return [
        ReminderRule(
            message=payload.get("self_reminder_message", "Time to log your weight today."),
            time=payload.get("self_reminder_time", "08:00"),
            days=list(payload.get("self_reminder_days", [0, 1, 2, 3, 4, 5, 6])),
            enabled=bool(payload.get("self_reminder_enabled", False)),
            last_sent_at=_decode_datetime(payload.get("self_reminder_last_sent_at"))
            if payload.get("self_reminder_last_sent_at")
            else None,
            last_seen_at=_decode_datetime(payload.get("self_reminder_last_seen_at"))
            if payload.get("self_reminder_last_seen_at")
            else None,
        )
    ]


def encode_friend(friend: FriendLink) -> dict[str, Any]:
    return {
        "friend_id": str(friend.friend_id),
        "display_name": friend.display_name,
        "status": friend.status,
        "name_overridden": friend.name_overridden,
        "avatar_b64": friend.avatar_b64,
        "received_share_weight": friend.received_share_weight,
        "received_share_waist": friend.received_share_waist,
        "share_weight": friend.share_weight,
        "share_waist": friend.share_waist,
        "shared_entries": [encode_shared_entry(entry) for entry in friend.shared_entries],
        "last_shared_at": _encode_datetime(friend.last_shared_at) if friend.last_shared_at else None,
        "last_entry_date": _encode_date(friend.last_entry_date),
        "last_entry_logged_today": friend.last_entry_logged_today,
        "last_weight_kg": friend.last_weight_kg,
        "last_waist_cm": friend.last_waist_cm,
        "last_reminder_at": _encode_datetime(friend.last_reminder_at) if friend.last_reminder_at else None,
        "last_reminder_message": friend.last_reminder_message,
        "created_at": _encode_datetime(friend.created_at),
    }


def decode_friend(payload: dict[str, Any]) -> FriendLink:
    created_at = payload.get("created_at")
    status = payload.get("status", "invited")
    if status == "pending":
        status = "invited"
    if status == "accepted":
        status = "connected"
    last_shared_at = payload.get("last_shared_at")
    last_reminder_at = payload.get("last_reminder_at")
    return FriendLink(
        friend_id=UUID(payload["friend_id"]),
        display_name=payload.get("display_name", "Friend"),
        status=status,
        name_overridden=bool(payload.get("name_overridden", False)),
        avatar_b64=payload.get("avatar_b64"),
        received_share_weight=bool(payload.get("received_share_weight", False)),
        received_share_waist=bool(payload.get("received_share_waist", False)),
        share_weight=bool(payload.get("share_weight", False)),
        share_waist=bool(payload.get("share_waist", False)),
        shared_entries=[decode_shared_entry(item) for item in payload.get("shared_entries", [])],
        last_shared_at=_decode_datetime(last_shared_at) if last_shared_at else None,
        last_entry_date=_decode_date(payload.get("last_entry_date")),
        last_entry_logged_today=payload.get("last_entry_logged_today"),
        last_weight_kg=payload.get("last_weight_kg"),
        last_waist_cm=payload.get("last_waist_cm"),
        last_reminder_at=_decode_datetime(last_reminder_at) if last_reminder_at else None,
        last_reminder_message=payload.get("last_reminder_message"),
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


def encode_shared_entry(entry: SharedEntry) -> dict[str, Any]:
    return {
        "entry_id": str(entry.entry_id),
        "measured_at": _encode_datetime(entry.measured_at),
        "date_local": _encode_date(entry.date_local),
        "weight_kg": entry.weight_kg,
        "waist_cm": entry.waist_cm,
        "updated_at": _encode_datetime(entry.updated_at),
        "is_deleted": entry.is_deleted,
    }


def decode_shared_entry(payload: dict[str, Any]) -> SharedEntry:
    return SharedEntry(
        entry_id=UUID(payload["entry_id"]),
        measured_at=_decode_datetime(payload["measured_at"]),
        date_local=_decode_date(payload.get("date_local")),
        weight_kg=payload.get("weight_kg"),
        waist_cm=payload.get("waist_cm"),
        updated_at=_decode_datetime(payload["updated_at"]),
        is_deleted=bool(payload.get("is_deleted", False)),
    )


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
