from __future__ import annotations

from PySide6.QtWidgets import QMainWindow, QTabWidget

from .state import AppState
from .history import HistoryWidget
from .friends import FriendsWidget
from .profile import ProfileWidget
from .sync import SyncWidget
from .trends import TrendsWidget
from .vault_admin import VaultAdminWidget, should_show_admin_tab
from .widgets import DashboardWidget


class MainWindow(QMainWindow):
    def __init__(self, state: AppState) -> None:
        super().__init__()
        self.setWindowTitle("Body Metrics Tracker")
        self.setMinimumSize(960, 640)
        self.statusBar().showMessage("")
        tabs = QTabWidget()
        tabs.addTab(DashboardWidget(state), "Dashboard")
        self._trends = TrendsWidget(state)
        tabs.addTab(self._trends, "Trends")
        tabs.addTab(HistoryWidget(state), "History")
        tabs.addTab(FriendsWidget(state), "Friends")
        tabs.addTab(ProfileWidget(state), "Profile")
        tabs.addTab(SyncWidget(state), "Sync")
        if should_show_admin_tab():
            self._vault_admin = VaultAdminWidget()
            tabs.addTab(self._vault_admin, "Vault (Admin)")
        tabs.currentChanged.connect(self._on_tab_changed)
        self.setCentralWidget(tabs)

    def closeEvent(self, event) -> None:
        if getattr(self, "_vault_admin", None) and self._vault_admin.is_running():
            self._vault_admin.stop_server()
        super().closeEvent(event)

    def _on_tab_changed(self, index: int) -> None:
        if not hasattr(self, "_trends"):
            return
        if self.centralWidget().widget(index) is self._trends:
            self._trends.focus_today()
