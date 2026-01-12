# Body Metrics Tracker

Local-first weight + waist tracking app with weekly analytics.

## Status
Scaffold includes core data models, unit conversions, weekly aggregation, encrypted local storage helpers, and a PySide6 dashboard + history (filter + CSV export) + profile tabs.

## Download & Run (end users)
We publish OS‑specific builds on GitHub Releases. Download the asset that matches your OS:

- Windows: `BodyMetricsTracker-windows.zip` → unzip → run `BodyMetricsTracker.exe`
- macOS: `BodyMetricsTracker-macos.zip` → unzip → drag `BodyMetricsTracker.app` to Applications → open
- Linux: `BodyMetricsTracker-linux.tar.gz` → extract → run `BodyMetricsTracker`

If your OS warns about unsigned apps, you may need to approve the app once in Security settings.

## Releases
- Build instructions: `RELEASING.md`
- GitHub Actions workflow: `.github/workflows/release.yml`

## iPhone PWA (Home Screen app)
The `pwa/` folder contains the iPhone-friendly web app. Deploy it on Cloudflare Pages and install it to the iPhone Home Screen for push notifications.
See `pwa/README.md` for setup steps.

## Architecture (current)
- `body_metrics_tracker.core`: models, units, and weekly aggregation utilities
- `body_metrics_tracker.storage`: encrypted local store (file-level AEAD) and serialization helpers
- `body_metrics_tracker.gui`: PySide6 dashboard scaffold with quick entry
## Profiles
- Use the Profile tab to create and switch between profiles. Each profile has its own entries, units, and goals.
## User Guide
- Dashboard: quick entry (weight first), weekly averages, and WoW deltas.
- Trends: charts with range/weekly/raw/smoothing toggles.
- History: filter by date, search notes, edit/delete entries, export CSV.
- Friends: share your friend code, send invites, accept connections, share updates, and send reminders.
- Profile: set your name, photo, units, goals, which metrics to track (waist optional), and appearance (accent + dark mode).
- Account Sync (Desktop ↔ PWA): copy the link code from the desktop Profile tab, then paste it into the PWA Settings → Account Sync to link and merge data. Treat the link code as private.

Notes:
- The desktop app checks for updates only when the app is open.
- Reminders are shown as an in‑app banner (not system notifications) on desktop.

## Relay (Cloudflare D1) development
We keep the tracked `relay/wrangler.toml` as a template. For local work, create a full copy and set your D1 database ID:

```bash
cp relay/wrangler.toml relay/wrangler.local.toml
# edit relay/wrangler.local.toml and set database_id
```

Use the helper script so Wrangler always picks up the local config:

```bash
bash relay/w.sh d1 execute body_metrics_relay --remote --command "SELECT 1;"
bash relay/w.sh deploy
```
