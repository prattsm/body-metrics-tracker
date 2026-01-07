from __future__ import annotations

from PySide6.QtWidgets import QMainWindow, QTabWidget

from .state import AppState
from .history import HistoryWidget
from .friends import FriendsWidget
from .profile import ProfileWidget
from .trends import TrendsWidget
from .widgets import DashboardWidget
from ..resources import load_app_icon


class MainWindow(QMainWindow):
    def __init__(self, state: AppState) -> None:
        super().__init__()
        self.setWindowTitle("Body Metrics Tracker")
        icon = load_app_icon()
        if icon is not None:
            self.setWindowIcon(icon)
        self.setMinimumSize(960, 640)
        self.statusBar().showMessage("")
        tabs = QTabWidget()
        tabs.addTab(DashboardWidget(state), "Dashboard")
        self._trends = TrendsWidget(state)
        tabs.addTab(self._trends, "Trends")
        tabs.addTab(HistoryWidget(state), "History")
        tabs.addTab(FriendsWidget(state), "Friends")
        tabs.addTab(ProfileWidget(state), "Profile")
        tabs.currentChanged.connect(self._on_tab_changed)
        self.setCentralWidget(tabs)

    def closeEvent(self, event) -> None:
        super().closeEvent(event)

    def _on_tab_changed(self, index: int) -> None:
        if not hasattr(self, "_trends"):
            return
        if self.centralWidget().widget(index) is self._trends:
            self._trends.focus_today()
