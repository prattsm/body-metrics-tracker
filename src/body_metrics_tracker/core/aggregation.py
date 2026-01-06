from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta
from statistics import fmean
from typing import Iterable, List, Sequence

from .models import MeasurementEntry


@dataclass(frozen=True)
class WeeklySummary:
    week_start_date_local: date
    avg_weight_kg: float
    avg_waist_cm: float | None
    count_entries: int


@dataclass(frozen=True)
class WeeklyDelta:
    week_start_date_local: date
    delta_weight_kg: float | None
    delta_waist_cm: float | None


def week_start_date(local_date: date) -> date:
    days_since_sunday = (local_date.weekday() + 1) % 7
    return local_date - timedelta(days=days_since_sunday)


def compute_weekly_summaries(entries: Iterable[MeasurementEntry]) -> List[WeeklySummary]:
    buckets: dict[date, list[MeasurementEntry]] = {}
    for entry in entries:
        if entry.is_deleted:
            continue
        if entry.date_local is None:
            raise ValueError("entry.date_local must be set")
        start = week_start_date(entry.date_local)
        buckets.setdefault(start, []).append(entry)

    summaries: list[WeeklySummary] = []
    for start_date, bucket in buckets.items():
        weights = [e.weight_kg for e in bucket]
        waists = [e.waist_cm for e in bucket if e.waist_cm is not None]
        summaries.append(
            WeeklySummary(
                week_start_date_local=start_date,
                avg_weight_kg=fmean(weights),
                avg_waist_cm=fmean(waists) if waists else None,
                count_entries=len(bucket),
            )
        )

    summaries.sort(key=lambda summary: summary.week_start_date_local)
    return summaries


def compute_weekly_deltas(summaries: Sequence[WeeklySummary]) -> List[WeeklyDelta]:
    deltas: list[WeeklyDelta] = []
    for index, summary in enumerate(summaries):
        if index == 0:
            deltas.append(
                WeeklyDelta(
                    week_start_date_local=summary.week_start_date_local,
                    delta_weight_kg=None,
                    delta_waist_cm=None,
                )
            )
            continue

        prev = summaries[index - 1]
        expected_prev = summary.week_start_date_local - timedelta(days=7)
        if prev.week_start_date_local != expected_prev:
            deltas.append(
                WeeklyDelta(
                    week_start_date_local=summary.week_start_date_local,
                    delta_weight_kg=None,
                    delta_waist_cm=None,
                )
            )
            continue

        deltas.append(
            WeeklyDelta(
                week_start_date_local=summary.week_start_date_local,
                delta_weight_kg=summary.avg_weight_kg - prev.avg_weight_kg,
                delta_waist_cm=(
                    None
                    if summary.avg_waist_cm is None or prev.avg_waist_cm is None
                    else summary.avg_waist_cm - prev.avg_waist_cm
                ),
            )
        )

    return deltas
