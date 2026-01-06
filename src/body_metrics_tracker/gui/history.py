from __future__ import annotations

import csv
from datetime import date
from functools import partial

from PySide6.QtWidgets import (
    QAbstractItemView,
    QCheckBox,
    QDateEdit,
    QFileDialog,
    QGroupBox,
    QHBoxLayout,
    QHeaderView,
    QLabel,
    QLineEdit,
    QPushButton,
    QTableWidget,
    QTableWidgetItem,
    QVBoxLayout,
    QWidget,
)

from body_metrics_tracker.core import LengthUnit, WeightUnit, waist_from_cm, weight_from_kg
from body_metrics_tracker.core.models import MeasurementEntry

from .dialogs import edit_entry_dialog
from .state import AppState


class HistoryWidget(QWidget):
    def __init__(self, state: AppState) -> None:
        super().__init__()
        self.state = state
        self._show_waist = None
        self._build_ui()
        self.state.subscribe(self._refresh_table)
        self._refresh_table()

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(12)

        header = QLabel("History")
        header.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(header)

        filter_group = QGroupBox("Filters")
        filter_layout = QHBoxLayout(filter_group)

        self.search_input = QLineEdit()
        self.search_input.setPlaceholderText("Search notes or dates...")
        self.search_input.textChanged.connect(self._refresh_table)

        self.from_check = QCheckBox("From")
        self.from_date = QDateEdit()
        self.from_date.setCalendarPopup(True)
        self.from_date.setDate(date.today())
        self.from_date.setEnabled(False)
        self.from_check.toggled.connect(self._on_from_toggled)
        self.from_date.dateChanged.connect(self._refresh_table)

        self.to_check = QCheckBox("To")
        self.to_date = QDateEdit()
        self.to_date.setCalendarPopup(True)
        self.to_date.setDate(date.today())
        self.to_date.setEnabled(False)
        self.to_check.toggled.connect(self._on_to_toggled)
        self.to_date.dateChanged.connect(self._refresh_table)

        self.clear_button = QPushButton("Clear")
        self.clear_button.clicked.connect(self._on_clear_filters)

        self.export_button = QPushButton("Export CSV")
        self.export_button.clicked.connect(self._on_export_csv)

        filter_layout.addWidget(self.search_input, 2)
        filter_layout.addWidget(self.from_check)
        filter_layout.addWidget(self.from_date)
        filter_layout.addWidget(self.to_check)
        filter_layout.addWidget(self.to_date)
        filter_layout.addWidget(self.clear_button)
        filter_layout.addWidget(self.export_button)

        layout.addWidget(filter_group)

        group = QGroupBox("Entries")
        group_layout = QVBoxLayout(group)

        self.table = QTableWidget(0, 6)
        self.table.setHorizontalHeaderLabels(
            ["Date", "Weight", "Waist", "Note", "Updated", "Actions"]
        )
        self.table.setSelectionBehavior(QAbstractItemView.SelectRows)
        self.table.setEditTriggers(QAbstractItemView.NoEditTriggers)
        self.table.verticalHeader().setVisible(False)
        self.table.horizontalHeader().setStretchLastSection(False)
        group_layout.addWidget(self.table)

        layout.addWidget(group)

        self.status_label = QLabel("")
        layout.addWidget(self.status_label)

    def _filtered_entries(self) -> list[MeasurementEntry]:
        entries = [entry for entry in self.state.entries if not entry.is_deleted]
        search_text = self.search_input.text().strip().lower()
        if search_text:
            entries = [
                entry
                for entry in entries
                if search_text in (entry.note or "").lower()
                or search_text in entry.measured_at.date().isoformat()
            ]

        if self.from_check.isChecked():
            from_date = self.from_date.date().toPython()
            entries = [entry for entry in entries if entry.measured_at.date() >= from_date]

        if self.to_check.isChecked():
            to_date = self.to_date.date().toPython()
            entries = [entry for entry in entries if entry.measured_at.date() <= to_date]

        return sorted(entries, key=lambda entry: entry.measured_at, reverse=True)

    def _refresh_table(self) -> None:
        show_waist = self.state.profile.track_waist
        if show_waist != self._show_waist:
            self._configure_columns(show_waist)
            self._show_waist = show_waist
        entries = self._filtered_entries()
        weight_unit = self.state.profile.weight_unit
        waist_unit = self.state.profile.waist_unit

        self.table.setRowCount(0)
        self.table.setRowCount(len(entries))
        for row, entry in enumerate(entries):
            self._populate_row(row, entry, weight_unit, waist_unit)

        header = self.table.horizontalHeader()
        header.setSectionResizeMode(0, QHeaderView.ResizeToContents)
        header.setSectionResizeMode(1, QHeaderView.ResizeToContents)
        if show_waist:
            header.setSectionResizeMode(2, QHeaderView.ResizeToContents)
            header.setSectionResizeMode(3, QHeaderView.Stretch)
            header.setSectionResizeMode(4, QHeaderView.ResizeToContents)
            header.setSectionResizeMode(5, QHeaderView.ResizeToContents)
        else:
            header.setSectionResizeMode(2, QHeaderView.Stretch)
            header.setSectionResizeMode(3, QHeaderView.ResizeToContents)
            header.setSectionResizeMode(4, QHeaderView.ResizeToContents)

    def _populate_row(
        self,
        row: int,
        entry: MeasurementEntry,
        weight_unit: WeightUnit,
        waist_unit: LengthUnit,
    ) -> None:
        measured_date = entry.measured_at.date().isoformat()
        weight_display = weight_from_kg(entry.weight_kg, weight_unit)
        waist_display = waist_from_cm(entry.waist_cm, waist_unit) if entry.waist_cm is not None else None
        updated_label = entry.updated_at.astimezone().strftime("%Y-%m-%d %H:%M")

        self.table.setItem(row, 0, QTableWidgetItem(measured_date))
        self.table.setItem(
            row,
            1,
            QTableWidgetItem(f"{weight_display:.1f} {weight_unit.value}"),
        )
        if self._show_waist:
            self.table.setItem(
                row,
                2,
                QTableWidgetItem(f"{waist_display:.1f} {waist_unit.value}" if waist_display is not None else "--"),
            )
            self.table.setItem(row, 3, QTableWidgetItem(entry.note or ""))
            self.table.setItem(row, 4, QTableWidgetItem(updated_label))
            action_column = 5
        else:
            self.table.setItem(row, 2, QTableWidgetItem(entry.note or ""))
            self.table.setItem(row, 3, QTableWidgetItem(updated_label))
            action_column = 4

        edit_button = QPushButton("Edit")
        edit_button.clicked.connect(partial(self._on_edit_entry, entry))
        delete_button = QPushButton("Delete")
        delete_button.clicked.connect(partial(self._on_delete_entry, entry))

        action_widget = QWidget()
        action_layout = QHBoxLayout(action_widget)
        action_layout.setContentsMargins(0, 0, 0, 0)
        action_layout.setSpacing(6)
        action_layout.addWidget(edit_button)
        action_layout.addWidget(delete_button)
        action_layout.addStretch(1)

        self.table.setCellWidget(row, action_column, action_widget)

    def _configure_columns(self, show_waist: bool) -> None:
        if show_waist:
            self.table.setColumnCount(6)
            self.table.setHorizontalHeaderLabels(
                ["Date", "Weight", "Waist", "Note", "Updated", "Actions"]
            )
        else:
            self.table.setColumnCount(5)
            self.table.setHorizontalHeaderLabels(
                ["Date", "Weight", "Note", "Updated", "Actions"]
            )

    def _on_edit_entry(self, entry: MeasurementEntry) -> None:
        result = edit_entry_dialog(
            self,
            entry,
            weight_unit=self.state.profile.weight_unit,
            waist_unit=self.state.profile.waist_unit,
            track_waist=self.state.profile.track_waist,
        )
        if result is None:
            return
        self.state.update_entry(result)

    def _on_delete_entry(self, entry: MeasurementEntry) -> None:
        self.state.soft_delete_entry(entry.entry_id)

    def _on_from_toggled(self, checked: bool) -> None:
        self.from_date.setEnabled(checked)
        self._refresh_table()

    def _on_to_toggled(self, checked: bool) -> None:
        self.to_date.setEnabled(checked)
        self._refresh_table()

    def _on_clear_filters(self) -> None:
        self.search_input.clear()
        self.from_check.setChecked(False)
        self.to_check.setChecked(False)
        self.status_label.setText("")
        self._refresh_table()

    def _on_export_csv(self) -> None:
        entries = self._filtered_entries()
        if not entries:
            self.status_label.setText("No entries to export.")
            return
        filename, _ = QFileDialog.getSaveFileName(
            self,
            "Export CSV",
            "body_metrics_entries.csv",
            "CSV Files (*.csv)",
        )
        if not filename:
            return
        weight_unit = self.state.profile.weight_unit
        waist_unit = self.state.profile.waist_unit
        show_waist = self.state.profile.track_waist
        try:
            with open(filename, "w", newline="", encoding="utf-8") as handle:
                writer = csv.writer(handle)
                if show_waist:
                    writer.writerow(
                        [
                            "measured_at",
                            "date_local",
                            "weight",
                            "weight_unit",
                            "waist",
                            "waist_unit",
                            "note",
                            "created_at",
                            "updated_at",
                            "version",
                        ]
                    )
                else:
                    writer.writerow(
                        [
                            "measured_at",
                            "date_local",
                            "weight",
                            "weight_unit",
                            "note",
                            "created_at",
                            "updated_at",
                            "version",
                        ]
                    )
                for entry in entries:
                    if show_waist:
                        writer.writerow(
                            [
                                entry.measured_at.isoformat(),
                                entry.date_local.isoformat() if entry.date_local else "",
                                f"{weight_from_kg(entry.weight_kg, weight_unit):.2f}",
                                weight_unit.value,
                                f"{waist_from_cm(entry.waist_cm, waist_unit):.2f}" if entry.waist_cm is not None else "",
                                waist_unit.value,
                                entry.note or "",
                                entry.created_at.isoformat(),
                                entry.updated_at.isoformat(),
                                entry.version,
                            ]
                        )
                    else:
                        writer.writerow(
                            [
                                entry.measured_at.isoformat(),
                                entry.date_local.isoformat() if entry.date_local else "",
                                f"{weight_from_kg(entry.weight_kg, weight_unit):.2f}",
                                weight_unit.value,
                                entry.note or "",
                                entry.created_at.isoformat(),
                                entry.updated_at.isoformat(),
                                entry.version,
                            ]
                        )
        except OSError as exc:
            self.status_label.setText(f"Export failed: {exc}")
            return
        self.status_label.setText(f"Exported {len(entries)} entries.")
