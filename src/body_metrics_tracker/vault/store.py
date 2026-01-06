from __future__ import annotations

import hashlib
import os
import secrets
import sqlite3
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from uuid import UUID

from body_metrics_tracker.sync.models import SyncEntryChange

from .crypto import VaultCryptoError, decrypt_payload, derive_user_key, encrypt_payload, load_master_key

SCHEMA_VERSION = 1


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def parse_dt(value: str) -> datetime:
    dt = datetime.fromisoformat(value)
    if dt.tzinfo is None:
        raise ValueError("Timestamp must be timezone-aware")
    return dt


class VaultBackend:
    def load_invites_from_env(self) -> None:
        raise NotImplementedError

    def ensure_user(self, user_id: UUID) -> None:
        raise NotImplementedError

    def record_device(self, user_id: UUID, device_id: str, device_name: str | None) -> None:
        raise NotImplementedError

    def touch_device(self, user_id: UUID, device_id: str) -> None:
        raise NotImplementedError

    def consume_invite(self, invite_token: str) -> None:
        raise NotImplementedError

    def issue_user_token(self, user_id: UUID) -> str:
        raise NotImplementedError

    def authenticate(self, user_token: str) -> UUID:
        raise NotImplementedError

    def apply_changes(self, user_id: UUID, changes: Iterable[SyncEntryChange], source_device_id: str) -> int:
        raise NotImplementedError

    def changes_since(self, user_id: UUID, since: datetime | None) -> list[SyncEntryChange]:
        raise NotImplementedError

    def list_users(self) -> list[dict[str, str | int | None]]:
        raise NotImplementedError

    def list_devices(self) -> list[dict[str, str | None]]:
        raise NotImplementedError

    def count_entries(self) -> int:
        raise NotImplementedError

    def create_invite_token(self, expires_at: datetime | None = None) -> str:
        raise NotImplementedError

    def list_invites(self) -> list[dict[str, str | None]]:
        raise NotImplementedError


@dataclass
class InMemoryVaultStore(VaultBackend):
    invites: dict[str, dict[str, datetime | None]] = field(default_factory=dict)
    user_tokens: dict[str, UUID] = field(default_factory=dict)
    entries: dict[UUID, dict[UUID, SyncEntryChange]] = field(default_factory=dict)
    users: dict[UUID, dict[str, datetime | None]] = field(default_factory=dict)
    devices: dict[str, dict[str, str | UUID | datetime | None]] = field(default_factory=dict)

    def load_invites_from_env(self) -> None:
        raw = os.getenv("VAULT_INVITE_TOKENS", "")
        for token in [item.strip() for item in raw.split(",") if item.strip()]:
            token_hash = hash_token(token)
            if token_hash not in self.invites:
                self.invites[token_hash] = {
                    "created_at": utc_now(),
                    "used_at": None,
                    "expires_at": None,
                }

    def ensure_user(self, user_id: UUID) -> None:
        if user_id not in self.users:
            self.users[user_id] = {
                "created_at": utc_now(),
                "last_seen_at": None,
            }

    def record_device(self, user_id: UUID, device_id: str, device_name: str | None) -> None:
        self.ensure_user(user_id)
        now = utc_now()
        existing = self.devices.get(device_id)
        if existing:
            if device_name:
                existing["device_name"] = device_name
            existing["last_seen_at"] = now
        else:
            self.devices[device_id] = {
                "user_id": user_id,
                "device_name": device_name,
                "created_at": now,
                "last_seen_at": now,
            }
        self.users[user_id]["last_seen_at"] = now

    def touch_device(self, user_id: UUID, device_id: str) -> None:
        self.record_device(user_id, device_id, None)

    def consume_invite(self, invite_token: str) -> None:
        token_hash = hash_token(invite_token)
        info = self.invites.get(token_hash)
        if not info:
            raise VaultAuthError("Invalid invite token")
        if info.get("used_at"):
            raise VaultAuthError("Invite token already used")
        expires_at = info.get("expires_at")
        if expires_at and expires_at < utc_now():
            raise VaultAuthError("Invite token expired")
        info["used_at"] = utc_now()

    def issue_user_token(self, user_id: UUID) -> str:
        token = os.urandom(32).hex()
        self.user_tokens[hash_token(token)] = user_id
        return token

    def authenticate(self, user_token: str) -> UUID:
        token_hash = hash_token(user_token)
        user_id = self.user_tokens.get(token_hash)
        if not user_id:
            raise VaultAuthError("Invalid user token")
        return user_id

    def apply_changes(self, user_id: UUID, changes: Iterable[SyncEntryChange], source_device_id: str) -> int:
        self.ensure_user(user_id)
        if source_device_id:
            self.touch_device(user_id, source_device_id)
        accepted = 0
        user_entries = self.entries.setdefault(user_id, {})
        for change in changes:
            existing = user_entries.get(change.entry_id)
            if existing and not should_accept(existing, change):
                continue
            user_entries[change.entry_id] = change
            accepted += 1
        return accepted

    def changes_since(self, user_id: UUID, since: datetime | None) -> list[SyncEntryChange]:
        user_entries = self.entries.get(user_id, {})
        if since is None:
            return list(user_entries.values())
        return [entry for entry in user_entries.values() if entry.updated_at > since]

    def list_users(self) -> list[dict[str, str | int | None]]:
        results: list[dict[str, str | int | None]] = []
        for user_id, info in self.users.items():
            device_count = sum(1 for device in self.devices.values() if device["user_id"] == user_id)
            entry_count = len(self.entries.get(user_id, {}))
            results.append(
                {
                    "user_id": str(user_id),
                    "created_at": info["created_at"].isoformat(),
                    "last_seen_at": info["last_seen_at"].isoformat() if info["last_seen_at"] else None,
                    "device_count": device_count,
                    "entry_count": entry_count,
                }
            )
        return results

    def list_devices(self) -> list[dict[str, str | None]]:
        results: list[dict[str, str | None]] = []
        for device_id, info in self.devices.items():
            results.append(
                {
                    "device_id": device_id,
                    "user_id": str(info["user_id"]),
                    "device_name": info.get("device_name"),
                    "created_at": info["created_at"].isoformat(),
                    "last_seen_at": info["last_seen_at"].isoformat() if info.get("last_seen_at") else None,
                }
            )
        return results

    def count_entries(self) -> int:
        return sum(len(entries) for entries in self.entries.values())

    def create_invite_token(self, expires_at: datetime | None = None) -> str:
        token = secrets.token_urlsafe(16)
        self.invites[hash_token(token)] = {
            "created_at": utc_now(),
            "used_at": None,
            "expires_at": expires_at,
        }
        return token

    def list_invites(self) -> list[dict[str, str | None]]:
        results = []
        for token_hash, info in self.invites.items():
            results.append(
                {
                    "token_hash": token_hash,
                    "created_at": info["created_at"].isoformat() if info.get("created_at") else None,
                    "used_at": info["used_at"].isoformat() if info.get("used_at") else None,
                    "expires_at": info["expires_at"].isoformat() if info.get("expires_at") else None,
                }
            )
        results.sort(key=lambda item: item.get("created_at") or "", reverse=True)
        return results


@dataclass
class SqliteVaultStore(VaultBackend):
    path: Path
    master_key: bytes

    def __post_init__(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self) -> None:
        with self._connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS meta (
                    key TEXT PRIMARY KEY,
                    value TEXT NOT NULL
                );
                CREATE TABLE IF NOT EXISTS invites (
                    token_hash TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    expires_at TEXT,
                    used_at TEXT
                );
                CREATE TABLE IF NOT EXISTS user_tokens (
                    token_hash TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    revoked_at TEXT
                );
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    created_at TEXT NOT NULL,
                    last_seen_at TEXT
                );
                CREATE TABLE IF NOT EXISTS devices (
                    device_id TEXT PRIMARY KEY,
                    user_id TEXT NOT NULL,
                    device_name TEXT,
                    created_at TEXT NOT NULL,
                    last_seen_at TEXT
                );
                CREATE TABLE IF NOT EXISTS entries (
                    user_id TEXT NOT NULL,
                    entry_id TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    version INTEGER NOT NULL,
                    payload TEXT NOT NULL,
                    received_at TEXT NOT NULL,
                    source_device_id TEXT NOT NULL,
                    PRIMARY KEY (user_id, entry_id)
                );
                CREATE INDEX IF NOT EXISTS idx_devices_user
                    ON devices(user_id);
                CREATE INDEX IF NOT EXISTS idx_entries_user_updated
                    ON entries(user_id, updated_at);
                """
            )
            conn.execute(
                "INSERT OR IGNORE INTO meta(key, value) VALUES(?, ?)",
                ("schema_version", str(SCHEMA_VERSION)),
            )

    def load_invites_from_env(self) -> None:
        raw = os.getenv("VAULT_INVITE_TOKENS", "")
        tokens = [item.strip() for item in raw.split(",") if item.strip()]
        if not tokens:
            return
        now = utc_now().isoformat()
        with self._connect() as conn:
            for token in tokens:
                conn.execute(
                    "INSERT OR IGNORE INTO invites(token_hash, created_at) VALUES(?, ?)",
                    (hash_token(token), now),
                )

    def ensure_user(self, user_id: UUID) -> None:
        with self._connect() as conn:
            conn.execute(
                "INSERT OR IGNORE INTO users(user_id, created_at) VALUES(?, ?)",
                (str(user_id), utc_now().isoformat()),
            )

    def record_device(self, user_id: UUID, device_id: str, device_name: str | None) -> None:
        self.ensure_user(user_id)
        now = utc_now().isoformat()
        with self._connect() as conn:
            conn.execute(
                """
                INSERT INTO devices(device_id, user_id, device_name, created_at, last_seen_at)
                VALUES(?, ?, ?, ?, ?)
                ON CONFLICT(device_id) DO UPDATE SET
                    user_id=excluded.user_id,
                    device_name=COALESCE(excluded.device_name, devices.device_name),
                    last_seen_at=excluded.last_seen_at
                """,
                (device_id, str(user_id), device_name, now, now),
            )
            conn.execute(
                "UPDATE users SET last_seen_at = ? WHERE user_id = ?",
                (now, str(user_id)),
            )

    def touch_device(self, user_id: UUID, device_id: str) -> None:
        self.record_device(user_id, device_id, None)

    def consume_invite(self, invite_token: str) -> None:
        token_hash = hash_token(invite_token)
        with self._connect() as conn:
            row = conn.execute(
                "SELECT token_hash, used_at, expires_at FROM invites WHERE token_hash = ?",
                (token_hash,),
            ).fetchone()
            if not row:
                raise VaultAuthError("Invalid invite token")
            if row["used_at"]:
                raise VaultAuthError("Invite token already used")
            if row["expires_at"]:
                expires = parse_dt(row["expires_at"])
                if expires < utc_now():
                    raise VaultAuthError("Invite token expired")
            conn.execute(
                "UPDATE invites SET used_at = ? WHERE token_hash = ?",
                (utc_now().isoformat(), token_hash),
            )

    def issue_user_token(self, user_id: UUID) -> str:
        token = os.urandom(32).hex()
        token_hash = hash_token(token)
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO user_tokens(token_hash, user_id, created_at) VALUES(?, ?, ?)",
                (token_hash, str(user_id), utc_now().isoformat()),
            )
        return token

    def authenticate(self, user_token: str) -> UUID:
        token_hash = hash_token(user_token)
        with self._connect() as conn:
            row = conn.execute(
                "SELECT user_id, revoked_at FROM user_tokens WHERE token_hash = ?",
                (token_hash,),
            ).fetchone()
            if not row:
                raise VaultAuthError("Invalid user token")
            if row["revoked_at"]:
                raise VaultAuthError("User token revoked")
            return UUID(row["user_id"])

    def apply_changes(self, user_id: UUID, changes: Iterable[SyncEntryChange], source_device_id: str) -> int:
        self.ensure_user(user_id)
        if source_device_id:
            self.touch_device(user_id, source_device_id)
        accepted = 0
        user_key = derive_user_key(self.master_key, user_id)
        with self._connect() as conn:
            for change in changes:
                row = conn.execute(
                    "SELECT version, updated_at FROM entries WHERE user_id = ? AND entry_id = ?",
                    (str(user_id), str(change.entry_id)),
                ).fetchone()
                if row:
                    existing_version = int(row["version"])
                    existing_updated_at = parse_dt(row["updated_at"])
                    if not should_accept_version(existing_version, existing_updated_at, change):
                        continue
                payload = encrypt_payload(change.to_dict(), user_key)
                conn.execute(
                    """
                    INSERT INTO entries(
                        user_id, entry_id, updated_at, version, payload, received_at, source_device_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(user_id, entry_id)
                    DO UPDATE SET
                        updated_at=excluded.updated_at,
                        version=excluded.version,
                        payload=excluded.payload,
                        received_at=excluded.received_at,
                        source_device_id=excluded.source_device_id
                    """,
                    (
                        str(user_id),
                        str(change.entry_id),
                        change.updated_at.isoformat(),
                        change.version,
                        payload,
                        utc_now().isoformat(),
                        source_device_id,
                    ),
                )
                accepted += 1
        return accepted

    def changes_since(self, user_id: UUID, since: datetime | None) -> list[SyncEntryChange]:
        user_key = derive_user_key(self.master_key, user_id)
        query = "SELECT payload FROM entries WHERE user_id = ?"
        params: tuple[str, ...] | tuple[str, str]
        if since is not None:
            query += " AND updated_at > ?"
            params = (str(user_id), since.isoformat())
        else:
            params = (str(user_id),)
        query += " ORDER BY updated_at ASC"
        with self._connect() as conn:
            rows = conn.execute(query, params).fetchall()
        changes = []
        for row in rows:
            payload = decrypt_payload(row["payload"], user_key)
            changes.append(SyncEntryChange.from_dict(payload))
        return changes

    def list_users(self) -> list[dict[str, str | int | None]]:
        query = """
            SELECT
                u.user_id,
                u.created_at,
                u.last_seen_at,
                (SELECT COUNT(*) FROM devices d WHERE d.user_id = u.user_id) AS device_count,
                (SELECT COUNT(*) FROM entries e WHERE e.user_id = u.user_id) AS entry_count
            FROM users u
            ORDER BY u.created_at ASC
        """
        with self._connect() as conn:
            rows = conn.execute(query).fetchall()
        return [
            {
                "user_id": row["user_id"],
                "created_at": row["created_at"],
                "last_seen_at": row["last_seen_at"],
                "device_count": int(row["device_count"]),
                "entry_count": int(row["entry_count"]),
            }
            for row in rows
        ]

    def list_devices(self) -> list[dict[str, str | None]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT device_id, user_id, device_name, created_at, last_seen_at FROM devices ORDER BY created_at ASC"
            ).fetchall()
        return [
            {
                "device_id": row["device_id"],
                "user_id": row["user_id"],
                "device_name": row["device_name"],
                "created_at": row["created_at"],
                "last_seen_at": row["last_seen_at"],
            }
            for row in rows
        ]

    def count_entries(self) -> int:
        with self._connect() as conn:
            row = conn.execute("SELECT COUNT(*) AS total FROM entries").fetchone()
        return int(row["total"]) if row else 0

    def create_invite_token(self, expires_at: datetime | None = None) -> str:
        token = secrets.token_urlsafe(16)
        token_hash = hash_token(token)
        with self._connect() as conn:
            conn.execute(
                "INSERT INTO invites(token_hash, created_at, expires_at) VALUES(?, ?, ?)",
                (
                    token_hash,
                    utc_now().isoformat(),
                    expires_at.isoformat() if expires_at else None,
                ),
            )
        return token

    def list_invites(self) -> list[dict[str, str | None]]:
        with self._connect() as conn:
            rows = conn.execute(
                "SELECT token_hash, created_at, expires_at, used_at FROM invites ORDER BY created_at DESC"
            ).fetchall()
        return [
            {
                "token_hash": row["token_hash"],
                "created_at": row["created_at"],
                "expires_at": row["expires_at"],
                "used_at": row["used_at"],
            }
            for row in rows
        ]


class VaultAuthError(RuntimeError):
    pass


def should_accept(existing: SyncEntryChange, incoming: SyncEntryChange) -> bool:
    if incoming.version > existing.version:
        return True
    if incoming.version < existing.version:
        return False
    return incoming.updated_at > existing.updated_at


def should_accept_version(existing_version: int, existing_updated_at: datetime, incoming: SyncEntryChange) -> bool:
    if incoming.version > existing_version:
        return True
    if incoming.version < existing_version:
        return False
    return incoming.updated_at > existing_updated_at


def select_backend() -> VaultBackend:
    storage_path = os.getenv("VAULT_STORAGE_PATH")
    master_key_raw = os.getenv("VAULT_MASTER_KEY", "")
    if storage_path:
        if not master_key_raw:
            raise VaultCryptoError("VAULT_MASTER_KEY must be set when VAULT_STORAGE_PATH is used")
        master_key = load_master_key(master_key_raw)
        return SqliteVaultStore(path=Path(storage_path).expanduser(), master_key=master_key)
    return InMemoryVaultStore()
