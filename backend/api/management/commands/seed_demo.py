# api/management/commands/seed_demo.py
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
import random

User = get_user_model()


class Command(BaseCommand):
    help = "Generar datos demo para Nex-Fit"

    def add_arguments(self, parser):
        parser.add_argument(
            "--users",
            type=int,
            default=5,
            help="Número de usuarios demo a crear"
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Limpiar datos existentes antes de crear nuevos"
        )

    def handle(self, *args, **options):
        if options["clear"]:
            self.stdout.write("Limpiando datos existentes...")
            self.clear_existing_data()

        self.stdout.write("Creando datos demo...")
        
        # Crear usuarios
        users = self.create_users(options["users"])
        
        # Crear datos de nutrición
        self.create_nutrition_data(users)
        
        # Crear datos de entrenamiento
        self.create_workout_data(users)
        
        # Crear datos de progreso
        self.create_progress_data(users)
        
        # Crear notificaciones
        self.create_notifications(users)
        
        # Crear logros
        self.create_achievements(users)
        
        self.stdout.write(
            self.style.SUCCESS("✅ Datos demo creados exitosamente!")
        )

    def clear_existing_data(self):
        """Limpiar datos existentes"""
        from nutrition.models import Food, NutritionPlan, Meal, MealLog
        from workouts.models import Exercise, WorkoutProgram, WorkoutLog
        from progress.models import ProgressPhoto, WeightEntry, BodyMeasurement
        from notifications.models import Notification
        from achievements.models import Achievement, UserAchievement
        from dashboard.models import DashboardData
        
        # Limpiar en orden para evitar problemas de FK
        MealLog.objects.all().delete()
        Meal.objects.all().delete()
        NutritionPlan.objects.all().delete()
        Food.objects.all().delete()
        
        WorkoutLog.objects.all().delete()
        WorkoutProgram.objects.all().delete()
        Exercise.objects.all().delete()
        
        ProgressPhoto.objects.all().delete()
        WeightEntry.objects.all().delete()
        BodyMeasurement.objects.all().delete()
        
        Notification.objects.all().delete()
        UserAchievement.objects.all().delete()
        Achievement.objects.all().delete()
        DashboardData.objects.all().delete()
        
        # No eliminar usuarios por seguridad

    def create_users(self, count):
        """Crear usuarios demo"""
        users = []
        
        # Crear admin si no existe
        admin, created = User.objects.get_or_create(
            email="admin@example.invalid",
            defaults={
                "first_name": "Admin",
                "last_name": "User",
                "role": "ADMIN",
                "is_staff": True,
                "is_superuser": True,
            }
        )
        if created:
            admin.set_password("CHANGE_ME_PASSWORD")
            admin.save()
            users.append(admin)
            self.stdout.write(f"✅ Usuario admin creado: {admin.email}")
        
        # Crear trainer si no existe
        trainer, created = User.objects.get_or_create(
            email="trainer@mykaizenfit.com",
            defaults={
                "first_name": "Trainer",
                "last_name": "User",
                "role": "TRAINER",
                "is_staff": True,
            }
        )
        if created:
            trainer.set_password("CHANGE_ME_PASSWORD")
            trainer.save()
            users.append(trainer)
            self.stdout.write(f"✅ Usuario trainer creado: {trainer.email}")
        
        # Crear usuarios miembros
        for i in range(count):
            user, created = User.objects.get_or_create(
                email=f"user{i+1}@mykaizenfit.com",
                defaults={
                    "first_name": f"Usuario{i+1}",
                    "last_name": "Demo",
                    "role": "MEMBER",
                }
            )
            if created:
                user.set_password("CHANGE_ME_PASSWORD")
                user.save()
                users.append(user)
                self.stdout.write(f"✅ Usuario demo creado: {user.email}")
        
        return users

    def create_nutrition_data(self, users):
        """Crear datos de nutrición demo"""
        from nutrition.models import Food, NutritionPlan, Meal, MealFood
        
        # Crear alimentos
        foods_data = [
            {"name": "Pollo", "calories": 165, "protein": 31.0, "carbs": 0.0, "fat": 3.6},
            {"name": "Arroz", "calories": 130, "protein": 2.7, "carbs": 28.0, "fat": 0.3},
            {"name": "Brócoli", "calories": 34, "protein": 2.8, "carbs": 7.0, "fat": 0.4},
            {"name": "Huevo", "calories": 74, "protein": 6.3, "carbs": 0.6, "fat": 5.0},
            {"name": "Avena", "calories": 389, "protein": 16.9, "carbs": 66.0, "fat": 6.9},
        ]
        
        foods = []
        for food_data in foods_data:
            food, created = Food.objects.get_or_create(
                name=food_data["name"],
                defaults=food_data
            )
            foods.append(food)
            if created:
                self.stdout.write(f"✅ Alimento creado: {food.name}")
        
        # Crear plan nutricional para el primer usuario
        if users:
            user = users[0]
            plan, created = NutritionPlan.objects.get_or_create(
                user=user,
                name="Plan Definición 1800",
                defaults={
                    "description": "Plan de definición muscular con 1800 calorías diarias",
                    "daily_calories": 1800,
                    "start_date": timezone.now().date(),
                    "is_active": True,
                }
            )
            
            if created:
                # Crear comidas
                meals_data = [
                    {"name": "Desayuno", "order_index": 1, "calories": 450},
                    {"name": "Almuerzo", "order_index": 2, "calories": 600},
                    {"name": "Cena", "order_index": 3, "calories": 500},
                    {"name": "Snack", "order_index": 4, "calories": 250},
                ]
                
                for meal_data in meals_data:
                    meal = Meal.objects.create(
                        plan=plan,
                        **meal_data
                    )
                    
                    # Agregar alimentos a la comida
                    if meal.name == "Desayuno":
                        MealFood.objects.create(meal=meal, food=foods[4], quantity=50)  # Avena
                        MealFood.objects.create(meal=meal, food=foods[3], quantity=100)  # Huevo
                    elif meal.name == "Almuerzo":
                        MealFood.objects.create(meal=meal, food=foods[0], quantity=150)  # Pollo
                        MealFood.objects.create(meal=meal, food=foods[1], quantity=100)  # Arroz
                        MealFood.objects.create(meal=meal, food=foods[2], quantity=200)  # Brócoli
                
                self.stdout.write(f"✅ Plan nutricional creado para {user.email}")

    def create_workout_data(self, users):
        """Crear datos de entrenamiento demo"""
        from workouts.models import Exercise, WorkoutProgram, WorkoutDay, WorkoutDayExercise
        
        # Crear ejercicios
        exercises_data = [
            {"name": "Press de Banca", "category": "strength", "muscle_groups": ["chest", "triceps"]},
            {"name": "Sentadillas", "category": "strength", "muscle_groups": ["legs", "glutes"]},
            {"name": "Peso Muerto", "category": "strength", "muscle_groups": ["back", "legs"]},
            {"name": "Pull-ups", "category": "strength", "muscle_groups": ["back", "biceps"]},
            {"name": "Plancha", "category": "core", "muscle_groups": ["abs", "core"]},
        ]
        
        exercises = []
        for exercise_data in exercises_data:
            exercise, created = Exercise.objects.get_or_create(
                name=exercise_data["name"],
                defaults=exercise_data
            )
            exercises.append(exercise)
            if created:
                self.stdout.write(f"✅ Ejercicio creado: {exercise.name}")
        
        # Crear programa de entrenamiento para el primer usuario
        if users:
            user = users[0]
            program, created = WorkoutProgram.objects.get_or_create(
                user=user,
                name="Programa Fuerza 4x4",
                defaults={
                    "description": "Programa de fuerza 4 días por semana",
                    "level": "intermediate",
                    "goal": "strength_building",
                    "days_per_week": 4,
                    "duration_weeks": 8,
                    "start_date": timezone.now().date(),
                    "is_active": True,
                }
            )
            
            if created:
                # Crear días de entrenamiento
                days_data = [
                    {"day": "monday", "name": "Pecho y Tríceps", "order_index": 1},
                    {"day": "tuesday", "name": "Piernas", "order_index": 2},
                    {"day": "wednesday", "name": "Descanso", "order_index": 3, "is_rest_day": True},
                    {"day": "thursday", "name": "Espalda y Bíceps", "order_index": 4},
                    {"day": "friday", "name": "Hombros y Core", "order_index": 5},
                ]
                
                for day_data in days_data:
                    day = WorkoutDay.objects.create(program=program, **day_data)
                    
                    if not day.is_rest_day:
                        # Agregar ejercicios al día
                        if day.name == "Pecho y Tríceps":
                            WorkoutDayExercise.objects.create(
                                day=day, exercise=exercises[0], sets=4, reps="8-10", rest_seconds=90
                            )
                        elif day.name == "Piernas":
                            WorkoutDayExercise.objects.create(
                                day=day, exercise=exercises[1], sets=4, reps="8-10", rest_seconds=120
                            )
                        elif day.name == "Espalda y Bíceps":
                            WorkoutDayExercise.objects.create(
                                day=day, exercise=exercises[3], sets=4, reps="8-10", rest_seconds=90
                            )
                        elif day.name == "Hombros y Core":
                            WorkoutDayExercise.objects.create(
                                day=day, exercise=exercises[4], sets=3, reps="30s", rest_seconds=60
                            )
                
                self.stdout.write(f"✅ Programa de entrenamiento creado para {user.email}")

    def create_progress_data(self, users):
        """Crear datos de progreso demo"""
        from progress.models import ProgressPhoto, WeightEntry, BodyMeasurement
        
        if not users:
            return
        
        user = users[0]
        today = timezone.now().date()
        
        # Crear entradas de peso
        for i in range(7):
            date = today - timedelta(days=i)
            weight = Decimal("75.0") - Decimal(str(i * 0.1))
            
            WeightEntry.objects.get_or_create(
                user=user,
                date=date,
                defaults={
                    "weight": weight,
                    "notes": f"Peso del día {date}"
                }
            )
        
        # Crear medidas corporales
        BodyMeasurement.objects.get_or_create(
            user=user,
            date=today,
            defaults={
                "chest": Decimal("95.0"),
                "waist": Decimal("80.0"),
                "arms": Decimal("35.0"),
                "thighs": Decimal("55.0"),
                "notes": "Medidas mensuales"
            }
        )
        
        self.stdout.write(f"✅ Datos de progreso creados para {user.email}")

    def create_notifications(self, users):
        """Crear notificaciones demo"""
        from notifications.models import Notification
        
        if not users:
            return
        
        user = users[0]
        
        notifications_data = [
            {
                "type": "workout_reminder",
                "title": "Recordatorio de Entrenamiento",
                "message": "¡Es hora de tu entrenamiento de hoy!",
                "data": {"workout_type": "strength"}
            },
            {
                "type": "achievement",
                "title": "¡Logro Desbloqueado!",
                "message": "Has completado 7 días seguidos de entrenamiento",
                "data": {"achievement": "7_day_streak"}
            },
            {
                "type": "progress",
                "title": "Progreso Actualizado",
                "message": "Has perdido 2kg este mes. ¡Excelente trabajo!",
                "data": {"weight_change": -2.0}
            },
        ]
        
        for notif_data in notifications_data:
            Notification.objects.get_or_create(
                user=user,
                title=notif_data["title"],
                defaults={
                    "type": notif_data["type"],
                    "message": notif_data["message"],
                    "data": notif_data["data"],
                    "expires_at": timezone.now() + timedelta(days=7)
                }
            )
        
        self.stdout.write(f"✅ Notificaciones creadas para {user.email}")

    def create_achievements(self, users):
        """Crear logros demo"""
        from achievements.models import Achievement, UserAchievement
        
        if not users:
            return
        
        user = users[0]
        
        # Crear logros disponibles
        achievements_data = [
            {
                "key": "first_workout",
                "name": "Primer Entrenamiento",
                "description": "Completa tu primer entrenamiento",
                "category": "workout",
                "points": 10
            },
            {
                "key": "7_day_streak",
                "name": "Racha de 7 Días",
                "description": "Entrena 7 días seguidos",
                "category": "streak",
                "points": 50
            },
            {
                "key": "weight_loss_5kg",
                "name": "Pérdida de 5kg",
                "description": "Pierde 5kg de peso",
                "category": "progress",
                "points": 100
            },
        ]
        
        for achievement_data in achievements_data:
            achievement, created = Achievement.objects.get_or_create(
                key=achievement_data["key"],
                defaults=achievement_data
            )
            
            if created:
                self.stdout.write(f"✅ Logro creado: {achievement.name}")
        
        # Asignar algunos logros al usuario
        first_achievement = Achievement.objects.get(key="first_workout")
        UserAchievement.objects.get_or_create(
            user=user,
            achievement=first_achievement,
            defaults={
                "progress": {"completed": True}
            }
        )
        
        self.stdout.write(f"✅ Logros asignados a {user.email}")
