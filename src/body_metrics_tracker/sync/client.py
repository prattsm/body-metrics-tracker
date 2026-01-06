from __future__ import annotations

import json
import ssl
import urllib.error
import urllib.request
from dataclasses import dataclass
from typing import Any
from uuid import UUID

from .models import (
    InviteRequest,
    InviteResponse,
    SyncEntryChange,
    SyncPullRequest,
    SyncPullResponse,
    SyncPushRequest,
    SyncPushResponse,
)


class SyncError(RuntimeError):
    pass


@dataclass(frozen=True)
class SyncResult:
    push: SyncPushResponse
    pull: SyncPullResponse


def _post_json(
    url: str,
    payload: dict[str, Any],
    headers: dict[str, str] | None = None,
    context: ssl.SSLContext | None = None,
) -> dict[str, Any]:
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, method="POST")
    request.add_header("Content-Type", "application/json")
    if headers:
        for key, value in headers.items():
            request.add_header(key, value)
    try:
        with urllib.request.urlopen(request, timeout=15, context=context) as response:
            response_body = response.read().decode("utf-8")
            return json.loads(response_body)
    except urllib.error.HTTPError as exc:
        try:
            detail = json.loads(exc.read().decode("utf-8")).get("detail")
        except Exception:
            detail = None
        message = detail or f"HTTP error {exc.code}"
        raise SyncError(message) from exc
    except Exception as exc:
        if isinstance(exc, ssl.SSLError):
            raise SyncError("TLS verification failed. Import the vault certificate and try again.") from exc
        raise SyncError(str(exc)) from exc


def _get_json(
    url: str,
    headers: dict[str, str] | None = None,
    context: ssl.SSLContext | None = None,
) -> dict[str, Any]:
    request = urllib.request.Request(url, method="GET")
    if headers:
        for key, value in headers.items():
            request.add_header(key, value)
    try:
        with urllib.request.urlopen(request, timeout=10, context=context) as response:
            response_body = response.read().decode("utf-8")
            return json.loads(response_body)
    except urllib.error.HTTPError as exc:
        try:
            detail = json.loads(exc.read().decode("utf-8")).get("detail")
        except Exception:
            detail = None
        message = detail or f"HTTP error {exc.code}"
        raise SyncError(message) from exc
    except Exception as exc:
        if isinstance(exc, ssl.SSLError):
            raise SyncError("TLS verification failed. Import the vault certificate and try again.") from exc
        raise SyncError(str(exc)) from exc


def exchange_invite(
    vault_url: str,
    invite_token: str,
    device_name: str,
    user_id: UUID,
    device_id: str | None = None,
    vault_cert_path: str | None = None,
    allow_insecure_http: bool = False,
) -> InviteResponse:
    request = InviteRequest(
        invite_token=invite_token,
        device_name=device_name,
        user_id=user_id,
        device_id=device_id,
    )
    url = f"{vault_url.rstrip('/')}/auth/invite"
    context = _build_ssl_context(vault_url, vault_cert_path, allow_insecure_http)
    response = _post_json(url, request.to_dict(), context=context)
    return InviteResponse.from_dict(response)


def push_changes(
    vault_url: str,
    user_token: str,
    user_id: UUID,
    device_id: str,
    changes: list[SyncEntryChange],
    since,
    vault_cert_path: str | None = None,
    allow_insecure_http: bool = False,
) -> SyncPushResponse:
    request = SyncPushRequest(user_id=user_id, device_id=device_id, since=since, changes=changes)
    url = f"{vault_url.rstrip('/')}/sync/push"
    context = _build_ssl_context(vault_url, vault_cert_path, allow_insecure_http)
    response = _post_json(url, request.to_dict(), headers={"X-User-Token": user_token}, context=context)
    return SyncPushResponse.from_dict(response)


def pull_changes(
    vault_url: str,
    user_token: str,
    user_id: UUID,
    device_id: str,
    since,
    vault_cert_path: str | None = None,
    allow_insecure_http: bool = False,
) -> SyncPullResponse:
    request = SyncPullRequest(user_id=user_id, device_id=device_id, since=since)
    url = f"{vault_url.rstrip('/')}/sync/pull"
    context = _build_ssl_context(vault_url, vault_cert_path, allow_insecure_http)
    response = _post_json(url, request.to_dict(), headers={"X-User-Token": user_token}, context=context)
    return SyncPullResponse.from_dict(response)


def check_health(vault_url: str, vault_cert_path: str | None = None, allow_insecure_http: bool = False) -> dict[str, Any]:
    url = f"{vault_url.rstrip('/')}/health"
    context = _build_ssl_context(vault_url, vault_cert_path, allow_insecure_http)
    return _get_json(url, context=context)


def create_invite(
    vault_url: str,
    admin_token: str,
    vault_cert_path: str | None = None,
    allow_insecure_http: bool = False,
    expires_in_days: int | None = None,
) -> dict[str, Any]:
    url = f"{vault_url.rstrip('/')}/admin/invites"
    payload = {"expires_in_days": expires_in_days} if expires_in_days else {}
    context = _build_ssl_context(vault_url, vault_cert_path, allow_insecure_http)
    return _post_json(url, payload, headers={"X-Admin-Token": admin_token}, context=context)


def admin_overview(
    vault_url: str,
    admin_token: str,
    vault_cert_path: str | None = None,
    allow_insecure_http: bool = False,
) -> dict[str, Any]:
    url = f"{vault_url.rstrip('/')}/admin/overview"
    context = _build_ssl_context(vault_url, vault_cert_path, allow_insecure_http)
    return _get_json(url, headers={"X-Admin-Token": admin_token}, context=context)


def _build_ssl_context(
    vault_url: str,
    vault_cert_path: str | None,
    allow_insecure_http: bool,
) -> ssl.SSLContext | None:
    if vault_url.startswith("https://"):
        if vault_cert_path:
            return ssl.create_default_context(cafile=vault_cert_path)
        return ssl.create_default_context()
    if vault_url.startswith("http://"):
        if allow_insecure_http:
            return None
        raise SyncError("Insecure HTTP is disabled. Use HTTPS or allow insecure HTTP in settings.")
    raise SyncError("Vault URL must start with http:// or https://")
