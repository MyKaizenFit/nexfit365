"""
Comando de gestión para exportar todas las recetas con sus ingredientes
"""
import json
import csv
from django.core.management.base import BaseCommand
from nutrition.models import Recipe


class Command(BaseCommand):
    help = 'Exporta todas las recetas con sus ingredientes a un archivo JSON y CSV'

    def add_arguments(self, parser):
        parser.add_argument(
            '--format',
            type=str,
            default='json',
            choices=['json', 'csv', 'both'],
            help='Formato de exportación (json, csv, o both)'
        )
        parser.add_argument(
            '--output',
            type=str,
            default='recipes_export',
            help='Nombre base del archivo de salida (sin extensión)'
        )

    def handle(self, *args, **options):
        output_format = options['format']
        output_base = options['output']
        
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("📦 EXPORTANDO RECETAS DE LA BASE DE DATOS"))
        self.stdout.write("=" * 70 + "\n")
        
        # Obtener todas las recetas activas
        recipes = Recipe.objects.filter(is_active=True).order_by('name')
        
        self.stdout.write(f"📋 Encontradas {recipes.count()} recetas activas\n")
        
        # Preparar datos para exportación
        recipes_data = []
        
        for recipe in recipes:
            # Formatear ingredientes
            ingredients_list = []
            if recipe.ingredients:
                if isinstance(recipe.ingredients, list):
                    for ing in recipe.ingredients:
                        if isinstance(ing, dict):
                            ingredients_list.append({
                                'name': ing.get('name', ''),
                                'amount': ing.get('amount', ing.get('quantity', '')),
                                'unit': ing.get('unit', '')
                            })
                        elif isinstance(ing, str):
                            ingredients_list.append({'raw': ing})
                else:
                    ingredients_list.append({'raw': str(recipe.ingredients)})
            
            recipe_data = {
                'id': str(recipe.id),
                'name': recipe.name,
                'description': recipe.description or '',
                'category': recipe.category,
                'difficulty': recipe.difficulty,
                'prep_time_minutes': recipe.prep_time_minutes,
                'cook_time_minutes': recipe.cook_time_minutes,
                'servings': recipe.servings,
                'calories': recipe.calories,
                'protein': float(recipe.protein) if recipe.protein else 0,
                'carbs': float(recipe.carbs) if recipe.carbs else 0,
                'fat': float(recipe.fat) if recipe.fat else 0,
                'fiber': float(recipe.fiber) if recipe.fiber else 0,
                'sugar': float(recipe.sugar) if recipe.sugar else 0,
                'sodium': float(recipe.sodium) if recipe.sodium else 0,
                'ingredients': ingredients_list,
                'ingredients_count': len(ingredients_list),
                'instructions': recipe.instructions or '',
                'instructions_length': len(recipe.instructions) if recipe.instructions else 0,
                'diet_types': recipe.diet_types if recipe.diet_types else [],
                'meal_types': recipe.meal_types if recipe.meal_types else [],
                'allergens': recipe.allergens if recipe.allergens else [],
                'tags': recipe.tags if recipe.tags else [],
                'is_system': recipe.is_system,
                'is_featured': recipe.is_featured,
                'created_at': recipe.created_at.isoformat() if recipe.created_at else '',
                'updated_at': recipe.updated_at.isoformat() if recipe.updated_at else ''
            }
            recipes_data.append(recipe_data)
        
        # Exportar a JSON
        if output_format in ['json', 'both']:
            json_filename = f"{output_base}.json"
            with open(json_filename, 'w', encoding='utf-8') as f:
                json.dump({
                    'total_recipes': len(recipes_data),
                    'export_date': recipes.first().updated_at.isoformat() if recipes.first() else '',
                    'recipes': recipes_data
                }, f, ensure_ascii=False, indent=2)
            
            self.stdout.write(self.style.SUCCESS(f"✅ Exportado a JSON: {json_filename}"))
            self.stdout.write(f"   Total de recetas: {len(recipes_data)}")
        
        # Exportar a CSV
        if output_format in ['csv', 'both']:
            csv_filename = f"{output_base}.csv"
            with open(csv_filename, 'w', newline='', encoding='utf-8') as f:
                if recipes_data:
                    fieldnames = [
                        'id', 'name', 'description', 'category', 'difficulty',
                        'prep_time_minutes', 'cook_time_minutes', 'servings',
                        'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium',
                        'ingredients_count', 'ingredients_json', 'instructions_length', 'instructions_preview',
                        'diet_types', 'meal_types', 'allergens', 'tags',
                        'is_system', 'is_featured'
                    ]
                    writer = csv.DictWriter(f, fieldnames=fieldnames)
                    writer.writeheader()
                    
                    for recipe_data in recipes_data:
                        row = {
                            'id': recipe_data['id'],
                            'name': recipe_data['name'],
                            'description': recipe_data['description'],
                            'category': recipe_data['category'],
                            'difficulty': recipe_data['difficulty'],
                            'prep_time_minutes': recipe_data['prep_time_minutes'],
                            'cook_time_minutes': recipe_data['cook_time_minutes'],
                            'servings': recipe_data['servings'],
                            'calories': recipe_data['calories'],
                            'protein': recipe_data['protein'],
                            'carbs': recipe_data['carbs'],
                            'fat': recipe_data['fat'],
                            'fiber': recipe_data['fiber'],
                            'sugar': recipe_data['sugar'],
                            'sodium': recipe_data['sodium'],
                            'ingredients_count': recipe_data['ingredients_count'],
                            'ingredients_json': json.dumps(recipe_data['ingredients'], ensure_ascii=False),
                            'instructions_length': recipe_data['instructions_length'],
                            'instructions_preview': (recipe_data['instructions'][:100] + '...') if len(recipe_data['instructions']) > 100 else recipe_data['instructions'],
                            'diet_types': ', '.join(recipe_data['diet_types']) if recipe_data['diet_types'] else '',
                            'meal_types': ', '.join(recipe_data['meal_types']) if recipe_data['meal_types'] else '',
                            'allergens': ', '.join(recipe_data['allergens']) if recipe_data['allergens'] else '',
                            'tags': ', '.join(recipe_data['tags']) if recipe_data['tags'] else '',
                            'is_system': recipe_data['is_system'],
                            'is_featured': recipe_data['is_featured']
                        }
                        writer.writerow(row)
            
            self.stdout.write(self.style.SUCCESS(f"✅ Exportado a CSV: {csv_filename}"))
        
        # Mostrar estadísticas
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write("📊 ESTADÍSTICAS")
        self.stdout.write("=" * 70)
        
        # Recetas sin ingredientes o con pocos ingredientes
        sin_ingredientes = [r for r in recipes_data if r['ingredients_count'] == 0]
        pocos_ingredientes = [r for r in recipes_data if 0 < r['ingredients_count'] < 3]
        
        self.stdout.write(f"\n⚠️  Recetas sin ingredientes: {len(sin_ingredientes)}")
        if sin_ingredientes:
            for r in sin_ingredientes[:10]:
                self.stdout.write(f"   - {r['name']}")
        
        self.stdout.write(f"\n⚠️  Recetas con menos de 3 ingredientes: {len(pocos_ingredientes)}")
        if pocos_ingredientes:
            for r in pocos_ingredientes[:10]:
                self.stdout.write(f"   - {r['name']} ({r['ingredients_count']} ingredientes)")
        
        # Recetas por categoría
        categories = {}
        for r in recipes_data:
            cat = r['category']
            categories[cat] = categories.get(cat, 0) + 1
        
        self.stdout.write(f"\n📂 Recetas por categoría:")
        for cat, count in sorted(categories.items()):
            self.stdout.write(f"   - {cat}: {count}")
        
        # Recetas por tipo (BOWL, FAJITA, etc.)
        types = {}
        for r in recipes_data:
            name_upper = r['name'].upper()
            if 'BOWL' in name_upper:
                types['BOWL'] = types.get('BOWL', 0) + 1
            elif 'FAJITA' in name_upper:
                types['FAJITA'] = types.get('FAJITA', 0) + 1
            elif 'TABLA' in name_upper:
                types['TABLA'] = types.get('TABLA', 0) + 1
            elif 'TOSTADA' in name_upper:
                types['TOSTADA'] = types.get('TOSTADA', 0) + 1
            elif 'CREMA' in name_upper:
                types['CREMA'] = types.get('CREMA', 0) + 1
            else:
                types['OTROS'] = types.get('OTROS', 0) + 1
        
        self.stdout.write(f"\n🍽️  Recetas por tipo:")
        for t, count in sorted(types.items()):
            self.stdout.write(f"   - {t}: {count}")
        
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("✅ Exportación completada"))
        self.stdout.write("=" * 70)





