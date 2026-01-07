from __future__ import annotations

from datetime import datetime
import threading
from uuid import uuid4

from PySide6.QtCore import QByteArray, QBuffer, Qt, QTime
from PySide6.QtGui import QColor, QImage, QPixmap, QTransform
from PySide6.QtWidgets import (
    QApplication,
    QCheckBox,
    QComboBox,
    QDoubleSpinBox,
    QDialog,
    QDialogButtonBox,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QTimeEdit,
    QColorDialog,
    QFileDialog,
    QGraphicsPixmapItem,
    QGraphicsScene,
    QGraphicsView,
    QSlider,
    QVBoxLayout,
    QWidget,
)

from body_metrics_tracker.core import LengthUnit, WeightUnit, normalize_waist, normalize_weight, waist_from_cm, weight_from_kg
from body_metrics_tracker.core.models import ReminderRule, UserProfile
from body_metrics_tracker.relay import RelayConfig, update_profile

from .state import AppState
from .theme import apply_app_theme

MAX_AVATAR_B64 = 60000


class ProfileWidget(QWidget):
    def __init__(self, state: AppState) -> None:
        super().__init__()
        self.state = state
        self._loading = False
        self._dirty = False
        self._pending_reload = False
        self._active_profile_id = None
        self._accent_color = "#4f8cf7"
        self._avatar_b64: str | None = None
        self._reminders: list[ReminderRule] = []
        self._build_ui()
        self._load_profile()
        self.state.subscribe(self._on_state_changed)

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        header = QLabel("Profile & Settings")
        header.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(header)

        tracking_group = QGroupBox("Tracking")
        tracking_form = QFormLayout()
        self.track_waist_checkbox = QCheckBox("Track waist measurements")
        self.track_waist_checkbox.toggled.connect(self._apply_tracking_visibility)
        tracking_form.addRow("", self.track_waist_checkbox)
        tracking_group.setLayout(tracking_form)
        layout.addWidget(tracking_group)

        appearance_group = QGroupBox("Appearance")
        appearance_form = QFormLayout()

        self.dark_mode_checkbox = QCheckBox("Dark mode")
        self.dark_mode_checkbox.toggled.connect(self._on_theme_changed)

        self.accent_swatch = QLabel("")
        self.accent_swatch.setObjectName("accentSwatch")
        self.accent_value_label = QLabel("")
        self.accent_button = QPushButton("Pick color")
        self.accent_button.clicked.connect(self._on_pick_accent)
        accent_row = QHBoxLayout()
        accent_row.addWidget(self.accent_swatch)
        accent_row.addWidget(self.accent_value_label)
        accent_row.addStretch(1)
        accent_row.addWidget(self.accent_button)
        accent_container = QWidget()
        accent_container.setLayout(accent_row)

        appearance_form.addRow("", self.dark_mode_checkbox)
        appearance_form.addRow("Accent color", accent_container)
        appearance_group.setLayout(appearance_form)
        layout.addWidget(appearance_group)

        details_group = QGroupBox("Profile Details")
        details_form = QFormLayout()
        self._details_form = details_form

        self.avatar_label = QLabel("No photo")
        self.avatar_label.setAlignment(Qt.AlignCenter)
        self.avatar_label.setFixedSize(64, 64)
        self.avatar_label.setStyleSheet(
            "border: 1px solid #c7d0db; border-radius: 32px; background: #f5f7fb; color: #7a8694;"
        )
        self.avatar_upload_button = QPushButton("Upload")
        self.avatar_upload_button.clicked.connect(self._on_upload_avatar)
        self.avatar_remove_button = QPushButton("Remove")
        self.avatar_remove_button.clicked.connect(self._on_remove_avatar)
        avatar_row = QHBoxLayout()
        avatar_row.addWidget(self.avatar_label)
        avatar_row.addWidget(self.avatar_upload_button)
        avatar_row.addWidget(self.avatar_remove_button)
        avatar_row.addStretch(1)
        avatar_container = QWidget()
        avatar_container.setLayout(avatar_row)

        self.display_name_input = QLineEdit()
        self.display_name_input.setPlaceholderText("Display name")

        self.weight_unit_combo = QComboBox()
        self.weight_unit_combo.addItem("kg", WeightUnit.KG)
        self.weight_unit_combo.addItem("lb", WeightUnit.LB)
        self.weight_unit_combo.currentIndexChanged.connect(self._on_units_changed)

        self.waist_unit_combo = QComboBox()
        self.waist_unit_combo.addItem("cm", LengthUnit.CM)
        self.waist_unit_combo.addItem("in", LengthUnit.IN)
        self.waist_unit_combo.currentIndexChanged.connect(self._on_units_changed)


        self.goal_weight_enabled = QCheckBox("Enable")
        self.goal_weight_value = QDoubleSpinBox()
        self.goal_weight_value.setDecimals(1)
        self.goal_weight_value.setSingleStep(0.1)
        weight_goal_row = QHBoxLayout()
        weight_goal_row.addWidget(self.goal_weight_enabled)
        weight_goal_row.addWidget(self.goal_weight_value)
        weight_goal_container = QWidget()
        weight_goal_container.setLayout(weight_goal_row)

        self.goal_waist_enabled = QCheckBox("Enable")
        self.goal_waist_value = QDoubleSpinBox()
        self.goal_waist_value.setDecimals(1)
        self.goal_waist_value.setSingleStep(0.1)
        waist_goal_row = QHBoxLayout()
        waist_goal_row.addWidget(self.goal_waist_enabled)
        waist_goal_row.addWidget(self.goal_waist_value)
        waist_goal_container = QWidget()
        waist_goal_container.setLayout(waist_goal_row)
        self.goal_waist_container = waist_goal_container

        details_form.addRow("Photo", avatar_container)
        details_form.addRow("Name", self.display_name_input)
        details_form.addRow("Weight units", self.weight_unit_combo)
        details_form.addRow("Waist units", self.waist_unit_combo)
        details_form.addRow("Goal weight", weight_goal_container)
        details_form.addRow("Goal waist", waist_goal_container)

        details_group.setLayout(details_form)
        layout.addWidget(details_group)

        reminder_group = QGroupBox("Reminders")
        reminder_layout = QVBoxLayout(reminder_group)
        reminder_hint = QLabel("Create multiple in-app reminders with custom messages and schedules.")
        reminder_hint.setStyleSheet("color: #9aa4af;")
        reminder_hint.setWordWrap(True)
        reminder_layout.addWidget(reminder_hint)

        self.reminder_list_layout = QVBoxLayout()
        reminder_layout.addLayout(self.reminder_list_layout)

        reminder_actions = QHBoxLayout()
        self.add_reminder_button = QPushButton("Add reminder")
        self.add_reminder_button.clicked.connect(self._on_add_reminder)
        reminder_actions.addWidget(self.add_reminder_button)
        reminder_actions.addStretch(1)
        reminder_layout.addLayout(reminder_actions)
        layout.addWidget(reminder_group)

        self.save_button = QPushButton("Save Profile")
        self.save_button.clicked.connect(self._on_save_profile)
        layout.addWidget(self.save_button)

        self.status_label = QLabel("")
        layout.addWidget(self.status_label)

        layout.addStretch(1)
        self._wire_dirty_signals()

    def _load_profile(self) -> None:
        profile = self.state.profile
        self._active_profile_id = profile.user_id
        self._loading = True
        self._dirty = False
        self._pending_reload = False
        self.status_label.setText("")
        self._avatar_b64 = profile.avatar_b64
        self._set_avatar_preview(self._avatar_b64)
        self.display_name_input.setText(profile.display_name)
        self._set_combo_value(self.weight_unit_combo, profile.weight_unit)
        self._set_combo_value(self.waist_unit_combo, profile.waist_unit)
        self.track_waist_checkbox.setChecked(profile.track_waist)
        self._accent_color = profile.accent_color or "#4f8cf7"
        self.accent_value_label.setText(self._accent_color)
        self.dark_mode_checkbox.setChecked(profile.dark_mode)
        self._load_goal_settings(profile)
        self._load_reminder_settings(profile)
        self._apply_tracking_visibility()
        self._loading = False

    def _load_goal_settings(self, profile: UserProfile) -> None:
        weight_unit = self._coerce_weight_unit(self.weight_unit_combo.currentData())
        waist_unit = self._coerce_waist_unit(self.waist_unit_combo.currentData())

        if profile.goal_weight_kg is not None:
            self.goal_weight_enabled.setChecked(True)
            self.goal_weight_value.setValue(weight_from_kg(profile.goal_weight_kg, weight_unit))
        else:
            self.goal_weight_enabled.setChecked(False)
            self.goal_weight_value.setValue(self.goal_weight_value.minimum())
        if profile.goal_waist_cm is not None:
            self.goal_waist_enabled.setChecked(True)
            self.goal_waist_value.setValue(waist_from_cm(profile.goal_waist_cm, waist_unit))
        else:
            self.goal_waist_enabled.setChecked(False)
            self.goal_waist_value.setValue(self.goal_waist_value.minimum())

        self._apply_goal_ranges()

    def _load_reminder_settings(self, profile: UserProfile) -> None:
        self._reminders = [self._clone_reminder(rule) for rule in profile.self_reminders]
        self._render_reminders()

    def _on_save_profile(self) -> None:
        profile = self.state.profile
        name = self.display_name_input.text().strip() or "User"
        if self._name_conflicts(name, profile.user_id):
            self.status_label.setText("Profile name already exists.")
            return
        self._dirty = False
        self._pending_reload = False
        profile.display_name = name
        profile.weight_unit = self._coerce_weight_unit(self.weight_unit_combo.currentData())
        profile.waist_unit = self._coerce_waist_unit(self.waist_unit_combo.currentData())
        profile.track_waist = self.track_waist_checkbox.isChecked()
        profile.accent_color = self._accent_color
        profile.dark_mode = self.dark_mode_checkbox.isChecked()
        profile.goal_weight_kg, profile.goal_weight_band_kg = self._collect_weight_goal(profile.weight_unit)
        profile.goal_waist_cm, profile.goal_waist_band_cm = self._collect_waist_goal(profile.waist_unit)
        profile.avatar_b64 = self._avatar_b64
        profile.self_reminders = [self._clone_reminder(rule) for rule in self._reminders]
        self.state.update_profile(profile)
        self._sync_profile_to_relay(profile)
        self._load_profile()
        self.status_label.setText("Profile saved.")

    def _on_upload_avatar(self) -> None:
        file_path, _ = QFileDialog.getOpenFileName(
            self,
            "Choose Profile Photo",
            "",
            "Images (*.png *.jpg *.jpeg *.bmp)",
        )
        if not file_path:
            return
        image = QImage(file_path)
        if image.isNull():
            self.status_label.setText("Could not load image.")
            return
        dialog = AvatarCropDialog(image, self)
        if dialog.exec() != QDialog.Accepted:
            return
        cropped = dialog.cropped_image()
        target_size = 96
        scaled = cropped.scaled(
            target_size,
            target_size,
            Qt.IgnoreAspectRatio,
            Qt.SmoothTransformation,
        )
        buffer = QByteArray()
        io_device = QBuffer(buffer)
        io_device.open(QBuffer.WriteOnly)
        scaled.save(io_device, "PNG")
        avatar_b64 = bytes(buffer.toBase64()).decode("ascii")
        if len(avatar_b64) > MAX_AVATAR_B64:
            self.status_label.setText("Photo is too large. Try a smaller crop.")
            return
        self._avatar_b64 = avatar_b64
        self._set_avatar_preview(self._avatar_b64)
        self._mark_dirty()
        self.status_label.setText("Photo updated. Click Save Profile to apply.")

    def _on_remove_avatar(self) -> None:
        self._avatar_b64 = None
        self._set_avatar_preview(None)
        self._mark_dirty()
        self.status_label.setText("Photo removed. Click Save Profile to apply.")

    def _set_avatar_preview(self, avatar_b64: str | None) -> None:
        if not avatar_b64:
            self.avatar_label.setPixmap(QPixmap())
            self.avatar_label.setText("No photo")
            return
        data = QByteArray.fromBase64(avatar_b64.encode("ascii"))
        pixmap = QPixmap()
        if not pixmap.loadFromData(data):
            self.avatar_label.setPixmap(QPixmap())
            self.avatar_label.setText("No photo")
            return
        pixmap = pixmap.scaled(64, 64, Qt.KeepAspectRatioByExpanding, Qt.SmoothTransformation)
        self.avatar_label.setPixmap(pixmap)
        self.avatar_label.setText("")

    def _sync_profile_to_relay(self, profile: UserProfile) -> None:
        if not profile.relay_url or not profile.relay_token:
            return
        config = RelayConfig(profile.relay_url, profile.relay_token)

        def run() -> None:
            try:
                update_profile(config, profile.display_name, profile.avatar_b64)
            except Exception:
                return

        threading.Thread(target=run, daemon=True).start()


    def _wire_dirty_signals(self) -> None:
        self.display_name_input.textEdited.connect(self._mark_dirty)
        self.weight_unit_combo.currentIndexChanged.connect(self._mark_dirty)
        self.waist_unit_combo.currentIndexChanged.connect(self._mark_dirty)
        self.track_waist_checkbox.toggled.connect(self._mark_dirty)
        self.goal_weight_enabled.toggled.connect(self._mark_dirty)
        self.goal_weight_value.valueChanged.connect(self._mark_dirty)
        self.goal_waist_enabled.toggled.connect(self._mark_dirty)
        self.goal_waist_value.valueChanged.connect(self._mark_dirty)
        self.dark_mode_checkbox.toggled.connect(self._mark_dirty)

    def _mark_dirty(self, *_args) -> None:
        if self._loading:
            return
        self._dirty = True

    def _render_reminders(self) -> None:
        self._clear_layout(self.reminder_list_layout)
        if not self._reminders:
            placeholder = QLabel("No reminders yet.")
            placeholder.setStyleSheet("color: #9aa4af;")
            self.reminder_list_layout.addWidget(placeholder)
            return
        for rule in sorted(self._reminders, key=lambda item: item.time):
            row = QWidget()
            row_layout = QHBoxLayout(row)
            row_layout.setContentsMargins(0, 0, 0, 0)
            row_layout.setSpacing(8)
            toggle = QCheckBox()
            toggle.setChecked(rule.enabled)
            toggle.toggled.connect(
                lambda checked, reminder_id=rule.reminder_id: self._toggle_reminder(reminder_id, checked)
            )
            summary = QLabel(self._reminder_summary(rule))
            edit_button = QPushButton("Edit")
            edit_button.clicked.connect(
                lambda _checked=False, reminder_id=rule.reminder_id: self._on_edit_reminder(reminder_id)
            )
            delete_button = QPushButton("Delete")
            delete_button.clicked.connect(
                lambda _checked=False, reminder_id=rule.reminder_id: self._on_delete_reminder(reminder_id)
            )
            row_layout.addWidget(toggle)
            row_layout.addWidget(summary, 1)
            row_layout.addWidget(edit_button)
            row_layout.addWidget(delete_button)
            self.reminder_list_layout.addWidget(row)

    def _reminder_summary(self, rule: ReminderRule) -> str:
        days = self._format_days(rule.days)
        message = rule.message.strip() if rule.message else "Time to log your weight today."
        if len(message) > 42:
            message = f"{message[:39]}..."
        return f"{days} · {rule.time} · {message}"

    def _format_days(self, days: list[int]) -> str:
        if not days:
            return "No days"
        days_set = set(days)
        all_days = {0, 1, 2, 3, 4, 5, 6}
        if days_set == all_days:
            return "Every day"
        labels = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}
        ordered = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        sorted_days = sorted(days_set, key=lambda item: ordered.index(labels[item]))
        return ", ".join(labels[idx] for idx in sorted_days)

    def _clone_reminder(self, rule: ReminderRule) -> ReminderRule:
        return ReminderRule(
            reminder_id=rule.reminder_id,
            message=rule.message,
            time=rule.time,
            days=list(rule.days),
            enabled=rule.enabled,
            last_sent_at=rule.last_sent_at,
            last_seen_at=rule.last_seen_at,
        )

    def _find_reminder(self, reminder_id) -> ReminderRule | None:
        for rule in self._reminders:
            if rule.reminder_id == reminder_id:
                return rule
        return None

    def _on_add_reminder(self) -> None:
        dialog = ReminderDialog(None, self)
        if dialog.exec() != QDialog.Accepted:
            return
        message, time_value, days = dialog.reminder_data()
        rule = ReminderRule(
            reminder_id=uuid4(),
            message=message or "Time to log your weight today.",
            time=time_value,
            days=days or [0, 1, 2, 3, 4, 5, 6],
            enabled=True,
        )
        self._reminders.append(rule)
        self._mark_dirty()
        self._render_reminders()

    def _on_edit_reminder(self, reminder_id) -> None:
        rule = self._find_reminder(reminder_id)
        if rule is None:
            return
        dialog = ReminderDialog(rule, self)
        if dialog.exec() != QDialog.Accepted:
            return
        message, time_value, days = dialog.reminder_data()
        rule.message = message or "Time to log your weight today."
        rule.time = time_value
        rule.days = days
        self._mark_dirty()
        self._render_reminders()

    def _on_delete_reminder(self, reminder_id) -> None:
        self._reminders = [rule for rule in self._reminders if rule.reminder_id != reminder_id]
        self._mark_dirty()
        self._render_reminders()

    def _toggle_reminder(self, reminder_id, enabled: bool) -> None:
        rule = self._find_reminder(reminder_id)
        if rule is None:
            return
        rule.enabled = enabled
        self._mark_dirty()
        self._render_reminders()

    def _clear_layout(self, layout) -> None:
        while layout.count():
            item = layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()

    def _name_conflicts(self, name: str, user_id) -> bool:
        for profile in self.state.profiles:
            if profile.user_id != user_id and profile.display_name.lower() == name.lower():
                return True
        return False

    def _set_combo_value(self, combo: QComboBox, value) -> None:
        for index in range(combo.count()):
            if combo.itemData(index) == value:
                combo.setCurrentIndex(index)
                return

    def _on_state_changed(self) -> None:
        if self._loading:
            return
        if self._active_profile_id and self._active_profile_id != self.state.profile.user_id:
            self._dirty = False
            self._pending_reload = False
            self._load_profile()
            return
        if self._dirty:
            self._pending_reload = True
            if not self.status_label.text():
                self.status_label.setText("Remote update received. Save to keep changes.")
            return
        self._load_profile()

    def _on_units_changed(self) -> None:
        if self._loading:
            return
        self._apply_goal_ranges()
        self._load_goal_settings(self.state.profile)

    def _apply_tracking_visibility(self) -> None:
        track_waist = self.track_waist_checkbox.isChecked()
        for widget in (self.waist_unit_combo, self.goal_waist_container):
            widget.setVisible(track_waist)
            label = self._details_form.labelForField(widget)
            if label is not None:
                label.setVisible(track_waist)
        self.goal_waist_enabled.setEnabled(track_waist)
        self.goal_waist_value.setEnabled(track_waist)

    def _on_pick_accent(self) -> None:
        color = QColorDialog.getColor(QColor(self._accent_color), self, "Pick accent color")
        if not color.isValid():
            return
        self._accent_color = color.name()
        self.accent_value_label.setText(self._accent_color)
        self._mark_dirty()
        self._on_theme_changed()

    def _on_theme_changed(self) -> None:
        if self._loading:
            return
        app = QApplication.instance()
        if app is None:
            return
        apply_app_theme(app, accent_color=self._accent_color, dark_mode=self.dark_mode_checkbox.isChecked())

    def _apply_goal_ranges(self) -> None:
        weight_unit = self._coerce_weight_unit(self.weight_unit_combo.currentData())
        waist_unit = self._coerce_waist_unit(self.waist_unit_combo.currentData())
        low_weight, high_weight = 20.0, 300.0
        low_waist, high_waist = 30.0, 200.0
        self.goal_weight_value.setRange(weight_from_kg(low_weight, weight_unit), weight_from_kg(high_weight, weight_unit))
        self.goal_weight_value.setSuffix(f" {weight_unit.value}")
        self.goal_waist_value.setRange(waist_from_cm(low_waist, waist_unit), waist_from_cm(high_waist, waist_unit))
        self.goal_waist_value.setSuffix(f" {waist_unit.value}")

    def _collect_weight_goal(self, unit: WeightUnit) -> tuple[float | None, float | None]:
        if not self.goal_weight_enabled.isChecked():
            return None, None
        value = normalize_weight(self.goal_weight_value.value(), unit)
        return value, None

    def _collect_waist_goal(self, unit: LengthUnit) -> tuple[float | None, float | None]:
        if not self.goal_waist_enabled.isChecked():
            return None, None
        value = normalize_waist(self.goal_waist_value.value(), unit)
        return value, None

    def _coerce_weight_unit(self, value) -> WeightUnit:
        if isinstance(value, WeightUnit):
            return value
        return WeightUnit(str(value))

    def _coerce_waist_unit(self, value) -> LengthUnit:
        if isinstance(value, LengthUnit):
            return value
        return LengthUnit(str(value))


class ReminderDialog(QDialog):
    def __init__(self, reminder: ReminderRule | None, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Reminder" if reminder else "Add Reminder")
        self._reminder = reminder
        self._message = ""
        self._time = "08:00"
        self._days: list[int] = [0, 1, 2, 3, 4, 5, 6]

        layout = QVBoxLayout(self)
        form = QFormLayout()

        self.message_input = QLineEdit()
        self.message_input.setPlaceholderText("Time to log your weight today.")

        self.time_input = QTimeEdit()
        self.time_input.setDisplayFormat("HH:mm")

        days_row = QHBoxLayout()
        self.day_checks: dict[int, QCheckBox] = {}
        for label, index in (
            ("Sun", 6),
            ("Mon", 0),
            ("Tue", 1),
            ("Wed", 2),
            ("Thu", 3),
            ("Fri", 4),
            ("Sat", 5),
        ):
            checkbox = QCheckBox(label)
            self.day_checks[index] = checkbox
            days_row.addWidget(checkbox)
        days_row.addStretch(1)
        days_container = QWidget()
        days_container.setLayout(days_row)

        form.addRow("Message", self.message_input)
        form.addRow("Time", self.time_input)
        form.addRow("Days", days_container)
        layout.addLayout(form)

        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self._on_accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

        if reminder is not None:
            self.message_input.setText(reminder.message)
            reminder_time = QTime.fromString(reminder.time, "HH:mm")
            if reminder_time.isValid():
                self.time_input.setTime(reminder_time)
            days = set(reminder.days or [])
            for index, checkbox in self.day_checks.items():
                checkbox.setChecked(index in days)
        else:
            self.time_input.setTime(QTime(8, 0))
            for checkbox in self.day_checks.values():
                checkbox.setChecked(True)

    def _on_accept(self) -> None:
        message = self.message_input.text().strip()
        self._message = message
        self._time = self.time_input.time().toString("HH:mm")
        self._days = sorted([index for index, checkbox in self.day_checks.items() if checkbox.isChecked()])
        self.accept()

    def reminder_data(self) -> tuple[str, str, list[int]]:
        return self._message, self._time, self._days


class AvatarCropDialog(QDialog):
    def __init__(self, image: QImage, parent: QWidget | None = None) -> None:
        super().__init__(parent)
        self.setWindowTitle("Crop Photo")
        self._image = image
        self._pixmap = QPixmap.fromImage(image)

        layout = QVBoxLayout(self)
        self._scene = QGraphicsScene(self)
        self._item = QGraphicsPixmapItem(self._pixmap)
        self._scene.addItem(self._item)
        self.view = QGraphicsView(self._scene)
        self.view.setFixedSize(260, 260)
        self.view.setSceneRect(self._pixmap.rect())
        self.view.setHorizontalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.view.setVerticalScrollBarPolicy(Qt.ScrollBarAlwaysOff)
        self.view.setDragMode(QGraphicsView.ScrollHandDrag)
        layout.addWidget(self.view, alignment=Qt.AlignCenter)

        self.zoom_slider = QSlider(Qt.Horizontal)
        self.zoom_slider.setRange(100, 300)
        self.zoom_slider.setValue(100)
        self.zoom_slider.valueChanged.connect(self._apply_zoom)
        layout.addWidget(self.zoom_slider)

        tool_row = QHBoxLayout()
        rotate_left = QPushButton("Rotate Left")
        rotate_left.clicked.connect(lambda: self._rotate(-90))
        rotate_right = QPushButton("Rotate Right")
        rotate_right.clicked.connect(lambda: self._rotate(90))
        flip_horizontal = QPushButton("Flip Horizontal")
        flip_horizontal.clicked.connect(lambda: self._flip(horizontal=True, vertical=False))
        flip_vertical = QPushButton("Flip Vertical")
        flip_vertical.clicked.connect(lambda: self._flip(horizontal=False, vertical=True))
        tool_row.addWidget(rotate_left)
        tool_row.addWidget(rotate_right)
        tool_row.addWidget(flip_horizontal)
        tool_row.addWidget(flip_vertical)
        layout.addLayout(tool_row)

        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self.accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

        self._base_scale = self._compute_base_scale()
        self._apply_zoom()
        self.view.centerOn(self._pixmap.rect().center())

    def _compute_base_scale(self) -> float:
        view_size = self.view.viewport().size()
        if self._pixmap.width() == 0 or self._pixmap.height() == 0:
            return 1.0
        return max(view_size.width() / self._pixmap.width(), view_size.height() / self._pixmap.height())

    def _apply_zoom(self) -> None:
        factor = self._base_scale * (self.zoom_slider.value() / 100.0)
        center = self.view.mapToScene(self.view.viewport().rect().center())
        self.view.resetTransform()
        self.view.scale(factor, factor)
        self.view.centerOn(center)

    def _rotate(self, degrees: int) -> None:
        transform = QTransform().rotate(degrees)
        self._image = self._image.transformed(transform, Qt.SmoothTransformation)
        self._refresh_pixmap()

    def _flip(self, *, horizontal: bool, vertical: bool) -> None:
        self._image = self._image.mirrored(horizontal, vertical)
        self._refresh_pixmap()

    def _refresh_pixmap(self) -> None:
        self._pixmap = QPixmap.fromImage(self._image)
        self._item.setPixmap(self._pixmap)
        self._scene.setSceneRect(self._pixmap.rect())
        self._base_scale = self._compute_base_scale()
        self._apply_zoom()

    def cropped_image(self) -> QImage:
        view_rect = self.view.viewport().rect()
        scene_rect = self.view.mapToScene(view_rect).boundingRect().intersected(self._pixmap.rect())
        if scene_rect.isNull():
            return self._image
        rect = scene_rect.toRect()
        rect = rect.intersected(self._image.rect())
        if rect.isNull():
            return self._image
        return self._image.copy(rect)
