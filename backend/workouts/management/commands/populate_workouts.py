"""
Comando de gestión para poblar ejercicios y planes de entrenamiento
Uso: python manage.py populate_workouts
"""

from django.core.management.base import BaseCommand
from workouts.models import Exercise, WorkoutPlanTemplate, WorkoutPlanDay, WorkoutPlanExercise
from accounts.models import CustomUser


class Command(BaseCommand):
    help = 'Popula la base de datos con ejercicios y planes de entrenamiento completos'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS('=' * 60))
        self.stdout.write(self.style.SUCCESS('POBLADOR DE EJERCICIOS Y PLANES DE ENTRENAMIENTO'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
        
        # Crear ejercicios
        self.stdout.write('\n1. Creando ejercicios...')
        exercises = self.create_exercises()
        
        # Crear planes
        self.stdout.write('\n2. Creando planes de entrenamiento...')
        self.create_workout_plans(exercises)
        
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS('✓ PROCESO COMPLETADO EXITOSAMENTE'))
        self.stdout.write(self.style.SUCCESS('=' * 60))
    
    def create_exercises(self):
        """Crear una lista completa de ejercicios"""
        exercises_data = [
            # EJERCICIOS DE PECHO
            {"name": "Press de Banca", "category": "strength", "muscle_groups": ["chest", "triceps", "shoulders"], 
             "instructions": "Acuéstate en el banco con la barra a la altura del pecho. Baja la barra hasta el pecho y empújala hacia arriba."},
            {"name": "Press Inclinado", "category": "strength", "muscle_groups": ["chest", "shoulders"], 
             "instructions": "Similar al press de banca pero con el banco inclinado a 30-45 grados para enfocar la parte superior del pecho."},
            {"name": "Press Declinado", "category": "strength", "muscle_groups": ["chest", "triceps"], 
             "instructions": "Acuéstate en el banco declinado y realiza el mismo movimiento que el press de banca para enfocar la parte inferior del pecho."},
            {"name": "Flexiones", "category": "bodyweight", "muscle_groups": ["chest", "triceps", "shoulders"], 
             "instructions": "Apoya las manos en el suelo a la altura del pecho. Baja el cuerpo hasta casi tocar el suelo y empuja hacia arriba."},
            {"name": "Flexiones Inclinadas", "category": "bodyweight", "muscle_groups": ["chest", "shoulders"], 
             "instructions": "Apoya las manos en una superficie elevada (banco, silla) para facilitar el movimiento."},
            {"name": "Flexiones Declinadas", "category": "bodyweight", "muscle_groups": ["chest", "triceps"], 
             "instructions": "Coloca los pies en una superficie elevada para aumentar la dificultad."},
            {"name": "Aperturas con Mancuernas", "category": "strength", "muscle_groups": ["chest"], 
             "instructions": "Acuéstate en el banco y abre los brazos con mancuernas en un movimiento de arco."},
            {"name": "Fondos (Dips)", "category": "bodyweight", "muscle_groups": ["chest", "triceps", "shoulders"], 
             "instructions": "Suspéndete en las barras paralelas, baja el cuerpo flexionando los brazos y empuja hacia arriba."},
            {"name": "Pullovers", "category": "strength", "muscle_groups": ["chest", "lats"], 
             "instructions": "Acostado en el banco, lleva la mancuerna desde detrás de la cabeza hasta sobre el pecho."},
            {"name": "Cruce con Cables", "category": "strength", "muscle_groups": ["chest"], 
             "instructions": "Cruza los brazos por delante del cuerpo usando cables para definir el pecho."},
            
            # EJERCICIOS DE ESPALDA (primeros 10 para ahorrar espacio)
            {"name": "Dominadas", "category": "bodyweight", "muscle_groups": ["lats", "biceps", "rhomboids"], 
             "instructions": "Colgando de la barra, tira del cuerpo hacia arriba hasta que la barbilla pase la barra."},
            {"name": "Remo con Barra", "category": "strength", "muscle_groups": ["lats", "rhomboids", "biceps"], 
             "instructions": "Inclínate hacia adelante y tira la barra hacia el abdomen, apretando los omóplatos."},
            {"name": "Remo con Mancuernas", "category": "strength", "muscle_groups": ["lats", "biceps"], 
             "instructions": "Apoya una rodilla en el banco, inclínate y tira de la mancuerna hacia el torso."},
            {"name": "Jalones al Pecho", "category": "strength", "muscle_groups": ["lats", "biceps"], 
             "instructions": "Sentado, tira de la barra hacia el pecho, no detrás del cuello."},
            {"name": "Jalones a la Nuca", "category": "strength", "muscle_groups": ["lats"], 
             "instructions": "Tira de la barra detrás de la nuca con control."},
            {"name": "Hiperextensiones", "category": "bodyweight", "muscle_groups": ["lower_back"], 
             "instructions": "Acostado boca abajo, eleva el torso arqueando la espalda."},
            {"name": "Encogimiento de Hombros", "category": "strength", "muscle_groups": ["traps"], 
             "instructions": "De pie con mancuernas, encoge los hombros hacia arriba."},
            
            # EJERCICIOS DE PIERNAS
            {"name": "Sentadillas", "category": "bodyweight", "muscle_groups": ["quads", "glutes", "calves"], 
             "instructions": "De pie con los pies a la altura de los hombros, baja como si te sentaras hasta que los muslos estén paralelos al suelo."},
            {"name": "Sentadillas con Barra", "category": "strength", "muscle_groups": ["quads", "glutes", "calves"], 
             "instructions": "Con la barra sobre los hombros, realiza sentadillas con peso adicional."},
            {"name": "Sentadillas Frontales", "category": "strength", "muscle_groups": ["quads", "core"], 
             "instructions": "Con la barra en la parte delantera de los hombros, realiza sentadillas."},
            {"name": "Peso Muerto", "category": "strength", "muscle_groups": ["hamstrings", "glutes", "lower_back"], 
             "instructions": "Con la barra en el suelo, agarra y levántala manteniendo la espalda recta hasta estar de pie."},
            {"name": "Peso Muerto Rumano", "category": "strength", "muscle_groups": ["hamstrings", "glutes"], 
             "instructions": "Con la barra en las manos, inclínate hacia adelante manteniendo las piernas rectas."},
            {"name": "Zancadas", "category": "bodyweight", "muscle_groups": ["quads", "glutes"], 
             "instructions": "Da un paso adelante y baja hasta que ambas rodillas estén en 90 grados."},
            {"name": "Prensa de Piernas", "category": "strength", "muscle_groups": ["quads", "glutes"], 
             "instructions": "Sentado en la prensa, empuja el peso con las piernas."},
            {"name": "Extensiones de Cuádriceps", "category": "strength", "muscle_groups": ["quads"], 
             "instructions": "Sentado en la máquina, extiende las piernas levantando el peso."},
            {"name": "Curl de Femorales", "category": "strength", "muscle_groups": ["hamstrings"], 
             "instructions": "Boca abajo en la máquina, flexiona las piernas llevando el peso hacia los glúteos."},
            {"name": "Elevación de Talones", "category": "strength", "muscle_groups": ["calves"], 
             "instructions": "De pie con peso, eleva los talones presionando sobre los dedos de los pies."},
            
            # EJERCICIOS DE HOMBROS
            {"name": "Press Militar", "category": "strength", "muscle_groups": ["shoulders", "triceps"], 
             "instructions": "De pie con barra, presiona hacia arriba hasta que los brazos estén completamente extendidos."},
            {"name": "Press Frontal con Mancuernas", "category": "strength", "muscle_groups": ["shoulders"], 
             "instructions": "Con mancuernas a la altura de los hombros, presiona hacia arriba."},
            {"name": "Elevaciones Laterales", "category": "strength", "muscle_groups": ["shoulders"], 
             "instructions": "Con mancuernas a los lados, eleva los brazos hasta la altura de los hombros."},
            {"name": "Elevaciones Frontales", "category": "strength", "muscle_groups": ["shoulders"], 
             "instructions": "De pie, eleva las mancuernas hacia el frente hasta la altura de los hombros."},
            {"name": "Vuelos Posteriores", "category": "strength", "muscle_groups": ["shoulders", "rear_delts"], 
             "instructions": "Inclinado hacia adelante, eleva las mancuernas hacia atrás para trabajar la parte posterior del hombro."},
            
            # EJERCICIOS DE BÍCEPS
            {"name": "Curl con Barra", "category": "strength", "muscle_groups": ["biceps"], 
             "instructions": "De pie con barra, flexiona los brazos llevando la barra hacia el pecho."},
            {"name": "Curl con Mancuernas", "category": "strength", "muscle_groups": ["biceps"], 
             "instructions": "Con mancuernas en cada mano, flexiona los brazos alternando o simultáneamente."},
            {"name": "Curl Martillo", "category": "strength", "muscle_groups": ["biceps", "brachialis"], 
             "instructions": "Con mancuernas en posición neutral (como martillos), flexiona los brazos."},
            {"name": "Curl Concentrado", "category": "strength", "muscle_groups": ["biceps"], 
             "instructions": "Sentado, apoya el codo en la pierna y realiza curls de forma concentrada."},
            
            # EJERCICIOS DE TRÍCEPS
            {"name": "Fondos en Paralelas", "category": "bodyweight", "muscle_groups": ["triceps", "chest"], 
             "instructions": "Suspéndete en barras paralelas, baja flexionando los brazos y empuja hacia arriba."},
            {"name": "Extensiones de Tríceps", "category": "strength", "muscle_groups": ["triceps"], 
             "instructions": "Con mancuerna o barra detrás de la cabeza, extiende los brazos presionando hacia arriba."},
            {"name": "Press Francés", "category": "strength", "muscle_groups": ["triceps"], 
             "instructions": "Acostado en el banco, baja la barra hacia la frente y presiona hacia arriba."},
            {"name": "Patadas de Tríceps", "category": "strength", "muscle_groups": ["triceps"], 
             "instructions": "Inclinado, flexiona el brazo hacia atrás como si dieras patadas."},
            
            # EJERCICIOS DE CORE
            {"name": "Plancha", "category": "bodyweight", "muscle_groups": ["core"], 
             "instructions": "En posición de flexión pero apoyado en antebrazos, mantén el cuerpo recto."},
            {"name": "Plancha Lateral", "category": "bodyweight", "muscle_groups": ["core", "obliques"], 
             "instructions": "De lado, apoya el antebrazo y mantén el cuerpo recto lateralmente."},
            {"name": "Crunches", "category": "bodyweight", "muscle_groups": ["abs"], 
             "instructions": "Acostado, eleva solo los hombros del suelo, sin levantar toda la espalda."},
            {"name": "Mountain Climbers", "category": "bodyweight", "muscle_groups": ["core", "shoulders"], 
             "instructions": "En posición de plancha, alterna llevando las rodillas al pecho rápidamente."},
            {"name": "Russian Twist", "category": "bodyweight", "muscle_groups": ["abs", "obliques"], 
             "instructions": "Sentado, rota el torso de lado a lado con o sin peso."},
            {"name": "V-Ups", "category": "bodyweight", "muscle_groups": ["abs"], 
             "instructions": "Acostado, eleva torso y piernas simultáneamente para formar una V."},
        ]
        
        created_count = 0
        for exercise_data in exercises_data:
            exercise, created = Exercise.objects.get_or_create(
                name=exercise_data["name"],
                defaults={
                    "category": exercise_data.get("category", ""),
                    "muscle_groups": exercise_data.get("muscle_groups", []),
                    "instructions": exercise_data.get("instructions", ""),
                }
            )
            if created:
                created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'✓ Creados {created_count} ejercicios nuevos (Total: {Exercise.objects.count()})'))
        return Exercise.objects.all()
    
    def create_workout_plans(self, exercises):
        """Crear planes de entrenamiento completos"""
        
        # Obtener o crear usuario admin
        admin_user = CustomUser.objects.filter(is_superuser=True).first()
        if not admin_user:
            admin_user = CustomUser.objects.first()
            if not admin_user:
                self.stdout.write(self.style.ERROR('⚠ Error: No hay usuarios en el sistema'))
                return
        
        def get_exercise(name):
            return Exercise.objects.filter(name__icontains=name).first()
        
        # PLAN 1: PRINCIPIANTES (3 días/semana)
        plan1, created = WorkoutPlanTemplate.objects.get_or_create(
            name="Plan Inicial - Tren Superior",
            defaults={
                "description": "Plan para principiantes enfocado en tren superior. Perfecto para empezar.",
                "difficulty": "beginner",
                "goal": "general_fitness",
                "duration_weeks": 4,
                "days_per_week": 3,
                "is_active": True,
                "is_public": True,
                "created_by": admin_user,
                "tags": ["principiante", "tren-superior", "inicio"]
            }
        )
        
        if created or not plan1.days.all().exists():
            if not created:
                plan1.days.all().delete()
            
            # Día 1
            day1 = WorkoutPlanDay.objects.create(
                plan=plan1, day_name="Día 1 - Tren Superior", day_number=1,
                is_rest_day=False, notes="Trabajo completo de tren superior", order_index=1
            )
            
            for i, (name, sets, reps) in enumerate([
                ("Flexiones", 3, "10"),
                ("Remo con Mancuernas", 3, "12"),
                ("Plancha", 1, "30 segundos"),
                ("Curl con Mancuernas", 3, "10"),
            ]):
                ex = get_exercise(name)
                if ex:
                    WorkoutPlanExercise.objects.create(
                        workout_day=day1, exercise=ex, sets=sets, reps=reps,
                        rest_time=60, notes=f"{ex.name} para principiantes", order_index=i+1
                    )
            
            # Descanso
            WorkoutPlanDay.objects.create(
                plan=plan1, day_name="Descanso", day_number=2,
                is_rest_day=True, notes="Día de descanso activo", order_index=2
            )
            
            # Día 3
            day3 = WorkoutPlanDay.objects.create(
                plan=plan1, day_name="Día 3 - Piernas", day_number=3,
                is_rest_day=False, notes="Trabajo de piernas", order_index=3
            )
            
            for i, (name, sets, reps) in enumerate([
                ("Sentadillas", 3, "15"),
                ("Zancadas", 3, "12 por pierna"),
                ("Elevación de Talones", 3, "15"),
                ("Plancha", 1, "30 segundos"),
            ]):
                ex = get_exercise(name)
                if ex:
                    WorkoutPlanExercise.objects.create(
                        workout_day=day3, exercise=ex, sets=sets, reps=reps,
                        rest_time=90, notes=f"{ex.name} para principiantes", order_index=i+1
                    )
            
            self.stdout.write(self.style.SUCCESS(f'✓ Plan creado: {plan1.name}'))
        
        # PLAN 2: INTERMEDIO (4 días/semana)
        plan2, created2 = WorkoutPlanTemplate.objects.get_or_create(
            name="Plan Intermedio - 4 Días Push Pull",
            defaults={
                "description": "Plan de 4 días para intermedios enfocado en hipertrofia",
                "difficulty": "intermediate",
                "goal": "muscle_gain",
                "duration_weeks": 6,
                "days_per_week": 4,
                "is_active": True,
                "is_public": True,
                "created_by": admin_user,
                "tags": ["intermedio", "hipertrofia"]
            }
        )
        
        if created2 or not plan2.days.all().exists():
            if not created2:
                plan2.days.all().delete()
            
            # Día 1 - Pecho y Tríceps
            day1 = WorkoutPlanDay.objects.create(
                plan=plan2, day_name="Push 1 - Pecho", day_number=1,
                is_rest_day=False, notes="Pe cho y tríceps intenso", order_index=1
            )
            
            for i, (name, sets, reps) in enumerate([
                ("Press de Banca", 4, "8-10"),
                ("Press Inclinado", 3, "10"),
                ("Flexiones Declinadas", 3, "12"),
                ("Fondos en Paralelas", 3, "10"),
            ]):
                ex = get_exercise(name)
                if ex:
                    WorkoutPlanExercise.objects.create(
                        workout_day=day1, exercise=ex, sets=sets, reps=reps,
                        rest_time=120, notes="", order_index=i+1
                    )
            
            # Día 2 - Espalda y Bíceps
            day2 = WorkoutPlanDay.objects.create(
                plan=plan2, day_name="Pull 1 - Espalda", day_number=2,
                is_rest_day=False, notes="Espalda ancha", order_index=2
            )
            
            for i, (name, sets, reps) in enumerate([
                ("Dominadas", 4, "8-10"),
                ("Remo con Barra", 4, "10"),
                ("Curl con Barra", 3, "10"),
                ("Curl Martillo", 3, "12"),
            ]):
                ex = get_exercise(name)
                if ex:
                    WorkoutPlanExercise.objects.create(
                        workout_day=day2, exercise=ex, sets=sets, reps=reps,
                        rest_time=90, notes="", order_index=i+1
                    )
            
            # Día 3 - Piernas
            day3 = WorkoutPlanDay.objects.create(
                plan=plan2, day_name="Piernas Completo", day_number=3,
                is_rest_day=False, notes="Entrenamiento de piernas intenso", order_index=3
            )
            
            for i, (name, sets, reps) in enumerate([
                ("Sentadillas con Barra", 5, "8"),
                ("Peso Muerto", 4, "6"),
                ("Prensa de Piernas", 4, "12"),
                ("Zancadas", 3, "10 por pierna"),
            ]):
                ex = get_exercise(name)
                if ex:
                    WorkoutPlanExercise.objects.create(
                        workout_day=day3, exercise=ex, sets=sets, reps=reps,
                        rest_time=180, notes="", order_index=i+1
                    )
            
            # Día 4 - Hombros y Core
            day4 = WorkoutPlanDay.objects.create(
                plan=plan2, day_name="Push 2 - Hombros", day_number=4,
                is_rest_day=False, notes="Hombros y core", order_index=4
            )
            
            for i, (name, sets, reps) in enumerate([
                ("Press Militar", 4, "8"),
                ("Elevaciones Laterales", 3, "12"),
                ("Vuelos Posteriores", 3, "12"),
                ("Plancha", 3, "45 segundos"),
                ("Mountain Climbers", 3, "15"),
            ]):
                ex = get_exercise(name)
                if ex:
                    WorkoutPlanExercise.objects.create(
                        workout_day=day4, exercise=ex, sets=sets, reps=reps,
                        rest_time=90, notes="", order_index=i+1
                    )
            
            self.stdout.write(self.style.SUCCESS(f'✓ Plan creado: {plan2.name}'))
        
        # PLAN 3: AVANZADO (5 días/semana)
        plan3, created3 = WorkoutPlanTemplate.objects.get_or_create(
            name="Plan Avanzado - Push Pull Legs",
            defaults={
                "description": "Plan avanzado para atletas experimentados",
                "difficulty": "advanced",
                "goal": "strength_building",
                "duration_weeks": 8,
                "days_per_week": 5,
                "is_active": True,
                "is_public": True,
                "created_by": admin_user,
                "tags": ["avanzado", "fuerza", "ppl"]
            }
        )
        
        if created3 or not plan3.days.all().exists():
            if not created3:
                plan3.days.all().delete()
            
            # Día 1 - Push
            day1 = WorkoutPlanDay.objects.create(
                plan=plan3, day_name="Push 1", day_number=1,
                is_rest_day=False, notes="Pe cho intenso", order_index=1
            )
            
            for i, (name, sets, reps) in enumerate([
                ("Press de Banca", 5, "5"),
                ("Press Inclinado", 4, "8"),
                ("Fondos en Paralelas", 3, "10"),
            ]):
                ex = get_exercise(name)
                if ex:
                    WorkoutPlanExercise.objects.create(
                        workout_day=day1, exercise=ex, sets=sets, reps=reps,
                        rest_time=180, notes="Fuerza", order_index=i+1
                    )
            
            # Día 2 - Pull
            day2 = WorkoutPlanDay.objects.create(
                plan=plan3, day_name="Pull 1", day_number=2,
                is_rest_day=False, notes="Espalda ancha", order_index=2
            )
            
            for i, (name, sets, reps) in enumerate([
                ("Peso Muerto", 5, "5"),
                ("Dominadas", 4, "8"),
                ("Remo con Barra", 4, "8"),
                ("Curl con Barra", 3, "10"),
            ]):
                ex = get_exercise(name)
                if ex:
                    WorkoutPlanExercise.objects.create(
                        workout_day=day2, exercise=ex, sets=sets, reps=reps,
                        rest_time=180, notes="Fuerza", order_index=i+1
                    )
            
            # Día 3 - Legs
            day3 = WorkoutPlanDay.objects.create(
                plan=plan3, day_name="Legs", day_number=3,
                is_rest_day=False, notes="Piernas exhaustivas", order_index=3
            )
            
            for i, (name, sets, reps) in enumerate([
                ("Sentadillas con Barra", 5, "6"),
                ("Peso Muerto Rumano", 4, "8"),
                ("Prensa de Piernas", 4, "10"),
                ("Extensiones de Cuádriceps", 3, "12"),
            ]):
                ex = get_exercise(name)
                if ex:
                    WorkoutPlanExercise.objects.create(
                        workout_day=day3, exercise=ex, sets=sets, reps=reps,
                        rest_time=180, notes="", order_index=i+1
                    )
            
            # Día 4 - Push 2
            day4 = WorkoutPlanDay.objects.create(
                plan=plan3, day_name="Push 2", day_number=4,
                is_rest_day=False, notes="Hombros", order_index=4
            )
            
            for i, (name, sets, reps) in enumerate([
                ("Press Militar", 5, "8"),
                ("Elevaciones Laterales", 4, "12"),
                ("Elevaciones Frontales", 3, "12"),
                ("Patadas de Tríceps", 3, "12"),
            ]):
                ex = get_exercise(name)
                if ex:
                    WorkoutPlanExercise.objects.create(
                        workout_day=day4, exercise=ex, sets=sets, reps=reps,
                        rest_time=120, notes="", order_index=i+1
                    )
            
            # Día 5 - Pull 2
            day5 = WorkoutPlanDay.objects.create(
                plan=plan3, day_name="Pull 2", day_number=5,
                is_rest_day=False, notes="Espalda posterior", order_index=5
            )
            
            for i, (name, sets, reps) in enumerate([
                ("Jalones al Pecho", 4, "10"),
                ("Remo con Mancuernas", 4, "10"),
                ("Encogimiento de Hombros", 4, "12"),
                ("Curl Martillo", 3, "12"),
            ]):
                ex = get_exercise(name)
                if ex:
                    WorkoutPlanExercise.objects.create(
                        workout_day=day5, exercise=ex, sets=sets, reps=reps,
                        rest_time=90, notes="", order_index=i+1
                    )
            
            self.stdout.write(self.style.SUCCESS(f'✓ Plan creado: {plan3.name}'))
        
        # === MÁS PLANES POR COMBINACIONES ===
        
        # PLAN 4: CASA - 2 DÍAS - PERDER PESO
        self.create_plan(
            name="Casa - 2 Días - Perder Peso",
            description="Plan de 2 días en casa para quemar grasa y perder peso",
            difficulty="beginner", goal="weight_loss", duration_weeks=8,
            days_per_week=2, is_equipment_needed=False,
            tag_words=["casa", "quemar-grasa", "cardio"]
        )
        
        # PLAN 5: CASA - 3 DÍAS - GANAR MÚSCULO
        self.create_plan(
            name="Casa - 3 Días - Ganar Músculo",
            description="Entrenamiento en casa con peso corporal para ganar masa muscular",
            difficulty="intermediate", goal="muscle_gain", duration_weeks=12,
            days_per_week=3, is_equipment_needed=False,
            tag_words=["casa", "peso-corporal", "hipertrofia"]
        )
        
        # PLAN 6: GIMNASIO - 3 DÍAS - PERDER PESO
        self.create_plan(
            name="Gimnasio - 3 Días - Quema Grasa",
            description="Plan de gimnasio enfocado en quemar grasa y tonificar",
            difficulty="beginner", goal="weight_loss", duration_weeks=8,
            days_per_week=3, is_equipment_needed=True,
            tag_words=["gimnasio", "quema", "tonificar"]
        )
        
        # PLAN 7: GIMNASIO - 4 DÍAS - GANAR MÚSCULO
        self.create_plan(
            name="Gimnasio - 4 Días - Volumen",
            description="Plan de volumen para ganar músculo de forma eficiente",
            difficulty="intermediate", goal="muscle_gain", duration_weeks=12,
            days_per_week=4, is_equipment_needed=True,
            tag_words=["volumen", "hipertrofia", "fuerza"]
        )
        
        # PLAN 8: CASA - 4 DÍAS - RECOMPOSICIÓN
        self.create_plan(
            name="Casa - 4 Días - Recomposición",
            description="Recomposición corporal en casa con entrenamientos intensos",
            difficulty="intermediate", goal="body_recomposition", duration_weeks=10,
            days_per_week=4, is_equipment_needed=False,
            tag_words=["recomposición", "transformación", "equilibrado"]
        )
        
        # PLAN 9: GIMNASIO - 5 DÍAS - FUERZA
        self.create_plan(
            name="Gimnasio - 5 Días - Fuerza Máxima",
            description="Desarrollo de fuerza máxima con entrenamiento intenso",
            difficulty="advanced", goal="strength_building", duration_weeks=8,
            days_per_week=5, is_equipment_needed=True,
            tag_words=["fuerza", "potencia", "avanzado"]
        )
        
        # PLAN 10: CASA - 5 DÍAS - CARDIO
        self.create_plan(
            name="Casa - 5 Días - Cardio Intenso",
            description="Plan intenso de cardio para máxima quema de grasa",
            difficulty="intermediate", goal="weight_loss", duration_weeks=6,
            days_per_week=5, is_equipment_needed=False,
            tag_words=["cardio", "intenso", "quema-total"]
        )
        
        # PLAN 11: 1 DÍA - MANTENIMIENTO
        self.create_plan(
            name="1 Día - Mantenimiento Total",
            description="Un solo día para mantener tu forma física",
            difficulty="beginner", goal="general_fitness", duration_weeks=4,
            days_per_week=1, is_equipment_needed=False,
            tag_words=["mantenimiento", "minimalista", "entreno-completo"]
        )
        
        # PLAN 12: GIMNASIO - 6 DÍAS - DIVISIÓN DOBLE
        self.create_plan(
            name="Gimnasio - 6 Días - Doble División",
            description="Entrenamiento de 6 días con división doble para máxima intensidad",
            difficulty="advanced", goal="muscle_gain", duration_weeks=10,
            days_per_week=6, is_equipment_needed=True,
            tag_words=["extremo", "doble-division", "volumen-máximo"]
        )
        
        # PLAN 13: CASA - 6 DÍAS - HIIT
        self.create_plan(
            name="Casa - 6 Días - HIIT",
            description="Entrenamientos HIIT intensos sin equipamiento",
            difficulty="advanced", goal="weight_loss", duration_weeks=8,
            days_per_week=6, is_equipment_needed=False,
            tag_words=["hiit", "intenso", "casa", "quema"]
        )
        
        # PLAN 14: PRINCIPIANTE CON EQUIPAMIENTO MÍNIMO
        self.create_plan(
            name="Principiante - Equipamiento Mínimo",
            description="Usa solo bandas de resistencia y mancuernas ligeras",
            difficulty="beginner", goal="general_fitness", duration_weeks=8,
            days_per_week=3, is_equipment_needed=True,
            tag_words=["principiante", "bandas", "mancuernas", "mínimo"]
        )
        
        # PLAN 15: AVANZADO DOMINADAS
        self.create_plan(
            name="Avanzado - Solo Peso Corporal",
            description="Plan extremo usando solo tu cuerpo y barras de dominadas",
            difficulty="advanced", goal="strength_building", duration_weeks=12,
            days_per_week=5, is_equipment_needed=False,
            tag_words=["calistenia", "peso-corporal", "avanzado", "fuerza"]
        )
        
        self.stdout.write(self.style.SUCCESS(f'\n✓ Total de planes: {WorkoutPlanTemplate.objects.count()}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Total de días: {WorkoutPlanDay.objects.count()}'))
        self.stdout.write(self.style.SUCCESS(f'✓ Total de ejercicios en planes: {WorkoutPlanExercise.objects.count()}'))
    
    def create_plan(self, name, description, difficulty, goal, duration_weeks, 
                     days_per_week, is_equipment_needed, tag_words):
        """Método auxiliar para crear planes completos"""
        admin_user = CustomUser.objects.filter(is_superuser=True).first() or CustomUser.objects.first()
        
        plan, created = WorkoutPlanTemplate.objects.get_or_create(
            name=name,
            defaults={
                "description": description,
                "difficulty": difficulty,
                "goal": goal,
                "duration_weeks": duration_weeks,
                "days_per_week": days_per_week,
                "is_active": True,
                "is_public": True,
                "created_by": admin_user,
                "tags": tag_words,
            }
        )
        
        if not created and not plan.days.all().exists():
            # El plan ya existe, no creamos duplicados
            return
        
        if not created:
            return
        
        # Crear días según el número de días por semana
        for day_num in range(1, days_per_week + 1):
            day = WorkoutPlanDay.objects.create(
                plan=plan,
                day_name=f"Día {day_num}",
                day_number=day_num,
                is_rest_day=False,
                notes=f"Día {day_num} del plan {name}",
                order_index=day_num
            )
            
            # Agregar ejercicios según el objetivo y dificultad
            self.add_exercises_to_day(day, difficulty, goal, is_equipment_needed, day_num, days_per_week)
        
        self.stdout.write(self.style.SUCCESS(f'✓ Plan creado: {name}'))
    
    def add_exercises_to_day(self, day, difficulty, goal, is_equipment, day_num, total_days):
        """Agregar ejercicios según las características del día"""
        def get_exercise(name):
            return Exercise.objects.filter(name__icontains=name).first()
        
        exercises_to_add = []
        
        # Determinar qué ejercicios agregar según el día
        if total_days == 1:
            # Plan de 1 día - entrenamiento completo del cuerpo
            exercises_to_add = [
                ("Sentadillas", 4, "15", 90),
                ("Flexiones", 4, "12", 90),
                ("Remo con Mancuernas", 3, "12", 90),
                ("Press Militar", 3, "12", 90),
                ("Plancha", 3, "45 segundos", 60),
            ]
        elif total_days == 2:
            # Plan de 2 días
            if day.day_number == 1:
                exercises_to_add = [
                    ("Sentadillas", 4, "20", 60),
                    ("Zancadas", 3, "15 por pierna", 60),
                    ("Burpees", 4, "10", 120),
                    ("Mountain Climbers", 3, "20 por lado", 60),
                ]
            else:  # day 2
                exercises_to_add = [
                    ("Flexiones", 4, "15", 90),
                    ("Flexiones Declinadas", 3, "12", 90),
                    ("Plancha", 3, "45 segundos", 60),
                    ("Russian Twist", 3, "20", 45),
                ]
        elif total_days == 3:
            # Plan de 3 días - Push/Pull/Legs simple
            if day.day_number in [1, 4]:  # Push
                exercises_to_add = [
                    ("Press de Banca" if is_equipment else "Flexiones", 4, "12", 90),
                    ("Press Inclinado" if is_equipment else "Flexiones Inclinadas", 3, "12", 90),
                    ("Fondos en Paralelas" if is_equipment else "Dips en Banco", 3, "10", 90),
                    ("Plancha", 3, "30 segundos", 60),
                ]
            elif day.day_number in [2, 5]:  # Pull
                exercises_to_add = [
                    ("Dominadas" if is_equipment else "Dominadas", 4, "8", 120),
                    ("Remo con Barra" if is_equipment else "Remo con Mancuernas", 4, "12", 90),
                    ("Curl con Barra" if is_equipment else "Curl con Mancuernas", 3, "12", 60),
                    ("Plancha Lateral", 3, "30 segundos por lado", 60),
                ]
            else:  # Legs
                exercises_to_add = [
                    ("Sentadillas con Barra" if is_equipment else "Sentadillas", 5, "15", 120),
                    ("Peso Muerto" if is_equipment else "Peso Muerto Rumano", 4, "10", 120),
                    ("Prensa de Piernas" if is_equipment else "Zancadas", 3, "15 por pierna", 90),
                    ("Elevación de Talones", 4, "20", 60),
                ]
        elif total_days == 4:
            # Push, Pull, Legs, Core
            if day.day_number == 1:  # Push
                exercises_to_add = [
                    ("Press de Banca" if is_equipment else "Flexiones", 5, "8", 120),
                    ("Press Inclinado" if is_equipment else "Flexiones Inclinadas", 4, "10", 120),
                    ("Fondos en Paralelas", 3, "10", 90),
                    ("Extensiones de Tríceps", 3, "12", 60),
                ]
            elif day.day_number == 2:  # Pull
                exercises_to_add = [
                    ("Peso Muerto", 5, "5", 180),
                    ("Dominadas", 4, "8", 120),
                    ("Remo con Barra" if is_equipment else "Remo con Mancuernas", 4, "10", 90),
                    ("Curl con Barra" if is_equipment else "Curl con Mancuernas", 3, "10", 60),
                ]
            elif day.day_number == 3:  # Legs
                exercises_to_add = [
                    ("Sentadillas con Barra" if is_equipment else "Sentadillas", 5, "8", 180),
                    ("Peso Muerto Rumano", 4, "8", 120),
                    ("Prensa de Piernas" if is_equipment else "Zancadas Andando", 4, "12", 90),
                    ("Extensiones de Cuádriceps", 3, "12", 60),
                    ("Elevación de Gemelos de Pie", 4, "15", 60),
                ]
            else:  # Core
                exercises_to_add = [
                    ("Plancha", 3, "60 segundos", 90),
                    ("Mountain Climbers", 4, "15 por lado", 60),
                    ("Russian Twist", 3, "20", 45),
                    ("V-Ups", 3, "15", 45),
                    ("Elevación de Piernas", 3, "15", 45),
                ]
        elif total_days == 5:
            # Push, Pull, Legs, Push, Pull
            if day.day_number in [1, 4]:  # Push
                exercises_to_add = [
                    ("Press de Banca", 5, "5", 180) if is_equipment else ("Flexiones", 5, "12", 120),
                    ("Press Inclinado", 4, "8", 150) if is_equipment else ("Flexiones Inclinadas", 4, "10", 90),
                    ("Press Militar", 4, "8", 120),
                    ("Extensiones de Tríceps", 3, "12", 60),
                ]
            elif day.day_number in [2, 5]:  # Pull
                exercises_to_add = [
                    ("Peso Muerto", 5, "5", 240) if is_equipment else ("Peso Muerto Rumano", 5, "8", 120),
                    ("Dominadas", 5, "8", 180),
                    ("Remo con Barra", 4, "8", 120) if is_equipment else ("Remo con Mancuernas", 4, "10", 90),
                    ("Curl con Barra", 4, "10", 60),
                ]
            else:  # Legs
                exercises_to_add = [
                    ("Sentadillas con Barra", 6, "6", 240) if is_equipment else ("Sentadillas", 5, "15", 120),
                    ("Sentadillas Frontales", 4, "8", 180) if is_equipment else ("Zancadas", 4, "12 por pierna", 90),
                    ("Peso Muerto Rumano", 4, "8", 150),
                    ("Prensa de Piernas", 4, "10", 90) if is_equipment else ("Sentadilla Búlgara", 3, "12", 60),
                    ("Elevación de Gemelos de Pie", 4, "15", 60),
                ]
        elif total_days == 6:
            # Todos los días excepto el 7
            if goal == "weight_loss":
                # Cardio/HIIT intenso
                exercises_to_add = [
                    ("Burpees", 5, "15", 120),
                    ("Jump Squats", 4, "15", 90),
                    ("Mountain Climbers", 4, "20 por lado", 60),
                    ("High Knees", 4, "30 segundos", 60),
                    ("Jumping Jacks", 3, "30 segundos", 45),
                ]
            else:
                # Entrenamiento normal
                if day.day_number <= 3:
                    # Primeros 3 días normales
                    exercises_to_add = [
                        ("Press de Banca" if is_equipment else "Flexiones", 4, "10", 120),
                        ("Remo con Barra" if is_equipment else "Remo con Mancuernas", 4, "10", 90),
                        ("Sentadillas con Barra" if is_equipment else "Sentadillas", 5, "12", 120),
                    ]
                else:
                    # Días 4-6 más intensos
                    exercises_to_add = [
                        ("Press Militar", 4, "8", 120),
                        ("Dominadas", 5, "8", 180),
                        ("Peso Muerto", 4, "6", 240) if is_equipment else ("Peso Muerto Rumano", 4, "10", 120),
                    ]
        
        # Agregar los ejercicios
        for i, (ex_name, sets, reps, rest) in enumerate(exercises_to_add):
            ex = get_exercise(ex_name)
            if ex:
                WorkoutPlanExercise.objects.create(
                    workout_day=day,
                    exercise=ex,
                    sets=sets,
                    reps=reps,
                    rest_time=rest,
                    notes=f"Día {day.day_number} - {ex.name}",
                    order_index=i+1
                )

