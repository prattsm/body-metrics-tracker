from __future__ import annotations

import sys

from PySide6.QtWidgets import QApplication

from .state import load_or_create_state
from .theme import apply_app_theme
from .window import MainWindow


def run() -> int:
    app = QApplication(sys.argv)
    apply_app_theme(app)
    state = load_or_create_state()
    if state is None:
        return 0
    apply_app_theme(app, accent_color=state.profile.accent_color, dark_mode=state.profile.dark_mode)
    window = MainWindow(state)
    window.show()
    return app.exec()


def main() -> None:
    raise SystemExit(run())
