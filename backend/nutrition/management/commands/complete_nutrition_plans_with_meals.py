"""
Comando para completar los planes nutricionales con comidas asociadas a recetas
"""
from django.core.management.base import BaseCommand
from nutrition.models import DefaultNutritionPlan, DefaultMeal, Recipe
from datetime import time
import random

class Command(BaseCommand):
    help = 'Completa los planes nutricionales con comidas asociadas a recetas'

    def handle(self, *args, **options):
        self.stdout.write('=' * 80)
        self.stdout.write('COMPLETANDO PLANES NUTRICIONALES CON COMIDAS')
        self.stdout.write('=' * 80)
        
        # Obtener todas las recetas disponibles
        recipes_by_category = {
            'Desayuno': list(Recipe.objects.filter(category='Desayuno')),
            'Almuerzo': list(Recipe.objects.filter(category='Almuerzo')),
            'Cena': list(Recipe.objects.filter(category='Cena')),
            'Snack': list(Recipe.objects.filter(category='Snack')),
        }
        
        total_recipes = sum(len(recipes) for recipes in recipes_by_category.values())
        self.stdout.write(f'\n🍽️ Recetas disponibles: {total_recipes}')
        for cat, recipes in recipes_by_category.items():
            self.stdout.write(f'   - {cat}: {len(recipes)} recetas')
        
        if total_recipes == 0:
            self.stdout.write(self.style.ERROR('❌ No hay recetas disponibles. Ejecuta primero populate_expanded_recipes'))
            return
        
        # Obtener todos los planes nutricionales
        plans = DefaultNutritionPlan.objects.all()
        self.stdout.write(f'\n🍎 Planes nutricionales encontrados: {plans.count()}')
        
        created_meals = 0
        updated_meals = 0
        skipped_meals = 0
        
        # Horarios estándar para las comidas
        meal_times = {
            'Desayuno': time(8, 0),
            'Merienda Mañana': time(11, 0),
            'Almuerzo': time(14, 0),
            'Merienda Tarde': time(17, 0),
            'Cena': time(20, 0),
        }
        
        for plan in plans:
            self.stdout.write(f'\n📋 Procesando: {plan.name}')
            
            # Verificar comidas existentes
            existing_meals = plan.meals.count()
            
            if existing_meals >= 4:
                self.stdout.write(f'   ⏭️  Ya tiene {existing_meals} comidas, verificando recetas...')
                # Verificar si las comidas tienen información de recetas en la descripción
                meals_without_recipes = [m for m in plan.meals.all() if 'Receta sugerida' not in m.description]
                if len(meals_without_recipes) == 0:
                    self.stdout.write(f'   ✅ Todas las comidas tienen información de recetas')
                    continue
                else:
                    self.stdout.write(f'   🔄 Actualizando {len(meals_without_recipes)} comidas con información de recetas...')
                    # Actualizar comidas existentes sin recetas
                    for meal in meals_without_recipes:
                        recipe = None
                        meal_name_lower = meal.name.lower()
                        
                        if 'desayuno' in meal_name_lower and recipes_by_category['Desayuno']:
                            recipe = random.choice(recipes_by_category['Desayuno'])
                        elif 'almuerzo' in meal_name_lower and recipes_by_category['Almuerzo']:
                            recipe = random.choice(recipes_by_category['Almuerzo'])
                        elif 'cena' in meal_name_lower and recipes_by_category['Cena']:
                            recipe = random.choice(recipes_by_category['Cena'])
                        elif ('merienda' in meal_name_lower or 'snack' in meal_name_lower) and recipes_by_category['Snack']:
                            recipe = random.choice(recipes_by_category['Snack'])
                        
                        if recipe:
                            # Preservar descripción original si existe
                            base_desc = meal.description.split('🍽️')[0].strip() if '🍽️' in meal.description else (meal.description or f'{meal.name}')
                            meal_desc = base_desc
                            if meal_desc and not meal_desc.endswith('.'):
                                meal_desc += '.'
                            meal_desc += f'\n\n🍽️ Receta sugerida: {recipe.name}\n📋 Ingredientes: {", ".join(recipe.ingredients[:5])}\n⏱️ Tiempo: {recipe.prep_time_minutes} minutos'
                            meal.description = meal_desc
                            meal.save()
                            updated_meals += 1
                        else:
                            skipped_meals += 1
                    if updated_meals > 0:
                        self.stdout.write(f'   ✅ Actualizadas {updated_meals} comidas con recetas')
                    continue
            else:
                self.stdout.write(f'   📝 Creando comidas para el plan...')
            
            # Calcular distribución de calorías
            daily_calories = plan.daily_calories or 2000
            calories_distribution = self._calculate_calories_distribution(daily_calories)
            
            # Crear o actualizar comidas
            meal_order = 1
            
            # Desayuno
            breakfast_recipe = random.choice(recipes_by_category['Desayuno']) if recipes_by_category['Desayuno'] else None
            breakfast_desc = f'Desayuno energético para empezar el día'
            if breakfast_recipe:
                breakfast_desc += f'\n\n🍽️ Receta sugerida: {breakfast_recipe.name}\n📋 Ingredientes: {", ".join(breakfast_recipe.ingredients[:5])}\n⏱️ Tiempo: {breakfast_recipe.prep_time_minutes} minutos'
            
            meal, created = DefaultMeal.objects.get_or_create(
                plan=plan,
                name='Desayuno',
                defaults={
                    'time': meal_times['Desayuno'],
                    'calories': calories_distribution['Desayuno'],
                    'protein': calories_distribution['Desayuno'] * 0.25 / 4,  # 25% proteína
                    'carbs': calories_distribution['Desayuno'] * 0.50 / 4,  # 50% carbos
                    'fat': calories_distribution['Desayuno'] * 0.25 / 9,  # 25% grasas
                    'description': breakfast_desc,
                    'order_index': meal_order,
                }
            )
            if not created and 'Receta sugerida' not in meal.description:
                meal.description = breakfast_desc
                meal.save()
                updated_meals += 1
            elif created:
                created_meals += 1
            meal_order += 1
            
            # Merienda Mañana (opcional, solo si hay suficientes calorías)
            if daily_calories >= 1800:
                snack_morning_recipe = random.choice(recipes_by_category['Snack']) if recipes_by_category['Snack'] else None
                snack_morning_desc = 'Snack saludable para mantener energía'
                if snack_morning_recipe:
                    snack_morning_desc += f'\n\n🍽️ Receta sugerida: {snack_morning_recipe.name}\n📋 Ingredientes: {", ".join(snack_morning_recipe.ingredients[:5])}\n⏱️ Tiempo: {snack_morning_recipe.prep_time_minutes} minutos'
                
                meal, created = DefaultMeal.objects.get_or_create(
                    plan=plan,
                    name='Merienda Mañana',
                    defaults={
                        'time': meal_times['Merienda Mañana'],
                        'calories': calories_distribution.get('Merienda Mañana', 200),
                        'protein': 15,
                        'carbs': 25,
                        'fat': 8,
                        'description': snack_morning_desc,
                        'order_index': meal_order,
                    }
                )
                if not created and 'Receta sugerida' not in meal.description:
                    meal.description = snack_morning_desc
                    meal.save()
                    updated_meals += 1
                elif created:
                    created_meals += 1
                meal_order += 1
            
            # Almuerzo
            lunch_recipe = random.choice(recipes_by_category['Almuerzo']) if recipes_by_category['Almuerzo'] else None
            lunch_desc = 'Comida principal del día'
            if lunch_recipe:
                lunch_desc += f'\n\n🍽️ Receta sugerida: {lunch_recipe.name}\n📋 Ingredientes: {", ".join(lunch_recipe.ingredients[:5])}\n⏱️ Tiempo: {lunch_recipe.prep_time_minutes} minutos'
            
            meal, created = DefaultMeal.objects.get_or_create(
                plan=plan,
                name='Almuerzo',
                defaults={
                    'time': meal_times['Almuerzo'],
                    'calories': calories_distribution['Almuerzo'],
                    'protein': calories_distribution['Almuerzo'] * 0.30 / 4,  # 30% proteína
                    'carbs': calories_distribution['Almuerzo'] * 0.40 / 4,  # 40% carbos
                    'fat': calories_distribution['Almuerzo'] * 0.30 / 9,  # 30% grasas
                    'description': lunch_desc,
                    'order_index': meal_order,
                }
            )
            if not created and 'Receta sugerida' not in meal.description:
                meal.description = lunch_desc
                meal.save()
                updated_meals += 1
            elif created:
                created_meals += 1
            meal_order += 1
            
            # Merienda Tarde
            snack_afternoon_recipe = random.choice(recipes_by_category['Snack']) if recipes_by_category['Snack'] else None
            snack_afternoon_desc = 'Snack pre-entrenamiento'
            if snack_afternoon_recipe:
                snack_afternoon_desc += f'\n\n🍽️ Receta sugerida: {snack_afternoon_recipe.name}\n📋 Ingredientes: {", ".join(snack_afternoon_recipe.ingredients[:5])}\n⏱️ Tiempo: {snack_afternoon_recipe.prep_time_minutes} minutos'
            
            meal, created = DefaultMeal.objects.get_or_create(
                plan=plan,
                name='Merienda Tarde',
                defaults={
                    'time': meal_times['Merienda Tarde'],
                    'calories': calories_distribution.get('Merienda Tarde', 250),
                    'protein': 15,
                    'carbs': 30,
                    'fat': 10,
                    'description': snack_afternoon_desc,
                    'order_index': meal_order,
                }
            )
            if not created and 'Receta sugerida' not in meal.description:
                meal.description = snack_afternoon_desc
                meal.save()
                updated_meals += 1
            elif created:
                created_meals += 1
            meal_order += 1
            
            # Cena
            dinner_recipe = random.choice(recipes_by_category['Cena']) if recipes_by_category['Cena'] else None
            dinner_desc = 'Cena ligera rica en proteína'
            if dinner_recipe:
                dinner_desc += f'\n\n🍽️ Receta sugerida: {dinner_recipe.name}\n📋 Ingredientes: {", ".join(dinner_recipe.ingredients[:5])}\n⏱️ Tiempo: {dinner_recipe.prep_time_minutes} minutos'
            
            meal, created = DefaultMeal.objects.get_or_create(
                plan=plan,
                name='Cena',
                defaults={
                    'time': meal_times['Cena'],
                    'calories': calories_distribution['Cena'],
                    'protein': calories_distribution['Cena'] * 0.35 / 4,  # 35% proteína
                    'carbs': calories_distribution['Cena'] * 0.30 / 4,  # 30% carbos
                    'fat': calories_distribution['Cena'] * 0.35 / 9,  # 35% grasas
                    'description': dinner_desc,
                    'order_index': meal_order,
                }
            )
            if not created and 'Receta sugerida' not in meal.description:
                meal.description = dinner_desc
                meal.save()
                updated_meals += 1
            elif created:
                created_meals += 1
            
            self.stdout.write(self.style.SUCCESS(f'   ✅ Plan completado con {plan.meals.count()} comidas'))
        
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS(
            f'✅ PROCESO COMPLETADO:\n'
            f'   • Comidas creadas: {created_meals}\n'
            f'   • Comidas actualizadas: {updated_meals}\n'
            f'   • Total comidas en base de datos: {DefaultMeal.objects.count()}'
        ))
        self.stdout.write('=' * 80)
    
    def _calculate_calories_distribution(self, daily_calories):
        """Calcula la distribución de calorías entre comidas"""
        if daily_calories < 1500:
            # Plan bajo en calorías: 3 comidas principales
            return {
                'Desayuno': int(daily_calories * 0.30),
                'Almuerzo': int(daily_calories * 0.45),
                'Cena': int(daily_calories * 0.25),
            }
        elif daily_calories < 2000:
            # Plan moderado: 4 comidas
            return {
                'Desayuno': int(daily_calories * 0.25),
                'Merienda Mañana': int(daily_calories * 0.10),
                'Almuerzo': int(daily_calories * 0.40),
                'Cena': int(daily_calories * 0.25),
            }
        else:
            # Plan completo: 5 comidas
            return {
                'Desayuno': int(daily_calories * 0.25),
                'Merienda Mañana': int(daily_calories * 0.10),
                'Almuerzo': int(daily_calories * 0.35),
                'Merienda Tarde': int(daily_calories * 0.10),
                'Cena': int(daily_calories * 0.20),
            }

