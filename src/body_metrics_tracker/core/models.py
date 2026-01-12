from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from enum import Enum
from uuid import UUID, uuid4


class WeightUnit(str, Enum):
    KG = "kg"
    LB = "lb"


class LengthUnit(str, Enum):
    CM = "cm"
    IN = "in"


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class UserProfile:
    user_id: UUID = field(default_factory=uuid4)
    display_name: str = "User"
    avatar_b64: str | None = None
    weight_unit: WeightUnit = WeightUnit.LB
    waist_unit: LengthUnit = LengthUnit.IN
    waist_convention_label: str = "smallest point"
    timezone: str = "local"
    track_waist: bool = False
    accent_color: str = "#4f8cf7"
    dark_mode: bool = False
    goal_weight_kg: float | None = None
    goal_weight_band_kg: float | None = None
    goal_waist_cm: float | None = None
    goal_waist_band_cm: float | None = None
    friends: list["FriendLink"] = field(default_factory=list)
    relay_url: str | None = None
    relay_token: str | None = None
    relay_last_checked_at: datetime | None = None
    relay_last_history_pull_at: datetime | None = None
    relay_last_history_push_at: datetime | None = None
    relay_last_self_history_pull_at: datetime | None = None
    relay_last_reminder_sync_at: datetime | None = None
    settings_updated_at: datetime | None = None
    last_reminder_seen_at: datetime | None = None
    self_reminders: list["ReminderRule"] = field(default_factory=list)


@dataclass
class ReminderRule:
    reminder_id: UUID = field(default_factory=uuid4)
    message: str = "Time to log your weight today."
    time: str = "08:00"
    days: list[int] = field(default_factory=lambda: [0, 1, 2, 3, 4, 5, 6])
    enabled: bool = True
    last_sent_at: datetime | None = None
    last_seen_at: datetime | None = None
    updated_at: datetime = field(default_factory=utc_now)
    is_deleted: bool = False
    deleted_at: datetime | None = None


@dataclass
class SharedEntry:
    entry_id: UUID
    measured_at: datetime
    weight_kg: float | None
    waist_cm: float | None
    updated_at: datetime
    date_local: date | None = None
    is_deleted: bool = False

    def __post_init__(self) -> None:
        if self.measured_at.tzinfo is None:
            raise ValueError("measured_at must be timezone-aware")
        if self.updated_at.tzinfo is None:
            raise ValueError("updated_at must be timezone-aware")
        if self.date_local is None:
            self.date_local = self.measured_at.date()


@dataclass
class FriendLink:
    friend_id: UUID
    display_name: str
    status: str = "invited"
    name_overridden: bool = False
    avatar_b64: str | None = None
    received_share_weight: bool = False
    received_share_waist: bool = False
    share_weight: bool = False
    share_waist: bool = False
    shared_entries: list[SharedEntry] = field(default_factory=list)
    last_shared_at: datetime | None = None
    last_entry_date: date | None = None
    last_entry_logged_today: bool | None = None
    last_weight_kg: float | None = None
    last_waist_cm: float | None = None
    last_reminder_at: datetime | None = None
    last_reminder_message: str | None = None
    created_at: datetime = field(default_factory=utc_now)


@dataclass
class MeasurementEntry:
    user_id: UUID
    measured_at: datetime
    weight_kg: float
    waist_cm: float | None
    entry_id: UUID = field(default_factory=uuid4)
    note: str | None = None
    created_at: datetime = field(default_factory=utc_now)
    updated_at: datetime = field(default_factory=utc_now)
    is_deleted: bool = False
    deleted_at: datetime | None = None
    version: int = 1
    date_local: date | None = None

    def __post_init__(self) -> None:
        if self.measured_at.tzinfo is None:
            raise ValueError("measured_at must be timezone-aware")
        if self.date_local is None:
            self.date_local = self.measured_at.date()
