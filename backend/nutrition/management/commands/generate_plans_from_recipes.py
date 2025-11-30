from django.core.management.base import BaseCommand
from nutrition.models import DefaultNutritionPlan, DefaultMeal, Recipe
from decimal import Decimal
import random


class Command(BaseCommand):
    help = 'Genera planes de nutrición basados en las recetas existentes y los carga en la base de datos'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Eliminar todos los planes existentes antes de crear nuevos'
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('🗑️  Eliminando planes existentes...')
            DefaultNutritionPlan.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✅ Planes eliminados'))

        # Obtener todas las recetas
        all_recipes = list(Recipe.objects.all())
        
        if not all_recipes:
            self.stdout.write(self.style.ERROR('❌ No hay recetas en la base de datos. Crea recetas primero.'))
            return

        self.stdout.write(f'📚 Total recetas encontradas: {len(all_recipes)}')

        # Agrupar recetas por categoría
        recipes_by_category = self.group_recipes_by_category(all_recipes)
        
        self.stdout.write('\n📊 Recetas por categoría:')
        for category, recipes in recipes_by_category.items():
            self.stdout.write(f'   • {category}: {len(recipes)} recetas')

        # Definir planes a crear
        plans_to_create = [
            {
                'name': 'Plan Pérdida de Peso',
                'description': 'Plan diseñado para pérdida de peso saludable con déficit calórico moderado',
                'daily_calories': 1500,
                'protein_percentage': Decimal('35.0'),
                'carbs_percentage': Decimal('35.0'),
                'fat_percentage': Decimal('30.0'),
                'target_audience': 'Pérdida de peso',
                'tags': ['pérdida_peso', 'déficit_calórico', 'saludable']
            },
            {
                'name': 'Plan Mantenimiento',
                'description': 'Plan balanceado para mantener el peso actual',
                'daily_calories': 2000,
                'protein_percentage': Decimal('30.0'),
                'carbs_percentage': Decimal('40.0'),
                'fat_percentage': Decimal('30.0'),
                'target_audience': 'Mantenimiento',
                'tags': ['mantenimiento', 'balanceado', 'equilibrado']
            },
            {
                'name': 'Plan Ganancia Muscular',
                'description': 'Plan alto en calorías y proteínas para ganancia de masa muscular',
                'daily_calories': 2500,
                'protein_percentage': Decimal('30.0'),
                'carbs_percentage': Decimal('45.0'),
                'fat_percentage': Decimal('25.0'),
                'target_audience': 'Ganancia muscular',
                'tags': ['ganancia_muscular', 'alto_calórico', 'alto_proteína']
            },
            {
                'name': 'Plan Alto en Proteína',
                'description': 'Plan enfocado en alto contenido proteico para desarrollo muscular',
                'daily_calories': 2200,
                'protein_percentage': Decimal('40.0'),
                'carbs_percentage': Decimal('30.0'),
                'fat_percentage': Decimal('30.0'),
                'target_audience': 'Alto en proteína',
                'tags': ['alto_proteína', 'desarrollo_muscular']
            },
            {
                'name': 'Plan Bajo en Carbohidratos',
                'description': 'Plan bajo en carbohidratos para pérdida de peso acelerada',
                'daily_calories': 1600,
                'protein_percentage': Decimal('35.0'),
                'carbs_percentage': Decimal('20.0'),
                'fat_percentage': Decimal('45.0'),
                'target_audience': 'Bajo en carbohidratos',
                'tags': ['bajo_carbohidratos', 'pérdida_peso', 'keto']
            },
        ]

        created_count = 0
        recipe_ids_used = []

        self.stdout.write('\n🍽️  Generando planes de nutrición...\n')

        for plan_data in plans_to_create:
            try:
                # Verificar si ya existe
                if DefaultNutritionPlan.objects.filter(name=plan_data['name']).exists():
                    self.stdout.write(self.style.WARNING(f'⚠️  Plan "{plan_data["name"]}" ya existe, omitiendo...'))
                    continue

                # Calcular macros en gramos
                protein_grams = (plan_data['daily_calories'] * plan_data['protein_percentage'] / 100) / 4
                carbs_grams = (plan_data['daily_calories'] * plan_data['carbs_percentage'] / 100) / 4
                fat_grams = (plan_data['daily_calories'] * plan_data['fat_percentage'] / 100) / 9

                # Crear el plan
                plan = DefaultNutritionPlan.objects.create(
                    name=plan_data['name'],
                    description=plan_data['description'],
                    daily_calories=plan_data['daily_calories'],
                    protein_percentage=plan_data['protein_percentage'],
                    carbs_percentage=plan_data['carbs_percentage'],
                    fat_percentage=plan_data['fat_percentage'],
                    target_macros={
                        'protein_grams': round(float(protein_grams), 1),
                        'carbs_grams': round(float(carbs_grams), 1),
                        'fat_grams': round(float(fat_grams), 1)
                    },
                    duration_weeks=4,
                    is_active=True,
                    is_default=False,
                    min_role_required='basic',
                    target_audience=plan_data['target_audience'],
                    tags=plan_data['tags'] + ['generado_automaticamente']
                )

                # Crear comidas del plan basadas en recetas
                meals_created = self.create_meals_from_recipes(
                    plan, recipes_by_category, plan_data['daily_calories']
                )

                # Guardar IDs de recetas usadas en el plan
                recipe_ids = [str(meal['recipe_id']) for meal in meals_created if 'recipe_id' in meal]
                if recipe_ids:
                    plan.tags = plan.tags + [f'recetas:{",".join(recipe_ids)}']
                    plan.save()

                recipe_ids_used.extend(recipe_ids)

                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✅ Plan creado: {plan.name} '
                        f'({plan.daily_calories} kcal/día, {len(meals_created)} comidas)'
                    )
                )

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'❌ Error creando plan "{plan_data["name"]}": {e}')
                )
                continue

        self.stdout.write(
            self.style.SUCCESS(
                f'\n🎉 Proceso completado:\n'
                f'   • Planes creados: {created_count}\n'
                f'   • Total planes en BD: {DefaultNutritionPlan.objects.count()}\n'
                f'   • Recetas utilizadas: {len(set(recipe_ids_used))}'
            )
        )

    def group_recipes_by_category(self, recipes):
        """Agrupa recetas por categoría"""
        categories = {
            'desayuno': [],
            'almuerzo': [],
            'cena': [],
            'snack': [],
            'otras': []
        }

        for recipe in recipes:
            category_lower = recipe.category.lower()
            if 'desayuno' in category_lower or 'breakfast' in category_lower:
                categories['desayuno'].append(recipe)
            elif 'almuerzo' in category_lower or 'lunch' in category_lower or 'comida' in category_lower:
                categories['almuerzo'].append(recipe)
            elif 'cena' in category_lower or 'dinner' in category_lower:
                categories['cena'].append(recipe)
            elif 'snack' in category_lower or 'merienda' in category_lower:
                categories['snack'].append(recipe)
            else:
                categories['otras'].append(recipe)

        return categories

    def create_meals_from_recipes(self, plan, recipes_by_category, daily_calories):
        """Crea comidas del plan basándose en recetas"""
        meals_created = []
        order_index = 1

        # Distribución de calorías por comida
        calories_distribution = {
            'desayuno': daily_calories * Decimal('0.25'),  # 25%
            'almuerzo': daily_calories * Decimal('0.35'),  # 35%
            'cena': daily_calories * Decimal('0.25'),  # 25%
            'snack': daily_calories * Decimal('0.15'),  # 15% (distribuido en 2 snacks)
        }

        # DESAYUNO
        if recipes_by_category['desayuno']:
            breakfast_recipe = random.choice(recipes_by_category['desayuno'])
            breakfast_calories = min(
                int(calories_distribution['desayuno']),
                breakfast_recipe.calories_per_serving
            )
            
            meal = DefaultMeal.objects.create(
                plan=plan,
                name=f"Desayuno: {breakfast_recipe.name}",
                time='08:00',
                calories=breakfast_calories,
                protein=self.estimate_protein(breakfast_calories, Decimal('0.25')),
                carbs=self.estimate_carbs(breakfast_calories, Decimal('0.50')),
                fat=self.estimate_fat(breakfast_calories, Decimal('0.25')),
                description=f"{breakfast_recipe.name}. {breakfast_recipe.description if hasattr(breakfast_recipe, 'description') else ''}",
                order_index=order_index
            )
            meals_created.append({'meal': meal, 'recipe_id': breakfast_recipe.id})
            order_index += 1

        # SNACK MAÑANA
        if recipes_by_category['snack']:
            snack1_recipe = random.choice(recipes_by_category['snack'])
            snack1_calories = min(200, snack1_recipe.calories_per_serving)
            
            meal = DefaultMeal.objects.create(
                plan=plan,
                name=f"Snack Mañana: {snack1_recipe.name}",
                time='10:30',
                calories=snack1_calories,
                protein=self.estimate_protein(snack1_calories, Decimal('0.30')),
                carbs=self.estimate_carbs(snack1_calories, Decimal('0.40')),
                fat=self.estimate_fat(snack1_calories, Decimal('0.30')),
                description=snack1_recipe.name,
                order_index=order_index
            )
            meals_created.append({'meal': meal, 'recipe_id': snack1_recipe.id})
            order_index += 1

        # ALMUERZO
        if recipes_by_category['almuerzo']:
            lunch_recipe = random.choice(recipes_by_category['almuerzo'])
            lunch_calories = min(
                int(calories_distribution['almuerzo']),
                lunch_recipe.calories_per_serving
            )
            
            meal = DefaultMeal.objects.create(
                plan=plan,
                name=f"Almuerzo: {lunch_recipe.name}",
                time='13:00',
                calories=lunch_calories,
                protein=self.estimate_protein(lunch_calories, Decimal('0.30')),
                carbs=self.estimate_carbs(lunch_calories, Decimal('0.45')),
                fat=self.estimate_fat(lunch_calories, Decimal('0.25')),
                description=f"{lunch_recipe.name}. Ingredientes: {', '.join(lunch_recipe.ingredients[:5]) if lunch_recipe.ingredients else 'Ver receta'}",
                order_index=order_index
            )
            meals_created.append({'meal': meal, 'recipe_id': lunch_recipe.id})
            order_index += 1

        # SNACK TARDE
        if recipes_by_category['snack'] and len(recipes_by_category['snack']) > 1:
            # Intentar elegir un snack diferente al de la mañana
            used_recipe_ids = [m.get('recipe_id') for m in meals_created if 'recipe_id' in m]
            available_snacks = [r for r in recipes_by_category['snack'] if r.id not in used_recipe_ids]
            snack2_recipe = random.choice(available_snacks) if available_snacks else random.choice(recipes_by_category['snack'])
            
            snack2_calories = min(200, snack2_recipe.calories_per_serving)
            
            meal = DefaultMeal.objects.create(
                plan=plan,
                name=f"Snack Tarde: {snack2_recipe.name}",
                time='16:00',
                calories=snack2_calories,
                protein=self.estimate_protein(snack2_calories, Decimal('0.30')),
                carbs=self.estimate_carbs(snack2_calories, Decimal('0.40')),
                fat=self.estimate_fat(snack2_calories, Decimal('0.30')),
                description=snack2_recipe.name,
                order_index=order_index
            )
            meals_created.append({'meal': meal, 'recipe_id': snack2_recipe.id})
            order_index += 1

        # CENA
        if recipes_by_category['cena']:
            dinner_recipe = random.choice(recipes_by_category['cena'])
            dinner_calories = min(
                int(calories_distribution['cena']),
                dinner_recipe.calories_per_serving
            )
            
            meal = DefaultMeal.objects.create(
                plan=plan,
                name=f"Cena: {dinner_recipe.name}",
                time='20:00',
                calories=dinner_calories,
                protein=self.estimate_protein(dinner_calories, Decimal('0.35')),
                carbs=self.estimate_carbs(dinner_calories, Decimal('0.35')),
                fat=self.estimate_fat(dinner_calories, Decimal('0.30')),
                description=f"{dinner_recipe.name}. Ingredientes: {', '.join(dinner_recipe.ingredients[:5]) if dinner_recipe.ingredients else 'Ver receta'}",
                order_index=order_index
            )
            meals_created.append({'meal': meal, 'recipe_id': dinner_recipe.id})
            order_index += 1

        return meals_created

    def estimate_protein(self, calories, percentage):
        """Estima proteínas en gramos basado en calorías y porcentaje"""
        return round(float((calories * percentage / 100) / 4), 1)

    def estimate_carbs(self, calories, percentage):
        """Estima carbohidratos en gramos basado en calorías y porcentaje"""
        return round(float((calories * percentage / 100) / 4), 1)

    def estimate_fat(self, calories, percentage):
        """Estima grasas en gramos basado en calorías y porcentaje"""
        return round(float((calories * percentage / 100) / 9), 1)

