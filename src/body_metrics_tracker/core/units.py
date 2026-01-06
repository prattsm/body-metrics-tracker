from __future__ import annotations

from .models import LengthUnit, WeightUnit

LB_PER_KG = 2.2046226218
CM_PER_IN = 2.54


def lb_to_kg(pounds: float) -> float:
    return pounds / LB_PER_KG


def kg_to_lb(kg: float) -> float:
    return kg * LB_PER_KG


def in_to_cm(inches: float) -> float:
    return inches * CM_PER_IN


def cm_to_in(cm: float) -> float:
    return cm / CM_PER_IN


def normalize_weight(value: float, unit: WeightUnit) -> float:
    if unit == WeightUnit.KG:
        return value
    if unit == WeightUnit.LB:
        return lb_to_kg(value)
    raise ValueError(f"Unsupported weight unit: {unit}")


def normalize_waist(value: float, unit: LengthUnit) -> float:
    if unit == LengthUnit.CM:
        return value
    if unit == LengthUnit.IN:
        return in_to_cm(value)
    raise ValueError(f"Unsupported waist unit: {unit}")


def weight_from_kg(value_kg: float, unit: WeightUnit) -> float:
    if unit == WeightUnit.KG:
        return value_kg
    if unit == WeightUnit.LB:
        return kg_to_lb(value_kg)
    raise ValueError(f"Unsupported weight unit: {unit}")


def waist_from_cm(value_cm: float, unit: LengthUnit) -> float:
    if unit == LengthUnit.CM:
        return value_cm
    if unit == LengthUnit.IN:
        return cm_to_in(value_cm)
    raise ValueError(f"Unsupported waist unit: {unit}")
