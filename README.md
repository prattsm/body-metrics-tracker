# Body Metrics Tracker

Local-first weight + waist tracking app with weekly analytics and a sync backup vault.

## Status
Scaffold includes core data models, unit conversions, weekly aggregation, encrypted local storage helpers, a PySide6 dashboard + history (filter + CSV export) + profile + sync tabs, goals, and a FastAPI vault server with optional SQLite persistence plus an in-app Vault (Admin) control panel.

## Commands
- Setup: `python -m venv .venv` then `source .venv/bin/activate` (Windows: `.venv\\Scripts\\activate`) and `pip install -e ".[dev]"`
- Run (GUI): `python -m body_metrics_tracker`
- Run (Vault, in-app admin): open the GUI and use the "Vault (Admin)" tab.
- Run (Vault, in-memory): `VAULT_INVITE_TOKENS=token1,token2 python -m body_metrics_tracker.vault`
- Run (Vault, persistent): `VAULT_STORAGE_PATH=~/.body_metrics_tracker/vault.db VAULT_MASTER_KEY=<base64> VAULT_INVITE_TOKENS=token1 python -m body_metrics_tracker.vault`
- Tests: `python -m pytest`
- Lint/format: not configured yet
- Typecheck: not configured yet

## Download & Run (end users)
We publish OS‑specific builds on GitHub Releases. Download the asset that matches your OS:

- Windows: `BodyMetricsTracker-windows.zip` → unzip → run `BodyMetricsTracker.exe`
- macOS: `BodyMetricsTracker-macos.zip` → unzip → drag `BodyMetricsTracker.app` to Applications → open
- Linux: `BodyMetricsTracker-linux.tar.gz` → extract → run `BodyMetricsTracker`

If your OS warns about unsigned apps, you may need to approve the app once in Security settings.

## Releases
- Build instructions: `RELEASING.md`
- GitHub Actions workflow: `.github/workflows/release.yml`

## Architecture (current)
- `body_metrics_tracker.core`: models, units, and weekly aggregation utilities
- `body_metrics_tracker.storage`: encrypted local store (file-level AEAD) and serialization helpers
- `body_metrics_tracker.gui`: PySide6 dashboard scaffold with quick entry
- `body_metrics_tracker.sync`: sync API models + vault storage schema
- `body_metrics_tracker.vault`: FastAPI vault server with optional SQLite persistence + encryption

## Sync basics
- Vault admin: open the "Vault (Admin)" tab, click Start Vault, then Generate Invite or Export Invite File.
- Friends: open Sync, import the invite file (or paste the invite token + certificate), confirm device name, then click "Join Vault".
- Local changes are pushed first, then the client pulls remote changes and applies conflict rules (version + updated_at).
- Optional auto-sync runs on a timer when enabled.

## Vault setup (admin)
- Start the GUI and open "Vault (Admin)".
- Click Start Vault (this generates a self-signed certificate and runs the server).
- Click Export Invite File to create a shareable `vault_invite.json`.
- Share the invite file with a friend (same LAN/VPN recommended).

Note: The Vault (Admin) tab is only shown on the admin machine. If you don't see it, set `BMT_ENABLE_VAULT_ADMIN=1` and relaunch.

## Friend setup (non-admin)
- Open Sync, click "Import Invite File", and choose the `vault_invite.json`.
- Confirm device name if needed, then click "Join Vault".
- Auto-sync can be enabled right away for ongoing backups.

## Profiles
- Use the Profile tab to create and switch between profiles. Each profile has its own entries, units, and goals.
## User Guide
- Dashboard: quick entry (weight first), weekly averages, and WoW deltas.
- Trends: charts with range/weekly/raw/smoothing toggles plus friend comparisons.
- History: filter by date, search notes, edit/delete entries, export CSV.
- Friends: share your friend code, add friends locally, and enable vault backup.
- Profile: set your name, units, goals, which metrics to track (waist optional), and appearance (accent + dark mode).
- Sync: import invite file or paste vault URL + invite token, join vault, run sync, and optionally auto-sync.


## Vault environment variables
- `VAULT_INVITE_TOKENS`: comma-separated invite tokens to allow onboarding.
- `VAULT_STORAGE_PATH`: enable SQLite persistence at this path.
- `VAULT_MASTER_KEY`: 32-byte key (base64 or hex) required when persistence is enabled.
- `VAULT_TLS_CERT` / `VAULT_TLS_KEY`: optional TLS cert + key paths for HTTPS.
- `VAULT_ADMIN_TOKEN`: protects the `/admin/overview` endpoint.

Example master key generation:
```bash
python - <<'PY'
import base64, secrets
print(base64.b64encode(secrets.token_bytes(32)).decode())
PY
```
