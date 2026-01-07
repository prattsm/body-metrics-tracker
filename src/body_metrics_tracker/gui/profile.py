from __future__ import annotations

from datetime import datetime
import threading

from PySide6.QtCore import QByteArray, QBuffer, Qt
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
from body_metrics_tracker.core.models import UserProfile
from body_metrics_tracker.relay import RelayConfig, update_profile

from .state import AppState
from .theme import apply_app_theme

MAX_AVATAR_B64 = 60000


class ProfileWidget(QWidget):
    def __init__(self, state: AppState) -> None:
        super().__init__()
        self.state = state
        self._loading = False
        self._accent_color = "#4f8cf7"
        self._avatar_b64: str | None = None
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

        self.save_button = QPushButton("Save Profile")
        self.save_button.clicked.connect(self._on_save_profile)
        layout.addWidget(self.save_button)

        self.status_label = QLabel("")
        layout.addWidget(self.status_label)

        layout.addStretch(1)

    def _load_profile(self) -> None:
        profile = self.state.profile
        self._loading = True
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

    def _on_save_profile(self) -> None:
        profile = self.state.profile
        name = self.display_name_input.text().strip() or "User"
        if self._name_conflicts(name, profile.user_id):
            self.status_label.setText("Profile name already exists.")
            return
        profile.display_name = name
        profile.weight_unit = self._coerce_weight_unit(self.weight_unit_combo.currentData())
        profile.waist_unit = self._coerce_waist_unit(self.waist_unit_combo.currentData())
        profile.track_waist = self.track_waist_checkbox.isChecked()
        profile.accent_color = self._accent_color
        profile.dark_mode = self.dark_mode_checkbox.isChecked()
        profile.goal_weight_kg, profile.goal_weight_band_kg = self._collect_weight_goal(profile.weight_unit)
        profile.goal_waist_cm, profile.goal_waist_band_cm = self._collect_waist_goal(profile.waist_unit)
        profile.avatar_b64 = self._avatar_b64
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
        self.status_label.setText("Photo updated. Click Save Profile to apply.")

    def _on_remove_avatar(self) -> None:
        self._avatar_b64 = None
        self._set_avatar_preview(None)
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
