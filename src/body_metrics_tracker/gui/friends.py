from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
from uuid import UUID

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QApplication,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QFileDialog,
    QMessageBox,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from body_metrics_tracker.core.friend_code import decode_friend_code, encode_friend_code
from body_metrics_tracker.core.models import FriendLink

from .state import AppState

INVITE_FILE_VERSION = 1


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

        hint = QLabel("Friends are local-only for now. Share your code, then invite each other.")
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

        self.import_invite_button = QPushButton("Import Invite File")
        self.import_invite_button.clicked.connect(self._on_import_invite_file)

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
            if existing.status == "incoming":
                existing.status = "connected"
            elif existing.status not in {"connected"}:
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

    def _on_import_invite_file(self) -> None:
        target, _ = QFileDialog.getOpenFileName(
            self,
            "Import Friend Invite",
            "",
            "Invite Files (*.json);;All Files (*)",
        )
        if not target:
            return
        try:
            payload = json.loads(Path(target).read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            QMessageBox.warning(self, "Invalid Invite", str(exc))
            return
        try:
            sender_id, sender_name = self._parse_invite_payload(payload)
        except ValueError as exc:
            QMessageBox.warning(self, "Invalid Invite", str(exc))
            return
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
            if friend.status == "incoming":
                accept_button = QPushButton("Accept")
            else:
                accept_button = QPushButton("Mark connected")
            accept_button.setEnabled(friend.status not in {"connected", "accepted"})
            accept_button.clicked.connect(
                lambda _checked=False, friend_id=friend.friend_id: self._on_accept_friend(friend_id)
            )
            remove_button = QPushButton("Remove")
            remove_button.clicked.connect(
                lambda _checked=False, friend_id=friend.friend_id, name=friend.display_name: self._on_remove_friend(
                    friend_id, name
                )
            )
            action_layout.addWidget(accept_button)
            action_layout.addWidget(remove_button)
            action_layout.addStretch(1)
            self.friends_table.setCellWidget(row, 3, action_widget)
        self.friends_table.resizeRowsToContents()

    def _on_accept_friend(self, friend_id: UUID) -> None:
        profile = self.state.profile
        updated = False
        for friend in profile.friends:
            if friend.friend_id == friend_id:
                friend.status = "connected"
                updated = True
                break
        if updated:
            self.state.update_profile(profile)
            self.status_label.setText("Friend marked as connected.")

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

    def _build_invite_payload(self, sender_id: UUID, sender_name: str, recipient_id: UUID) -> dict[str, str]:
        return {
            "version": INVITE_FILE_VERSION,
            "sender_code": encode_friend_code(sender_id),
            "sender_name": sender_name or "Friend",
            "recipient_code": encode_friend_code(recipient_id),
            "created_at": datetime.now(timezone.utc).isoformat(),
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
