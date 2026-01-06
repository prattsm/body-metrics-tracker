from __future__ import annotations

from uuid import UUID

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QApplication,
    QCheckBox,
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
)

from body_metrics_tracker.core.friend_code import decode_friend_code, encode_friend_code
from body_metrics_tracker.core.models import FriendLink

from .state import AppState


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

        hint = QLabel("Friends are local-only for now. Share your code, then enter theirs to invite.")
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

        self.add_friend_button = QPushButton("Invite Friend")
        self.add_friend_button.clicked.connect(self._on_add_friend)

        add_form.addRow("Friend code", self.friend_code_input)
        add_form.addRow("Name", self.friend_name_input)
        add_form.addRow("", self.add_friend_button)
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

        backup_group = QGroupBox("Vault backup")
        backup_layout = QVBoxLayout(backup_group)
        self.vault_enabled_checkbox = QCheckBox("Enable vault backup for this profile")
        self.vault_enabled_checkbox.toggled.connect(self._on_vault_toggled)
        backup_hint = QLabel("Configure vault details in the Sync tab.")
        backup_hint.setStyleSheet("color: #9aa4af;")
        backup_hint.setWordWrap(True)
        backup_layout.addWidget(self.vault_enabled_checkbox)
        backup_layout.addWidget(backup_hint)
        layout.addWidget(backup_group)

        self.status_label = QLabel("")
        self.status_label.setStyleSheet("color: #6b7785;")
        layout.addWidget(self.status_label)
        layout.addStretch(1)

    def _load_profile(self) -> None:
        profile = self.state.profile
        self._active_profile_id = profile.user_id
        self.friend_code_display.setText(encode_friend_code(profile.user_id))
        self.vault_enabled_checkbox.blockSignals(True)
        self.vault_enabled_checkbox.setChecked(profile.sync_settings.enabled)
        self.vault_enabled_checkbox.blockSignals(False)
        self._refresh_table()

    def _on_state_changed(self) -> None:
        if self._active_profile_id != self.state.profile.user_id:
            self._load_profile()
            return
        self.vault_enabled_checkbox.blockSignals(True)
        self.vault_enabled_checkbox.setChecked(self.state.profile.sync_settings.enabled)
        self.vault_enabled_checkbox.blockSignals(False)
        self._refresh_table()

    def _copy_friend_code(self) -> None:
        code = self.friend_code_display.text().strip()
        if not code:
            return
        QApplication.clipboard().setText(code)
        self.status_label.setText("Friend code copied.")

    def _on_add_friend(self) -> None:
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
        if any(friend.friend_id == friend_id for friend in profile.friends):
            QMessageBox.information(self, "Already Added", "That friend is already in your list.")
            return

        profile.friends.append(FriendLink(friend_id=friend_id, display_name=name_text, status="invited"))
        self.state.update_profile(profile)
        self.friend_code_input.clear()
        self.friend_name_input.clear()
        self.status_label.setText("Invite saved.")

    def _refresh_table(self) -> None:
        friends = list(self.state.profile.friends)
        self.friends_table.setRowCount(0)
        for friend in friends:
            row = self.friends_table.rowCount()
            self.friends_table.insertRow(row)
            name_item = QTableWidgetItem(friend.display_name)
            code_item = QTableWidgetItem(encode_friend_code(friend.friend_id))
            status_text = "Connected" if friend.status in {"connected", "accepted"} else "Invited"
            status_item = QTableWidgetItem(status_text)
            status_item.setTextAlignment(int(Qt.AlignCenter))
            self.friends_table.setItem(row, 0, name_item)
            self.friends_table.setItem(row, 1, code_item)
            self.friends_table.setItem(row, 2, status_item)

            action_widget = QWidget()
            action_layout = QHBoxLayout(action_widget)
            action_layout.setContentsMargins(0, 0, 0, 0)
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

    def _on_vault_toggled(self, checked: bool) -> None:
        profile = self.state.profile
        profile.sync_settings.enabled = checked
        self.state.update_profile(profile)
        message = "Vault backup enabled." if checked else "Vault backup disabled."
        self.status_label.setText(message)
