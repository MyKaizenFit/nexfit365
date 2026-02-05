from django.core.management.base import BaseCommand
from nutrition.models import Food
from nutrition.fatsecret_client import FatSecretClient, extract_foods, parse_food_description


class Command(BaseCommand):
    help = "Importa alimentos desde FatSecret a la tabla de alimentos"

    def add_arguments(self, parser):
        parser.add_argument("--search", required=True, help="Texto a buscar (ej: 'pollo')")
        parser.add_argument("--pages", type=int, default=1, help="Número de páginas a importar")
        parser.add_argument("--page-size", type=int, default=20, dest="page_size")
        parser.add_argument("--region", default="ES")
        parser.add_argument("--language", default="es")
        parser.add_argument("--include-brands", action="store_true")

    def handle(self, *args, **options):
        search_expression = options["search"]
        pages = max(1, options["pages"])
        page_size = min(max(1, options["page_size"]), 50)
        region = options["region"]
        language = options["language"]
        include_brands = options["include_brands"]

        client = FatSecretClient()
        created = 0
        updated = 0
        skipped = 0

        for page in range(pages):
            payload = client.search_foods(
                search_expression=search_expression,
                page_number=page,
                max_results=page_size,
                region=region,
                language=language,
                generic_description="weight",
            )
            foods = extract_foods(payload)
            if not foods:
                break

            for item in foods:
                food_type = item.get("food_type")
                if food_type == "Brand" and not include_brands:
                    skipped += 1
                    continue

                food_name = (item.get("food_name") or "").strip()
                brand_name = (item.get("brand_name") or "").strip()
                description = item.get("food_description")

                if not food_name:
                    skipped += 1
                    continue

                parsed = parse_food_description(description)

                name_key = f"{food_name} ({brand_name})" if brand_name else food_name

                defaults = {
                    "brand": brand_name,
                    "serving_size": parsed.serving_size or 100,
                    "serving_unit": parsed.serving_unit or "g",
                    "calories": parsed.calories or 0,
                    "protein": parsed.protein or 0,
                    "carbs": parsed.carbs or 0,
                    "fat": parsed.fat or 0,
                    "is_verified": True,
                }

                obj, was_created = Food.objects.update_or_create(
                    name=name_key,
                    defaults=defaults,
                )

                if was_created:
                    created += 1
                else:
                    updated += 1

        self.stdout.write(self.style.SUCCESS(
            f"Importación completada: {created} creados, {updated} actualizados, {skipped} omitidos"
        ))
