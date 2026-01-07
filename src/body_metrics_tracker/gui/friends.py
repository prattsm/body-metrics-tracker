from __future__ import annotations

from datetime import date, datetime, timezone
import json
from pathlib import Path
from uuid import UUID

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QApplication,
    QCheckBox,
    QDialog,
    QDialogButtonBox,
    QFileDialog,
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

from .state import AppState

INVITE_FILE_VERSION = 1
FILE_TYPE_INVITE = "invite"
FILE_TYPE_ACCEPT = "accept"
FILE_TYPE_SHARE = "share"
FILE_TYPE_REMINDER = "reminder"


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
        self._build_ui()
        self._load_profile()
        self.state.subscribe(self._on_state_changed)

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        header = QLabel("Friends")
        header.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(header)

        hint = QLabel("Friends are local-only for now. Share your code, then exchange invite files.")
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

        self.add_friend_button = QPushButton("Save Invite File")
        self.add_friend_button.clicked.connect(self._on_create_invite_file)

        self.import_invite_button = QPushButton("Import Friend File")
        self.import_invite_button.clicked.connect(self._on_import_friend_file)

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
        self._refresh_table()

    def _on_state_changed(self) -> None:
        if self._active_profile_id != self.state.profile.user_id:
            self._load_profile()
            return
        self._refresh_table()

    def _copy_friend_code(self) -> None:
        code = self.friend_code_display.text().strip()
        if not code:
            return
        QApplication.clipboard().setText(code)
        self.status_label.setText("Friend code copied.")

    def _on_create_invite_file(self) -> None:
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

        existing = self._find_friend(friend_id)
        if existing:
            existing.display_name = name_text or existing.display_name
            if existing.status not in {"connected", "incoming"}:
                existing.status = "invited"
        else:
            profile.friends.append(FriendLink(friend_id=friend_id, display_name=name_text, status="invited"))
        payload = self._build_invite_payload(profile.user_id, profile.display_name, friend_id)
        target, _ = QFileDialog.getSaveFileName(
            self,
            "Save Friend Invite",
            "friend_invite.json",
            "Invite Files (*.json);;All Files (*)",
        )
        if not target:
            return
        try:
            Path(target).write_text(json.dumps(payload, indent=2), encoding="utf-8")
        except OSError as exc:
            QMessageBox.warning(self, "Save Failed", str(exc))
            return
        self.state.update_profile(profile)
        self.friend_code_input.clear()
        self.friend_name_input.clear()
        self.status_label.setText("Invite file saved. Send it to your friend.")

    def _on_import_friend_file(self) -> None:
        target, _ = QFileDialog.getOpenFileName(
            self,
            "Import Friend File",
            "",
            "Friend Files (*.json);;All Files (*)",
        )
        if not target:
            return
        try:
            payload = json.loads(Path(target).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            QMessageBox.warning(self, "Invalid File", str(exc))
            return
        file_type = self._detect_file_type(payload)
        if file_type == FILE_TYPE_INVITE:
            self._handle_invite(payload)
        elif file_type == FILE_TYPE_ACCEPT:
            self._handle_accept(payload)
        elif file_type == FILE_TYPE_SHARE:
            self._handle_share(payload)
        elif file_type == FILE_TYPE_REMINDER:
            self._handle_reminder(payload)
        else:
            QMessageBox.warning(self, "Invalid File", "Unrecognized friend file.")

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
            self.state.update_profile(profile)
            payload = self._build_accept_payload(profile.user_id, profile.display_name, friend_id)
            target, _ = QFileDialog.getSaveFileName(
                self,
                "Save Friend Acceptance",
                "friend_accept.json",
                "Friend Files (*.json);;All Files (*)",
            )
            if target:
                try:
                    Path(target).write_text(json.dumps(payload, indent=2), encoding="utf-8")
                    self.status_label.setText("Accepted. Send the acceptance file to your friend.")
                except OSError as exc:
                    QMessageBox.warning(self, "Save Failed", str(exc))
            else:
                self.status_label.setText("Accepted. Remember to send an acceptance file.")

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
            self.status_label.setText("Share settings updated.")

    def _on_share_update(self, friend_id: UUID) -> None:
        friend = self._find_friend(friend_id)
        if not friend:
            return
        profile = self.state.profile
        entries = [entry for entry in self.state.entries if not entry.is_deleted]
        if entries:
            last = entries[-1]
            last_entry_date = last.date_local
            logged_today = last_entry_date == date.today()
            weight_kg = last.weight_kg if friend.share_weight else None
            waist_cm = last.waist_cm if friend.share_waist else None
        else:
            last_entry_date = None
            logged_today = False
            weight_kg = None
            waist_cm = None
        payload = self._build_share_payload(
            sender_id=profile.user_id,
            sender_name=profile.display_name,
            recipient_id=friend.friend_id,
            last_entry_date=last_entry_date,
            logged_today=logged_today,
            weight_kg=weight_kg,
            waist_cm=waist_cm,
        )
        target, _ = QFileDialog.getSaveFileName(
            self,
            "Save Share Update",
            "friend_share.json",
            "Friend Files (*.json);;All Files (*)",
        )
        if not target:
            return
        try:
            Path(target).write_text(json.dumps(payload, indent=2), encoding="utf-8")
        except OSError as exc:
            QMessageBox.warning(self, "Save Failed", str(exc))
            return
        self.status_label.setText("Share update saved. Send it to your friend.")

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
        profile = self.state.profile
        payload = self._build_reminder_payload(
            sender_id=profile.user_id,
            sender_name=profile.display_name,
            recipient_id=friend.friend_id,
            message=message_text,
        )
        target, _ = QFileDialog.getSaveFileName(
            self,
            "Save Reminder",
            "friend_reminder.json",
            "Friend Files (*.json);;All Files (*)",
        )
        if not target:
            return
        try:
            Path(target).write_text(json.dumps(payload, indent=2), encoding="utf-8")
        except OSError as exc:
            QMessageBox.warning(self, "Save Failed", str(exc))
            return
        self.status_label.setText("Reminder saved. Send it to your friend.")

    def _detect_file_type(self, payload: dict) -> str:
        file_type = str(payload.get("type", "")).strip().lower()
        if file_type:
            return file_type
        return FILE_TYPE_INVITE

    def _handle_invite(self, payload: dict) -> None:
        sender_id, sender_name = self._parse_invite_payload(payload)
        profile = self.state.profile
        if sender_id == profile.user_id:
            QMessageBox.warning(self, "Invalid Invite", "This invite is from you.")
            return
        existing = self._find_friend(sender_id)
        if existing:
            existing.display_name = sender_name or existing.display_name
            if existing.status == "invited":
                existing.status = "connected"
            elif existing.status != "connected":
                existing.status = "incoming"
        else:
            profile.friends.append(FriendLink(friend_id=sender_id, display_name=sender_name, status="incoming"))
        self.state.update_profile(profile)
        self.status_label.setText("Invite imported. Accept to connect.")

    def _handle_accept(self, payload: dict) -> None:
        sender_id, sender_name = self._parse_sender_payload(payload)
        profile = self.state.profile
        friend = self._find_friend(sender_id)
        if friend:
            friend.display_name = sender_name or friend.display_name
            friend.status = "connected"
        else:
            profile.friends.append(FriendLink(friend_id=sender_id, display_name=sender_name, status="connected"))
        self.state.update_profile(profile)
        self.status_label.setText("Acceptance received. You are now connected.")

    def _handle_share(self, payload: dict) -> None:
        sender_id, sender_name = self._parse_sender_payload(payload)
        profile = self.state.profile
        friend = self._find_friend(sender_id)
        if not friend:
            friend = FriendLink(friend_id=sender_id, display_name=sender_name, status="connected")
            profile.friends.append(friend)
        else:
            friend.display_name = sender_name or friend.display_name
            if friend.status != "connected":
                friend.status = "connected"
        data = payload.get("data", {}) or {}
        last_entry_date = data.get("last_entry_date")
        friend.last_entry_date = date.fromisoformat(last_entry_date) if last_entry_date else None
        friend.last_entry_logged_today = data.get("logged_today")
        weight_kg = data.get("weight_kg")
        waist_cm = data.get("waist_cm")
        friend.last_weight_kg = float(weight_kg) if weight_kg is not None else None
        friend.last_waist_cm = float(waist_cm) if waist_cm is not None else None
        shared_at = payload.get("shared_at")
        friend.last_shared_at = datetime.fromisoformat(shared_at) if shared_at else datetime.now(timezone.utc)
        self.state.update_profile(profile)
        self.status_label.setText(f"Update received from {friend.display_name}.")

    def _handle_reminder(self, payload: dict) -> None:
        sender_id, sender_name = self._parse_sender_payload(payload)
        profile = self.state.profile
        friend = self._find_friend(sender_id)
        if not friend:
            friend = FriendLink(friend_id=sender_id, display_name=sender_name, status="incoming")
            profile.friends.append(friend)
        else:
            friend.display_name = sender_name or friend.display_name
        message = str(payload.get("message", "")).strip() or "Time to log your weight today."
        friend.last_reminder_at = datetime.now(timezone.utc)
        friend.last_reminder_message = message
        self.state.update_profile(profile)
        QMessageBox.information(self, "Reminder", f"{friend.display_name}: {message}")

    def _build_invite_payload(self, sender_id: UUID, sender_name: str, recipient_id: UUID) -> dict[str, str]:
        return {
            "type": FILE_TYPE_INVITE,
            "version": INVITE_FILE_VERSION,
            "sender_code": encode_friend_code(sender_id),
            "sender_name": sender_name or "Friend",
            "recipient_code": encode_friend_code(recipient_id),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def _build_accept_payload(self, sender_id: UUID, sender_name: str, recipient_id: UUID) -> dict[str, str]:
        return {
            "type": FILE_TYPE_ACCEPT,
            "version": INVITE_FILE_VERSION,
            "sender_code": encode_friend_code(sender_id),
            "sender_name": sender_name or "Friend",
            "recipient_code": encode_friend_code(recipient_id),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }

    def _build_share_payload(
        self,
        sender_id: UUID,
        sender_name: str,
        recipient_id: UUID,
        last_entry_date: date | None,
        logged_today: bool,
        weight_kg: float | None,
        waist_cm: float | None,
    ) -> dict[str, object]:
        return {
            "type": FILE_TYPE_SHARE,
            "version": INVITE_FILE_VERSION,
            "sender_code": encode_friend_code(sender_id),
            "sender_name": sender_name or "Friend",
            "recipient_code": encode_friend_code(recipient_id),
            "shared_at": datetime.now(timezone.utc).isoformat(),
            "data": {
                "last_entry_date": last_entry_date.isoformat() if last_entry_date else None,
                "logged_today": logged_today,
                "weight_kg": weight_kg,
                "waist_cm": waist_cm,
            },
        }

    def _build_reminder_payload(
        self,
        sender_id: UUID,
        sender_name: str,
        recipient_id: UUID,
        message: str,
    ) -> dict[str, str]:
        return {
            "type": FILE_TYPE_REMINDER,
            "version": INVITE_FILE_VERSION,
            "sender_code": encode_friend_code(sender_id),
            "sender_name": sender_name or "Friend",
            "recipient_code": encode_friend_code(recipient_id),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "message": message,
        }

    def _parse_invite_payload(self, payload: dict) -> tuple[UUID, str]:
        version = int(payload.get("version", 0))
        if version != INVITE_FILE_VERSION:
            raise ValueError("Unsupported invite file version.")
        sender_code = str(payload.get("sender_code", "")).strip()
        recipient_code = str(payload.get("recipient_code", "")).strip()
        sender_name = str(payload.get("sender_name", "Friend")).strip() or "Friend"
        if not sender_code:
            raise ValueError("Invite is missing sender code.")
        sender_id = decode_friend_code(sender_code)
        if recipient_code:
            if recipient_code != encode_friend_code(self.state.profile.user_id):
                raise ValueError("This invite is not meant for your friend code.")
        return sender_id, sender_name

    def _parse_sender_payload(self, payload: dict) -> tuple[UUID, str]:
        version = int(payload.get("version", 0))
        if version != INVITE_FILE_VERSION:
            raise ValueError("Unsupported friend file version.")
        sender_code = str(payload.get("sender_code", "")).strip()
        recipient_code = str(payload.get("recipient_code", "")).strip()
        sender_name = str(payload.get("sender_name", "Friend")).strip() or "Friend"
        if not sender_code:
            raise ValueError("Missing sender code.")
        sender_id = decode_friend_code(sender_code)
        if recipient_code:
            if recipient_code != encode_friend_code(self.state.profile.user_id):
                raise ValueError("This file is not meant for your friend code.")
        return sender_id, sender_name

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
