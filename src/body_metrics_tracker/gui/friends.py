from __future__ import annotations

from datetime import date, datetime, timezone
import os
import threading
from uuid import UUID

from PySide6.QtCore import QThread, Qt, Signal
from PySide6.QtWidgets import (
    QApplication,
    QCheckBox,
    QDialog,
    QDialogButtonBox,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
    QInputDialog,
)

from body_metrics_tracker.core.friend_code import decode_friend_code, encode_friend_code
from body_metrics_tracker.core.models import FriendLink
from body_metrics_tracker.relay import (
    RelayConfig,
    RelayError,
    accept_invite,
    fetch_inbox,
    post_status,
    register,
    send_invite,
    send_reminder,
    update_share_settings,
)

from .state import AppState

DEFAULT_RELAY_URL = os.getenv("BMT_RELAY_URL", "").strip()


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


class FriendSettingsDialog(QDialog):
    def __init__(self, friend: FriendLink, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.friend = friend
        self.setWindowTitle(f"Share Settings - {friend.display_name}")
        layout = QVBoxLayout(self)

        info = QLabel("Choose what you want to share with this friend.")
        info.setWordWrap(True)
        layout.addWidget(info)

        form = QFormLayout()
        self.share_weight_checkbox = QCheckBox("Share my weight")
        self.share_weight_checkbox.setChecked(friend.share_weight)
        self.share_waist_checkbox = QCheckBox("Share my waist")
        self.share_waist_checkbox.setChecked(friend.share_waist)
        form.addRow("", self.share_weight_checkbox)
        form.addRow("", self.share_waist_checkbox)
        layout.addLayout(form)

        note = QLabel("Status (whether you logged today) is always shared.")
        note.setStyleSheet("color: #9aa4af;")
        note.setWordWrap(True)
        layout.addWidget(note)

        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

    def settings(self) -> tuple[bool, bool]:
        return self.share_weight_checkbox.isChecked(), self.share_waist_checkbox.isChecked()


class FriendsWidget(QWidget):
    def __init__(self, state: AppState) -> None:
        super().__init__()
        self.state = state
        self._active_profile_id = None
        self._active_worker: TaskWorker | None = None
        self._build_ui()
        self._load_profile()
        self.state.subscribe(self._on_state_changed)
        self._sync_on_open()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        header = QLabel("Friends")
        header.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(header)

        hint = QLabel("Friends are local-only for now. Share your code, then invite each other.")
        hint.setStyleSheet("color: #9aa4af;")
        hint.setWordWrap(True)
        layout.addWidget(hint)

        relay_group = QGroupBox("Relay Connection")
        relay_form = QFormLayout()
        self.relay_url_input = QLineEdit()
        self.relay_url_input.setPlaceholderText("https://your-relay.example")

        self.connect_button = QPushButton("Connect")
        self.connect_button.clicked.connect(self._on_connect_relay)
        self.refresh_button = QPushButton("Refresh")
        self.refresh_button.clicked.connect(self._on_refresh_relay)

        relay_buttons = QHBoxLayout()
        relay_buttons.addWidget(self.connect_button)
        relay_buttons.addWidget(self.refresh_button)
        relay_button_container = QWidget()
        relay_button_container.setLayout(relay_buttons)

        self.relay_status_label = QLabel("Not connected.")
        self.relay_status_label.setStyleSheet("color: #9aa4af;")
        self.relay_status_label.setWordWrap(True)

        relay_form.addRow("Relay URL", self.relay_url_input)
        relay_form.addRow("", relay_button_container)
        relay_form.addRow("", self.relay_status_label)
        relay_group.setLayout(relay_form)
        layout.addWidget(relay_group)

        code_group = QGroupBox("Your friend code")
        code_layout = QHBoxLayout(code_group)
        self.friend_code_display = QLineEdit()
        self.friend_code_display.setReadOnly(True)
        self.copy_code_button = QPushButton("Copy")
        self.copy_code_button.clicked.connect(self._copy_friend_code)
        code_layout.addWidget(self.friend_code_display, 1)
        code_layout.addWidget(self.copy_code_button)
        layout.addWidget(code_group)

        add_group = QGroupBox("Invite a friend")
        add_form = QFormLayout()
        self.friend_code_input = QLineEdit()
        self.friend_code_input.setPlaceholderText("Paste friend code")
        self.friend_name_input = QLineEdit()
        self.friend_name_input.setPlaceholderText("Name (optional)")

        self.add_friend_button = QPushButton("Send Invite")
        self.add_friend_button.clicked.connect(self._on_send_invite)

        self.import_invite_button = QPushButton("Refresh Invites")
        self.import_invite_button.clicked.connect(self._on_refresh_relay)

        invite_buttons = QHBoxLayout()
        invite_buttons.addWidget(self.add_friend_button)
        invite_buttons.addWidget(self.import_invite_button)
        invite_container = QWidget()
        invite_container.setLayout(invite_buttons)

        add_form.addRow("Friend code", self.friend_code_input)
        add_form.addRow("Name", self.friend_name_input)
        add_form.addRow("", invite_container)
        add_group.setLayout(add_form)
        layout.addWidget(add_group)

        list_group = QGroupBox("Friends")
        list_layout = QVBoxLayout(list_group)
        self.friends_table = QTableWidget(0, 4)
        self.friends_table.setHorizontalHeaderLabels(["Name", "Friend Code", "Status", "Actions"])
        self.friends_table.horizontalHeader().setStretchLastSection(True)
        self.friends_table.verticalHeader().setVisible(False)
        self.friends_table.setEditTriggers(QTableWidget.NoEditTriggers)
        self.friends_table.setSelectionBehavior(QTableWidget.SelectRows)
        list_layout.addWidget(self.friends_table)
        layout.addWidget(list_group)

        self.status_label = QLabel("")
        self.status_label.setStyleSheet("color: #6b7785;")
        layout.addWidget(self.status_label)
        layout.addStretch(1)

    def _load_profile(self) -> None:
        profile = self.state.profile
        self._active_profile_id = profile.user_id
        self.friend_code_display.setText(encode_friend_code(profile.user_id))
        if profile.relay_url:
            self.relay_url_input.setText(profile.relay_url)
        elif DEFAULT_RELAY_URL and not self.relay_url_input.text().strip():
            self.relay_url_input.setText(DEFAULT_RELAY_URL)
        self._update_relay_status(profile)
        self._refresh_table()

    def _on_state_changed(self) -> None:
        if self._active_profile_id != self.state.profile.user_id:
            self._load_profile()
            return
        self._update_relay_status(self.state.profile)
        self._refresh_table()

    def _copy_friend_code(self) -> None:
        code = self.friend_code_display.text().strip()
        if not code:
            return
        QApplication.clipboard().setText(code)
        self.status_label.setText("Friend code copied.")

    def _on_connect_relay(self) -> None:
        url = self.relay_url_input.text().strip()
        if not url:
            QMessageBox.warning(self, "Missing URL", "Enter your relay URL.")
            return
        profile = self.state.profile
        friend_code = encode_friend_code(profile.user_id)

        def task():
            return register(url, str(profile.user_id), friend_code, profile.display_name)

        def on_success(result: dict) -> None:
            token = result.get("token")
            if not token:
                raise RelayError("Relay did not return a token.")
            profile.relay_url = url
            profile.relay_token = token
            profile.relay_last_checked_at = datetime.now(timezone.utc)
            self.state.update_profile(profile)
            self._update_relay_status(profile)
            self.status_label.setText("Relay connected.")
            self._sync_on_open(force=True)

        self._start_task("Connecting to relay...", task, on_success)

    def _on_refresh_relay(self) -> None:
        config = self._relay_config()
        if not config:
            QMessageBox.information(self, "Relay Not Connected", "Connect to the relay to refresh.")
            return

        def task():
            return fetch_inbox(config)

        def on_success(result: dict) -> None:
            self._apply_inbox(result)
            self.status_label.setText("Relay updated.")

        self._start_task("Refreshing from relay...", task, on_success)

    def _on_send_invite(self) -> None:
        config = self._relay_config()
        if not config:
            QMessageBox.warning(self, "Relay Not Connected", "Connect to the relay first.")
            return
        code_text = self.friend_code_input.text().strip()
        name_text = self.friend_name_input.text().strip() or "Friend"
        if not code_text:
            QMessageBox.warning(self, "Missing Code", "Enter a friend code.")
            return
        try:
            friend_id = decode_friend_code(code_text)
        except ValueError:
            QMessageBox.warning(self, "Invalid Code", "Enter a valid friend code.")
            return
        profile = self.state.profile
        if friend_id == profile.user_id:
            QMessageBox.warning(self, "Invalid Code", "You cannot add your own friend code.")
            return

        def task():
            return send_invite(config, code_text)

        def on_success(_result: dict) -> None:
            existing = self._find_friend(friend_id)
            if existing:
                existing.display_name = name_text or existing.display_name
                if existing.status not in {"connected", "incoming"}:
                    existing.status = "invited"
            else:
                profile.friends.append(FriendLink(friend_id=friend_id, display_name=name_text, status="invited"))
            self.state.update_profile(profile)
            self.friend_code_input.clear()
            self.friend_name_input.clear()
            self.status_label.setText("Invite sent.")

        self._start_task("Sending invite...", task, on_success)

    def _refresh_table(self) -> None:
        friends = list(self.state.profile.friends)
        self.friends_table.setRowCount(0)
        for friend in friends:
            row = self.friends_table.rowCount()
            self.friends_table.insertRow(row)
            name_item = QTableWidgetItem(friend.display_name)
            code_item = QTableWidgetItem(encode_friend_code(friend.friend_id))
            status_text = self._status_label(friend.status)
            status_item = QTableWidgetItem(status_text)
            status_item.setTextAlignment(int(Qt.AlignCenter))
            self.friends_table.setItem(row, 0, name_item)
            self.friends_table.setItem(row, 1, code_item)
            self.friends_table.setItem(row, 2, status_item)

            action_widget = QWidget()
            action_layout = QHBoxLayout(action_widget)
            action_layout.setContentsMargins(0, 0, 0, 0)
            accept_button = QPushButton("Accept")
            accept_button.setEnabled(friend.status == "incoming")
            accept_button.clicked.connect(
                lambda _checked=False, friend_id=friend.friend_id: self._on_accept_friend(friend_id)
            )
            share_button = QPushButton("Share Update")
            share_button.setEnabled(friend.status == "connected")
            share_button.clicked.connect(
                lambda _checked=False, friend_id=friend.friend_id: self._on_share_update(friend_id)
            )
            reminder_button = QPushButton("Send Reminder")
            reminder_button.setEnabled(friend.status == "connected")
            reminder_button.clicked.connect(
                lambda _checked=False, friend_id=friend.friend_id: self._on_send_reminder(friend_id)
            )
            settings_button = QPushButton("Settings")
            settings_button.clicked.connect(
                lambda _checked=False, friend_id=friend.friend_id: self._on_edit_settings(friend_id)
            )
            remove_button = QPushButton("Remove")
            remove_button.clicked.connect(
                lambda _checked=False, friend_id=friend.friend_id, name=friend.display_name: self._on_remove_friend(
                    friend_id, name
                )
            )
            action_layout.addWidget(accept_button)
            action_layout.addWidget(share_button)
            action_layout.addWidget(reminder_button)
            action_layout.addWidget(settings_button)
            action_layout.addWidget(remove_button)
            action_layout.addStretch(1)
            self.friends_table.setCellWidget(row, 3, action_widget)
        self.friends_table.resizeRowsToContents()

    def _on_accept_friend(self, friend_id: UUID) -> None:
        profile = self.state.profile
        updated = False
        for friend in profile.friends:
            if friend.friend_id == friend_id:
                if friend.status != "incoming":
                    return
                friend.status = "connected"
                updated = True
                break
        if updated:
            config = self._relay_config()
            if not config:
                QMessageBox.warning(self, "Relay Not Connected", "Connect to the relay first.")
                return

            def task():
                return accept_invite(config, encode_friend_code(friend_id))

            def on_success(_result: dict) -> None:
                self.state.update_profile(profile)
                self.status_label.setText("Invite accepted.")

            self._start_task("Accepting invite...", task, on_success)

    def _on_remove_friend(self, friend_id: UUID, name: str) -> None:
        response = QMessageBox.question(
            self,
            "Remove Friend",
            f"Remove {name} from your friends list?",
            QMessageBox.Yes | QMessageBox.No,
        )
        if response != QMessageBox.Yes:
            return
        profile = self.state.profile
        profile.friends = [friend for friend in profile.friends if friend.friend_id != friend_id]
        self.state.update_profile(profile)
        self.status_label.setText("Friend removed.")

    def _on_edit_settings(self, friend_id: UUID) -> None:
        friend = self._find_friend(friend_id)
        if not friend:
            return
        dialog = FriendSettingsDialog(friend, self)
        if dialog.exec() == QDialog.Accepted:
            share_weight, share_waist = dialog.settings()
            friend.share_weight = share_weight
            friend.share_waist = share_waist
            self.state.update_profile(self.state.profile)
            config = self._relay_config()
            if not config:
                self.status_label.setText("Share settings updated (relay not connected).")
                return

            def task():
                return update_share_settings(
                    config,
                    encode_friend_code(friend.friend_id),
                    share_weight,
                    share_waist,
                )

            def on_success(_result: dict) -> None:
                self.status_label.setText("Share settings updated.")
                self._post_status_async()

            self._start_task("Saving share settings...", task, on_success)

    def _on_share_update(self, friend_id: UUID) -> None:
        if not self._relay_config():
            QMessageBox.warning(self, "Relay Not Connected", "Connect to the relay first.")
            return
        self._post_status_async(show_status=True)

    def _on_send_reminder(self, friend_id: UUID) -> None:
        friend = self._find_friend(friend_id)
        if not friend:
            return
        config = self._relay_config()
        if not config:
            QMessageBox.warning(self, "Relay Not Connected", "Connect to the relay first.")
            return
        message, ok = QInputDialog.getText(
            self,
            "Send Reminder",
            "Reminder message:",
            text="Time to log your weight today.",
        )
        if not ok:
            return
        message_text = message.strip() or "Time to log your weight today."

        def task():
            return send_reminder(config, encode_friend_code(friend.friend_id), message_text)

        def on_success(_result: dict) -> None:
            self.status_label.setText("Reminder sent.")

        self._start_task("Sending reminder...", task, on_success)


    def _sync_on_open(self, force: bool = False) -> None:
        profile = self.state.profile
        if not profile.relay_url or not profile.relay_token:
            return
        if not force and profile.relay_last_checked_at:
            elapsed = datetime.now(timezone.utc) - profile.relay_last_checked_at
            if elapsed.total_seconds() < 60:
                return
        self._post_status_async()
        self._on_refresh_relay()

    def _relay_config(self) -> RelayConfig | None:
        profile = self.state.profile
        url = self.relay_url_input.text().strip() or profile.relay_url or DEFAULT_RELAY_URL
        token = profile.relay_token
        if not url or not token:
            return None
        return RelayConfig(base_url=url, token=token)

    def _start_task(self, label: str, task, on_success) -> None:
        if self._active_worker:
            return
        self._active_worker = TaskWorker(task)
        self._active_worker.completed.connect(lambda result: self._on_task_completed(result, on_success))
        self._active_worker.failed.connect(self._on_task_failed)
        self.status_label.setText(label)
        self._active_worker.start()

    def _on_task_completed(self, result, on_success) -> None:
        self._active_worker = None
        if on_success:
            try:
                on_success(result)
            except Exception as exc:
                self.status_label.setText(f"Relay error: {exc}")

    def _on_task_failed(self, message: str) -> None:
        self._active_worker = None
        self.status_label.setText(f"Relay error: {message}")

    def _update_relay_status(self, profile) -> None:
        if profile.relay_url and profile.relay_token:
            self.relay_status_label.setText("Connected.")
        elif profile.relay_url:
            self.relay_status_label.setText("Relay URL set. Connect to finish.")
        else:
            self.relay_status_label.setText("Not connected.")

    def _apply_inbox(self, payload: dict) -> None:
        profile = self.state.profile
        incoming = payload.get("incoming_invites", [])
        reminders = payload.get("reminders", [])
        friends = payload.get("friends", [])

        for invite in incoming:
            code = str(invite.get("from_code", "")).strip()
            if not code:
                continue
            try:
                friend_id = decode_friend_code(code)
            except ValueError:
                continue
            name = str(invite.get("from_name", "Friend")).strip() or "Friend"
            existing = self._find_friend(friend_id)
            if existing:
                existing.display_name = name or existing.display_name
                if existing.status != "connected":
                    existing.status = "incoming"
            else:
                profile.friends.append(FriendLink(friend_id=friend_id, display_name=name, status="incoming"))

        for reminder in reminders:
            code = str(reminder.get("from_code", "")).strip()
            if not code:
                continue
            try:
                friend_id = decode_friend_code(code)
            except ValueError:
                continue
            name = str(reminder.get("from_name", "Friend")).strip() or "Friend"
            message = str(reminder.get("message", "")).strip() or "Time to log your weight today."
            friend = self._find_friend(friend_id)
            if not friend:
                friend = FriendLink(friend_id=friend_id, display_name=name, status="incoming")
                profile.friends.append(friend)
            friend.display_name = name or friend.display_name
            friend.last_reminder_at = datetime.now(timezone.utc)
            friend.last_reminder_message = message

        for friend_data in friends:
            code = str(friend_data.get("friend_code", "")).strip()
            if not code:
                continue
            try:
                friend_id = decode_friend_code(code)
            except ValueError:
                continue
            name = str(friend_data.get("display_name", "Friend")).strip() or "Friend"
            friend = self._find_friend(friend_id)
            if not friend:
                friend = FriendLink(friend_id=friend_id, display_name=name, status="connected")
                profile.friends.append(friend)
            friend.display_name = name or friend.display_name
            friend.status = "connected"
            friend.last_entry_logged_today = friend_data.get("logged_today")
            last_entry_date = friend_data.get("last_entry_date")
            friend.last_entry_date = date.fromisoformat(last_entry_date) if last_entry_date else None
            weight_kg = friend_data.get("weight_kg")
            waist_cm = friend_data.get("waist_cm")
            friend.last_weight_kg = float(weight_kg) if weight_kg is not None else None
            friend.last_waist_cm = float(waist_cm) if waist_cm is not None else None
            share = friend_data.get("share_settings") or {}
            if share:
                friend.share_weight = bool(share.get("share_weight", friend.share_weight))
                friend.share_waist = bool(share.get("share_waist", friend.share_waist))

        profile.relay_last_checked_at = datetime.now(timezone.utc)
        self.state.update_profile(profile)

    def _post_status_async(self, show_status: bool = False) -> None:
        config = self._relay_config()
        if not config:
            return
        logged_today, last_entry_date, weight_kg, waist_cm = self._current_status_payload()

        def task() -> None:
            post_status(config, logged_today, last_entry_date, weight_kg, waist_cm)

        def run() -> None:
            try:
                task()
                if show_status:
                    self.status_label.setText("Status shared.")
            except Exception:
                if show_status:
                    self.status_label.setText("Failed to share status.")

        threading.Thread(target=run, daemon=True).start()

    def _current_status_payload(self) -> tuple[bool, date | None, float | None, float | None]:
        entries = [entry for entry in self.state.entries if not entry.is_deleted]
        today = date.today()
        logged_today = any(entry.measured_at.date() == today for entry in entries)
        last_entry_date = entries[-1].date_local if entries else None
        share_weight = any(
            friend.share_weight for friend in self.state.profile.friends if friend.status == "connected"
        )
        share_waist = any(
            friend.share_waist for friend in self.state.profile.friends if friend.status == "connected"
        )
        if entries:
            last = entries[-1]
            weight_kg = last.weight_kg if share_weight else None
            waist_cm = last.waist_cm if share_waist else None
        else:
            weight_kg = None
            waist_cm = None
        return logged_today, last_entry_date, weight_kg, waist_cm

    def _find_friend(self, friend_id: UUID) -> FriendLink | None:
        for friend in self.state.profile.friends:
            if friend.friend_id == friend_id:
                return friend
        return None

    def _status_label(self, status: str) -> str:
        if status in {"connected", "accepted"}:
            return "Connected"
        if status == "incoming":
            return "Incoming"
        return "Invited"
