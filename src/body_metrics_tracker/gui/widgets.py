from __future__ import annotations

from datetime import date, datetime, time, timedelta
import threading

from PySide6.QtWidgets import (
    QDateEdit,
    QDoubleSpinBox,
    QFormLayout,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QMessageBox,
    QPushButton,
    QVBoxLayout,
    QWidget,
)

from body_metrics_tracker.core import (
    LengthUnit,
    MeasurementEntry,
    WeightUnit,
    compute_weekly_deltas,
    compute_weekly_summaries,
    normalize_waist,
    normalize_weight,
    waist_from_cm,
    weight_from_kg,
)
from body_metrics_tracker.relay import RelayConfig, post_status
from body_metrics_tracker.core.aggregation import week_start_date

from .state import AppState

WEIGHT_RANGE_KG = (20.0, 300.0)
WAIST_RANGE_CM = (30.0, 200.0)
DEFAULT_WEIGHT_LB = 150.0
DEFAULT_WAIST_IN = 35.0


class DashboardWidget(QWidget):
    def __init__(self, state: AppState) -> None:
        super().__init__()
        self.state = state
        self._build_ui()
        self._apply_profile_defaults()
        self._refresh_stats()
        self.state.subscribe(self._on_state_changed)

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(16)

        header_row = QHBoxLayout()
        header = QLabel("Dashboard")
        header.setStyleSheet("font-size: 20px; font-weight: 600;")
        self.profile_label = QLabel("")
        self.profile_label.setStyleSheet("color: #9aa4af;")
        header_row.addWidget(header)
        header_row.addStretch(1)
        header_row.addWidget(self.profile_label)
        layout.addLayout(header_row)

        self.banner_container = QWidget()
        banner_layout = QHBoxLayout(self.banner_container)
        banner_layout.setContentsMargins(0, 0, 0, 0)
        self.banner_label = QLabel("")
        self.banner_label.setStyleSheet(
            "background-color: #fff4d6; color: #5b4a1f; padding: 8px 12px; border-radius: 8px;"
        )
        self.banner_label.setWordWrap(True)
        self.banner_dismiss_button = QPushButton("Dismiss")
        self.banner_dismiss_button.clicked.connect(self._dismiss_reminder)
        banner_layout.addWidget(self.banner_label, 1)
        banner_layout.addWidget(self.banner_dismiss_button)
        self.banner_container.setVisible(False)
        layout.addWidget(self.banner_container)

        self.quick_entry = self._build_quick_entry()
        layout.addWidget(self.quick_entry)

        self.today_card = QGroupBox("Today")
        self.today_card.setObjectName("todayCard")
        today_layout = QVBoxLayout(self.today_card)
        self.today_status_label = QLabel("No entry yet")
        self.today_status_label.setStyleSheet("font-size: 14px; font-weight: 600;")
        self.today_detail_label = QLabel("")
        self.today_detail_label.setStyleSheet("color: #6b7785;")
        today_layout.addWidget(self.today_status_label)
        today_layout.addWidget(self.today_detail_label)
        layout.addWidget(self.today_card)

        self.friends_group = QGroupBox("Friends")
        self.friends_layout = QVBoxLayout(self.friends_group)
        layout.addWidget(self.friends_group)

        summary_row = QHBoxLayout()
        summary_row.setSpacing(12)
        self.summary_label = QLabel("This week: no entries yet")
        self.summary_label.setStyleSheet("font-size: 14px;")
        self.last_entry_label = QLabel("Last entry: --")
        self.last_entry_label.setStyleSheet("font-size: 14px;")
        summary_row.addWidget(self.summary_label)
        summary_row.addStretch(1)
        summary_row.addWidget(self.last_entry_label)
        layout.addLayout(summary_row)

        self.delta_label = QLabel("Last completed week: --")
        self.delta_label.setStyleSheet("font-size: 13px; color: #9aa4af;")
        layout.addWidget(self.delta_label)

        self.status_label = QLabel("")
        self.status_label.setObjectName("statusLabel")
        layout.addWidget(self.status_label)

        layout.addStretch(1)

    def _build_quick_entry(self) -> QGroupBox:
        group = QGroupBox("Daily Entry")
        form = QFormLayout()

        self.weight_input = QDoubleSpinBox()
        self.weight_input.setDecimals(1)
        self.weight_input.setSingleStep(0.1)

        self.waist_input = QDoubleSpinBox()
        self.waist_input.setDecimals(1)
        self.waist_input.setSingleStep(0.1)
        self.waist_row_label = QLabel("Waist")
        self.waist_row_container = self.waist_input

        self.date_input = QDateEdit()
        self.date_input.setCalendarPopup(True)
        self.date_input.setDate(date.today())

        self.note_input = QLineEdit()
        self.note_input.setPlaceholderText("Optional note")

        self.save_button = QPushButton("Save Entry")
        self.save_button.setDefault(True)
        self.save_button.clicked.connect(self._on_save_entry)
        self.note_input.returnPressed.connect(self._on_save_entry)

        form.addRow("Weight", self.weight_input)
        form.addRow(self.waist_row_label, self.waist_row_container)
        form.addRow("Date", self.date_input)
        form.addRow("Note", self.note_input)
        form.addRow("", self.save_button)

        group.setLayout(form)
        return group

    def _apply_profile_defaults(self) -> None:
        profile = self.state.profile
        self.profile_label.setText(f"Profile: {profile.display_name}")
        self._apply_units(reset_values=True)
        self._apply_tracking_visibility()

    def _on_state_changed(self) -> None:
        self._apply_profile_defaults()
        self._refresh_stats()

    def _selected_weight_unit(self) -> WeightUnit:
        return self.state.profile.weight_unit

    def _selected_waist_unit(self) -> LengthUnit:
        return self.state.profile.waist_unit

    def _apply_units(self, reset_values: bool) -> None:
        weight_unit = self._selected_weight_unit()
        waist_unit = self._selected_waist_unit()

        self.weight_input.blockSignals(True)
        self.waist_input.blockSignals(True)

        if weight_unit == WeightUnit.KG:
            self.weight_input.setRange(*WEIGHT_RANGE_KG)
            self.weight_input.setSuffix(" kg")
        else:
            low, high = WEIGHT_RANGE_KG
            self.weight_input.setRange(weight_from_kg(low, weight_unit), weight_from_kg(high, weight_unit))
            self.weight_input.setSuffix(" lb")

        if waist_unit == LengthUnit.CM:
            self.waist_input.setRange(*WAIST_RANGE_CM)
            self.waist_input.setSuffix(" cm")
        else:
            low, high = WAIST_RANGE_CM
            self.waist_input.setRange(waist_from_cm(low, waist_unit), waist_from_cm(high, waist_unit))
            self.waist_input.setSuffix(" in")

        if reset_values:
            self._reset_inputs_from_last_entry()

        self.weight_input.blockSignals(False)
        self.waist_input.blockSignals(False)

    def _apply_tracking_visibility(self) -> None:
        track_waist = self.state.profile.track_waist
        self.waist_row_label.setVisible(track_waist)
        self.waist_row_container.setVisible(track_waist)
        self.waist_input.setEnabled(track_waist)

    def _reset_inputs_from_last_entry(self) -> None:
        entries = [entry for entry in self.state.entries if not entry.is_deleted]
        track_waist = self.state.profile.track_waist
        if entries:
            last = entries[-1]
            weight_display = weight_from_kg(last.weight_kg, self._selected_weight_unit())
            self.weight_input.setValue(weight_display)
            if track_waist:
                if last.waist_cm is None:
                    self.waist_input.setValue(self.waist_input.minimum())
                else:
                    waist_display = waist_from_cm(last.waist_cm, self._selected_waist_unit())
                    self.waist_input.setValue(waist_display)
            return
        default_weight_kg = normalize_weight(DEFAULT_WEIGHT_LB, WeightUnit.LB)
        default_weight_display = weight_from_kg(default_weight_kg, self._selected_weight_unit())
        self.weight_input.setValue(default_weight_display)
        if track_waist:
            default_waist_cm = normalize_waist(DEFAULT_WAIST_IN, LengthUnit.IN)
            default_waist_display = waist_from_cm(default_waist_cm, self._selected_waist_unit())
            self.waist_input.setValue(default_waist_display)

    def _on_save_entry(self) -> None:
        weight_display = float(self.weight_input.value())
        measured_date = self.date_input.date().toPython()
        measured_at = self._combine_datetime(measured_date)
        note = self.note_input.text().strip() or None

        weight_kg = normalize_weight(weight_display, self._selected_weight_unit())
        waist_cm = None
        if self.state.profile.track_waist:
            waist_display = float(self.waist_input.value())
            waist_cm = normalize_waist(waist_display, self._selected_waist_unit())

        warnings = self._validation_warnings(weight_kg, waist_cm, measured_at)
        if warnings:
            if not self._confirm_warning("\n".join(warnings)):
                return

        entry = MeasurementEntry(
            user_id=self.state.profile.user_id,
            measured_at=measured_at,
            weight_kg=weight_kg,
            waist_cm=waist_cm,
            note=note,
        )
        self.state.add_entry(entry)
        self.note_input.clear()
        self._refresh_stats()
        self._post_status_update()
        self.status_label.setText("Entry saved.")

    def _combine_datetime(self, selected_date: date) -> datetime:
        now = datetime.now().astimezone()
        base_time = time(now.hour, now.minute, now.second)
        return datetime.combine(selected_date, base_time, tzinfo=now.tzinfo)

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
        if self._is_duplicate_entry(weight_kg, waist_cm, measured_at):
            warnings.append("Possible duplicate entry (similar values within 5 minutes).")
        return warnings

    def _confirm_warning(self, message: str) -> bool:
        result = QMessageBox.warning(
            self,
            "Check values",
            f"{message}\n\nSave anyway?",
            QMessageBox.Yes | QMessageBox.No,
        )
        return result == QMessageBox.Yes

    def _refresh_stats(self) -> None:
        entries = [entry for entry in self.state.entries if not entry.is_deleted]
        weight_unit = self._selected_weight_unit()
        waist_unit = self._selected_waist_unit()
        track_waist = self.state.profile.track_waist
        today = date.today()
        today_entries = [entry for entry in entries if entry.measured_at.date() == today]

        if entries:
            last = entries[-1]
            last_weight = weight_from_kg(last.weight_kg, weight_unit)
            if track_waist and last.waist_cm is not None:
                last_waist = waist_from_cm(last.waist_cm, waist_unit)
                self.last_entry_label.setText(
                    f"Last entry: {last_weight:.1f} {weight_unit.value} / {last_waist:.1f} {waist_unit.value}"
                )
            else:
                self.last_entry_label.setText(f"Last entry: {last_weight:.1f} {weight_unit.value}")
        else:
            self.last_entry_label.setText("Last entry: --")

        if today_entries:
            entry = today_entries[-1]
            today_weight = weight_from_kg(entry.weight_kg, weight_unit)
            if track_waist and entry.waist_cm is not None:
                today_waist = waist_from_cm(entry.waist_cm, waist_unit)
                detail = f"{today_weight:.1f} {weight_unit.value} · {today_waist:.1f} {waist_unit.value}"
            else:
                detail = f"{today_weight:.1f} {weight_unit.value}"
            self.today_status_label.setText("Logged today")
            self.today_status_label.setStyleSheet("font-size: 14px; font-weight: 600; color: #2fbf71;")
            self.today_detail_label.setText(detail)
        else:
            self.today_status_label.setText("No entry yet")
            self.today_status_label.setStyleSheet("font-size: 14px; font-weight: 600; color: #6b7785;")
            self.today_detail_label.setText("Add today's weight to keep your streak.")

        summaries = compute_weekly_summaries(entries)
        self._update_weekly_summary(summaries, weight_unit, waist_unit, track_waist)
        self._refresh_friend_status(weight_unit, waist_unit)

    def _post_status_update(self) -> None:
        profile = self.state.profile
        if not profile.relay_url or not profile.relay_token:
            return
        entries = [entry for entry in self.state.entries if not entry.is_deleted]
        today = date.today()
        logged_today = any(entry.measured_at.date() == today for entry in entries)
        last_entry_date = entries[-1].date_local if entries else None
        share_weight = any(
            friend.share_weight for friend in profile.friends if friend.status == "connected"
        )
        share_waist = any(
            friend.share_waist for friend in profile.friends if friend.status == "connected"
        )
        if entries:
            last = entries[-1]
            weight_kg = last.weight_kg if share_weight else None
            waist_cm = last.waist_cm if share_waist else None
        else:
            weight_kg = None
            waist_cm = None

        config = RelayConfig(profile.relay_url, profile.relay_token)

        def run() -> None:
            try:
                post_status(config, logged_today, last_entry_date, weight_kg, waist_cm)
            except Exception:
                return

        threading.Thread(target=run, daemon=True).start()

    def _refresh_friend_status(self, weight_unit: WeightUnit, waist_unit: LengthUnit) -> None:
        self._clear_layout(self.friends_layout)
        profile = self.state.profile
        friends = list(profile.friends)
        if not friends:
            placeholder = QLabel("No friends connected yet.")
            placeholder.setStyleSheet("color: #9aa4af;")
            self.friends_layout.addWidget(placeholder)
            self.banner_container.setVisible(False)
            return
        today = date.today()
        seen_at = profile.last_reminder_seen_at
        latest_reminder = None
        for friend in friends:
            if friend.last_reminder_at and friend.last_reminder_message:
                if seen_at and friend.last_reminder_at <= seen_at:
                    continue
                if latest_reminder is None or friend.last_reminder_at > latest_reminder[0]:
                    latest_reminder = (friend.last_reminder_at, friend)
        if latest_reminder:
            _, friend = latest_reminder
            self._latest_reminder_at = friend.last_reminder_at
            self.banner_label.setText(f"Reminder from {friend.display_name}: {friend.last_reminder_message}")
            self.banner_container.setVisible(True)
        else:
            self._latest_reminder_at = None
            self.banner_container.setVisible(False)
        for friend in sorted(friends, key=lambda item: item.display_name.lower()):
            status_text = self._friend_status_text(friend, today)
            details = self._friend_detail_text(friend, weight_unit, waist_unit)
            text = f"{friend.display_name}: {status_text}"
            if details:
                text = f"{text} · {details}"
            label = QLabel(text)
            if friend.last_entry_logged_today:
                label.setStyleSheet("color: #2fbf71;")
            self.friends_layout.addWidget(label)
            if friend.last_reminder_message and (
                seen_at is None or (friend.last_reminder_at and friend.last_reminder_at > seen_at)
            ):
                reminder = QLabel(f"Reminder: {friend.last_reminder_message}")
                reminder.setStyleSheet("color: #9aa4af;")
                self.friends_layout.addWidget(reminder)

    def _dismiss_reminder(self) -> None:
        if not getattr(self, "_latest_reminder_at", None):
            return
        profile = self.state.profile
        profile.last_reminder_seen_at = self._latest_reminder_at
        self.state.update_profile(profile)

    def _friend_status_text(self, friend, today: date) -> str:
        if friend.status != "connected":
            if friend.status == "incoming":
                return "Invite pending"
            return "Invite sent"
        if friend.last_entry_logged_today is True:
            return "Logged today"
        if friend.last_entry_logged_today is False:
            return "Not logged today"
        if friend.last_entry_date:
            if friend.last_entry_date == today:
                return "Logged today"
            return f"Last logged {friend.last_entry_date.isoformat()}"
        return "No update yet"

    def _friend_detail_text(self, friend, weight_unit: WeightUnit, waist_unit: LengthUnit) -> str:
        parts = []
        if friend.last_weight_kg is not None:
            weight_display = weight_from_kg(friend.last_weight_kg, weight_unit)
            parts.append(f"{weight_display:.1f} {weight_unit.value}")
        if friend.last_waist_cm is not None:
            waist_display = waist_from_cm(friend.last_waist_cm, waist_unit)
            parts.append(f"{waist_display:.1f} {waist_unit.value}")
        return " / ".join(parts)

    def _clear_layout(self, layout: QVBoxLayout) -> None:
        while layout.count():
            item = layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.deleteLater()

    def _update_weekly_summary(
        self,
        summaries: list,
        weight_unit: WeightUnit,
        waist_unit: LengthUnit,
        track_waist: bool,
    ) -> None:
        if not summaries:
            self.summary_label.setText("This week: no entries yet")
            self.delta_label.setText("Last completed week: --")
            return

        today = date.today()
        current_week = week_start_date(today)
        summary_by_week = {summary.week_start_date_local: summary for summary in summaries}
        current_summary = summary_by_week.get(current_week)
        if current_summary:
            avg_weight = weight_from_kg(current_summary.avg_weight_kg, weight_unit)
            if track_waist and current_summary.avg_waist_cm is not None:
                avg_waist = waist_from_cm(current_summary.avg_waist_cm, waist_unit)
                self.summary_label.setText(
                    f"This week avg: {avg_weight:.1f} {weight_unit.value} / {avg_waist:.1f} {waist_unit.value}"
                )
            else:
                self.summary_label.setText(f"This week avg: {avg_weight:.1f} {weight_unit.value}")
        else:
            self.summary_label.setText("This week: no entries yet")

        last_completed_weeks = [week for week in summary_by_week if week < current_week]
        if not last_completed_weeks:
            self.delta_label.setText("Last completed week: --")
            return
        last_week = max(last_completed_weeks)
        last_summary = summary_by_week[last_week]
        deltas = {delta.week_start_date_local: delta for delta in compute_weekly_deltas(summaries)}
        delta = deltas.get(last_week)
        delta_weight_kg = delta.delta_weight_kg if delta else None
        avg_weight = weight_from_kg(last_summary.avg_weight_kg, weight_unit)
        avg_waist = (
            waist_from_cm(last_summary.avg_waist_cm, waist_unit) if last_summary.avg_waist_cm is not None else None
        )
        delta_weight = None if delta is None or delta.delta_weight_kg is None else weight_from_kg(delta.delta_weight_kg, weight_unit)
        delta_waist = None if delta is None or delta.delta_waist_cm is None else waist_from_cm(delta.delta_waist_cm, waist_unit)

        if delta_weight is None:
            delta_text = "Last completed week: no prior week to compare"
        elif track_waist and avg_waist is not None and delta_waist is not None:
            delta_text = (
                f"Last completed week: {avg_weight:.1f} {weight_unit.value} / {avg_waist:.1f} {waist_unit.value} "
                f"(WoW: {delta_weight:+.1f} {weight_unit.value}, {delta_waist:+.1f} {waist_unit.value})"
            )
        else:
            delta_text = (
                f"Last completed week: {avg_weight:.1f} {weight_unit.value} "
                f"(WoW: {delta_weight:+.1f} {weight_unit.value})"
            )
        self.delta_label.setText(delta_text)
        self._apply_goal_accent(delta_weight_kg, last_summary.avg_weight_kg)

    def _apply_goal_accent(self, delta_weight_kg: float | None, current_avg_kg: float) -> None:
        profile = self.state.profile
        goal = profile.goal_weight_kg
        if delta_weight_kg is None or goal is None:
            self.delta_label.setStyleSheet("font-size: 13px; color: #6b7785;")
            return
        diff = goal - current_avg_kg
        if abs(diff) < 0.1:
            self.delta_label.setStyleSheet("font-size: 13px; color: #6b7785;")
            return
        desired = 1 if diff > 0 else -1
        good = (desired > 0 and delta_weight_kg > 0) or (desired < 0 and delta_weight_kg < 0)
        if good:
            self.delta_label.setStyleSheet("font-size: 13px; color: #2fbf71;")
        else:
            self.delta_label.setStyleSheet("font-size: 13px; color: #6b7785;")

    def _is_duplicate_entry(self, weight_kg: float, waist_cm: float | None, measured_at: datetime) -> bool:
        tolerance_minutes = 5
        weight_tol = 0.1
        waist_tol = 0.1
        for entry in self.state.entries:
            if entry.is_deleted:
                continue
            delta = abs((entry.measured_at - measured_at).total_seconds())
            if delta <= tolerance_minutes * 60:
                if abs(entry.weight_kg - weight_kg) > weight_tol:
                    continue
                if waist_cm is None or entry.waist_cm is None:
                    return True
                if abs(entry.waist_cm - waist_cm) <= waist_tol:
                    return True
        return False
