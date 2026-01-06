from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

from fastapi import FastAPI, Header, HTTPException

from body_metrics_tracker.sync.models import (
    InviteRequest,
    InviteResponse,
    SyncPullRequest,
    SyncPullResponse,
    SyncPushRequest,
    SyncPushResponse,
)

from .store import VaultAuthError, select_backend


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


backend = select_backend()
backend.load_invites_from_env()
ADMIN_TOKEN = os.getenv("VAULT_ADMIN_TOKEN")

app = FastAPI(title="Body Metrics Tracker Vault", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/invite")
def auth_invite(payload: dict) -> dict:
    request = InviteRequest.from_dict(payload)
    try:
        backend.consume_invite(request.invite_token)
    except VaultAuthError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    user_id = request.user_id or uuid4()
    backend.ensure_user(user_id)
    if request.device_id:
        backend.record_device(user_id, request.device_id, request.device_name)
    user_token = backend.issue_user_token(user_id)
    response = InviteResponse(user_id=user_id, user_token=user_token, expires_at=None)
    return response.to_dict()


@app.post("/sync/push")
def sync_push(payload: dict, x_user_token: str = Header(...)) -> dict:
    request = SyncPushRequest.from_dict(payload)
    try:
        user_id = backend.authenticate(x_user_token)
    except VaultAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    if request.user_id != user_id:
        raise HTTPException(status_code=403, detail="User mismatch")
    backend.touch_device(user_id, request.device_id)
    accepted = backend.apply_changes(user_id, request.changes, request.device_id)
    server_time = utc_now()
    response = SyncPushResponse(
        server_time=server_time,
        accepted_count=accepted,
        next_since=server_time,
    )
    return response.to_dict()


@app.post("/sync/pull")
def sync_pull(payload: dict, x_user_token: str = Header(...)) -> dict:
    request = SyncPullRequest.from_dict(payload)
    try:
        user_id = backend.authenticate(x_user_token)
    except VaultAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    if request.user_id != user_id:
        raise HTTPException(status_code=403, detail="User mismatch")
    backend.touch_device(user_id, request.device_id)
    changes = backend.changes_since(user_id, request.since)
    server_time = utc_now()
    response = SyncPullResponse(
        server_time=server_time,
        changes=changes,
        next_since=server_time,
    )
    return response.to_dict()


@app.get("/sync/pull")
def sync_pull_query(
    user_id: str,
    device_id: str,
    since: str | None = None,
    x_user_token: str = Header(...),
) -> dict:
    user_uuid = UUID(user_id)
    try:
        auth_user = backend.authenticate(x_user_token)
    except VaultAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    if user_uuid != auth_user:
        raise HTTPException(status_code=403, detail="User mismatch")
    if since:
        parsed_since = datetime.fromisoformat(since)
        if parsed_since.tzinfo is None:
            raise HTTPException(status_code=400, detail="since must be timezone-aware")
    else:
        parsed_since = None
    request = SyncPullRequest(
        user_id=user_uuid,
        device_id=device_id,
        since=parsed_since,
    )
    backend.touch_device(request.user_id, request.device_id)
    changes = backend.changes_since(request.user_id, request.since)
    server_time = utc_now()
    response = SyncPullResponse(
        server_time=server_time,
        changes=changes,
        next_since=server_time,
    )
    return response.to_dict()


def _require_admin(x_admin_token: str | None) -> None:
    if not ADMIN_TOKEN:
        raise HTTPException(status_code=503, detail="Admin token not configured")
    if not x_admin_token or x_admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=401, detail="Invalid admin token")


@app.get("/admin/overview")
def admin_overview(x_admin_token: str | None = Header(default=None)) -> dict:
    _require_admin(x_admin_token)
    return {
        "users": backend.list_users(),
        "devices": backend.list_devices(),
        "invites": backend.list_invites(),
        "total_entries": backend.count_entries(),
    }


@app.post("/admin/invites")
def admin_invites(payload: dict | None = None, x_admin_token: str | None = Header(default=None)) -> dict:
    _require_admin(x_admin_token)
    expires_at = None
    if payload and payload.get("expires_in_days"):
        expires_at = utc_now() + timedelta(days=int(payload["expires_in_days"]))
    token = backend.create_invite_token(expires_at=expires_at)
    return {"invite_token": token, "expires_at": expires_at.isoformat() if expires_at else None}
