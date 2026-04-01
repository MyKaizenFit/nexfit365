"""
Importacion masiva de alimentos desde OpenFoodFacts.

Objetivo:
- Cargar gran cantidad de alimentos en la tabla Food.
- Guardar un export JSON con el mismo shape de datos que una carga manual via API.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from django.core.management.base import BaseCommand

from nutrition.fatsecret_client import OpenFoodFactsClient
from nutrition.models import Food


DEFAULT_TERMS = [
    "pollo",
    "ternera",
    "pavo",
    "atun",
    "salmon",
    "huevo",
    "leche",
    "yogur",
    "queso",
    "arroz",
    "pasta",
    "avena",
    "pan",
    "patata",
    "boniato",
    "brocoli",
    "espinaca",
    "tomate",
    "zanahoria",
    "cebolla",
    "manzana",
    "platano",
    "fresa",
    "naranja",
    "garbanzo",
    "lenteja",
    "frijol",
    "aceite de oliva",
    "almendra",
    "nuez",
]

STORE_MAP = {
    "mercadona": "mercadona",
    "carrefour": "carrefour",
    "lidl": "lidl",
    "aldi": "aldi",
    "dia": "dia",
    "dia%": "dia",
    "alcampo": "alcampo",
    "eroski": "eroski",
    "consum": "consum",
    "hipercor": "hipercor",
}


def _normalize_store(product: dict) -> str:
    stores = (product.get("stores") or "").lower()
    tags = [str(item).lower() for item in (product.get("stores_tags") or [])]

    for key, value in STORE_MAP.items():
        if key in stores:
            return value
    for tag in tags:
        for key, value in STORE_MAP.items():
            if key in tag:
                return value
    return "otro"


def _normalize_category(product: dict, fallback: str) -> str:
    tags = [str(item) for item in (product.get("categories_tags") or []) if item]
    if tags:
        first = tags[0]
        value = first.split(":", 1)[1] if ":" in first else first
        return value.replace("-", " ").strip().title()[:100]

    categories = (product.get("categories") or "").strip()
    if categories:
        return categories.split(",", 1)[0].strip().title()[:100]

    return fallback.title()[:100]


class Command(BaseCommand):
    help = (
        "Importa gran cantidad de alimentos desde OpenFoodFacts y "
        "genera un export JSON con formato de carga manual"
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--terms",
            nargs="*",
            help="Lista de terminos de busqueda. Si no se indica, usa preset por defecto.",
        )
        parser.add_argument("--pages-per-term", type=int, default=2)
        parser.add_argument("--page-size", type=int, default=40)
        parser.add_argument("--country", default="es")
        parser.add_argument("--language", default="es")
        parser.add_argument(
            "--max-total",
            type=int,
            default=1500,
            help="Limite maximo de alimentos a procesar en esta ejecucion.",
        )
        parser.add_argument(
            "--output",
            default="data/foods_manual_like_import.json",
            help="Ruta relativa (backend/) para export JSON de la importacion.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="No guarda en BD, solo previsualiza y exporta JSON.",
        )

    def handle(self, *args, **options):
        terms = options["terms"] or DEFAULT_TERMS
        pages_per_term = max(1, int(options["pages_per_term"]))
        page_size = min(max(1, int(options["page_size"])), 100)
        country = options["country"]
        language = options["language"]
        max_total = max(1, int(options["max_total"]))
        dry_run = bool(options["dry_run"])

        output_path = Path(options["output"])
        output_path.parent.mkdir(parents=True, exist_ok=True)

        client = OpenFoodFactsClient()
        created = 0
        updated = 0
        skipped = 0
        processed = 0
        exported_rows = []
        seen_names = set()

        self.stdout.write(
            self.style.NOTICE(
                f"Importacion masiva: {len(terms)} terminos, {pages_per_term} paginas/termino, {page_size} por pagina"
            )
        )

        for term in terms:
            if processed >= max_total:
                break

            self.stdout.write(f"\nBuscando termino: '{term}'")
            for page in range(1, pages_per_term + 1):
                if processed >= max_total:
                    break

                try:
                    result = client.search_foods(
                        search_expression=term,
                        page=page,
                        page_size=page_size,
                        country=country,
                        language=language,
                    )
                except Exception as exc:
                    self.stderr.write(f"Error API termino='{term}' pagina={page}: {exc}")
                    continue
                products = result.get("products", [])
                if not products:
                    break

                for product in products:
                    if processed >= max_total:
                        break

                    food_name = client.get_food_name(product, language=language).strip()
                    if not food_name or food_name == "Sin nombre":
                        skipped += 1
                        continue

                    name_key = food_name[:200]
                    if name_key in seen_names:
                        skipped += 1
                        continue

                    nutrients = client.parse_nutrients(product)
                    calories = int(nutrients.calories or 0)
                    protein = float(nutrients.protein or 0)
                    carbs = float(nutrients.carbs or 0)
                    fat = float(nutrients.fat or 0)

                    # Evita productos sin informacion util.
                    if calories <= 0 and protein <= 0 and carbs <= 0 and fat <= 0:
                        skipped += 1
                        continue

                    brand = (product.get("brands") or "").split(",", 1)[0].strip()[:100]

                    payload = {
                        "name": name_key,
                        "brand": brand,
                        "store": _normalize_store(product),
                        "serving_size": float(nutrients.serving_size or 100),
                        "serving_unit": str(nutrients.serving_unit or "g")[:30],
                        "calories": calories,
                        "protein": protein,
                        "carbs": carbs,
                        "fat": fat,
                        "fiber": float(nutrients.fiber or 0),
                        "sugar": float(nutrients.sugar or 0),
                        "sodium": float(nutrients.sodium or 0),
                        "category": _normalize_category(product, fallback=term),
                        "is_verified": True,
                    }

                    exported_rows.append(
                        {
                            "food": payload,
                            "external": {
                                "source": "openfoodfacts",
                                "barcode": str(product.get("code") or ""),
                                "image_url": str(product.get("image_url") or ""),
                                "search_term": term,
                            },
                        }
                    )

                    if not dry_run:
                        _, was_created = Food.objects.update_or_create(
                            name=name_key,
                            defaults=payload,
                        )
                        if was_created:
                            created += 1
                        else:
                            updated += 1

                    seen_names.add(name_key)
                    processed += 1

        export_doc = {
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": "openfoodfacts",
            "country": country,
            "language": language,
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
        self.stdout.write(self.style.SUCCESS("IMPORTACION MASIVA COMPLETADA"))
        self.stdout.write("=" * 70)
        self.stdout.write(f"Procesados: {processed}")
        self.stdout.write(f"Creados: {created}")
        self.stdout.write(f"Actualizados: {updated}")
        self.stdout.write(f"Omitidos: {skipped}")
        self.stdout.write(f"JSON exportado: {output_path}")
