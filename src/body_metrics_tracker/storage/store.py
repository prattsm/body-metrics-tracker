from __future__ import annotations

import json
import os
import tempfile
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Iterable
from uuid import UUID

from body_metrics_tracker.core.models import AdminConfig, MeasurementEntry, UserProfile, utc_now

from .codec import (
    decode_admin_config,
    decode_entry,
    decode_profile,
    encode_admin_config,
    encode_entry,
    encode_profile,
)
from .crypto import StorageError, decrypt_bytes, encrypt_bytes

SCHEMA_VERSION = 1


@dataclass
class LocalStoreData:
    schema_version: int = SCHEMA_VERSION
    profiles: list[UserProfile] = field(default_factory=list)
    entries: list[MeasurementEntry] = field(default_factory=list)
    last_modified: datetime = field(default_factory=utc_now)
    active_profile_id: UUID | None = None
    admin_config: AdminConfig | None = None

    @classmethod
    def new(cls, profiles: Iterable[UserProfile] | None = None) -> "LocalStoreData":
        profile_list = list(profiles) if profiles else []
        active_profile_id = profile_list[0].user_id if profile_list else None
        return cls(
            profiles=profile_list,
            entries=[],
            last_modified=utc_now(),
            active_profile_id=active_profile_id,
        )

    def add_entry(self, entry: MeasurementEntry) -> None:
        self.entries.append(entry)
        self.last_modified = utc_now()

    def update_entry(self, entry: MeasurementEntry) -> bool:
        for idx, existing in enumerate(self.entries):
            if existing.entry_id == entry.entry_id:
                self.entries[idx] = entry
                self.last_modified = utc_now()
                return True
        return False

    def soft_delete_entry(self, entry_id: UUID, deleted_at: datetime | None = None) -> bool:
        for entry in self.entries:
            if entry.entry_id == entry_id:
                entry.is_deleted = True
                entry.deleted_at = deleted_at or utc_now()
                entry.updated_at = utc_now()
                entry.version += 1
                self.last_modified = utc_now()
                return True
        return False


class LocalStore:
    def __init__(self, path: Path) -> None:
        self.path = Path(path)

    def exists(self) -> bool:
        return self.path.exists()

    def initialize(self, passphrase: str, profile: UserProfile | None = None) -> LocalStoreData:
        data = LocalStoreData.new([profile] if profile else None)
        self.save(data, passphrase)
        return data

    def load(self, passphrase: str) -> LocalStoreData:
        if not self.path.exists():
            raise StorageError("Encrypted store not found")
        container = self._read_container()
        plaintext = decrypt_bytes(container, passphrase)
        try:
            payload = json.loads(plaintext.decode("utf-8"))
        except json.JSONDecodeError as exc:
            raise StorageError("Decrypted payload is not valid JSON") from exc
        return _deserialize_store(payload)

    def save(self, data: LocalStoreData, passphrase: str) -> None:
        payload = _serialize_store(data)
        plaintext = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
        container = encrypt_bytes(plaintext, passphrase)
        self._write_container(container)

    def _read_container(self) -> dict[str, Any]:
        try:
            with self.path.open("r", encoding="utf-8") as handle:
                return json.load(handle)
        except FileNotFoundError as exc:
            raise StorageError("Encrypted store not found") from exc
        except json.JSONDecodeError as exc:
            raise StorageError("Encrypted store is not valid JSON") from exc

    def _write_container(self, container: dict[str, Any]) -> None:
        serialized = json.dumps(container, indent=2, sort_keys=True)
        directory = self.path.parent
        directory.mkdir(parents=True, exist_ok=True)
        fd, tmp_path = tempfile.mkstemp(prefix=self.path.name, dir=directory)
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(serialized)
                handle.flush()
                os.fsync(handle.fileno())
            os.replace(tmp_path, self.path)
        finally:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)


def _serialize_store(data: LocalStoreData) -> dict[str, Any]:
    return {
        "schema_version": data.schema_version,
        "last_modified": data.last_modified.isoformat(),
        "profiles": [encode_profile(profile) for profile in data.profiles],
        "entries": [encode_entry(entry) for entry in data.entries],
        "active_profile_id": str(data.active_profile_id) if data.active_profile_id else None,
        "admin_config": encode_admin_config(data.admin_config) if data.admin_config else None,
    }


def _deserialize_store(payload: dict[str, Any]) -> LocalStoreData:
    try:
        version = int(payload["schema_version"])
    except (KeyError, ValueError, TypeError) as exc:
        raise StorageError("Missing or invalid schema version") from exc
    if version != SCHEMA_VERSION:
        raise StorageError(f"Unsupported schema version: {version}")

    try:
        last_modified = datetime.fromisoformat(payload["last_modified"])
    except (KeyError, ValueError, TypeError) as exc:
        raise StorageError("Missing or invalid last_modified") from exc

    profiles = [decode_profile(profile) for profile in payload.get("profiles", [])]
    entries = [decode_entry(entry) for entry in payload.get("entries", [])]
    active_profile = payload.get("active_profile_id")
    active_profile_id = UUID(active_profile) if active_profile else None
    if active_profile_id is None and profiles:
        active_profile_id = profiles[0].user_id
    admin_payload = payload.get("admin_config")
    admin_config = None
    if isinstance(admin_payload, dict):
        try:
            admin_config = decode_admin_config(admin_payload)
        except Exception:
            admin_config = None
    return LocalStoreData(
        schema_version=version,
        profiles=profiles,
        entries=entries,
        last_modified=last_modified,
        active_profile_id=active_profile_id,
        admin_config=admin_config,
    )
