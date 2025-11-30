from django.core.management.base import BaseCommand
from nutrition.models import DefaultMeal, DefaultNutritionPlan
from django.utils import timezone

class Command(BaseCommand):
    help = 'Crea comidas por defecto para todos los usuarios'

    def handle(self, *args, **options):
        self.stdout.write('🍽️  Creando comidas por defecto...')
        
        # Crear plan de nutrición por defecto
        default_plan, created = DefaultNutritionPlan.objects.get_or_create(
            name='Plan de Nutrición Básico',
            defaults={
                'description': 'Plan de nutrición equilibrado para comenzar tu viaje de salud',
                'daily_calories': 2000,
                'target_macros': {
                    'protein': 150,
                    'carbs': 200,
                    'fat': 65
                },
                'is_active': True,
                'is_default': True
            }
        )

        if created:
            self.stdout.write(
                self.style.SUCCESS('✅ Plan de nutrición por defecto creado')
            )
        else:
            # Actualizar si ya existe
            default_plan.description = 'Plan de nutrición equilibrado para comenzar tu viaje de salud'
            default_plan.daily_calories = 2000
            default_plan.target_macros = {
                'protein': 150,
                'carbs': 200,
                'fat': 65
            }
            default_plan.is_active = True
            default_plan.is_default = True
            default_plan.save()
            self.stdout.write(
                self.style.WARNING('🔄 Plan de nutrición por defecto actualizado')
            )

        # Crear comidas por defecto
        default_meals = [
            {
                'name': 'Desayuno',
                'time': '08:00',
                'calories': 400,
                'protein': 25,
                'carbs': 45,
                'fat': 15,
                'description': 'Desayuno equilibrado para comenzar el día',
                'order_index': 1
            },
            {
                'name': 'Snack Mañana',
                'time': '10:30',
                'calories': 200,
                'protein': 15,
                'carbs': 25,
                'fat': 8,
                'description': 'Snack ligero para mantener la energía',
                'order_index': 2
            },
            {
                'name': 'Almuerzo',
                'time': '13:00',
                'calories': 600,
                'protein': 40,
                'carbs': 60,
                'fat': 20,
                'description': 'Comida principal del día',
                'order_index': 3
            },
            {
                'name': 'Snack Tarde',
                'time': '16:00',
                'calories': 200,
                'protein': 15,
                'carbs': 25,
                'fat': 8,
                'description': 'Snack para mantener el metabolismo activo',
                'order_index': 4
            },
            {
                'name': 'Cena',
                'time': '20:00',
                'calories': 400,
                'protein': 35,
                'carbs': 35,
                'fat': 14,
                'description': 'Cena ligera para terminar el día',
                'order_index': 5
            }
        ]

        # Crear o actualizar comidas por defecto
        created_meals = []
        for meal_data in default_meals:
            meal, created = DefaultMeal.objects.get_or_create(
                name=meal_data['name'],
                plan=default_plan,
                defaults=meal_data
            )
            if created:
                self.stdout.write(
                    self.style.SUCCESS(f'✅ Comida creada: {meal.name}')
                )
            else:
                # Actualizar si ya existe
                for key, value in meal_data.items():
                    if key != 'plan':  # No actualizar el plan
                        setattr(meal, key, value)
                meal.save()
                self.stdout.write(
                    self.style.WARNING(f'🔄 Comida actualizada: {meal.name}')
                )
            created_meals.append(meal)

        self.stdout.write(
            self.style.SUCCESS('\n🎉 ¡Comidas por defecto creadas exitosamente!')
        )
        self.stdout.write(f'📊 Total de comidas: {len(created_meals)}')
        self.stdout.write(f'📋 Plan: {default_plan.name}')
        self.stdout.write(f'🔥 Calorías diarias: {default_plan.daily_calories} kcal')
