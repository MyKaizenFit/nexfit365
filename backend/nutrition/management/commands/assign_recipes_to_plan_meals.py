"""
Comando para asignar recetas a las comidas de los planes de nutrición
"""
from django.core.management.base import BaseCommand
from django.db import models
from nutrition.models import NutritionPlan, PlanMeal, Recipe
import random


class Command(BaseCommand):
    help = 'Asigna recetas sugeridas a las comidas de los planes de nutrición'

    def add_arguments(self, parser):
        parser.add_argument(
            '--all',
            action='store_true',
            help='Actualizar todos los planes (activos e inactivos)'
        )
        parser.add_argument(
            '--system-only',
            action='store_true',
            help='Solo actualizar planes del sistema (sin usuario)'
        )

    def handle(self, *args, **options):
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("🍽️  ASIGNANDO RECETAS A COMIDAS DE PLANES"))
        self.stdout.write("=" * 70 + "\n")
        
        # Determinar qué planes actualizar
        if options['all']:
            plans = NutritionPlan.objects.all()
        elif options['system_only']:
            plans = NutritionPlan.objects.filter(user__isnull=True, is_active=True)
        else:
            # Por defecto: solo planes activos
            plans = NutritionPlan.objects.filter(is_active=True)
        
        self.stdout.write(f"📊 Planes encontrados: {plans.count()}")
        self.stdout.write(f"📚 Recetas disponibles: {Recipe.objects.filter(is_active=True).count()}\n")
        
        # Mapeo de meal_type a categorías de recetas
        meal_type_to_categories = {
            'breakfast': ['breakfast'],
            'morning_snack': ['breakfast', 'snack'],
            'lunch': ['lunch'],
            'afternoon_snack': ['snack'],
            'dinner': ['dinner'],
            'evening_snack': ['snack'],
            'snack': ['snack']
        }
        
        total_recipes_assigned = 0
        plans_updated = 0
        
        for plan in plans:
            meals = plan.meals.all().order_by('order_index')
            
            if not meals.exists():
                self.stdout.write(self.style.WARNING(f"⚠️  {plan.name}: Sin comidas"))
                continue
            
            plan_recipes = 0
            
            for meal in meals:
                # Obtener categorías apropiadas para este tipo de comida
                categories = meal_type_to_categories.get(meal.meal_type, ['lunch'])
                
                # Buscar recetas que coincidan con el meal_type o la categoría
                suitable_recipes = Recipe.objects.filter(
                    is_active=True
                ).filter(
                    models.Q(meal_types__overlap=categories) | 
                    models.Q(category__in=categories)
                )
                
                # Si no hay suficientes, buscar por categoría solamente
                if suitable_recipes.count() < 3:
                    suitable_recipes = Recipe.objects.filter(
                        is_active=True,
                        category__in=categories
                    )
                
                # Si aún no hay suficientes, buscar cualquier receta activa
                if suitable_recipes.count() < 3:
                    suitable_recipes = Recipe.objects.filter(is_active=True)
                
                # Seleccionar 3-5 recetas aleatorias
                if suitable_recipes.count() > 0:
                    num_to_select = min(5, suitable_recipes.count())
                    selected_recipes = random.sample(list(suitable_recipes), num_to_select)
                    
                    # Limpiar recetas existentes y asignar nuevas
                    meal.suggested_recipes.clear()
                    for recipe in selected_recipes:
                        meal.suggested_recipes.add(recipe)
                    
                    plan_recipes += len(selected_recipes)
                    self.stdout.write(f"   ✅ {meal.name} ({meal.meal_type}): {len(selected_recipes)} recetas")
                else:
                    self.stdout.write(self.style.WARNING(f"   ⚠️  {meal.name}: No hay recetas disponibles"))
            
            if plan_recipes > 0:
                total_recipes_assigned += plan_recipes
                plans_updated += 1
                self.stdout.write(self.style.SUCCESS(f"✅ {plan.name}: {plan_recipes} recetas asignadas\n"))
            else:
                self.stdout.write(self.style.WARNING(f"⚠️  {plan.name}: No se asignaron recetas\n"))
        
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS(f"✅ Proceso completado"))
        self.stdout.write(f"   Planes actualizados: {plans_updated}")
        self.stdout.write(f"   Total recetas asignadas: {total_recipes_assigned}")
        self.stdout.write("=" * 70)





