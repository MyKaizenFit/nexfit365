"""
Importacion masiva de alimentos desde USDA FoodData Central API.

Genera un JSON con formato equivalente a carga manual y guarda en Food.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import requests
from django.core.management.base import BaseCommand

from nutrition.models import Food


USDA_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"

DEFAULT_TERMS = [
    "chicken",
    "beef",
    "turkey",
    "salmon",
    "tuna",
    "egg",
    "milk",
    "yogurt",
    "cheese",
    "rice",
    "pasta",
    "oats",
    "bread",
    "potato",
    "sweet potato",
    "broccoli",
    "spinach",
    "tomato",
    "carrot",
    "onion",
    "apple",
    "banana",
    "orange",
    "strawberry",
    "chickpeas",
    "lentils",
    "beans",
    "olive oil",
    "almonds",
    "walnuts",
]


def _nutrient_map(food: dict) -> dict:
    values = {
        "calories": 0,
        "protein": 0.0,
        "carbs": 0.0,
        "fat": 0.0,
        "fiber": 0.0,
        "sugar": 0.0,
        "sodium": 0.0,
    }

    nutrients = food.get("foodNutrients") or []
    for nutrient in nutrients:
        name = str(nutrient.get("nutrientName") or "").strip().lower()
        value = nutrient.get("value")
        if value is None:
            continue

        try:
            num = float(value)
        except (TypeError, ValueError):
            continue

        if name in {
            "energy",
            "energy (atwater general factors)",
            "energy (atwater specific factors)",
        }:
            values["calories"] = int(round(num))
        elif name == "protein":
            values["protein"] = round(num, 2)
        elif name == "carbohydrate, by difference":
            values["carbs"] = round(num, 2)
        elif name == "total lipid (fat)":
            values["fat"] = round(num, 2)
        elif name == "fiber, total dietary":
            values["fiber"] = round(num, 2)
        elif name == "sugars, total including nlea":
            values["sugar"] = round(num, 2)
        elif name == "sodium, na":
            values["sodium"] = round(num, 2)

    return values


class Command(BaseCommand):
    help = "Importa gran cantidad de alimentos desde USDA API y exporta JSON manual-like"

    def add_arguments(self, parser):
        parser.add_argument("--api-key", default="DEMO_KEY")
        parser.add_argument("--terms", nargs="*")
        parser.add_argument("--pages-per-term", type=int, default=3)
        parser.add_argument("--page-size", type=int, default=50)
        parser.add_argument("--max-total", type=int, default=1500)
        parser.add_argument("--output", default="data/foods_manual_like_import_usda.json")
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        api_key = options["api_key"]
        terms = options["terms"] or DEFAULT_TERMS
        pages_per_term = max(1, int(options["pages_per_term"]))
        page_size = min(max(1, int(options["page_size"])), 200)
        max_total = max(1, int(options["max_total"]))
        dry_run = bool(options["dry_run"])

        output_path = Path(options["output"])
        output_path.parent.mkdir(parents=True, exist_ok=True)

        session = requests.Session()
        created = 0
        updated = 0
        skipped = 0
        processed = 0
        seen_names = set()
        exported_rows = []

        self.stdout.write(
            self.style.NOTICE(
                f"USDA bulk import: {len(terms)} terminos, {pages_per_term} paginas/termino, {page_size} por pagina"
            )
        )

        for term in terms:
            if processed >= max_total:
                break

            self.stdout.write(f"\nBuscando termino USDA: '{term}'")
            for page in range(1, pages_per_term + 1):
                if processed >= max_total:
                    break

                params = {
                    "query": term,
                    "pageNumber": page,
                    "pageSize": page_size,
                    "api_key": api_key,
                }
                try:
                    response = session.get(USDA_URL, params=params, timeout=60)
                    response.raise_for_status()
                    payload = response.json()
                except Exception as exc:
                    self.stderr.write(f"Error USDA termino='{term}' pagina={page}: {exc}")
                    continue

                foods = payload.get("foods") or []
                if not foods:
                    break

                for item in foods:
                    if processed >= max_total:
                        break

                    name = str(item.get("description") or "").strip()[:200]
                    if not name:
                        skipped += 1
                        continue
                    if name in seen_names:
                        skipped += 1
                        continue

                    nutrients = _nutrient_map(item)
                    if (
                        nutrients["calories"] <= 0
                        and nutrients["protein"] <= 0
                        and nutrients["carbs"] <= 0
                        and nutrients["fat"] <= 0
                    ):
                        skipped += 1
                        continue

                    payload_food = {
                        "name": name,
                        "brand": str(item.get("brandOwner") or item.get("brandName") or "")[:100],
                        "store": "otro",
                        "serving_size": float(item.get("servingSize") or 100),
                        "serving_unit": str(item.get("servingSizeUnit") or "g")[:30],
                        "calories": nutrients["calories"],
                        "protein": nutrients["protein"],
                        "carbs": nutrients["carbs"],
                        "fat": nutrients["fat"],
                        "fiber": nutrients["fiber"],
                        "sugar": nutrients["sugar"],
                        "sodium": nutrients["sodium"],
                        "category": str(item.get("foodCategory") or term).strip().title()[:100],
                        "is_verified": True,
                    }

                    exported_rows.append(
                        {
                            "food": payload_food,
                            "external": {
                                "source": "usda_fdc",
                                "fdc_id": item.get("fdcId"),
                                "data_type": item.get("dataType"),
                                "search_term": term,
                            },
                        }
                    )

                    if not dry_run:
                        _, was_created = Food.objects.update_or_create(
                            name=name,
                            defaults=payload_food,
                        )
                        if was_created:
                            created += 1
                        else:
                            updated += 1

                    seen_names.add(name)
                    processed += 1

        export_doc = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "usda_fdc",
            "terms": terms,
            "pages_per_term": pages_per_term,
            "page_size": page_size,
            "max_total": max_total,
            "dry_run": dry_run,
            "items": exported_rows,
        }

        with output_path.open("w", encoding="utf-8") as handle:
            json.dump(export_doc, handle, ensure_ascii=False, indent=2)

        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("USDA IMPORT COMPLETADA"))
        self.stdout.write("=" * 70)
        self.stdout.write(f"Procesados: {processed}")
        self.stdout.write(f"Creados: {created}")
        self.stdout.write(f"Actualizados: {updated}")
        self.stdout.write(f"Omitidos: {skipped}")
        self.stdout.write(f"JSON exportado: {output_path}")
