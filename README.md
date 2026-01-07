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
- Profile: set your name, units, goals, which metrics to track (waist optional), and appearance (accent + dark mode).

Notes:
- The desktop app checks for updates only when the app is open.
- Reminders are shown as an in‑app banner (not system notifications) on desktop.
