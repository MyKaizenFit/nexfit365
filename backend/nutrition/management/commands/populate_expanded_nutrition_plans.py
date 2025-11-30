from django.core.management.base import BaseCommand
from nutrition.models import DefaultNutritionPlan, DefaultMeal, Recipe
from accounts.models import CustomUser
import random

class Command(BaseCommand):
    help = 'Crea una gran variedad de planes de nutrición basados en todas las combinaciones posibles del formulario'

    def add_arguments(self, parser):
        parser.add_argument('--clear', action='store_true', help='Eliminar todos los planes existentes antes de crear nuevos')

    def handle(self, *args, **options):
        if options['clear']:
            DefaultNutritionPlan.objects.all().delete()
            self.stdout.write(self.style.SUCCESS('✅ Planes de nutrición existentes eliminados'))
        
        admin_user = CustomUser.objects.filter(is_superuser=True).first() or CustomUser.objects.first()
        
        # Obtener todas las recetas disponibles
        all_recipes = list(Recipe.objects.all())
        
        self.stdout.write(f'📚 Total recetas disponibles: {len(all_recipes)}')
        
        if len(all_recipes) == 0:
            self.stdout.write(self.style.ERROR('❌ No hay recetas disponibles. Ejecuta primero populate_expanded_recipes.py'))
            return
        
        created_count = 0
        skipped_count = 0
        
        # Combinaciones: objetivo (3) x nivel_actividad (5) x días_entreno (7) = 105 planes base
        # Plus variaciones según calorías y macros = más planes
        
        self.stdout.write('📚 Generando planes de nutrición...')
        
        # GENERAR PLANES POR OBJETIVO Y ACTIVIDAD
        for goal in ['lose_weight', 'gain_muscle', 'body_recomposition']:
            for activity in ['sedentary', 'light', 'moderate', 'active', 'very_active']:
                for days in range(1, 8):  # 1-7 días de entrenamiento
                    # Calcular calorías según objetivo y actividad
                    base_calories = self.calculate_base_calories(activity)
                    daily_calories = self.adjust_calories_for_goal(base_calories, goal, activity, days)
                    
                    # Calcular macros según objetivo
                    macros = self.calculate_macros(goal, daily_calories)
                    
                    try:
                        # Crear nombre descriptivo
                        goal_name = self.get_goal_name(goal)
                        activity_name = self.get_activity_name(activity)
                        
                        name = f"Plan {goal_name} - {activity_name} - {days} {self.pluralize_dias(days)}/semana"
                        
                        # Verificar si ya existe
                        if DefaultNutritionPlan.objects.filter(name=name).exists():
                            skipped_count += 1
                            continue
                        
                        # Crear el plan
                        plan = DefaultNutritionPlan.objects.create(
                            name=name,
                            description=f"Plan nutricional diseñado para {goal_name.lower()} con nivel de actividad {activity_name.lower()}. "
                                       f"Incluye {days} día(s) de entrenamiento por semana. "
                                       f"Calorías diarias: {daily_calories} kcal.",
                            daily_calories=daily_calories,
                            protein_percentage=macros['protein'],
                            carbs_percentage=macros['carbs'],
                            fat_percentage=macros['fat'],
                            target_macros={
                                'protein_grams': macros['protein_grams'],
                                'carbs_grams': macros['carbs_grams'],
                                'fat_grams': macros['fat_grams']
                            },
                            duration_weeks=self.get_duration(goal),
                            is_active=True,
                            is_default=False,
                            min_role_required='basic',
                            target_audience=f"{goal_name} - {activity_name}",
                            tags=[goal, activity, f"{days}_dias", 'personalized'],
                            image_url=''
                        )
                        
                        # Crear comidas del plan
                        self.create_meals_for_plan(plan, all_recipes, goal, activity, daily_calories, days)
                        
                        created_count += 1
                        
                        if created_count % 20 == 0:
                            self.stdout.write(f'✅ Creados {created_count} planes...')
                            
                    except Exception as e:
                        self.stdout.write(self.style.ERROR(f'❌ Error creando plan: {e}'))
                        continue
        
        # AGREGAR PLANES ESPECIALES (bajo en calorías, alto en proteína, etc.)
        special_plans = self.create_special_plans(all_recipes, admin_user)
        created_count += special_plans
        
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Proceso completado:\n'
            f'   • Planes creados: {created_count}\n'
            f'   • Planes omitidos (ya existían): {skipped_count}\n'
            f'   • Total en base de datos: {DefaultNutritionPlan.objects.count()}'
        ))
    
    def calculate_base_calories(self, activity):
        """Calcula calorías base según nivel de actividad"""
        base = {
            'sedentary': 1800,
            'light': 2000,
            'moderate': 2200,
            'active': 2400,
            'very_active': 2600
        }
        return base.get(activity, 2000)
    
    def adjust_calories_for_goal(self, base_calories, goal, activity, training_days):
        """Ajusta calorías según objetivo y días de entrenamiento"""
        # Ajuste por objetivo
        if goal == 'lose_weight':
            # Déficit calórico: -300 a -500 kcal
            adjusted = base_calories - random.randint(300, 500)
        elif goal == 'gain_muscle':
            # Superávit calórico: +300 a +500 kcal
            adjusted = base_calories + random.randint(300, 500)
        else:  # body_recomposition
            # Calorías de mantenimiento
            adjusted = base_calories
        
        # Ajuste por días de entrenamiento
        training_adjustment = training_days * 50  # +50 kcal por cada día de entrenamiento
        adjusted += training_adjustment
        
        # Asegurar mínimo y máximo razonables
        return max(1200, min(adjusted, 3500))
    
    def calculate_macros(self, goal, daily_calories):
        """Calcula macros según objetivo"""
        if goal == 'lose_weight':
            # Más proteína, menos carbos
            protein_pct = 35.0
            carbs_pct = 35.0
            fat_pct = 30.0
        elif goal == 'gain_muscle':
            # Alto en proteína y carbos
            protein_pct = 30.0
            carbs_pct = 45.0
            fat_pct = 25.0
        else:  # body_recomposition
            # Balanceado
            protein_pct = 30.0
            carbs_pct = 40.0
            fat_pct = 30.0
        
        # Calcular gramos
        protein_grams = (daily_calories * protein_pct / 100) / 4
        carbs_grams = (daily_calories * carbs_pct / 100) / 4
        fat_grams = (daily_calories * fat_pct / 100) / 9
        
        return {
            'protein': protein_pct,
            'carbs': carbs_pct,
            'fat': fat_pct,
            'protein_grams': round(protein_grams, 1),
            'carbs_grams': round(carbs_grams, 1),
            'fat_grams': round(fat_grams, 1)
        }
    
    def get_goal_name(self, goal):
        mapping = {
            'lose_weight': 'Pérdida de Peso',
            'gain_muscle': 'Ganancia Muscular',
            'body_recomposition': 'Recomposición'
        }
        return mapping.get(goal, goal)
    
    def get_activity_name(self, activity):
        mapping = {
            'sedentary': 'Sedentario',
            'light': 'Ligero',
            'moderate': 'Moderado',
            'active': 'Activo',
            'very_active': 'Muy Activo'
        }
        return mapping.get(activity, activity)
    
    def pluralize_dias(self, num):
        return 'Días' if num > 1 else 'Día'
    
    def get_duration(self, goal):
        """Duración del plan en semanas según objetivo"""
        if goal == 'lose_weight':
            return 12  # 3 meses
        elif goal == 'gain_muscle':
            return 16  # 4 meses
        else:
            return 12  # 3 meses
    
    def create_meals_for_plan(self, plan, all_recipes, goal, activity, daily_calories, training_days):
        """Crea TODAS las comidas del día con recetas completas"""
        # Separar recetas por categoría (usando nombres y categorías apropiadas)
        breakfasts = [
            r for r in all_recipes 
            if r.category.lower() == 'desayuno' 
            and not any(bad in r.name.lower() for bad in ['salmón', 'pollo', 'carne', 'ternera', 'almuerzo', 'cena'])
        ]
        lunches = [
            r for r in all_recipes 
            if r.category.lower() == 'almuerzo' 
            and not any(bad in r.name.lower() for bad in ['desayuno', 'cena'])
        ]
        dinners = [
            r for r in all_recipes 
            if r.category.lower() == 'cena' 
            and not any(bad in r.name.lower() for bad in ['desayuno', 'almuerzo'])
        ]
        # Filtrar snacks apropiados (excluir recetas con nombres de comidas principales)
        snacks = [
            r for r in all_recipes 
            if r.category.lower() == 'snack'
            and not any(bad in r.name.lower() for bad in ['pollo', 'ternera', 'carne', 'salmón', 'pescado', 'almuerzo', 'cena', 'desayuno'])
        ]
        
        # Si no hay suficientes snacks apropiados, usar todos
        if not snacks:
            snacks = [r for r in all_recipes if r.category.lower() == 'snack']
        
        # Si no hay suficientes recetas apropiadas, usar todas de la categoría
        if not breakfasts:
            breakfasts = [r for r in all_recipes if r.category.lower() == 'desayuno']
        if not lunches:
            lunches = [r for r in all_recipes if r.category.lower() == 'almuerzo']
        if not dinners:
            dinners = [r for r in all_recipes if r.category.lower() == 'cena']
        
        if not all([breakfasts, lunches, dinners, snacks]):
            self.stdout.write(self.style.WARNING(f'⚠️ No hay suficientes recetas de todas las categorías'))
            return
        
        # Calcular calorías por comida
        calories_per_meal = self.distribute_calories(daily_calories, training_days)
        
        # DESAYUNO (SIEMPRE debe existir)
        breakfast = random.choice(breakfasts)
        breakfast_calories = min(int(calories_per_meal['breakfast']), breakfast.calories_per_serving)
        DefaultMeal.objects.create(
            plan=plan,
            name=f"Desayuno: {breakfast.name}",
            time='08:00',
            calories=breakfast_calories,
            protein=round(breakfast_calories * 0.25 / 4, 1),
            carbs=round(breakfast_calories * 0.50 / 4, 1),
            fat=round(breakfast_calories * 0.25 / 9, 1),
            description=f"{breakfast.name}. Ingredientes: {', '.join(breakfast.ingredients[:3])}",
            order_index=1
        )
        
        # SNACK PRE-ALMUERZO (opcional según nivel de actividad)
        if activity in ['active', 'very_active']:
            snack1 = random.choice(snacks)
            snack_calories = min(150, snack1.calories_per_serving)
            DefaultMeal.objects.create(
                plan=plan,
                name=f"Snack Mañana: {snack1.name}",
                time='10:30',
                calories=snack_calories,
                protein=round(snack_calories * 0.30 / 4, 1),
                carbs=round(snack_calories * 0.40 / 4, 1),
                fat=round(snack_calories * 0.30 / 9, 1),
                description=f"{snack1.name}",
                order_index=2
            )
            next_order = 3
        else:
            next_order = 2
        
        # ALMUERZO (SIEMPRE debe existir)
        lunch = random.choice(lunches)
        lunch_calories = min(int(calories_per_meal['lunch']), lunch.calories_per_serving)
        DefaultMeal.objects.create(
            plan=plan,
            name=f"Almuerzo: {lunch.name}",
            time='13:00',
            calories=lunch_calories,
            protein=round(lunch_calories * 0.30 / 4, 1),
            carbs=round(lunch_calories * 0.45 / 4, 1),
            fat=round(lunch_calories * 0.25 / 9, 1),
            description=f"{lunch.name}. Ingredientes: {', '.join(lunch.ingredients[:4])}",
            order_index=next_order
        )
        next_order += 1
        
        # SNACK TARDE (SIEMPRE debe existir)
        snack2 = random.choice(snacks)
        snack2_calories = min(int(calories_per_meal.get('snack', 200)), snack2.calories_per_serving)
        DefaultMeal.objects.create(
            plan=plan,
            name=f"Snack Tarde: {snack2.name}",
            time='16:00',
            calories=snack2_calories,
            protein=round(snack2_calories * 0.30 / 4, 1),
            carbs=round(snack2_calories * 0.40 / 4, 1),
            fat=round(snack2_calories * 0.30 / 9, 1),
            description=f"{snack2.name}",
            order_index=next_order
        )
        next_order += 1
        
        # CENA (SIEMPRE debe existir)
        dinner = random.choice(dinners)
        dinner_calories = min(int(calories_per_meal['dinner']), dinner.calories_per_serving)
        DefaultMeal.objects.create(
            plan=plan,
            name=f"Cena: {dinner.name}",
            time='20:00',
            calories=dinner_calories,
            protein=round(dinner_calories * 0.35 / 4, 1),
            carbs=round(dinner_calories * 0.35 / 4, 1),
            fat=round(dinner_calories * 0.30 / 9, 1),
            description=f"{dinner.name}. Ingredientes: {', '.join(dinner.ingredients[:4])}",
            order_index=next_order
        )
        next_order += 1
        
        # SNACK NOCTURNO (opcional según objetivo y actividad)
        if goal == 'gain_muscle' or activity in ['active', 'very_active']:
            snack3 = random.choice(snacks)
            snack3_calories = min(150, snack3.calories_per_serving)
            DefaultMeal.objects.create(
                plan=plan,
                name=f"Snack Nocturno: {snack3.name}",
                time='22:00',
                calories=snack3_calories,
                protein=round(snack3_calories * 0.35 / 4, 1),
                carbs=round(snack3_calories * 0.35 / 4, 1),
                fat=round(snack3_calories * 0.30 / 9, 1),
                description=f"{snack3.name}",
                order_index=next_order
            )
    
    def distribute_calories(self, daily_calories, training_days):
        """Distribuye calorías entre comidas de manera completa"""
        # Distribución completa: Desayuno 25%, Almuerzo 35%, Cena 25%, Snacks 15%
        # Ajustar según días de entrenamiento
        if training_days >= 5:
            # Más calorías en desayuno y snacks si hay muchos días de entrenamiento
            base_distribution = {
                'breakfast': daily_calories * 0.28,
                'lunch': daily_calories * 0.35,
                'dinner': daily_calories * 0.25,
                'snack': daily_calories * 0.12  # Distribuido en 2-3 snacks
            }
        else:
            base_distribution = {
                'breakfast': daily_calories * 0.25,
                'lunch': daily_calories * 0.35,
                'dinner': daily_calories * 0.30,
                'snack': daily_calories * 0.10  # Distribuido en 1-2 snacks
            }
        
        return base_distribution
    
    def create_special_plans(self, all_recipes, admin_user):
        """Crea planes especiales adicionales"""
        special_plans_data = [
            {
                'name': 'Plan Definitivo - Alto en Proteína',
                'goal': 'gain_muscle',
                'activity': 'active',
                'daily_calories': 2800,
                'protein': 40.0,
                'carbs': 35.0,
                'fat': 25.0,
                'description': 'Plan alto en proteína ideal para ganancia muscular'
            },
            {
                'name': 'Plan Definitivo - Bajo en Calorías',
                'goal': 'lose_weight',
                'activity': 'moderate',
                'daily_calories': 1400,
                'protein': 35.0,
                'carbs': 35.0,
                'fat': 30.0,
                'description': 'Plan bajo en calorías para pérdida de peso efectiva'
            },
            {
                'name': 'Plan Definitivo - Cetogénico',
                'goal': 'lose_weight',
                'activity': 'light',
                'daily_calories': 1800,
                'protein': 25.0,
                'carbs': 5.0,
                'fat': 70.0,
                'description': 'Plan cetogénico bajo en carbohidratos'
            },
            {
                'name': 'Plan Definitivo - Vegetariano',
                'goal': 'body_recomposition',
                'activity': 'moderate',
                'daily_calories': 2100,
                'protein': 25.0,
                'carbs': 50.0,
                'fat': 25.0,
                'description': 'Plan vegetariano completo y balanceado'
            },
            {
                'name': 'Plan Definitivo - Proteína Variable',
                'goal': 'gain_muscle',
                'activity': 'very_active',
                'daily_calories': 3000,
                'protein': 30.0,
                'carbs': 50.0,
                'fat': 20.0,
                'description': 'Plan de alto volumen para atletas activos'
            },
        ]
        
        created = 0
        
        for plan_data in special_plans_data:
            try:
                if DefaultNutritionPlan.objects.filter(name=plan_data['name']).exists():
                    continue
                
                macros = self.calculate_macros_from_percentages(
                    plan_data['daily_calories'],
                    plan_data['protein'],
                    plan_data['carbs'],
                    plan_data['fat']
                )
                
                plan = DefaultNutritionPlan.objects.create(
                    name=plan_data['name'],
                    description=plan_data['description'],
                    daily_calories=plan_data['daily_calories'],
                    protein_percentage=plan_data['protein'],
                    carbs_percentage=plan_data['carbs'],
                    fat_percentage=plan_data['fat'],
                    target_macros=macros,
                    duration_weeks=12,
                    is_active=True,
                    is_default=False,
                    min_role_required='basic',
                    target_audience=plan_data['goal'],
                    tags=['especial', plan_data['goal'], 'personalized'],
                )
                
                self.create_meals_for_plan(
                    plan, all_recipes, plan_data['goal'], plan_data['activity'],
                    plan_data['daily_calories'], 4
                )
                
                created += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error creando plan especial: {e}'))
        
        return created
    
    def calculate_macros_from_percentages(self, calories, protein_pct, carbs_pct, fat_pct):
        """Calcula gramos de macros desde porcentajes"""
        return {
            'protein_grams': round((calories * protein_pct / 100) / 4, 1),
            'carbs_grams': round((calories * carbs_pct / 100) / 4, 1),
            'fat_grams': round((calories * fat_pct / 100) / 9, 1)
        }

