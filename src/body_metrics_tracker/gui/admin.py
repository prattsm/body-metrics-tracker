from __future__ import annotations

from datetime import datetime

from PySide6.QtCore import Qt, QThread, Signal
from PySide6.QtWidgets import (
    QApplication,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QInputDialog,
    QMessageBox,
    QPushButton,
    QSplitter,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from body_metrics_tracker.config import DEFAULT_RELAY_URL
from body_metrics_tracker.relay import (
    AdminRelayConfig,
    admin_fetch_entries,
    admin_fetch_user,
    admin_list_users,
    admin_generate_recovery,
    admin_delete_user,
    admin_restore_user,
)

from .state import AppState


class TaskWorker(QThread):
    completed = Signal(object)
    failed = Signal(str)

    def __init__(self, task) -> None:
        super().__init__()
        self._task = task

    def run(self) -> None:
        try:
            result = self._task()
        except Exception as exc:
            self.failed.emit(str(exc))
        else:
            self.completed.emit(result)


class AdminWidget(QWidget):
    def __init__(self, state: AppState) -> None:
        super().__init__()
        self.state = state
        self._active_workers: list[TaskWorker] = []
        self._selected_user_id: str | None = None
        self._build_ui()
        self._load_admin_config()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        header = QLabel("Admin")
        header.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(header)

        setup_group = QGroupBox("Admin Access")
        setup_form = QFormLayout()

        self.device_id_display = QLineEdit()
        self.device_id_display.setReadOnly(True)
        self.copy_device_button = QPushButton("Copy")
        self.copy_device_button.clicked.connect(self._copy_device_id)
        device_row = QHBoxLayout()
        device_row.addWidget(self.device_id_display, 1)
        device_row.addWidget(self.copy_device_button)
        device_container = QWidget()
        device_container.setLayout(device_row)
        setup_form.addRow("Device ID", device_container)

        self.token_input = QLineEdit()
        self.token_input.setEchoMode(QLineEdit.Password)
        self.token_input.setPlaceholderText("Paste admin token")
        self.save_token_button = QPushButton("Save token")
        self.save_token_button.clicked.connect(self._save_token)
        self.clear_token_button = QPushButton("Clear")
        self.clear_token_button.clicked.connect(self._clear_token)
        token_row = QHBoxLayout()
        token_row.addWidget(self.token_input, 1)
        token_row.addWidget(self.save_token_button)
        token_row.addWidget(self.clear_token_button)
        token_container = QWidget()
        token_container.setLayout(token_row)
        setup_form.addRow("Admin token", token_container)

        self.setup_status = QLabel("")
        self.setup_status.setStyleSheet("color: #9aa4af;")
        setup_form.addRow("", self.setup_status)
        setup_group.setLayout(setup_form)
        layout.addWidget(setup_group)

        users_group = QGroupBox("Users")
        users_layout = QVBoxLayout(users_group)
        self.refresh_users_button = QPushButton("Refresh users")
        self.refresh_users_button.clicked.connect(self._refresh_users)
        users_layout.addWidget(self.refresh_users_button)

        self.users_table = QTableWidget(0, 6)
        self.users_table.setHorizontalHeaderLabels(
            ["Name", "Friend code", "Entries", "Deleted", "Last entry", "Last seen"],
        )
        self.users_table.setSelectionBehavior(QTableWidget.SelectRows)
        self.users_table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.users_table.setSortingEnabled(False)
        self.users_table.itemSelectionChanged.connect(self._on_user_selected)
        self.users_table.horizontalHeader().setStretchLastSection(True)
        users_layout.addWidget(self.users_table)
        detail_group = QGroupBox("User Details")
        detail_layout = QVBoxLayout(detail_group)
        detail_form = QFormLayout()
        self.detail_name = QLabel("--")
        self.detail_friend_code = QLabel("--")
        self.detail_user_id = QLabel("--")
        self.detail_counts = QLabel("--")
        self.detail_last_seen = QLabel("--")
        self.detail_last_entry = QLabel("--")
        detail_form.addRow("Name", self.detail_name)
        detail_form.addRow("Friend code", self.detail_friend_code)
        detail_form.addRow("User ID", self.detail_user_id)
        detail_form.addRow("Entries / Deleted", self.detail_counts)
        detail_form.addRow("Last seen", self.detail_last_seen)
        detail_form.addRow("Latest entry", self.detail_last_entry)
        self.recovery_code_display = QLineEdit()
        self.recovery_code_display.setReadOnly(True)
        self.recovery_copy_button = QPushButton("Copy")
        self.recovery_copy_button.clicked.connect(self._copy_recovery_code)
        recovery_row = QHBoxLayout()
        recovery_row.addWidget(self.recovery_code_display, 1)
        recovery_row.addWidget(self.recovery_copy_button)
        recovery_container = QWidget()
        recovery_container.setLayout(recovery_row)
        detail_form.addRow("Recovery code", recovery_container)
        detail_layout.addLayout(detail_form)

        self.recovery_generate_button = QPushButton("Generate recovery code")
        self.recovery_generate_button.setEnabled(False)
        self.recovery_generate_button.clicked.connect(self._generate_recovery_code)
        detail_layout.addWidget(self.recovery_generate_button)

        self.restore_button = QPushButton("Restore deleted entries")
        self.restore_button.setEnabled(False)
        self.restore_button.clicked.connect(self._restore_user)
        detail_layout.addWidget(self.restore_button)

        self.delete_button = QPushButton("Delete user and data")
        self.delete_button.setEnabled(False)
        self.delete_button.clicked.connect(self._delete_user)
        detail_layout.addWidget(self.delete_button)

        self.detail_status = QLabel("")
        self.detail_status.setStyleSheet("color: #9aa4af;")
        detail_layout.addWidget(self.detail_status)
        entries_group = QGroupBox("Entries")
        entries_layout = QVBoxLayout(entries_group)
        self.entries_table = QTableWidget(0, 7)
        self.entries_table.setHorizontalHeaderLabels(
            ["Date", "Time", "Weight (kg)", "Waist (cm)", "Note", "Updated", "Deleted"],
        )
        self.entries_table.setSelectionBehavior(QTableWidget.SelectRows)
        self.entries_table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.entries_table.horizontalHeader().setStretchLastSection(True)
        entries_layout.addWidget(self.entries_table)
        splitter = QSplitter(Qt.Vertical)
        splitter.setChildrenCollapsible(False)
        splitter.addWidget(users_group)
        splitter.addWidget(detail_group)
        splitter.addWidget(entries_group)
        splitter.setStretchFactor(0, 3)
        splitter.setStretchFactor(1, 1)
        splitter.setStretchFactor(2, 2)
        splitter.setSizes([360, 220, 320])
        layout.addWidget(splitter, 1)

        self.status_label = QLabel("")
        layout.addWidget(self.status_label)

        layout.addStretch(1)

    def _load_admin_config(self) -> None:
        config = self.state.admin_config
        if not config:
            self.setup_status.setText("Admin config missing. Set BMT_ADMIN_BOOTSTRAP=1 and restart.")
            return
        self.device_id_display.setText(str(config.device_id))
        if config.admin_token:
            self.setup_status.setText("Admin token stored.")
        else:
            self.setup_status.setText("Admin token not set.")

    def _copy_device_id(self) -> None:
        if not self.device_id_display.text().strip():
            return
        QApplication.clipboard().setText(self.device_id_display.text().strip())
        self.setup_status.setText("Device ID copied.")

    def _save_token(self) -> None:
        token = self.token_input.text().strip()
        if not token:
            self.setup_status.setText("Paste the admin token first.")
            return
        config = self.state.ensure_admin_config()
        config.admin_token = token
        self.state.update_admin_config(config)
        self.token_input.clear()
        self.setup_status.setText("Admin token saved.")

    def _clear_token(self) -> None:
        config = self.state.ensure_admin_config()
        config.admin_token = None
        self.state.update_admin_config(config)
        self.token_input.clear()
        self.setup_status.setText("Admin token cleared.")

    def _admin_relay_config(self) -> AdminRelayConfig | None:
        config = self.state.admin_config
        if not config or config.owner_user_id != self.state.profile.user_id:
            self.status_label.setText("Admin access is not enabled for this profile.")
            return None
        if not config.admin_token:
            self.status_label.setText("Admin token is missing.")
            return None
        base_url = self.state.profile.relay_url or DEFAULT_RELAY_URL
        if not base_url:
            self.status_label.setText("Relay URL is not configured.")
            return None
        return AdminRelayConfig(base_url=base_url, admin_token=config.admin_token, admin_device_id=str(config.device_id))

    def _start_task(self, label: str, task, on_success) -> None:
        worker = TaskWorker(task)
        self._active_workers.append(worker)
        worker.completed.connect(lambda result, _worker=worker: self._on_task_completed(result, on_success, _worker))
        worker.failed.connect(lambda message, _worker=worker: self._on_task_failed(message, _worker))
        if label:
            self.status_label.setText(label)
        worker.start()

    def _on_task_completed(self, result, on_success, worker: TaskWorker) -> None:
        if worker in self._active_workers:
            self._active_workers.remove(worker)
        if on_success:
            try:
                on_success(result)
            except Exception as exc:
                self.status_label.setText(f"Admin error: {exc}")

    def _on_task_failed(self, message: str, worker: TaskWorker) -> None:
        if worker in self._active_workers:
            self._active_workers.remove(worker)
        self.status_label.setText(f"Admin error: {message}")

    def _refresh_users(self) -> None:
        config = self._admin_relay_config()
        if not config:
            return

        def task():
            return admin_list_users(config)

        def on_success(result: dict) -> None:
            self._apply_users(result)
            self.status_label.setText("Users refreshed.")

        self._start_task("Loading users...", task, on_success)

    def _apply_users(self, payload: dict) -> None:
        users = payload.get("users", []) if isinstance(payload, dict) else []
        self.users_table.setRowCount(len(users))
        for row_index, user in enumerate(users):
            name_item = QTableWidgetItem(user.get("display_name") or "")
            name_item.setData(Qt.UserRole, user.get("user_id"))
            self.users_table.setItem(row_index, 0, name_item)
            self.users_table.setItem(row_index, 1, QTableWidgetItem(user.get("friend_code") or ""))
            self.users_table.setItem(row_index, 2, QTableWidgetItem(str(user.get("entry_count", 0))))
            self.users_table.setItem(row_index, 3, QTableWidgetItem(str(user.get("deleted_count", 0))))
            self.users_table.setItem(row_index, 4, QTableWidgetItem(self._format_ts(user.get("last_entry_at"))))
            self.users_table.setItem(row_index, 5, QTableWidgetItem(self._format_ts(user.get("last_seen_at"))))
        self.users_table.resizeColumnsToContents()
        self._clear_user_details()

    def _clear_user_details(self) -> None:
        self._selected_user_id = None
        self.restore_button.setEnabled(False)
        self.recovery_generate_button.setEnabled(False)
        self.delete_button.setEnabled(False)
        self.detail_name.setText("--")
        self.detail_friend_code.setText("--")
        self.detail_user_id.setText("--")
        self.detail_counts.setText("--")
        self.detail_last_seen.setText("--")
        self.detail_last_entry.setText("--")
        self.recovery_code_display.setText("")
        self.detail_status.setText("")
        self.entries_table.setRowCount(0)

    def _on_user_selected(self) -> None:
        selected = self.users_table.selectedItems()
        if not selected:
            return
        row = selected[0].row()
        item = self.users_table.item(row, 0)
        if not item:
            return
        user_id = item.data(Qt.UserRole)
        if not user_id:
            return
        self._selected_user_id = str(user_id)
        self.restore_button.setEnabled(True)
        self.recovery_generate_button.setEnabled(True)
        self.delete_button.setEnabled(True)
        self.recovery_code_display.setText("")
        self._load_user_detail(self._selected_user_id)

    def _load_user_detail(self, user_id: str) -> None:
        config = self._admin_relay_config()
        if not config:
            return

        def task():
            user = admin_fetch_user(config, user_id)
            entries: list[dict] = []
            offset = 0
            batch_size = 1000
            while True:
                page = admin_fetch_entries(config, user_id, limit=batch_size, offset=offset)
                page_entries = page.get("entries", []) if isinstance(page, dict) else []
                entries.extend(page_entries)
                if len(page_entries) < batch_size:
                    break
                offset += len(page_entries)
            return {"user": user, "entries": {"entries": entries}}

        def on_success(result: dict) -> None:
            user_payload = result.get("user", {}) if isinstance(result, dict) else {}
            entries_payload = result.get("entries", {}) if isinstance(result, dict) else {}
            self._apply_user_detail(user_payload)
            self._apply_entries(entries_payload.get("entries", []))

        self._start_task("Loading user details...", task, on_success)

    def _apply_user_detail(self, payload: dict) -> None:
        user = payload.get("user", {})
        stats = payload.get("stats", {})
        latest = payload.get("latest_entry")
        self.detail_name.setText(user.get("display_name") or "--")
        self.detail_friend_code.setText(user.get("friend_code") or "--")
        self.detail_user_id.setText(user.get("user_id") or "--")
        entry_count = stats.get("entry_count", 0)
        deleted_count = stats.get("deleted_count", 0)
        self.detail_counts.setText(f"{entry_count} / {deleted_count}")
        self.detail_last_seen.setText(self._format_ts(user.get("last_seen_at")))
        if latest:
            latest_text = (
                f"{self._format_ts(latest.get('measured_at'))} "
                f"W {self._format_num(latest.get('weight_kg'))} "
                f"Waist {self._format_num(latest.get('waist_cm'))}"
            )
        else:
            latest_text = "--"
        self.detail_last_entry.setText(latest_text)

    def _apply_entries(self, entries: list) -> None:
        self.entries_table.setRowCount(len(entries))
        for row_index, entry in enumerate(entries):
            measured_at = entry.get("measured_at") or ""
            date_text, time_text = self._split_datetime(measured_at)
            self.entries_table.setItem(row_index, 0, QTableWidgetItem(date_text))
            self.entries_table.setItem(row_index, 1, QTableWidgetItem(time_text))
            self.entries_table.setItem(row_index, 2, QTableWidgetItem(self._format_num(entry.get("weight_kg"))))
            self.entries_table.setItem(row_index, 3, QTableWidgetItem(self._format_num(entry.get("waist_cm"))))
            self.entries_table.setItem(row_index, 4, QTableWidgetItem(entry.get("note") or ""))
            self.entries_table.setItem(row_index, 5, QTableWidgetItem(self._format_ts(entry.get("updated_at"))))
            self.entries_table.setItem(row_index, 6, QTableWidgetItem("Yes" if entry.get("is_deleted") else "No"))
        self.entries_table.resizeColumnsToContents()

    def _copy_recovery_code(self) -> None:
        code = self.recovery_code_display.text().strip()
        if not code:
            return
        QApplication.clipboard().setText(code)
        self.detail_status.setText("Recovery code copied.")

    def _generate_recovery_code(self) -> None:
        if not self._selected_user_id:
            return
        config = self._admin_relay_config()
        if not config:
            return

        def task():
            return admin_generate_recovery(config, self._selected_user_id)

        def on_success(result: dict) -> None:
            code = result.get("code") if isinstance(result, dict) else None
            expires = result.get("expires_at") if isinstance(result, dict) else None
            if code:
                self.recovery_code_display.setText(code)
                expiry_text = self._format_ts(expires)
                self.detail_status.setText(f"Recovery code generated. Expires {expiry_text}.")
            else:
                self.detail_status.setText("Recovery code generated.")

        self._start_task("Generating recovery code...", task, on_success)

    def _restore_user(self) -> None:
        if not self._selected_user_id:
            return
        name = self.detail_name.text()
        reply = QMessageBox.question(
            self,
            "Restore deleted entries",
            f"Restore all deleted entries for {name}? This will push them back on next sync.",
            QMessageBox.Yes | QMessageBox.No,
        )
        if reply != QMessageBox.Yes:
            return
        config = self._admin_relay_config()
        if not config:
            return

        def task():
            return admin_restore_user(config, self._selected_user_id)

        def on_success(result: dict) -> None:
            restored = result.get("restored", 0) if isinstance(result, dict) else 0
            self.detail_status.setText(f"Restored {restored} entries.")
            self._load_user_detail(self._selected_user_id)

        self._start_task("Restoring entries...", task, on_success)

    def _delete_user(self) -> None:
        if not self._selected_user_id:
            return
        name = self.detail_name.text()
        prompt = f"Type DELETE to remove {name} and all data."
        text, ok = QInputDialog.getText(self, "Delete user", prompt)
        if not ok or text.strip().upper() != "DELETE":
            return
        config = self._admin_relay_config()
        if not config:
            return

        def task():
            return admin_delete_user(config, self._selected_user_id)

        def on_success(result: dict) -> None:
            self.detail_status.setText("User deleted.")
            self._refresh_users()

        self._start_task("Deleting user...", task, on_success)

    @staticmethod
    def _format_num(value) -> str:
        if value is None:
            return "--"
        try:
            return f"{float(value):.2f}"
        except (TypeError, ValueError):
            return str(value)

    @staticmethod
    def _format_ts(value) -> str:
        if not value:
            return "--"
        try:
            text = value.replace("Z", "+00:00") if isinstance(value, str) else value
            parsed = datetime.fromisoformat(text)
            return parsed.strftime("%Y-%m-%d %H:%M")
        except Exception:
            return str(value)

    @staticmethod
    def _split_datetime(value) -> tuple[str, str]:
        if not value:
            return "--", "--"
        try:
            text = value.replace("Z", "+00:00")
            parsed = datetime.fromisoformat(text)
            return parsed.strftime("%Y-%m-%d"), parsed.strftime("%H:%M")
        except Exception:
            return str(value), ""
