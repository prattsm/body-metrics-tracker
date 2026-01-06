from __future__ import annotations

from dataclasses import dataclass
from datetime import date, datetime, timedelta

from PySide6.QtCore import Qt
from PySide6.QtWidgets import (
    QDialog,
    QDialogButtonBox,
    QComboBox,
    QDateEdit,
    QDoubleSpinBox,
    QFormLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QVBoxLayout,
)

from body_metrics_tracker.core import (
    LengthUnit,
    MeasurementEntry,
    WeightUnit,
    normalize_waist,
    normalize_weight,
    waist_from_cm,
    weight_from_kg,
)
from body_metrics_tracker.core.models import utc_now


@dataclass(frozen=True)
class PassphraseResult:
    passphrase: str


class PassphraseDialog(QDialog):
    def __init__(self, mode: str, parent=None) -> None:
        super().__init__(parent)
        if mode not in {"unlock", "create"}:
            raise ValueError("mode must be 'unlock' or 'create'")
        self.mode = mode
        self._passphrase: str | None = None
        self._build_ui()

    @property
    def passphrase(self) -> str | None:
        return self._passphrase

    def _build_ui(self) -> None:
        self.setWindowTitle("Unlock Vault" if self.mode == "unlock" else "Create Vault")
        self.setModal(True)

        layout = QVBoxLayout(self)
        description = QLabel(
            "Enter your passphrase to unlock your data." if self.mode == "unlock" else "Set a passphrase to encrypt your data."
        )
        description.setWordWrap(True)
        layout.addWidget(description)

        form = QFormLayout()
        self.passphrase_input = QLineEdit()
        self.passphrase_input.setEchoMode(QLineEdit.Password)
        self.passphrase_input.setPlaceholderText("Passphrase")
        form.addRow("Passphrase", self.passphrase_input)

        self.confirm_input = None
        if self.mode == "create":
            confirm = QLineEdit()
            confirm.setEchoMode(QLineEdit.Password)
            confirm.setPlaceholderText("Confirm passphrase")
            form.addRow("Confirm", confirm)
            self.confirm_input = confirm

        layout.addLayout(form)

        self.error_label = QLabel("")
        self.error_label.setStyleSheet("color: #f28b82;")
        self.error_label.setWordWrap(True)
        layout.addWidget(self.error_label)

        buttons = QDialogButtonBox(QDialogButtonBox.Ok | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self._on_accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

        self.passphrase_input.setFocus(Qt.OtherFocusReason)

    def _on_accept(self) -> None:
        passphrase = self.passphrase_input.text().strip()
        if not passphrase:
            self.error_label.setText("Passphrase cannot be empty.")
            return
        if self.mode == "create" and self.confirm_input is not None:
            confirm = self.confirm_input.text().strip()
            if passphrase != confirm:
                self.error_label.setText("Passphrases do not match.")
                return
        self._passphrase = passphrase
        self.accept()


def request_passphrase(parent, mode: str) -> str | None:
    dialog = PassphraseDialog(mode=mode, parent=parent)
    if dialog.exec() == QDialog.Accepted:
        return dialog.passphrase
    return None


class EntryDialog(QDialog):
    def __init__(
        self,
        entry: MeasurementEntry,
        weight_unit: WeightUnit,
        waist_unit: LengthUnit,
        track_waist: bool,
        parent=None,
    ) -> None:
        super().__init__(parent)
        self.entry = entry
        self.weight_unit = weight_unit
        self.waist_unit = waist_unit
        self.track_waist = track_waist
        self.updated_entry: MeasurementEntry | None = None
        self._build_ui()

    def _build_ui(self) -> None:
        self.setWindowTitle("Edit Entry")
        self.setModal(True)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        self.weight_input = QDoubleSpinBox()
        self.weight_input.setDecimals(1)
        self.weight_input.setSingleStep(0.1)

        self.waist_input = QDoubleSpinBox()
        self.waist_input.setDecimals(1)
        self.waist_input.setSingleStep(0.1)
        self.waist_input.valueChanged.connect(self._on_waist_changed)

        self.date_input = QDateEdit()
        self.date_input.setCalendarPopup(True)

        self.note_input = QLineEdit()

        form.addRow("Weight", self.weight_input)
        if self.track_waist:
            form.addRow("Waist", self.waist_input)
        form.addRow("Date", self.date_input)
        form.addRow("Note", self.note_input)

        layout.addLayout(form)

        buttons = QDialogButtonBox(QDialogButtonBox.Save | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self._on_accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

        self._load_entry_values()

    def _load_entry_values(self) -> None:
        weight_low, weight_high = 20.0, 300.0
        waist_low, waist_high = 30.0, 200.0
        self.weight_input.setRange(
            weight_from_kg(weight_low, self.weight_unit),
            weight_from_kg(weight_high, self.weight_unit),
        )
        self.waist_input.setRange(
            waist_from_cm(waist_low, self.waist_unit),
            waist_from_cm(waist_high, self.waist_unit),
        )
        self.weight_input.setSuffix(f" {self.weight_unit.value}")
        self.waist_input.setSuffix(f" {self.waist_unit.value}")

        weight_display = weight_from_kg(self.entry.weight_kg, self.weight_unit)
        self.weight_input.setValue(weight_display)
        self._waist_missing = False
        if self.track_waist:
            if self.entry.waist_cm is None:
                self._waist_missing = True
                self.waist_input.setValue(self.waist_input.minimum())
            else:
                waist_display = waist_from_cm(self.entry.waist_cm, self.waist_unit)
                self.waist_input.setValue(waist_display)

        self.date_input.setDate(self.entry.measured_at.date())
        self.note_input.setText(self.entry.note or "")

    def _on_accept(self) -> None:
        weight_display = float(self.weight_input.value())
        measured_date = self.date_input.date().toPython()
        measured_at = self._combine_datetime(measured_date)
        note = self.note_input.text().strip() or None

        weight_kg = normalize_weight(weight_display, self.weight_unit)
        if self.track_waist:
            waist_display = float(self.waist_input.value())
            if self._waist_missing and waist_display == self.waist_input.minimum():
                waist_cm = None
            else:
                waist_cm = normalize_waist(waist_display, self.waist_unit)
        else:
            waist_cm = self.entry.waist_cm

        warnings = self._validation_warnings(weight_kg, waist_cm, measured_at)
        if warnings:
            result = QMessageBox.warning(
                self,
                "Check values",
                f"{'\\n'.join(warnings)}\\n\\nSave anyway?",
                QMessageBox.Yes | QMessageBox.No,
            )
            if result != QMessageBox.Yes:
                return

        self.updated_entry = MeasurementEntry(
            entry_id=self.entry.entry_id,
            user_id=self.entry.user_id,
            measured_at=measured_at,
            date_local=measured_at.date(),
            weight_kg=weight_kg,
            waist_cm=waist_cm,
            note=note,
            created_at=self.entry.created_at,
            updated_at=utc_now(),
            is_deleted=False,
            deleted_at=None,
            version=self.entry.version + 1,
        )
        self.accept()

    def _on_waist_changed(self) -> None:
        if hasattr(self, "_waist_missing"):
            self._waist_missing = False

    def _combine_datetime(self, selected_date: date) -> datetime:
        tzinfo = self.entry.measured_at.tzinfo or datetime.now().astimezone().tzinfo
        base_time = self.entry.measured_at.time()
        return datetime.combine(selected_date, base_time, tzinfo=tzinfo)

    def _validation_warnings(self, weight_kg: float, waist_cm: float | None, measured_at: datetime) -> list[str]:
        warnings = []
        if weight_kg < 35.0 or weight_kg > 220.0:
            warnings.append("Weight value looks unusual.")
        if waist_cm is not None and (waist_cm < 50.0 or waist_cm > 180.0):
            warnings.append("Waist value looks unusual.")
        today = datetime.now().astimezone().date()
        if measured_at.date() > today:
            warnings.append("Date is in the future.")
        if measured_at.date() < today - timedelta(days=365):
            warnings.append("Date is more than 1 year in the past.")
        return warnings


def edit_entry_dialog(
    parent, entry: MeasurementEntry, weight_unit: WeightUnit, waist_unit: LengthUnit, track_waist: bool
) -> MeasurementEntry | None:
    dialog = EntryDialog(entry, weight_unit, waist_unit, track_waist=track_waist, parent=parent)
    if dialog.exec() == QDialog.Accepted:
        return dialog.updated_entry
    return None


class NewProfileDialog(QDialog):
    def __init__(self, existing_names: set[str], parent=None) -> None:
        super().__init__(parent)
        self._existing_names = {name.lower() for name in existing_names}
        self.profile_name: str | None = None
        self.weight_unit: WeightUnit = WeightUnit.LB
        self.waist_unit: LengthUnit = LengthUnit.IN
        self._build_ui()

    def _build_ui(self) -> None:
        self.setWindowTitle("New Profile")
        self.setModal(True)

        layout = QVBoxLayout(self)
        form = QFormLayout()

        self.name_input = QLineEdit()
        self.name_input.setPlaceholderText("Display name")

        self.weight_unit_combo = QComboBox()
        self.weight_unit_combo.addItem("kg", WeightUnit.KG)
        self.weight_unit_combo.addItem("lb", WeightUnit.LB)
        self.weight_unit_combo.setCurrentIndex(1)

        self.waist_unit_combo = QComboBox()
        self.waist_unit_combo.addItem("cm", LengthUnit.CM)
        self.waist_unit_combo.addItem("in", LengthUnit.IN)
        self.waist_unit_combo.setCurrentIndex(1)

        form.addRow("Name", self.name_input)
        form.addRow("Weight units", self.weight_unit_combo)
        form.addRow("Waist units", self.waist_unit_combo)
        layout.addLayout(form)

        self.error_label = QLabel("")
        self.error_label.setStyleSheet("color: #f28b82;")
        self.error_label.setWordWrap(True)
        layout.addWidget(self.error_label)

        buttons = QDialogButtonBox(QDialogButtonBox.Create | QDialogButtonBox.Cancel)
        buttons.accepted.connect(self._on_accept)
        buttons.rejected.connect(self.reject)
        layout.addWidget(buttons)

    def _on_accept(self) -> None:
        name = self.name_input.text().strip()
        if not name:
            self.error_label.setText("Name is required.")
            return
        if name.lower() in self._existing_names:
            self.error_label.setText("A profile with this name already exists.")
            return
        self.profile_name = name
        self.weight_unit = self.weight_unit_combo.currentData()
        self.waist_unit = self.waist_unit_combo.currentData()
        self.accept()


def new_profile_dialog(parent, existing_names: set[str]) -> NewProfileDialog | None:
    dialog = NewProfileDialog(existing_names, parent=parent)
    if dialog.exec() == QDialog.Accepted:
        return dialog
    return None
