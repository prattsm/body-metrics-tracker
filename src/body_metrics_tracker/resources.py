from __future__ import annotations

from pathlib import Path

from PySide6.QtGui import QIcon


def load_app_icon() -> QIcon | None:
    asset_dir = Path(__file__).resolve().parent / "assets"
    for name in ("app_icon.png", "app_icon.ico"):
        path = asset_dir / name
        if path.exists():
            return QIcon(str(path))
    return None
