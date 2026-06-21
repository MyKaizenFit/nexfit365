"""Helpers to scale recipe ingredient quantities without distorting proportions."""

from __future__ import annotations


def is_oil_like(food_name: str, food_category: str) -> bool:
    normalized_name = (food_name or "").strip().lower()
    normalized_category = (food_category or "").strip().lower()
    oil_terms = ("aceite", "oil")
    return any(term in normalized_name for term in oil_terms) or any(
        term in normalized_category for term in oil_terms
    )


def is_seasoning_like(food_name: str, food_category: str) -> bool:
    normalized_name = (food_name or "").strip().lower()
    normalized_category = (food_category or "").strip().lower()
    seasoning_terms = (
        "sal",
        "pimienta",
        "especia",
        "condimento",
        "curry",
        "canela",
        "orégano",
        "oregano",
        "comino",
        "piment",
        "vinagre",
        "mostaza",
    )
    return any(
        term in normalized_name or term in normalized_category for term in seasoning_terms
    )


def scale_ingredient_quantity(
    original_amount: float,
    scale_factor: float,
    *,
    food_name: str = "",
    food_category: str = "",
) -> float:
    """
    Scale an ingredient amount while keeping proportions sensible.

    Main ingredients follow the recipe scale factor. Oils and seasonings use a
    damped curve so they do not collapse or explode relative to the rest.
    """
    original = float(original_amount or 0)
    if original <= 0:
        return 0.0

    factor = float(scale_factor or 1.0)
    linear = original * factor

    if is_oil_like(food_name, food_category):
        scaled = original + (linear - original) * 0.7
        lower_bound = max(2.0, original * 0.45)
        upper_bound = max(15.0, min(25.0, original * max(1.0, factor) * 1.25))
        scaled = max(lower_bound, min(scaled, upper_bound))
    elif is_seasoning_like(food_name, food_category):
        scaled = original + (linear - original) * 0.35
        lower_bound = max(0.5, original * 0.65)
        upper_bound = max(original * 1.35, original + 2.0)
        scaled = max(lower_bound, min(scaled, upper_bound))
    else:
        scaled = linear

    return round(scaled, 1)
