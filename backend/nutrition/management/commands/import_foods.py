"""
Comando para importar alimentos desde OpenFoodFacts a la base de datos.
OpenFoodFacts es gratuito y open source, no requiere autenticación.
"""
from django.core.management.base import BaseCommand
from nutrition.models import Food
from nutrition.fatsecret_client import OpenFoodFactsClient


class Command(BaseCommand):
    help = "Importa alimentos desde OpenFoodFacts a la tabla de alimentos"

    def add_arguments(self, parser):
        parser.add_argument(
            "--search", 
            required=True, 
            help="Texto a buscar (ej: 'pollo', 'arroz', 'manzana')"
        )
        parser.add_argument(
            "--pages", 
            type=int, 
            default=1, 
            help="Número de páginas a importar (default: 1)"
        )
        parser.add_argument(
            "--page-size", 
            type=int, 
            default=20, 
            dest="page_size",
            help="Resultados por página (default: 20, máx: 100)"
        )
        parser.add_argument(
            "--country", 
            default="spain",
            help="País para filtrar (spain, france, etc.)"
        )
        parser.add_argument(
            "--language", 
            default="es",
            help="Idioma (es, en, fr)"
        )

    def handle(self, *args, **options):
        search_expression = options["search"]
        pages = max(1, options["pages"])
        page_size = min(max(1, options["page_size"]), 100)
        country = options["country"]
        language = options["language"]

        client = OpenFoodFactsClient()
        created = 0
        updated = 0
        skipped = 0
        
        self.stdout.write(f"Buscando '{search_expression}' en OpenFoodFacts...")

        for page_num in range(1, pages + 1):
            self.stdout.write(f"  Página {page_num}/{pages}...")
            
            try:
                result = client.search_foods(
                    search_expression=search_expression,
                    page=page_num,
                    page_size=page_size,
                    country=country,
                    language=language,
                )
            except Exception as e:
                self.stderr.write(f"Error en página {page_num}: {e}")
                continue

            products = result.get("products", [])
            if not products:
                self.stdout.write(f"  No hay más productos en página {page_num}")
                break

            for product in products:
                # Obtener nombre del producto
                food_name = client.get_food_name(product, language)
                
                if not food_name or food_name == "Sin nombre":
                    skipped += 1
                    continue
                
                # Verificar que tenga datos nutricionales mínimos
                nutriments = product.get("nutriments", {})
                if not nutriments:
                    skipped += 1
                    continue
                
                # Parsear nutrientes
                nutrients = client.parse_nutrients(product)
                
                # Si no tiene calorías, probablemente no tiene datos útiles
                if nutrients.calories == 0 and nutrients.protein is None and nutrients.carbs is None:
                    skipped += 1
                    continue
                
                # Obtener marca
                brand = product.get("brands", "")
                if brand:
                    brand = brand.split(",")[0].strip()  # Solo primera marca
                
                # Código de barras como identificador externo
                barcode = product.get("code", "")
                
                defaults = {
                    "brand": brand[:100] if brand else "",
                    "serving_size": nutrients.serving_size or 100,
                    "serving_unit": nutrients.serving_unit or "g",
                    "calories": nutrients.calories or 0,
                    "protein": float(nutrients.protein or 0),
                    "carbs": float(nutrients.carbs or 0),
                    "fat": float(nutrients.fat or 0),
                    "fiber": float(nutrients.fiber or 0) if nutrients.fiber else 0,
                    "is_verified": True,
                }

                try:
                    # Usar nombre como clave única (truncado si es muy largo)
                    name_key = food_name[:200]
                    
                    obj, was_created = Food.objects.update_or_create(
                        name=name_key,
                        defaults=defaults,
                    )

                    if was_created:
                        created += 1
                        self.stdout.write(f"    + {name_key}")
                    else:
                        updated += 1
                except Exception as e:
                    self.stderr.write(f"    Error guardando '{food_name[:50]}': {e}")
                    skipped += 1

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS(
            f"✅ Importación completada: {created} creados, {updated} actualizados, {skipped} omitidos"
        ))
