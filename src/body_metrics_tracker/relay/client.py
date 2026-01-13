from __future__ import annotations

import json
import os
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any
from urllib.error import HTTPError
from urllib.parse import urlencode, urljoin, urlparse
from urllib.request import Request, urlopen


class RelayError(RuntimeError):
    pass


@dataclass(frozen=True)
class RelayConfig:
    base_url: str
    token: str | None = None


@dataclass(frozen=True)
class AdminRelayConfig:
    base_url: str
    admin_token: str
    admin_device_id: str


def register(
    base_url: str,
    user_id: str,
    friend_code: str,
    display_name: str,
    avatar_b64: str | None = None,
) -> dict[str, Any]:
    payload = {
        "user_id": user_id,
        "friend_code": friend_code,
        "display_name": display_name,
        "avatar_b64": avatar_b64,
    }
    return _request_json(base_url, "/v1/register", method="POST", payload=payload)


def update_profile(config: RelayConfig, display_name: str, avatar_b64: str | None) -> dict[str, Any]:
    payload = {"display_name": display_name, "avatar_b64": avatar_b64}
    return _request_json(config.base_url, "/v1/profile", method="POST", token=config.token, payload=payload)


def fetch_profile_settings(config: RelayConfig) -> dict[str, Any]:
    return _request_json(config.base_url, "/v1/profile/settings", method="GET", token=config.token)


def update_profile_settings(config: RelayConfig, settings: dict[str, Any]) -> dict[str, Any]:
    payload = {"settings": settings}
    return _request_json(config.base_url, "/v1/profile/settings", method="POST", token=config.token, payload=payload)


def send_invite(config: RelayConfig, to_code: str) -> dict[str, Any]:
    payload = {"to_code": to_code}
    return _request_json(config.base_url, "/v1/invites", method="POST", token=config.token, payload=payload)


def accept_invite(config: RelayConfig, from_code: str) -> dict[str, Any]:
    payload = {"from_code": from_code}
    return _request_json(config.base_url, "/v1/invites/accept", method="POST", token=config.token, payload=payload)


def fetch_inbox(config: RelayConfig) -> dict[str, Any]:
    return _request_json(config.base_url, "/v1/inbox", method="GET", token=config.token)


def update_share_settings(config: RelayConfig, friend_code: str, share_weight: bool, share_waist: bool) -> dict[str, Any]:
    payload = {"friend_code": friend_code, "share_weight": share_weight, "share_waist": share_waist}
    return _request_json(config.base_url, "/v1/share-settings", method="POST", token=config.token, payload=payload)


def push_history(config: RelayConfig, entries: list[dict[str, Any]]) -> dict[str, Any]:
    payload = {"entries": entries}
    return _request_json(config.base_url, "/v1/history", method="POST", token=config.token, payload=payload)


def fetch_history(config: RelayConfig, since: datetime | None = None) -> dict[str, Any]:
    query = ""
    if since is not None:
        query = f"?{urlencode({'since': since.isoformat()})}"
    return _request_json(config.base_url, f"/v1/history{query}", method="GET", token=config.token)


def fetch_self_history(config: RelayConfig, since: datetime | None = None) -> dict[str, Any]:
    query = ""
    if since is not None:
        query = f"?{urlencode({'since': since.isoformat()})}"
    return _request_json(config.base_url, f"/v1/history/self{query}", method="GET", token=config.token)


def remove_friend(config: RelayConfig, friend_code: str) -> dict[str, Any]:
    payload = {"friend_code": friend_code}
    return _request_json(config.base_url, "/v1/friends/remove", method="POST", token=config.token, payload=payload)


def post_status(
    config: RelayConfig,
    logged_today: bool,
    last_entry_date: date | None,
    weight_kg: float | None,
    waist_cm: float | None,
) -> dict[str, Any]:
    payload = {
        "logged_today": logged_today,
        "last_entry_date": last_entry_date.isoformat() if last_entry_date else None,
        "weight_kg": weight_kg,
        "waist_cm": waist_cm,
    }
    return _request_json(config.base_url, "/v1/status", method="POST", token=config.token, payload=payload)


def send_reminder(config: RelayConfig, to_code: str, message: str) -> dict[str, Any]:
    payload = {"to_code": to_code, "message": message}
    return _request_json(config.base_url, "/v1/reminders", method="POST", token=config.token, payload=payload)


def list_reminder_schedules(config: RelayConfig) -> dict[str, Any]:
    return _request_json(config.base_url, "/v1/reminders/schedules", method="GET", token=config.token)


def upsert_reminder_schedule(config: RelayConfig, reminder: dict[str, Any]) -> dict[str, Any]:
    return _request_json(
        config.base_url,
        "/v1/reminders/schedules",
        method="POST",
        token=config.token,
        payload=reminder,
    )


def delete_reminder_schedule(config: RelayConfig, reminder_id: str) -> dict[str, Any]:
    payload = {"id": reminder_id}
    return _request_json(
        config.base_url,
        "/v1/reminders/schedules/delete",
        method="POST",
        token=config.token,
        payload=payload,
    )


def admin_list_users(config: AdminRelayConfig) -> dict[str, Any]:
    return _request_json(
        config.base_url,
        "/v1/admin/users",
        method="GET",
        extra_headers=_admin_headers(config),
    )


def admin_fetch_user(config: AdminRelayConfig, user_id: str) -> dict[str, Any]:
    return _request_json(
        config.base_url,
        f"/v1/admin/users/{user_id}",
        method="GET",
        extra_headers=_admin_headers(config),
    )


def admin_fetch_entries(
    config: AdminRelayConfig,
    user_id: str,
    *,
    limit: int | None = None,
    offset: int | None = None,
) -> dict[str, Any]:
    query = ""
    params = {}
    if limit is not None:
        params["limit"] = str(limit)
    if offset is not None:
        params["offset"] = str(offset)
    if params:
        query = f"?{urlencode(params)}"
    return _request_json(
        config.base_url,
        f"/v1/admin/users/{user_id}/entries{query}",
        method="GET",
        extra_headers=_admin_headers(config),
    )


def admin_restore_user(config: AdminRelayConfig, user_id: str) -> dict[str, Any]:
    return _request_json(
        config.base_url,
        f"/v1/admin/users/{user_id}/restore",
        method="POST",
        extra_headers=_admin_headers(config),
    )


def admin_generate_recovery(config: AdminRelayConfig, user_id: str) -> dict[str, Any]:
    return _request_json(
        config.base_url,
        f"/v1/admin/users/{user_id}/recovery",
        method="POST",
        extra_headers=_admin_headers(config),
    )


def admin_delete_user(config: AdminRelayConfig, user_id: str) -> dict[str, Any]:
    return _request_json(
        config.base_url,
        f"/v1/admin/users/{user_id}/delete",
        method="POST",
        extra_headers=_admin_headers(config),
    )


def admin_merge_user(config: AdminRelayConfig, target_user_id: str, source_user_id: str) -> dict[str, Any]:
    payload = {"source_user_id": source_user_id}
    return _request_json(
        config.base_url,
        f"/v1/admin/users/{target_user_id}/merge",
        method="POST",
        payload=payload,
        extra_headers=_admin_headers(config),
    )


def _request_json(
    base_url: str,
    path: str,
    *,
    method: str,
    token: str | None = None,
    payload: dict[str, Any] | None = None,
    extra_headers: dict[str, str] | None = None,
) -> dict[str, Any]:
    url = _join_url(base_url, path)
    _ensure_https(url)
    headers = {"Accept": "application/json"}
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if extra_headers:
        headers.update(extra_headers)
    request = Request(url, method=method, headers=headers, data=data)
    try:
        with urlopen(request, timeout=10) as response:
            raw = response.read().decode("utf-8")
            if not raw:
                return {}
            return json.loads(raw)
    except HTTPError as exc:
        detail = ""
        try:
            raw = exc.read().decode("utf-8")
            if raw:
                payload = json.loads(raw)
                if isinstance(payload, dict) and payload.get("error"):
                    detail = str(payload["error"])
                else:
                    detail = raw.strip()
        except Exception:
            detail = ""
        message = f"HTTP {exc.code}: {exc.reason}"
        if detail:
            message = f"{message} ({detail})"
        raise RelayError(message) from exc
    except Exception as exc:
        raise RelayError(str(exc)) from exc


def _join_url(base_url: str, path: str) -> str:
    if not base_url:
        raise RelayError("Relay URL is required.")
    if not base_url.endswith("/"):
        base_url += "/"
    return urljoin(base_url, path.lstrip("/"))


def _ensure_https(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme == "https":
        return
    allow = os.getenv("BMT_ALLOW_INSECURE_HTTP", "").strip().lower() in {"1", "true", "yes", "on"}
    if not allow:
        raise RelayError("Relay URL must use https. Set BMT_ALLOW_INSECURE_HTTP=1 to override for development.")


def _admin_headers(config: AdminRelayConfig) -> dict[str, str]:
    return {
        "X-Admin-Token": config.admin_token,
        "X-Admin-Device": config.admin_device_id,
    }
