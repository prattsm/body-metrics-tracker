from __future__ import annotations

from dataclasses import dataclass
import hashlib
import json
from pathlib import Path
import platform
from typing import Callable
from uuid import uuid4

from PySide6.QtCore import QStandardPaths, QThread, QTimer, Signal
from PySide6.QtWidgets import (
    QCheckBox,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QFileDialog,
    QMessageBox,
    QPushButton,
    QSpinBox,
    QVBoxLayout,
    QWidget,
)

from body_metrics_tracker.sync.client import SyncResult, check_health, exchange_invite, pull_changes, push_changes
from body_metrics_tracker.sync.models import SyncEntryChange

from .state import AppState


@dataclass(frozen=True)
class InviteResult:
    user_token: str


class TaskWorker(QThread):
    completed = Signal(object)
    failed = Signal(str)

    def __init__(self, task: Callable[[], object]) -> None:
        super().__init__()
        self._task = task

    def run(self) -> None:
        try:
            result = self._task()
        except Exception as exc:
            self.failed.emit(str(exc))
        else:
            self.completed.emit(result)


class SyncWidget(QWidget):
    def __init__(self, state: AppState) -> None:
        super().__init__()
        self.state = state
        self._active_worker: TaskWorker | None = None
        self._auto_timer = QTimer(self)
        self._auto_timer.timeout.connect(self._on_auto_sync)
        self._active_profile_id = None
        self._build_ui()
        self._load_settings()
        self.state.subscribe(self._refresh_status)
        self._refresh_status()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        header = QLabel("Sync")
        header.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(header)
        hint = QLabel('Have an invite file? Import it, then click "Join Vault".')
        hint.setStyleSheet("color: #9aa4af;")
        hint.setWordWrap(True)
        layout.addWidget(hint)

        group = QGroupBox("Vault Settings")
        form = QFormLayout()

        self.enabled_checkbox = QCheckBox("Enable sync")
        self.enabled_checkbox.toggled.connect(self._configure_timer_from_ui)

        self.vault_url_input = QLineEdit()
        self.vault_url_input.setPlaceholderText("https://vault.example.com")

        self.device_name_input = QLineEdit()
        self.device_name_input.setPlaceholderText("My Laptop")

        self.device_id_input = QLineEdit()
        self.device_id_input.setReadOnly(True)

        self.generate_device_button = QPushButton("Generate")
        self.generate_device_button.clicked.connect(self._on_generate_device)

        device_row = QHBoxLayout()
        device_row.addWidget(self.device_id_input, 1)
        device_row.addWidget(self.generate_device_button)
        device_container = QWidget()
        device_container.setLayout(device_row)

        self.invite_token_input = QLineEdit()
        self.invite_token_input.setPlaceholderText("Invite token")

        self.invite_file_button = QPushButton("Import Invite File")
        self.invite_file_button.clicked.connect(self._on_import_invite_file)

        self.user_token_input = QLineEdit()
        self.user_token_input.setPlaceholderText("User token")

        self.vault_cert_input = QLineEdit()
        self.vault_cert_input.setPlaceholderText("Vault certificate path")
        self.vault_cert_browse = QPushButton("Browse")
        self.vault_cert_browse.clicked.connect(self._on_browse_cert)
        cert_row = QHBoxLayout()
        cert_row.addWidget(self.vault_cert_input, 1)
        cert_row.addWidget(self.vault_cert_browse)
        cert_container = QWidget()
        cert_container.setLayout(cert_row)

        self.allow_insecure_checkbox = QCheckBox("Allow insecure HTTP (not recommended)")

        self.auto_sync_checkbox = QCheckBox("Auto-sync")
        self.auto_sync_checkbox.toggled.connect(self._configure_timer_from_ui)
        self.auto_sync_interval = QSpinBox()
        self.auto_sync_interval.setRange(5, 120)
        self.auto_sync_interval.setSuffix(" min")
        self.auto_sync_interval.setSingleStep(5)
        self.auto_sync_interval.valueChanged.connect(self._configure_timer_from_ui)

        auto_row = QHBoxLayout()
        auto_row.addWidget(self.auto_sync_checkbox)
        auto_row.addWidget(self.auto_sync_interval)
        auto_container = QWidget()
        auto_container.setLayout(auto_row)

        self.join_button = QPushButton("Join Vault")
        self.join_button.clicked.connect(self._on_exchange_invite)

        self.test_button = QPushButton("Test Connection")
        self.test_button.clicked.connect(self._on_test_connection)

        self.save_button = QPushButton("Save Settings")
        self.save_button.clicked.connect(self._on_save_settings)

        form.addRow("", self.enabled_checkbox)
        form.addRow("Vault URL", self.vault_url_input)
        form.addRow("Invite file", self.invite_file_button)
        form.addRow("Device name", self.device_name_input)
        form.addRow("Device ID", device_container)
        form.addRow("Invite token", self.invite_token_input)
        form.addRow("User token", self.user_token_input)
        form.addRow("Vault certificate", cert_container)
        form.addRow("", self.allow_insecure_checkbox)
        form.addRow("Auto-sync", auto_container)
        form.addRow("", self.test_button)
        form.addRow("", self.join_button)
        form.addRow("", self.save_button)
        group.setLayout(form)

        layout.addWidget(group)

        self.sync_now_button = QPushButton("Sync Now")
        self.sync_now_button.clicked.connect(self._on_sync_now)
        layout.addWidget(self.sync_now_button)

        self.status_label = QLabel("")
        self.status_label.setWordWrap(True)
        layout.addWidget(self.status_label)

        layout.addStretch(1)

    def _load_settings(self) -> None:
        settings = self.state.profile.sync_settings
        self._active_profile_id = self.state.profile.user_id
        self.enabled_checkbox.setChecked(settings.enabled)
        self.vault_url_input.setText(settings.vault_url or "")
        self.device_name_input.setText(settings.device_name or self._default_device_name())
        self.device_id_input.setText(settings.device_id or uuid4().hex)
        self.user_token_input.setText(settings.user_token or "")
        self.vault_cert_input.setText(settings.vault_cert_path or "")
        self.allow_insecure_checkbox.setChecked(settings.allow_insecure_http)
        self.auto_sync_checkbox.setChecked(settings.auto_sync_enabled)
        self.auto_sync_interval.setValue(settings.auto_sync_interval_minutes)
        self._configure_timer_from_ui()

    def _refresh_status(self) -> None:
        if self._active_profile_id != self.state.profile.user_id:
            self._load_settings()
        settings = self.state.profile.sync_settings
        if settings.last_sync_at:
            when = settings.last_sync_at.astimezone().strftime("%Y-%m-%d %H:%M")
            self.status_label.setText(f"Last sync: {when}")
        else:
            self.status_label.setText("Last sync: never")

    def _on_generate_device(self) -> None:
        device_id = uuid4().hex
        self.device_id_input.setText(device_id)

    def _on_import_invite_file(self) -> None:
        filename, _ = QFileDialog.getOpenFileName(
            self,
            "Select Vault Invite File",
            "",
            "Invite Files (*.json);;All Files (*)",
        )
        if not filename:
            return
        try:
            payload = json.loads(Path(filename).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            QMessageBox.warning(self, "Invalid Invite File", str(exc))
            return
        vault_url = str(payload.get("vault_url", "")).strip()
        invite_token = str(payload.get("invite_token", "")).strip()
        cert_pem = payload.get("vault_cert_pem")
        if not vault_url or not invite_token:
            QMessageBox.warning(self, "Invalid Invite File", "Vault URL and invite token are required.")
            return
        self.vault_url_input.setText(vault_url)
        self.invite_token_input.setText(invite_token)
        if cert_pem:
            try:
                cert_path = self._store_cert_pem(str(cert_pem))
                self.vault_cert_input.setText(str(cert_path))
            except OSError as exc:
                QMessageBox.warning(self, "Certificate Error", str(exc))
                return
        if not self.device_name_input.text().strip():
            self.device_name_input.setText(self._default_device_name())
        self.allow_insecure_checkbox.setChecked(False)
        self.status_label.setText("Invite loaded. Click 'Join Vault' to finish setup.")

    def _on_browse_cert(self) -> None:
        filename, _ = QFileDialog.getOpenFileName(
            self,
            "Select Vault Certificate",
            "",
            "Certificate Files (*.crt *.pem *.cer);;All Files (*)",
        )
        if filename:
            self.vault_cert_input.setText(filename)

    def _configure_timer_from_ui(self) -> None:
        if self.auto_sync_checkbox.isChecked() and self.enabled_checkbox.isChecked():
            interval_ms = int(self.auto_sync_interval.value()) * 60 * 1000
            self._auto_timer.start(interval_ms)
        else:
            self._auto_timer.stop()

    def _on_save_settings(self) -> None:
        settings = self.state.profile.sync_settings
        settings.enabled = self.enabled_checkbox.isChecked()
        settings.vault_url = self.vault_url_input.text().strip() or None
        settings.device_name = self.device_name_input.text().strip() or None
        settings.device_id = self.device_id_input.text().strip() or None
        settings.user_token = self.user_token_input.text().strip() or None
        settings.vault_cert_path = self.vault_cert_input.text().strip() or None
        settings.allow_insecure_http = self.allow_insecure_checkbox.isChecked()
        settings.auto_sync_enabled = self.auto_sync_checkbox.isChecked()
        settings.auto_sync_interval_minutes = int(self.auto_sync_interval.value())
        self.state.update_profile(self.state.profile)
        self.status_label.setText("Sync settings saved.")
        self._configure_timer_from_ui()

    def _on_exchange_invite(self) -> None:
        if self._active_worker:
            return
        vault_url = self.vault_url_input.text().strip()
        invite_token = self.invite_token_input.text().strip()
        device_name = self.device_name_input.text().strip()
        device_id = self.device_id_input.text().strip()
        vault_cert_path = self.vault_cert_input.text().strip() or None
        allow_insecure = self.allow_insecure_checkbox.isChecked()

        if not device_id:
            device_id = uuid4().hex
            self.device_id_input.setText(device_id)
        if not device_name:
            device_name = self._default_device_name()
            self.device_name_input.setText(device_name)
        if not vault_url or not invite_token or not device_name or not device_id:
            QMessageBox.warning(
                self,
                "Missing Info",
                "Vault URL, invite token, device name, and device ID are required.",
            )
            return

        def task() -> InviteResult:
            response = exchange_invite(
                vault_url=vault_url,
                invite_token=invite_token,
                device_name=device_name,
                user_id=self.state.profile.user_id,
                device_id=device_id,
                vault_cert_path=vault_cert_path,
                allow_insecure_http=allow_insecure,
            )
            return InviteResult(user_token=response.user_token)

        self._active_worker = TaskWorker(task)
        self._active_worker.completed.connect(self._on_invite_completed)
        self._active_worker.failed.connect(self._on_task_failed)
        self._active_worker.start()
        self.status_label.setText("Joining vault...")

    def _on_test_connection(self) -> None:
        if self._active_worker:
            return
        vault_url = self.vault_url_input.text().strip()
        if not vault_url:
            QMessageBox.warning(self, "Missing Info", "Vault URL is required.")
            return

        def task() -> str:
            vault_cert_path = self.vault_cert_input.text().strip() or None
            allow_insecure = self.allow_insecure_checkbox.isChecked()
            response = check_health(vault_url, vault_cert_path=vault_cert_path, allow_insecure_http=allow_insecure)
            status = response.get("status", "unknown")
            return f"Vault status: {status}"

        self._active_worker = TaskWorker(task)
        self._active_worker.completed.connect(self._on_test_completed)
        self._active_worker.failed.connect(self._on_task_failed)
        self._active_worker.start()
        self.status_label.setText("Checking vault...")

    def _on_test_completed(self, message: str) -> None:
        self._active_worker = None
        self.status_label.setText(message)

    def _on_invite_completed(self, result: InviteResult) -> None:
        self._active_worker = None
        self.user_token_input.setText(result.user_token)
        self.enabled_checkbox.setChecked(True)
        if not self.auto_sync_checkbox.isChecked():
            self.auto_sync_checkbox.setChecked(True)
        self._on_save_settings()
        self.status_label.setText("Vault joined. Running initial sync...")
        self._start_sync(show_dialogs=False)

    def _on_sync_now(self) -> None:
        self._start_sync(show_dialogs=True)

    def _on_auto_sync(self) -> None:
        self._start_sync(show_dialogs=False)

    def _start_sync(self, show_dialogs: bool) -> None:
        if self._active_worker:
            return
        settings = self.state.profile.sync_settings
        if not self.enabled_checkbox.isChecked():
            if show_dialogs:
                QMessageBox.information(self, "Sync Disabled", "Enable sync before running a sync.")
            return
        vault_url = self.vault_url_input.text().strip()
        user_token = self.user_token_input.text().strip()
        device_id = self.device_id_input.text().strip()
        vault_cert_path = self.vault_cert_input.text().strip() or None
        allow_insecure = self.allow_insecure_checkbox.isChecked()
        if not vault_url or not user_token or not device_id:
            if show_dialogs:
                QMessageBox.warning(self, "Missing Info", "Vault URL, user token, and device ID are required.")
            return

        settings.enabled = self.enabled_checkbox.isChecked()
        settings.vault_url = vault_url
        settings.user_token = user_token
        settings.device_id = device_id
        settings.device_name = self.device_name_input.text().strip() or None
        settings.vault_cert_path = vault_cert_path
        settings.allow_insecure_http = allow_insecure
        settings.auto_sync_enabled = self.auto_sync_checkbox.isChecked()
        settings.auto_sync_interval_minutes = int(self.auto_sync_interval.value())
        self.state.update_profile(self.state.profile)

        since = settings.last_sync_at
        changes = [SyncEntryChange.from_entry(entry) for entry in self.state.entries_since(since)]

        def task() -> SyncResult:
            push = push_changes(
                vault_url=vault_url,
                user_token=user_token,
                user_id=self.state.profile.user_id,
                device_id=device_id,
                changes=changes,
                since=since,
                vault_cert_path=vault_cert_path,
                allow_insecure_http=allow_insecure,
            )
            pull = pull_changes(
                vault_url=vault_url,
                user_token=user_token,
                user_id=self.state.profile.user_id,
                device_id=device_id,
                since=push.next_since,
                vault_cert_path=vault_cert_path,
                allow_insecure_http=allow_insecure,
            )
            return SyncResult(push=push, pull=pull)

        self._active_worker = TaskWorker(task)
        self._active_worker.completed.connect(self._on_sync_completed)
        self._active_worker.failed.connect(self._on_task_failed)
        self._active_worker.start()
        self.status_label.setText("Syncing...")

    def _on_sync_completed(self, result: SyncResult) -> None:
        self._active_worker = None
        applied = self.state.apply_remote_changes(result.pull.changes)
        settings = self.state.profile.sync_settings
        settings.last_sync_at = result.pull.next_since
        self.state.update_profile(self.state.profile)
        self.status_label.setText(f"Sync complete. Applied {applied} change(s).")

    def _on_task_failed(self, message: str) -> None:
        self._active_worker = None
        self.status_label.setText(f"Sync error: {message}")

    def _default_device_name(self) -> str:
        name = platform.node().strip()
        return name or "My Device"

    def _store_cert_pem(self, pem: str) -> Path:
        if "BEGIN CERTIFICATE" not in pem:
            raise OSError("Invite certificate is missing or invalid.")
        base = QStandardPaths.writableLocation(QStandardPaths.AppDataLocation)
        cert_root = Path(base) if base else Path.home() / ".body_metrics_tracker"
        cert_dir = cert_root / "vault"
        cert_dir.mkdir(parents=True, exist_ok=True)
        digest = hashlib.sha256(pem.encode("utf-8")).hexdigest()[:12]
        cert_path = cert_dir / f"vault_{digest}.crt"
        cert_path.write_text(pem, encoding="utf-8")
        return cert_path
