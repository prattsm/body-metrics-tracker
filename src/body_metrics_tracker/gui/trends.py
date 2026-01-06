from __future__ import annotations

from datetime import date, datetime, time, timedelta

import pyqtgraph as pg
from PySide6.QtWidgets import (
    QCheckBox,
    QComboBox,
    QGroupBox,
    QHBoxLayout,
    QLabel,
    QVBoxLayout,
    QWidget,
)

from body_metrics_tracker.core import (
    LengthUnit,
    MeasurementEntry,
    WeightUnit,
    compute_weekly_summaries,
    waist_from_cm,
    weight_from_kg,
)

from .state import AppState

try:
    from pyqtgraph.graphicsItems.DateAxisItem import DateAxisItem
except Exception:  # pragma: no cover - optional import
    DateAxisItem = None


class TrendsWidget(QWidget):
    def __init__(self, state: AppState) -> None:
        super().__init__()
        self.state = state
        self._friend_checks: dict[object, QCheckBox] = {}
        self._build_ui()
        self._install_interactions()
        self._apply_profile_defaults()
        self._refresh_charts()
        self.state.subscribe(self._on_state_changed)

    def _build_ui(self) -> None:
        layout = QVBoxLayout(self)
        layout.setSpacing(22)

        header = QLabel("Trends")
        header.setStyleSheet("font-size: 20px; font-weight: 600;")
        layout.addWidget(header)

        hint = QLabel("Compare trends over time. Select friends to overlay their progress.")
        hint.setStyleSheet("color: #9aa4af;")
        hint.setWordWrap(True)
        layout.addWidget(hint)

        self.compare_group = QGroupBox("Compare")
        self.compare_layout = QVBoxLayout(self.compare_group)
        layout.addWidget(self.compare_group)

        controls_group = QGroupBox("View Options")
        controls_layout = QHBoxLayout(controls_group)

        self.range_combo = QComboBox()
        self.range_combo.addItems(["4 weeks", "12 weeks", "YTD", "All"])
        self.range_combo.currentIndexChanged.connect(self._refresh_charts)

        self.show_raw = QCheckBox("Raw points")
        self.show_raw.setChecked(True)
        self.show_raw.toggled.connect(self._refresh_charts)

        self.show_weekly = QCheckBox("Weekly average")
        self.show_weekly.setChecked(True)
        self.show_weekly.toggled.connect(self._refresh_charts)

        self.show_smoothing = QCheckBox("Smoothing")
        self.show_smoothing.setChecked(False)
        self.show_smoothing.toggled.connect(self._refresh_charts)

        self.smoothing_window = QComboBox()
        self.smoothing_window.addItems(["7 points", "14 points", "28 points"])
        self.smoothing_window.currentIndexChanged.connect(self._refresh_charts)

        self.show_goals = QCheckBox("Goals")
        self.show_goals.setChecked(True)
        self.show_goals.toggled.connect(self._refresh_charts)

        controls_layout.addWidget(QLabel("Range"))
        controls_layout.addWidget(self.range_combo)
        controls_layout.addStretch(1)
        controls_layout.addWidget(self.show_raw)
        controls_layout.addWidget(self.show_weekly)
        controls_layout.addWidget(self.show_smoothing)
        controls_layout.addWidget(self.smoothing_window)
        controls_layout.addWidget(self.show_goals)
        layout.addWidget(controls_group)

        self.weight_plot = self._create_plot("Weight")
        self.weight_plot.setMinimumHeight(260)
        layout.addWidget(self.weight_plot)

        layout.addSpacing(6)

        self.waist_plot = self._create_plot("Waist")
        self.waist_plot.setMinimumHeight(260)
        layout.addWidget(self.waist_plot)

        self.hover_label = QLabel("")
        self.hover_label.setStyleSheet("color: #9aa4af; font-size: 12px;")
        layout.addWidget(self.hover_label)

        layout.addStretch(1)

    def _create_plot(self, title: str) -> pg.PlotWidget:
        axis_items = {}
        if DateAxisItem is not None:
            axis_items["bottom"] = DateAxisItem(orientation="bottom")
        plot = pg.PlotWidget(axisItems=axis_items)
        plot.setBackground("#ffffff")
        plot.showGrid(x=True, y=True, alpha=0.25)
        plot.setTitle(title)
        plot.addLegend(offset=(10, 10))
        plot.setMouseEnabled(x=True, y=True)
        axis_pen = pg.mkPen(color=(150, 160, 175))
        for axis_name in ("bottom", "left"):
            axis = plot.getAxis(axis_name)
            axis.setPen(axis_pen)
            axis.setTextPen(pg.mkPen(color=(112, 122, 138)))
        plot.getPlotItem().setContentsMargins(12, 8, 12, 24)
        return plot

    def _apply_profile_defaults(self) -> None:
        self._apply_goal_toggle()
        self._refresh_friend_list()
        self._apply_tracking_visibility()

    def _on_state_changed(self) -> None:
        self._apply_profile_defaults()
        self._refresh_charts()

    def _selected_weight_unit(self) -> WeightUnit:
        return self.state.profile.weight_unit

    def _selected_waist_unit(self) -> LengthUnit:
        return self.state.profile.waist_unit

    def _apply_tracking_visibility(self) -> None:
        track_waist = self.state.profile.track_waist
        self.waist_plot.setVisible(track_waist)
        self._update_axis_visibility(track_waist)

    def _refresh_friend_list(self) -> None:
        selected = {user_id for user_id, box in self._friend_checks.items() if box.isChecked()}
        while self.compare_layout.count():
            item = self.compare_layout.takeAt(0)
            widget = item.widget()
            if widget is not None:
                widget.setParent(None)
        self._friend_checks = {}
        friends = [profile for profile in self.state.profiles if profile.user_id != self.state.profile.user_id]
        if not friends:
            placeholder = QLabel("No friends available.")
            placeholder.setStyleSheet("color: #9aa4af;")
            self.compare_layout.addWidget(placeholder)
            return
        for profile in sorted(friends, key=lambda item: item.display_name.lower()):
            checkbox = QCheckBox(profile.display_name)
            checkbox.setChecked(profile.user_id in selected)
            checkbox.toggled.connect(self._refresh_charts)
            self.compare_layout.addWidget(checkbox)
            self._friend_checks[profile.user_id] = checkbox

    def _selected_friend_profiles(self) -> list:
        selected_ids = {user_id for user_id, box in self._friend_checks.items() if box.isChecked()}
        return [profile for profile in self.state.profiles if profile.user_id in selected_ids]

    def _refresh_charts(self) -> None:
        entries = [entry for entry in self.state.entries if not entry.is_deleted]
        weight_unit = self._selected_weight_unit()
        waist_unit = self._selected_waist_unit()

        series = [
            {
                "label": self.state.profile.display_name,
                "entries": self._apply_range(entries),
            }
        ]
        for friend in self._selected_friend_profiles():
            friend_entries = [
                entry for entry in self.state.entries_for_profile(friend.user_id) if not entry.is_deleted
            ]
            series.append(
                {
                    "label": friend.display_name,
                    "entries": self._apply_range(friend_entries),
                }
            )

        self._refresh_plots(series, weight_unit, waist_unit)

    def _apply_range(self, entries: list[MeasurementEntry]) -> list[MeasurementEntry]:
        selection = self.range_combo.currentText()
        if selection == "All":
            return sorted(entries, key=lambda entry: entry.measured_at)
        today = date.today()
        if selection == "4 weeks":
            start_date = today - timedelta(weeks=4)
        elif selection == "12 weeks":
            start_date = today - timedelta(weeks=12)
        else:
            start_date = date(today.year, 1, 1)
        return sorted(
            [entry for entry in entries if entry.measured_at.date() >= start_date],
            key=lambda entry: entry.measured_at,
        )

    def _refresh_plots(
        self,
        series_list: list[dict[str, object]],
        weight_unit: WeightUnit,
        waist_unit: LengthUnit,
    ) -> None:
        self.weight_plot.clear()
        self.waist_plot.clear()
        self._reset_plot(self.weight_plot, self._weight_crosshair)
        if self.state.profile.track_waist:
            self._reset_plot(self.waist_plot, self._waist_crosshair)
        self._apply_goal_lines(weight_unit, waist_unit)

        weight_palette = [
            (91, 163, 255),
            (255, 99, 132),
            (255, 183, 77),
            (178, 102, 255),
            (102, 204, 255),
        ]
        waist_palette = [
            (125, 215, 165),
            (255, 159, 64),
            (255, 204, 128),
            (102, 204, 180),
            (153, 214, 255),
        ]

        weight_series_data: list[dict[str, object]] = []
        waist_series_data: list[dict[str, object]] = []

        for idx, series in enumerate(series_list):
            label = str(series["label"])
            entries = list(series["entries"]) if series.get("entries") else []
            entries = sorted([entry for entry in entries if not entry.is_deleted], key=lambda entry: entry.measured_at)
            color_weight = weight_palette[idx % len(weight_palette)]
            color_waist = waist_palette[idx % len(waist_palette)]

            if entries:
                timestamps = [entry.measured_at.timestamp() for entry in entries]
                weight_values = [weight_from_kg(entry.weight_kg, weight_unit) for entry in entries]
                weight_series_data.append(
                    {"label": label, "timestamps": timestamps, "values": weight_values}
                )

                if self.show_raw.isChecked():
                    self.weight_plot.plot(
                        timestamps,
                        weight_values,
                        pen=None,
                        symbol="o",
                        symbolSize=6,
                        symbolBrush=color_weight,
                        symbolPen=None,
                        name=f"{label} raw",
                    )

                if self.show_weekly.isChecked():
                    summaries = compute_weekly_summaries(entries)
                    if summaries:
                        tzinfo = datetime.now().astimezone().tzinfo
                        week_x = [
                            datetime.combine(summary.week_start_date_local, time(12, 0), tzinfo=tzinfo).timestamp()
                            for summary in summaries
                        ]
                        weekly_weight = [weight_from_kg(summary.avg_weight_kg, weight_unit) for summary in summaries]
                        self.weight_plot.plot(
                            week_x,
                            weekly_weight,
                            pen=pg.mkPen(color=color_weight, width=2),
                            name=f"{label} weekly",
                        )

                if self.show_smoothing.isChecked():
                    window = self._smoothing_window_points()
                    if window >= 2 and len(weight_values) >= window:
                        smoothed_weight = _moving_average(weight_values, window)
                        smoothed_x = timestamps[window - 1 :]
                        self.weight_plot.plot(
                            smoothed_x,
                            smoothed_weight,
                            pen=pg.mkPen(color=color_weight, width=2),
                            name=f"{label} smoothed",
                        )

            if self.state.profile.track_waist:
                waist_entries = [entry for entry in entries if entry.waist_cm is not None]
                if waist_entries:
                    waist_timestamps = [entry.measured_at.timestamp() for entry in waist_entries]
                    waist_values = [waist_from_cm(entry.waist_cm, waist_unit) for entry in waist_entries]
                    waist_series_data.append(
                        {"label": label, "timestamps": waist_timestamps, "values": waist_values}
                    )

                    if self.show_raw.isChecked():
                        self.waist_plot.plot(
                            waist_timestamps,
                            waist_values,
                            pen=None,
                            symbol="o",
                            symbolSize=6,
                            symbolBrush=color_waist,
                            symbolPen=None,
                            name=f"{label} raw",
                        )

                    if self.show_weekly.isChecked():
                        summaries = compute_weekly_summaries(waist_entries)
                        summaries = [summary for summary in summaries if summary.avg_waist_cm is not None]
                        if summaries:
                            tzinfo = datetime.now().astimezone().tzinfo
                            week_x = [
                                datetime.combine(summary.week_start_date_local, time(12, 0), tzinfo=tzinfo).timestamp()
                                for summary in summaries
                            ]
                            weekly_waist = [waist_from_cm(summary.avg_waist_cm, waist_unit) for summary in summaries]
                            self.waist_plot.plot(
                                week_x,
                                weekly_waist,
                                pen=pg.mkPen(color=color_waist, width=2),
                                name=f"{label} weekly",
                            )

                    if self.show_smoothing.isChecked():
                        window = self._smoothing_window_points()
                        if window >= 2 and len(waist_values) >= window:
                            smoothed_waist = _moving_average(waist_values, window)
                            smoothed_x = waist_timestamps[window - 1 :]
                            self.waist_plot.plot(
                                smoothed_x,
                                smoothed_waist,
                                pen=pg.mkPen(color=color_waist, width=2),
                                name=f"{label} smoothed",
                            )

        self.weight_plot.setLabel("left", f"Weight ({weight_unit.value})")
        if self.state.profile.track_waist:
            self.waist_plot.setLabel("left", f"Waist ({waist_unit.value})")

        self._latest_plot_data = {
            "weight": weight_series_data,
            "waist": waist_series_data,
            "weight_unit": weight_unit,
            "waist_unit": waist_unit,
        }
        self._update_axis_visibility(self.state.profile.track_waist)
        self._center_on_today()

    def _update_axis_visibility(self, track_waist: bool) -> None:
        weight_axis = self.weight_plot.getAxis("bottom")
        waist_axis = self.waist_plot.getAxis("bottom")
        weight_axis.setStyle(showValues=True)
        weight_axis.setHeight(28)
        waist_axis.setStyle(showValues=True if track_waist else False)
        waist_axis.setHeight(28 if track_waist else 0)

    def _center_on_today(self) -> None:
        today = datetime.now().astimezone()
        center_ts = today.timestamp()
        selection = self.range_combo.currentText()
        if selection == "4 weeks":
            range_days = 28
        elif selection == "12 weeks":
            range_days = 84
        elif selection == "YTD":
            start_year = date(today.year, 1, 1)
            range_days = max(30, (today.date() - start_year).days)
        else:
            range_days = 180
        half_seconds = max(range_days, 7) * 24 * 3600 / 2
        start_ts = center_ts - half_seconds
        end_ts = center_ts + half_seconds
        self.weight_plot.getViewBox().setXRange(start_ts, end_ts, padding=0.02)
        if self.state.profile.track_waist:
            self.waist_plot.getViewBox().setXRange(start_ts, end_ts, padding=0.02)

    def focus_today(self) -> None:
        self._center_on_today()

    def _install_interactions(self) -> None:
        self._latest_plot_data = {}
        self._weight_crosshair = pg.InfiniteLine(angle=90, movable=False, pen=pg.mkPen(color=(80, 80, 80)))
        self._waist_crosshair = pg.InfiniteLine(angle=90, movable=False, pen=pg.mkPen(color=(80, 80, 80)))
        self.weight_plot.addItem(self._weight_crosshair, ignoreBounds=True)
        self.waist_plot.addItem(self._waist_crosshair, ignoreBounds=True)

        self._weight_proxy = pg.SignalProxy(self.weight_plot.scene().sigMouseMoved, rateLimit=60, slot=self._on_mouse_move)
        self._waist_proxy = pg.SignalProxy(self.waist_plot.scene().sigMouseMoved, rateLimit=60, slot=self._on_mouse_move)

    def _on_mouse_move(self, event) -> None:
        if not self._latest_plot_data:
            return
        pos = event[0]
        for plot in (self.weight_plot, self.waist_plot):
            if not plot.isVisible():
                continue
            if not plot.sceneBoundingRect().contains(pos):
                continue
            mouse_point = plot.plotItem.vb.mapSceneToView(pos)
            x = mouse_point.x()
            self._weight_crosshair.setPos(x)
            self._waist_crosshair.setPos(x)
            metric = "weight" if plot is self.weight_plot else "waist"
            self._update_hover_label(x, metric)
            break

    def _update_hover_label(self, timestamp: float, metric: str) -> None:
        data = self._latest_plot_data
        series_list = data.get(metric, [])
        if not series_list:
            self.hover_label.setText("")
            return
        best = None
        for series in series_list:
            timestamps = series.get("timestamps", [])
            values = series.get("values", [])
            if not timestamps:
                continue
            index = min(range(len(timestamps)), key=lambda i: abs(timestamps[i] - timestamp))
            distance = abs(timestamps[index] - timestamp)
            if best is None or distance < best["distance"]:
                best = {
                    "distance": distance,
                    "timestamp": timestamps[index],
                    "value": values[index],
                    "label": series.get("label", ""),
                }
        if not best:
            self.hover_label.setText("")
            return
        ts = datetime.fromtimestamp(best["timestamp"]).astimezone()
        unit = data["weight_unit"] if metric == "weight" else data["waist_unit"]
        label = best["label"]
        self.hover_label.setText(
            f"{ts.strftime('%Y-%m-%d')} · {label}: {best['value']:.1f} {unit.value}"
        )

    def _reset_plot(self, plot: pg.PlotWidget, crosshair: pg.InfiniteLine) -> None:
        if crosshair is not None:
            plot.addItem(crosshair, ignoreBounds=True)
        plot.addLegend(offset=(10, 10))

    def _smoothing_window_points(self) -> int:
        selection = self.smoothing_window.currentText()
        if selection.startswith("7"):
            return 7
        if selection.startswith("14"):
            return 14
        return 28

    def _apply_goal_toggle(self) -> None:
        profile = self.state.profile
        has_goals = profile.goal_weight_kg is not None or (profile.track_waist and profile.goal_waist_cm is not None)
        self.show_goals.setEnabled(has_goals)
        if not has_goals:
            self.show_goals.setChecked(False)

    def _apply_goal_lines(self, weight_unit: WeightUnit, waist_unit: LengthUnit) -> None:
        if not self.show_goals.isChecked():
            return
        profile = self.state.profile
        if profile.goal_weight_kg is not None:
            goal = weight_from_kg(profile.goal_weight_kg, weight_unit)
            line = pg.InfiniteLine(pos=goal, angle=0, pen=pg.mkPen(color=(255, 99, 132), width=2))
            self.weight_plot.addItem(line, ignoreBounds=True)

        if profile.track_waist and profile.goal_waist_cm is not None:
            goal = waist_from_cm(profile.goal_waist_cm, waist_unit)
            line = pg.InfiniteLine(pos=goal, angle=0, pen=pg.mkPen(color=(255, 159, 64), width=2))
            self.waist_plot.addItem(line, ignoreBounds=True)


def _moving_average(values: list[float], window: int) -> list[float]:
    if window <= 1:
        return values[:]
    result = []
    for idx in range(window - 1, len(values)):
        subset = values[idx - window + 1 : idx + 1]
        result.append(sum(subset) / window)
    return result
