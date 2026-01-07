from __future__ import annotations

from datetime import date, datetime, timezone
import threading
from uuid import UUID

from PySide6.QtCore import QByteArray, QThread, Qt, Signal, QTimer
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
from body_metrics_tracker.core.models import FriendLink, SharedEntry
from body_metrics_tracker.config import DEFAULT_RELAY_URL
from body_metrics_tracker.relay import (
    RelayConfig,
    RelayError,
    accept_invite,
    fetch_inbox,
    fetch_history,
    post_status,
    push_history,
    register,
    remove_friend,
    send_invite,
    send_reminder,
    update_share_settings,
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
            name_item = QTableWidgetItem(friend.display_name)
            icon = self._avatar_icon(friend.avatar_b64)
            if icon is not None:
                name_item.setIcon(icon)
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
            self._push_history_async()
            self._pull_history_async()

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
