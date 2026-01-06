from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Optional

from PySide6.QtCore import QStandardPaths
from PySide6.QtWidgets import QMessageBox, QWidget

from body_metrics_tracker.core.models import LengthUnit, MeasurementEntry, UserProfile, WeightUnit, utc_now
from body_metrics_tracker.sync.models import SyncEntryChange
from body_metrics_tracker.storage import LocalStore, LocalStoreData, StorageError

from .dialogs import request_passphrase


@dataclass
class AppState:
    store: LocalStore
    data: LocalStoreData
    passphrase: str
    _listeners: list[Callable[[], None]] = field(default_factory=list, init=False)

    @property
    def profile(self) -> UserProfile:
        if not self.data.profiles:
            profile = UserProfile()
            self.data.profiles.append(profile)
            self.save()
        if self.data.active_profile_id is None:
            self.data.active_profile_id = self.data.profiles[0].user_id
            self.save()
        profile = self._profile_by_id(self.data.active_profile_id) or self.data.profiles[0]
        if profile.user_id != self.data.active_profile_id:
            self.data.active_profile_id = profile.user_id
            self.save()
        if not isinstance(profile.weight_unit, WeightUnit):
            profile.weight_unit = WeightUnit(str(profile.weight_unit))
        if not isinstance(profile.waist_unit, LengthUnit):
            profile.waist_unit = LengthUnit(str(profile.waist_unit))
        return profile

    @property
    def profiles(self) -> list[UserProfile]:
        return list(self.data.profiles)

    @property
    def entries(self) -> list[MeasurementEntry]:
        active_id = self.profile.user_id
        return [entry for entry in self.data.entries if entry.user_id == active_id]

    def entries_for_profile(self, user_id) -> list[MeasurementEntry]:
        return [entry for entry in self.data.entries if entry.user_id == user_id]

    def subscribe(self, callback: Callable[[], None]) -> None:
        self._listeners.append(callback)

    def _notify(self) -> None:
        for callback in list(self._listeners):
            callback()

    def add_entry(self, entry: MeasurementEntry) -> None:
        self.data.add_entry(entry)
        self.save()
        self._notify()

    def add_profile(self, profile: UserProfile) -> None:
        self.data.profiles.append(profile)
        self.data.active_profile_id = profile.user_id
        self.data.last_modified = utc_now()
        self.save()
        self._notify()

    def set_active_profile(self, user_id) -> None:
        if self.data.active_profile_id == user_id:
            return
        if not self._profile_by_id(user_id):
            return
        self.data.active_profile_id = user_id
        self.data.last_modified = utc_now()
        self.save()
        self._notify()

    def update_profile(self, profile: UserProfile) -> None:
        updated = False
        for idx, existing in enumerate(self.data.profiles):
            if existing.user_id == profile.user_id:
                self.data.profiles[idx] = profile
                updated = True
                break
        if not updated:
            self.data.profiles.append(profile)
        self.data.last_modified = utc_now()
        if self.data.active_profile_id is None:
            self.data.active_profile_id = profile.user_id
        self.save()
        self._notify()

    def update_entry(self, entry: MeasurementEntry) -> bool:
        updated = self.data.update_entry(entry)
        if updated:
            self.save()
            self._notify()
        return updated

    def soft_delete_entry(self, entry_id) -> bool:
        deleted = self.data.soft_delete_entry(entry_id)
        if deleted:
            self.save()
            self._notify()
        return deleted

    def entries_since(self, since, user_id=None) -> list[MeasurementEntry]:
        if user_id is None:
            user_id = self.profile.user_id
        if since is None:
            return [entry for entry in self.data.entries if entry.user_id == user_id]
        return [
            entry
            for entry in self.data.entries
            if entry.user_id == user_id and entry.updated_at > since
        ]

    def apply_remote_changes(self, changes: list[SyncEntryChange], user_id=None) -> int:
        if user_id is None:
            user_id = self.profile.user_id
        updated = 0
        for change in changes:
            entry = change.to_entry()
            if entry.user_id != user_id:
                continue
            existing = next(
                (item for item in self.data.entries if item.entry_id == entry.entry_id),
                None,
            )
            if existing and not _should_accept(existing, entry):
                continue
            if existing:
                index = self.data.entries.index(existing)
                self.data.entries[index] = entry
            else:
                self.data.entries.append(entry)
            updated += 1
        if updated:
            self.data.last_modified = utc_now()
            self.save()
            self._notify()
        return updated

    def save(self) -> None:
        self.store.save(self.data, self.passphrase)

    def _profile_by_id(self, user_id) -> Optional[UserProfile]:
        for profile in self.data.profiles:
            if profile.user_id == user_id:
                return profile
        return None


def _should_accept(existing: MeasurementEntry, incoming: MeasurementEntry) -> bool:
    if incoming.version > existing.version:
        return True
    if incoming.version < existing.version:
        return False
    return incoming.updated_at > existing.updated_at


def default_store_path() -> Path:
    location = QStandardPaths.writableLocation(QStandardPaths.AppDataLocation)
    if not location:
        base = Path.home() / ".body_metrics_tracker"
    else:
        base = Path(location)
    return base / "local_store.json"


def load_or_create_state(parent: QWidget | None = None) -> Optional[AppState]:
    store = LocalStore(default_store_path())
    if store.exists():
        while True:
            passphrase = request_passphrase(parent, mode="unlock")
            if passphrase is None:
                return None
            try:
                data = store.load(passphrase)
                if not data.profiles:
                    data.profiles.append(UserProfile())
                    store.save(data, passphrase)
                break
            except StorageError as exc:
                QMessageBox.warning(parent, "Unlock Failed", str(exc))
        return AppState(store=store, data=data, passphrase=passphrase)

    passphrase = request_passphrase(parent, mode="create")
    if passphrase is None:
        return None
    profile = UserProfile()
    data = store.initialize(passphrase, profile)
    return AppState(store=store, data=data, passphrase=passphrase)
