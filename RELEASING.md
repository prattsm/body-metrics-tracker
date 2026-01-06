# Releasing Body Metrics Tracker

This project uses PyInstaller to produce OS‑specific builds. You must build on each target OS.

## Prereqs (all OS)
- Python 3.11+ installed
- `pip install -e ".[dev]"` (from repo root)
- `pip install pyinstaller`

## Build (Linux)
```bash
python -m PyInstaller --noconfirm --clean --windowed --name BodyMetricsTracker --paths src pyinstaller_entry.py
```

Package for release:
```bash
tar -czf dist/BodyMetricsTracker-linux.tar.gz -C dist BodyMetricsTracker
```

## Build (macOS)
```bash
python -m PyInstaller --noconfirm --clean --windowed --name BodyMetricsTracker --paths src pyinstaller_entry.py
```

Package the `.app`:
```bash
cd dist
ditto -c -k --sequesterRsrc --keepParent BodyMetricsTracker.app BodyMetricsTracker-macos.zip
```

Note: Unsigned builds will trigger Gatekeeper warnings. For smoother installs, sign and notarize.

## Build (Windows)
```powershell
python -m PyInstaller --noconfirm --clean --windowed --name BodyMetricsTracker --paths src pyinstaller_entry.py
```

Package for release:
```powershell
Compress-Archive -Path dist/BodyMetricsTracker -DestinationPath dist/BodyMetricsTracker-windows.zip
```

Note: Unsigned builds may trigger SmartScreen warnings.

## Optional: App icon
Add `--icon assets/app.ico` (Windows) or `--icon assets/app.icns` (macOS) to the PyInstaller command.

## GitHub Releases (manual)
1. Commit changes and tag: `git tag v0.1.0`
2. Push tag: `git push origin v0.1.0`
3. Attach the packaged zips/tarballs to the GitHub Release.

## GitHub Releases (automated)
The repo includes a GitHub Actions workflow at `.github/workflows/release.yml`.
Push a `v*` tag to trigger builds for Windows/macOS/Linux and auto‑attach artifacts.
