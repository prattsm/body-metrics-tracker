from __future__ import annotations

from datetime import date, datetime, timezone
import threading
from uuid import UUID

from PySide6.QtCore import QByteArray, QThread, Qt, Signal, QTimer, QSize
from PySide6.QtGui import QIcon, QPixmap
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

from body_metrics_tracker.core.friend_code import (
    decode_friend_code,
    encode_friend_code,
    encode_friend_code_compact,
)
from body_metrics_tracker.core.models import (
    FriendLink,
    LengthUnit,
    MeasurementEntry,
    ReminderRule,
    SharedEntry,
    UserProfile,
    WeightUnit,
    utc_now,
)
from body_metrics_tracker.config import DEFAULT_RELAY_URL
from body_metrics_tracker.relay import (
    RelayConfig,
    RelayError,
    accept_invite,
    delete_reminder_schedule,
    fetch_inbox,
    fetch_history,
    fetch_profile_settings,
    fetch_self_history,
    list_reminder_schedules,
    post_status,
    push_history,
    register,
    remove_friend,
    send_invite,
    send_reminder,
    upsert_reminder_schedule,
    update_profile,
    update_profile_settings,
    update_share_settings,
)

from .state import AppState
from .theme import apply_app_theme


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
        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Name")
        self.name_input.setText(friend.display_name)
        self.share_weight_checkbox = QCheckBox("Share my weight")
        self.share_weight_checkbox.setChecked(friend.share_weight)
        self.share_waist_checkbox = QCheckBox("Share my waist")
        self.share_waist_checkbox.setChecked(friend.share_waist)
        form.addRow("Name", self.name_input)
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

    def settings(self) -> tuple[str, bool, bool]:
        name = self.name_input.text().strip()
        return name, self.share_weight_checkbox.isChecked(), self.share_waist_checkbox.isChecked()


class FriendsWidget(QWidget):
    def __init__(self, state: AppState) -> None:
        super().__init__()
        self.state = state
        self._active_profile_id = None
        self._active_workers: list[TaskWorker] = []
        self._last_status_payload: tuple[bool, date | None, float | None, float | None] | None = None
        self._last_profile_sync: tuple[str, str | None] | None = None
        self._build_ui()
        self._load_profile()
        self.state.subscribe(self._on_state_changed)
        self._sync_on_open()
        self._start_auto_sync()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        header = QLabel("Friends")
        header.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(header)

        hint = QLabel("Share your friend code, send invites, and accept connections.")
        hint.setStyleSheet("color: #9aa4af;")
        hint.setWordWrap(True)
        layout.addWidget(hint)

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

        self.import_invite_button = QPushButton("Check for Invites")
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
        self.friends_table.verticalHeader().setDefaultSectionSize(36)
        self.friends_table.setIconSize(QSize(28, 28))
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
        self._last_status_payload = None
        self.friend_code_display.setText(encode_friend_code(profile.user_id))
        if not profile.relay_url and DEFAULT_RELAY_URL:
            profile.relay_url = DEFAULT_RELAY_URL
            self.state.update_profile(profile)
        self._refresh_table()

    def _on_state_changed(self) -> None:
        if self._active_profile_id != self.state.profile.user_id:
            self._load_profile()
            return
        self._refresh_table()
        self._maybe_post_status()
        self._push_history_async()
        self._sync_profile_async()

    def _copy_friend_code(self) -> None:
        code = self.friend_code_display.text().strip()
        if not code:
            return
        QApplication.clipboard().setText(code)
        self.status_label.setText("Friend code copied.")

    def _on_refresh_relay(self, *, show_errors: bool = True) -> None:
        def run_refresh() -> None:
            config = self._relay_config()
            if not config:
                return

            def task():
                return fetch_inbox(config)

            def on_success(result: dict) -> None:
                self._apply_inbox(result)
                self.status_label.setText("Relay updated.")

            self._start_task("Refreshing from relay...", task, on_success)

        self._ensure_relay_connected_async(run_refresh, show_errors=show_errors)

    def _on_send_invite(self) -> None:
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

        normalized_code = encode_friend_code_compact(friend_id)

        def after_connected() -> None:
            config = self._relay_config()
            if not config:
                return

            def task():
                return send_invite(config, normalized_code)

            def on_success(_result: dict) -> None:
                existing = self._find_friend(friend_id)
                if existing:
                    if name_text:
                        existing.display_name = name_text
                        existing.name_overridden = True
                    if existing.status not in {"connected", "incoming"}:
                        existing.status = "invited"
                else:
                    profile.friends.append(
                        FriendLink(
                            friend_id=friend_id,
                            display_name=name_text,
                            status="invited",
                            name_overridden=bool(name_text),
                        )
                    )
                self.state.update_profile(profile)
                self.friend_code_input.clear()
                self.friend_name_input.clear()
                self.status_label.setText("Invite sent.")

            self._start_task("Sending invite...", task, on_success)

        self._ensure_relay_connected_async(after_connected, show_errors=True)

    def _refresh_table(self) -> None:
        friends = list(self.state.profile.friends)
        self.friends_table.setRowCount(0)
        for friend in friends:
            row = self.friends_table.rowCount()
            self.friends_table.insertRow(row)
            name_item = QTableWidgetItem("")
            self.friends_table.setItem(row, 0, name_item)
            self.friends_table.setCellWidget(row, 0, self._friend_name_widget(friend))
            code_item = QTableWidgetItem(encode_friend_code(friend.friend_id))
            status_text = self._status_label(friend.status)
            status_item = QTableWidgetItem(status_text)
            status_item.setTextAlignment(int(Qt.AlignCenter))
            self.friends_table.setItem(row, 1, code_item)
            self.friends_table.setItem(row, 2, status_item)

            action_widget = QWidget()
            action_layout = QHBoxLayout(action_widget)
            action_layout.setContentsMargins(0, 0, 0, 0)
            if friend.status == "incoming":
                accept_button = QPushButton("Accept")
                accept_button.clicked.connect(
                    lambda _checked=False, friend_id=friend.friend_id: self._on_accept_friend(friend_id)
                )
                action_layout.addWidget(accept_button)
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
            action_layout.addWidget(reminder_button)
            action_layout.addWidget(settings_button)
            action_layout.addWidget(remove_button)
            action_layout.addStretch(1)
            self.friends_table.setCellWidget(row, 3, action_widget)
        self.friends_table.resizeRowsToContents()

    def _friend_name_widget(self, friend: FriendLink) -> QWidget:
        widget = QWidget()
        layout = QHBoxLayout(widget)
        layout.setContentsMargins(4, 0, 4, 0)
        layout.setSpacing(8)
        avatar = QLabel()
        avatar.setFixedSize(28, 28)
        avatar.setAlignment(Qt.AlignCenter)
        pixmap = self._avatar_pixmap(friend.avatar_b64, 28)
        if pixmap is not None:
            avatar.setPixmap(pixmap)
        else:
            initial = (friend.display_name or "?").strip()[:1].upper() or "?"
            avatar.setText(initial)
            avatar.setStyleSheet(
                "background: #e6edf5; color: #6b7785; border-radius: 14px; font-weight: 600;"
            )
        name = QLabel(friend.display_name)
        layout.addWidget(avatar)
        layout.addWidget(name)
        layout.addStretch(1)
        return widget

    def _avatar_pixmap(self, avatar_b64: str | None, size: int) -> QPixmap | None:
        if not avatar_b64:
            return None
        try:
            data = QByteArray.fromBase64(avatar_b64.encode("ascii"))
        except Exception:
            return None
        pixmap = QPixmap()
        if not pixmap.loadFromData(data):
            return None
        return pixmap.scaled(size, size, Qt.KeepAspectRatioByExpanding, Qt.SmoothTransformation)

    def _on_accept_friend(self, friend_id: UUID) -> None:
        profile = self.state.profile
        friend = self._find_friend(friend_id)
        if not friend or friend.status != "incoming":
            return

        def after_connected() -> None:
            config = self._relay_config()
            if not config:
                return

            def task():
                return accept_invite(config, encode_friend_code_compact(friend_id))

            def on_success(_result: dict) -> None:
                friend.status = "connected"
                self.state.update_profile(profile)
                self.status_label.setText("Invite accepted.")

            self._start_task("Accepting invite...", task, on_success)

        self._ensure_relay_connected_async(after_connected, show_errors=True)

    def _on_remove_friend(self, friend_id: UUID, name: str) -> None:
        response = QMessageBox.question(
            self,
            "Remove Friend",
            f"Remove {name} from your friends list?",
            QMessageBox.Yes | QMessageBox.No,
        )
        if response != QMessageBox.Yes:
            return
        def after_connected() -> None:
            config = self._relay_config()
            if not config:
                return

            def task():
                return remove_friend(config, encode_friend_code_compact(friend_id))

            def on_success(_result: dict) -> None:
                profile = self.state.profile
                profile.friends = [friend for friend in profile.friends if friend.friend_id != friend_id]
                self.state.update_profile(profile)
                self.status_label.setText("Friend removed.")

            self._start_task("Removing friend...", task, on_success)

        self._ensure_relay_connected_async(after_connected, show_errors=True)

    def _on_edit_settings(self, friend_id: UUID) -> None:
        friend = self._find_friend(friend_id)
        if not friend:
            return
        dialog = FriendSettingsDialog(friend, self)
        if dialog.exec() == QDialog.Accepted:
            display_name, share_weight, share_waist = dialog.settings()
            if display_name:
                friend.display_name = display_name
                friend.name_overridden = True
            friend.share_weight = share_weight
            friend.share_waist = share_waist
            self.state.update_profile(self.state.profile)

            def after_connected() -> None:
                config = self._relay_config()
                if not config:
                    return

                def task():
                    return update_share_settings(
                        config,
                        encode_friend_code_compact(friend.friend_id),
                        share_weight,
                        share_waist,
                    )

                def on_success(_result: dict) -> None:
                    self.status_label.setText("Share settings updated.")
                    self._post_status_async()
                    self._push_history_async()

                self._start_task("Saving share settings...", task, on_success)

            self._ensure_relay_connected_async(after_connected, show_errors=True)

    def _on_send_reminder(self, friend_id: UUID) -> None:
        friend = self._find_friend(friend_id)
        if not friend:
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

        def after_connected() -> None:
            config = self._relay_config()
            if not config:
                return

            def task():
                return send_reminder(config, encode_friend_code_compact(friend.friend_id), message_text)

            def on_success(_result: dict) -> None:
                self.status_label.setText("Reminder sent.")

            self._start_task("Sending reminder...", task, on_success)

        self._ensure_relay_connected_async(after_connected, show_errors=True)


    def _sync_on_open(self, force: bool = False) -> None:
        profile = self.state.profile
        if not force and profile.relay_last_checked_at:
            elapsed = datetime.now(timezone.utc) - profile.relay_last_checked_at
            if elapsed.total_seconds() < 60:
                return

        def after_connected() -> None:
            self._post_status_async()
            self._on_refresh_relay(show_errors=False)
            self._sync_settings_async()
            self._push_history_async()
            self._sync_self_history_async()
            self._pull_history_async()
            self._sync_reminders_async()

        self._ensure_relay_connected_async(after_connected, show_errors=False)

    def _relay_config(self) -> RelayConfig | None:
        profile = self.state.profile
        url = profile.relay_url or DEFAULT_RELAY_URL
        token = profile.relay_token
        if not url or not token:
            return None
        return RelayConfig(base_url=url, token=token)

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
                self.status_label.setText(f"Relay error: {exc}")

    def _on_task_failed(self, message: str, worker: TaskWorker) -> None:
        if worker in self._active_workers:
            self._active_workers.remove(worker)
        self.status_label.setText(f"Relay error: {message}")

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
            avatar_b64 = invite.get("from_avatar")
            existing = self._find_friend(friend_id)
            if existing:
                if not existing.name_overridden:
                    existing.display_name = name or existing.display_name
                if avatar_b64:
                    existing.avatar_b64 = avatar_b64
                if existing.status != "connected":
                    existing.status = "incoming"
            else:
                profile.friends.append(
                    FriendLink(friend_id=friend_id, display_name=name, status="incoming", avatar_b64=avatar_b64)
                )

        for reminder in reminders:
            code = str(reminder.get("from_code", "")).strip()
            if not code:
                continue
            try:
                friend_id = decode_friend_code(code)
            except ValueError:
                continue
            name = str(reminder.get("from_name", "Friend")).strip() or "Friend"
            avatar_b64 = reminder.get("from_avatar")
            message = str(reminder.get("message", "")).strip() or "Time to log your weight today."
            friend = self._find_friend(friend_id)
            if not friend:
                friend = FriendLink(
                    friend_id=friend_id,
                    display_name=name,
                    status="incoming",
                    avatar_b64=avatar_b64,
                )
                profile.friends.append(friend)
            if not friend.name_overridden:
                friend.display_name = name or friend.display_name
            if avatar_b64:
                friend.avatar_b64 = avatar_b64
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
            avatar_b64 = friend_data.get("avatar_b64")
            friend = self._find_friend(friend_id)
            if not friend:
                friend = FriendLink(friend_id=friend_id, display_name=name, status="connected", avatar_b64=avatar_b64)
                profile.friends.append(friend)
            if not friend.name_overridden:
                friend.display_name = name or friend.display_name
            if avatar_b64:
                friend.avatar_b64 = avatar_b64
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
            share_from_friend = friend_data.get("share_from_friend") or {}
            if share_from_friend:
                friend.received_share_weight = bool(
                    share_from_friend.get("share_weight", friend.received_share_weight)
                )
                friend.received_share_waist = bool(
                    share_from_friend.get("share_waist", friend.received_share_waist)
                )

        connected_ids = set()
        for friend_data in friends:
            code = str(friend_data.get("friend_code", "")).strip()
            if not code:
                continue
            try:
                connected_ids.add(decode_friend_code(code))
            except ValueError:
                continue
        profile.friends = [
            friend
            for friend in profile.friends
            if friend.status != "connected" or friend.friend_id in connected_ids
        ]

        profile.relay_last_checked_at = datetime.now(timezone.utc)
        self.state.update_profile(profile)

    def _apply_history(self, payload: dict) -> None:
        profile = self.state.profile
        friends = payload.get("friends", [])
        newest_update = profile.relay_last_history_pull_at
        for friend_data in friends:
            code = str(friend_data.get("friend_code", "")).strip()
            if not code:
                continue
            try:
                friend_id = decode_friend_code(code)
            except ValueError:
                continue
            name = str(friend_data.get("display_name", "Friend")).strip() or "Friend"
            avatar_b64 = friend_data.get("avatar_b64")
            friend = self._find_friend(friend_id)
            if not friend:
                friend = FriendLink(friend_id=friend_id, display_name=name, status="connected", avatar_b64=avatar_b64)
                profile.friends.append(friend)
            if not friend.name_overridden:
                friend.display_name = name or friend.display_name
            if avatar_b64:
                friend.avatar_b64 = avatar_b64
            share_from_friend = friend_data.get("share_from_friend") or {}
            friend.received_share_weight = bool(share_from_friend.get("share_weight", False))
            friend.received_share_waist = bool(share_from_friend.get("share_waist", False))
            entries_payload = friend_data.get("entries", [])
            if entries_payload:
                self._merge_shared_entries(friend, entries_payload)
                last_update = self._latest_shared_update(friend)
                if last_update and (newest_update is None or last_update > newest_update):
                    newest_update = last_update
        if newest_update:
            profile.relay_last_history_pull_at = newest_update
        else:
            profile.relay_last_history_pull_at = datetime.now(timezone.utc)
        self.state.update_profile(profile)

    def _sync_settings_async(self) -> None:
        config = self._relay_config()
        if not config:
            return

        def task():
            return fetch_profile_settings(config)

        def on_success(result: dict) -> None:
            self._reconcile_settings(config, result)

        self._start_task("", task, on_success)

    def _reconcile_settings(self, config: RelayConfig, payload: dict) -> None:
        profile = self.state.profile
        remote_settings = payload.get("settings") if isinstance(payload, dict) else None
        remote_updated = self._parse_timestamp(payload.get("updated_at")) if payload else None
        local_updated = profile.settings_updated_at
        if remote_updated and (local_updated is None or remote_updated > local_updated):
            changed = self._apply_settings_payload(profile, remote_settings)
            profile.settings_updated_at = remote_updated
            self.state.update_profile(profile)
            if changed:
                app = QApplication.instance()
                if app is not None:
                    apply_app_theme(
                        app,
                        accent_color=profile.accent_color,
                        dark_mode=profile.dark_mode,
                    )
            return
        if local_updated and (remote_updated is None or local_updated > remote_updated):
            settings_payload = self._build_settings_payload(profile, remote_settings)

            def task():
                return update_profile_settings(config, settings_payload)

            def on_success(result: dict) -> None:
                updated = self._parse_timestamp(result.get("updated_at")) if result else None
                profile.settings_updated_at = updated or utc_now()
                self.state.update_profile(profile)

            self._start_task("", task, on_success)
            return
        if local_updated is None and remote_updated is None:
            settings_payload = self._build_settings_payload(profile, remote_settings)

            def task():
                return update_profile_settings(config, settings_payload)

            def on_success(result: dict) -> None:
                updated = self._parse_timestamp(result.get("updated_at")) if result else None
                profile.settings_updated_at = updated or utc_now()
                self.state.update_profile(profile)

            self._start_task("", task, on_success)

    def _apply_settings_payload(self, profile: UserProfile, settings: dict | None) -> bool:
        if not isinstance(settings, dict):
            return False
        changed = False
        if isinstance(settings.get("display_name"), str) and settings["display_name"] != profile.display_name:
            profile.display_name = settings["display_name"]
            changed = True
        if "avatar_b64" in settings and settings["avatar_b64"] != profile.avatar_b64:
            profile.avatar_b64 = settings.get("avatar_b64")
            changed = True
        if settings.get("weight_unit") in {WeightUnit.KG.value, WeightUnit.LB.value}:
            next_unit = WeightUnit(settings["weight_unit"])
            if next_unit != profile.weight_unit:
                profile.weight_unit = next_unit
                changed = True
        if settings.get("waist_unit") in {LengthUnit.CM.value, LengthUnit.IN.value}:
            next_unit = LengthUnit(settings["waist_unit"])
            if next_unit != profile.waist_unit:
                profile.waist_unit = next_unit
                changed = True
        if isinstance(settings.get("track_waist"), bool) and settings["track_waist"] != profile.track_waist:
            profile.track_waist = settings["track_waist"]
            if not profile.track_waist:
                profile.goal_waist_cm = None
            changed = True
        if isinstance(settings.get("accent_color"), str) and settings["accent_color"] != profile.accent_color:
            profile.accent_color = settings["accent_color"]
            changed = True
        if isinstance(settings.get("dark_mode"), bool) and settings["dark_mode"] != profile.dark_mode:
            profile.dark_mode = settings["dark_mode"]
            changed = True
        if "goal_weight_kg" in settings and settings["goal_weight_kg"] != profile.goal_weight_kg:
            profile.goal_weight_kg = settings.get("goal_weight_kg")
            changed = True
        if "goal_weight_band_kg" in settings and settings["goal_weight_band_kg"] != profile.goal_weight_band_kg:
            profile.goal_weight_band_kg = settings.get("goal_weight_band_kg")
            changed = True
        if "goal_waist_cm" in settings and settings["goal_waist_cm"] != profile.goal_waist_cm:
            profile.goal_waist_cm = settings.get("goal_waist_cm")
            changed = True
        if "goal_waist_band_cm" in settings and settings["goal_waist_band_cm"] != profile.goal_waist_band_cm:
            profile.goal_waist_band_cm = settings.get("goal_waist_band_cm")
            changed = True
        if isinstance(settings.get("waist_convention_label"), str) and settings["waist_convention_label"] != profile.waist_convention_label:
            profile.waist_convention_label = settings["waist_convention_label"]
            changed = True
        if isinstance(settings.get("timezone"), str) and settings["timezone"] != profile.timezone:
            profile.timezone = settings["timezone"]
            changed = True
        return changed

    def _build_settings_payload(self, profile: UserProfile, existing: dict | None) -> dict:
        payload = dict(existing) if isinstance(existing, dict) else {}
        payload.update(
            {
                "display_name": profile.display_name,
                "avatar_b64": profile.avatar_b64,
                "weight_unit": profile.weight_unit.value,
                "waist_unit": profile.waist_unit.value,
                "track_waist": profile.track_waist,
                "accent_color": profile.accent_color,
                "dark_mode": profile.dark_mode,
                "goal_weight_kg": profile.goal_weight_kg,
                "goal_weight_band_kg": profile.goal_weight_band_kg,
                "goal_waist_cm": profile.goal_waist_cm,
                "goal_waist_band_cm": profile.goal_waist_band_cm,
                "waist_convention_label": profile.waist_convention_label,
                "timezone": profile.timezone,
            }
        )
        return payload

    def _sync_self_history_async(self) -> None:
        config = self._relay_config()
        if not config:
            return
        profile = self.state.profile
        since = profile.relay_last_self_history_pull_at

        def task():
            return fetch_self_history(config, since)

        def on_success(result: dict) -> None:
            self._apply_self_history(result)

        self._start_task("", task, on_success)

    def _apply_self_history(self, payload: dict) -> None:
        profile = self.state.profile
        entries_payload = payload.get("entries", []) if isinstance(payload, dict) else []
        newest_update = profile.relay_last_self_history_pull_at
        existing = {entry.entry_id: entry for entry in self.state.entries}
        for entry_data in entries_payload:
            entry_id_text = entry_data.get("entry_id")
            if not entry_id_text:
                continue
            try:
                entry_id = UUID(entry_id_text)
            except (ValueError, TypeError):
                continue
            updated_at_text = entry_data.get("updated_at")
            if not updated_at_text:
                continue
            updated_at = self._parse_timestamp(updated_at_text)
            if updated_at is None:
                continue
            local = existing.get(entry_id)
            if local and local.updated_at >= updated_at:
                continue
            if entry_data.get("is_deleted"):
                if local:
                    local.is_deleted = True
                    local.deleted_at = updated_at
                    local.updated_at = updated_at
                    self.state.update_entry(local)
                if newest_update is None or updated_at > newest_update:
                    newest_update = updated_at
                continue
            measured_at_text = entry_data.get("measured_at")
            measured_at = self._parse_timestamp(measured_at_text) if measured_at_text else None
            if measured_at is None:
                continue
            date_local_text = entry_data.get("date_local")
            try:
                date_local = date.fromisoformat(date_local_text) if date_local_text else measured_at.date()
            except ValueError:
                date_local = measured_at.date()
            weight_kg = entry_data.get("weight_kg")
            if weight_kg is None:
                continue
            waist_cm = entry_data.get("waist_cm")
            note = entry_data.get("note")
            if local:
                local.measured_at = measured_at
                local.date_local = date_local
                local.weight_kg = float(weight_kg)
                local.waist_cm = float(waist_cm) if waist_cm is not None else None
                local.note = note
                local.updated_at = updated_at
                local.is_deleted = False
                local.deleted_at = None
                local.version += 1
                self.state.update_entry(local)
            else:
                entry = MeasurementEntry(
                    entry_id=entry_id,
                    user_id=profile.user_id,
                    measured_at=measured_at,
                    date_local=date_local,
                    weight_kg=float(weight_kg),
                    waist_cm=float(waist_cm) if waist_cm is not None else None,
                    note=note,
                    created_at=updated_at,
                    updated_at=updated_at,
                    is_deleted=False,
                    deleted_at=None,
                    version=1,
                )
                self.state.add_entry(entry)
            if newest_update is None or updated_at > newest_update:
                newest_update = updated_at
        profile.relay_last_self_history_pull_at = newest_update or datetime.now(timezone.utc)
        self.state.update_profile(profile)

    def _sync_reminders_async(self) -> None:
        config = self._relay_config()
        if not config:
            return

        def task():
            return list_reminder_schedules(config)

        def on_success(result: dict) -> None:
            self._merge_reminder_schedules(config, result)

        self._start_task("", task, on_success)

    def _merge_reminder_schedules(self, config: RelayConfig, payload: dict) -> None:
        profile = self.state.profile
        remote = payload.get("reminders", []) if isinstance(payload, dict) else []
        remote_by_id: dict[UUID, dict] = {}
        for item in remote:
            reminder_id = item.get("id")
            try:
                remote_by_id[UUID(reminder_id)] = item
            except (TypeError, ValueError):
                continue
        last_sync = profile.relay_last_reminder_sync_at
        pending_upserts: list[ReminderRule] = []
        pending_deletes: list[ReminderRule] = []
        next_reminders: list[ReminderRule] = []
        for rule in profile.self_reminders:
            remote_item = remote_by_id.get(rule.reminder_id)
            if rule.is_deleted:
                if remote_item:
                    pending_deletes.append(rule)
                    next_reminders.append(rule)
                continue
            if remote_item:
                remote_updated = self._parse_timestamp(remote_item.get("updated_at")) if remote_item else None
                if remote_updated and (rule.updated_at is None or remote_updated > rule.updated_at):
                    self._apply_remote_reminder(rule, remote_item, remote_updated)
                elif rule.updated_at and (remote_updated is None or rule.updated_at > remote_updated):
                    pending_upserts.append(rule)
                next_reminders.append(rule)
            else:
                if last_sync is None or (rule.updated_at and rule.updated_at > last_sync):
                    pending_upserts.append(rule)
                    next_reminders.append(rule)
                else:
                    continue
        for reminder_id, item in remote_by_id.items():
            if any(rule.reminder_id == reminder_id for rule in next_reminders):
                continue
            next_reminders.append(self._reminder_from_payload(reminder_id, item))
        profile.self_reminders = next_reminders
        if pending_upserts or pending_deletes:

            def task():
                for rule in pending_upserts:
                    upsert_reminder_schedule(config, self._reminder_payload(rule))
                for rule in pending_deletes:
                    delete_reminder_schedule(config, str(rule.reminder_id))
                return True

            def on_success(_result: object) -> None:
                profile.relay_last_reminder_sync_at = utc_now()
                profile.self_reminders = [rule for rule in profile.self_reminders if not rule.is_deleted]
                self.state.update_profile(profile)

            self._start_task("", task, on_success)
        else:
            profile.relay_last_reminder_sync_at = utc_now()
            self.state.update_profile(profile)

    def _apply_remote_reminder(self, rule: ReminderRule, data: dict, updated_at: datetime | None) -> None:
        rule.message = data.get("message") or rule.message
        rule.time = data.get("time") or rule.time
        rule.days = list(data.get("days") or rule.days or [0, 1, 2, 3, 4, 5, 6])
        rule.enabled = data.get("enabled", True) is True
        rule.updated_at = updated_at or utc_now()
        rule.is_deleted = False
        rule.deleted_at = None

    def _reminder_from_payload(self, reminder_id: UUID, data: dict) -> ReminderRule:
        updated_at = self._parse_timestamp(data.get("updated_at")) if data else None
        return ReminderRule(
            reminder_id=reminder_id,
            message=data.get("message", "Time to log your weight today."),
            time=data.get("time", "08:00"),
            days=list(data.get("days") or [0, 1, 2, 3, 4, 5, 6]),
            enabled=data.get("enabled", True) is True,
            updated_at=updated_at or utc_now(),
            is_deleted=False,
        )

    def _reminder_payload(self, rule: ReminderRule) -> dict:
        return {
            "id": str(rule.reminder_id),
            "message": rule.message,
            "time": rule.time,
            "days": list(rule.days),
            "enabled": rule.enabled,
            "timezone": self._local_timezone(),
        }

    def _local_timezone(self) -> str:
        tzinfo = datetime.now().astimezone().tzinfo
        if tzinfo is not None and hasattr(tzinfo, "key"):
            return tzinfo.key  # type: ignore[return-value]
        return "UTC"

    def _merge_shared_entries(self, friend: FriendLink, entries_payload: list[dict]) -> None:
        existing = {entry.entry_id: entry for entry in friend.shared_entries}
        for payload in entries_payload:
            entry_id_text = payload.get("entry_id")
            if not entry_id_text:
                continue
            try:
                entry_id = UUID(entry_id_text)
            except (ValueError, TypeError):
                continue
            updated_at_text = payload.get("updated_at")
            if not updated_at_text:
                continue
            updated_at = self._parse_timestamp(updated_at_text)
            if updated_at is None:
                continue
            is_deleted = bool(payload.get("is_deleted", False))
            if is_deleted:
                if entry_id in existing:
                    del existing[entry_id]
                continue
            measured_at_text = payload.get("measured_at")
            if not measured_at_text:
                continue
            measured_at = self._parse_timestamp(measured_at_text)
            if measured_at is None:
                continue
            date_local_text = payload.get("date_local")
            try:
                date_local = date.fromisoformat(date_local_text) if date_local_text else None
            except ValueError:
                date_local = None
            entry = SharedEntry(
                entry_id=entry_id,
                measured_at=measured_at,
                date_local=date_local,
                weight_kg=payload.get("weight_kg"),
                waist_cm=payload.get("waist_cm"),
                updated_at=updated_at,
                is_deleted=False,
            )
            existing[entry_id] = entry
        friend.shared_entries = sorted(existing.values(), key=lambda item: item.measured_at)

    def _latest_shared_update(self, friend: FriendLink) -> datetime | None:
        if not friend.shared_entries:
            return None
        return max(entry.updated_at for entry in friend.shared_entries)

    def _parse_timestamp(self, value: str) -> datetime | None:
        if not value:
            return None
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    def _sync_profile_async(self) -> None:
        config = self._relay_config()
        if not config:
            return
        profile = self.state.profile
        payload = (profile.display_name, profile.avatar_b64)
        if self._last_profile_sync == payload:
            return
        if profile.avatar_b64 and len(profile.avatar_b64) > 60000:
            if not self.status_label.text():
                self.status_label.setText("Profile photo too large to sync. Re-upload in Profile.")
            return

        def run() -> None:
            try:
                update_profile(config, profile.display_name, profile.avatar_b64)
            except Exception:
                return
            self._last_profile_sync = payload

        threading.Thread(target=run, daemon=True).start()

    def _ensure_relay_connected_async(self, on_ready, *, show_errors: bool) -> None:
        profile = self.state.profile
        url = profile.relay_url or DEFAULT_RELAY_URL
        if not url:
            if show_errors:
                message = "Relay is not configured. Please contact the admin."
                self.status_label.setText(message)
                QMessageBox.warning(self, "Relay Not Configured", message)
            return
        if profile.relay_token:
            if profile.relay_url != url:
                profile.relay_url = url
                self.state.update_profile(profile)
            self._sync_profile_async()
            on_ready()
            return
        friend_code = encode_friend_code_compact(profile.user_id)

        def task():
            return register(url, str(profile.user_id), friend_code, profile.display_name, profile.avatar_b64)

        def on_success(result: dict) -> None:
            token = result.get("token")
            if not token:
                raise RelayError("Relay did not return a token.")
            profile.relay_url = url
            profile.relay_token = token
            profile.relay_last_checked_at = datetime.now(timezone.utc)
            self.state.update_profile(profile)
            self.status_label.setText("Relay connected.")
            self._sync_profile_async()
            on_ready()

        self._start_task("Connecting to relay...", task, on_success)

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

    def _push_history_async(self) -> None:
        config = self._relay_config()
        if not config:
            return
        profile = self.state.profile
        entries = [entry for entry in self.state.entries]
        if not entries:
            return
        since = profile.relay_last_history_push_at
        if since:
            entries = [entry for entry in entries if entry.updated_at > since]
        if not entries:
            return
        payload_entries = [self._serialize_entry(entry) for entry in entries]
        latest = max(entry.updated_at for entry in entries)

        def task():
            return push_history(config, payload_entries)

        def on_success(_result: dict) -> None:
            profile.relay_last_history_push_at = latest
            self.state.update_profile(profile)

        self._start_task("", task, on_success)

    def _pull_history_async(self) -> None:
        config = self._relay_config()
        if not config:
            return
        profile = self.state.profile
        since = None if self._needs_full_history() else profile.relay_last_history_pull_at

        def task():
            return fetch_history(config, since)

        def on_success(result: dict) -> None:
            self._apply_history(result)

        self._start_task("", task, on_success)

    def _needs_full_history(self) -> bool:
        for friend in self.state.profile.friends:
            if friend.status != "connected":
                continue
            if friend.received_share_weight or friend.received_share_waist:
                if not friend.shared_entries:
                    return True
        return False

    def _serialize_entry(self, entry) -> dict[str, object]:
        return {
            "entry_id": str(entry.entry_id),
            "measured_at": entry.measured_at.isoformat(),
            "date_local": entry.date_local.isoformat() if entry.date_local else None,
            "weight_kg": entry.weight_kg,
            "waist_cm": entry.waist_cm,
            "note": entry.note,
            "updated_at": entry.updated_at.isoformat(),
            "is_deleted": entry.is_deleted,
        }

    def _maybe_post_status(self) -> None:
        payload = self._current_status_payload()
        if payload == self._last_status_payload:
            return
        self._last_status_payload = payload
        self._post_status_async()

    def _start_auto_sync(self) -> None:
        self._relay_timer = QTimer(self)
        self._relay_timer.setInterval(10000)
        self._relay_timer.timeout.connect(self._on_relay_timer)
        self._relay_timer.start()

    def _on_relay_timer(self) -> None:
        if len(self._active_workers) >= 2:
            return
        self._sync_on_open(force=True)

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

    def _avatar_icon(self, avatar_b64: str | None) -> QIcon | None:
        if not avatar_b64:
            return None
        try:
            data = QByteArray.fromBase64(avatar_b64.encode("ascii"))
        except Exception:
            return None
        pixmap = QPixmap()
        if not pixmap.loadFromData(data):
            return None
        pixmap = pixmap.scaled(24, 24, Qt.KeepAspectRatioByExpanding, Qt.SmoothTransformation)
        return QIcon(pixmap)

    def _status_label(self, status: str) -> str:
        if status in {"connected", "accepted"}:
            return "Connected"
        if status == "incoming":
            return "Incoming"
        return "Invited"
