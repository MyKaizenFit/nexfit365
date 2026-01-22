"""
Script para poblar la base de datos con ejercicios y planes de entrenamiento
Ejecutar con: python manage.py shell < populate_exercises_and_workouts.py
O directamente: python populate_exercises_and_workouts.py
"""

import os
import django

# Configurar Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from workouts.models import Exercise, WorkoutPlanTemplate, WorkoutPlanDay, WorkoutPlanExercise
from accounts.models import CustomUser

def create_exercises():
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
        
        # EJERCICIOS DE ESPALDA
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
        {"name": "Remo en T", "category": "strength", "muscle_groups": ["lats", "middle_back"], 
         "instructions": "Sujeta una barra T y tira hacia el pecho con un movimiento controlado."},
        {"name": "Pullovers", "category": "strength", "muscle_groups": ["lats", "chest"], 
         "instructions": "Acostado en el banco, lleva la mancuerna desde detrás de la cabeza hasta sobre el pecho."},
        {"name": "Hiperextensiones", "category": "bodyweight", "muscle_groups": ["lower_back"], 
         "instructions": "Acostado boca abajo, eleva el torso arqueando la espalda."},
        {"name": "Encogimiento de Hombros", "category": "strength", "muscle_groups": ["traps"], 
         "instructions": "De pie con mancuernas, encoge los hombros hacia arriba."},
        {"name": "Remo Unilateral con Cable", "category": "strength", "muscle_groups": ["lats", "biceps"], 
         "instructions": "De pie, tira del cable con un brazo hacia el torso."},
        
        # EJERCICIOS DE PIERNAS
        {"name": "Sentadillas", "category": "strength", "muscle_groups": ["quads", "glutes", "calves"], 
         "instructions": "De pie con los pies a la altura de los hombros, baja como si te sentaras hasta que los muslos estén paralelos al suelo."},
        {"name": "Sentadillas con Barra", "category": "strength", "muscle_groups": ["quads", "glutes", "calves"], 
         "instructions": "Con la barra sobre los hombros, realiza sentadillas con peso adicional."},
        {"name": "Sentadillas Frontales", "category": "strength", "muscle_groups": ["quads", "core"], 
         "instructions": "Con la barra en la parte delantera de los hombros, realiza sentadillas."},
        {"name": "Peso Muerto", "category": "strength", "muscle_groups": ["hamstrings", "glutes", "lower_back"], 
         "instructions": "Con la barra en el suelo, agarra y levántala manteniendo la espalda recta hasta estar de pie."},
        {"name": "Peso Muerto Rumano", "category": "strength", "muscle_groups": ["hamstrings", "glutes"], 
         "instructions": "Con la barra en las manos, inclínate hacia adelante manteniendo las piernas rectas."},
        {"name": "Zancadas", "category": "strength", "muscle_groups": ["quads", "glutes"], 
         "instructions": "Da un paso adelante y baja hasta que ambas rodillas estén en 90 grados."},
        {"name": "Zancadas Andando", "category": "bodyweight", "muscle_groups": ["quads", "glutes"], 
         "instructions": "Alterna zancadas mientras caminas, manteniendo el torso erguido."},
        {"name": "Prensa de Piernas", "category": "strength", "muscle_groups": ["quads", "glutes"], 
         "instructions": "Sentado en la prensa, empuja el peso con las piernas."},
        {"name": "Extensiones de Cuádriceps", "category": "strength", "muscle_groups": ["quads"], 
         "instructions": "Sentado en la máquina, extiende las piernas levantando el peso."},
        {"name": "Curl de Femorales", "category": "strength", "muscle_groups": ["hamstrings"], 
         "instructions": "Boca abajo en la máquina, flexiona las piernas llevando el peso hacia los glúteos."},
        {"name": "Elevación de Talones", "category": "strength", "muscle_groups": ["calves"], 
         "instructions": "De pie con peso, eleva los talones presionando sobre los dedos de los pies."},
        {"name": "Sentadilla Búlgara", "category": "strength", "muscle_groups": ["quads", "glutes"], 
         "instructions": "Con un pie elevado atrás, realiza sentadillas con la pierna delantera."},
        {"name": "Step Ups", "category": "bodyweight", "muscle_groups": ["quads", "glutes"], 
         "instructions": "Sube a un banco con un pie y luego el otro, alternando piernas."},
        {"name": "Sentadilla Sumo", "category": "strength", "muscle_groups": ["quads", "glutes", "adductors"], 
         "instructions": "Con los pies más separados y apuntando hacia afuera, realiza sentadillas."},
        
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
        {"name": "Hugas Arnold", "category": "strength", "muscle_groups": ["shoulders"], 
         "instructions": "Comienza con mancuernas en el pecho, gira y presiona hacia arriba como si abrazaras."},
        {"name": "Paseo del Granjero", "category": "strength", "muscle_groups": ["shoulders", "core", "traps"], 
         "instructions": "Camina sosteniendo pesos pesados a los lados para fortalecer hombros y core."},
        
        # EJERCICIOS DE BÍCEPS
        {"name": "Curl con Barra", "category": "strength", "muscle_groups": ["biceps"], 
         "instructions": "De pie con barra, flexiona los brazos llevando la barra hacia el pecho."},
        {"name": "Curl con Mancuernas", "category": "strength", "muscle_groups": ["biceps"], 
         "instructions": "Con mancuernas en cada mano, flexiona los brazos alternando o simultáneamente."},
        {"name": "Curl Martillo", "category": "strength", "muscle_groups": ["biceps", "brachialis"], 
         "instructions": "Con mancuernas en posición neutral (como martillos), flexiona los brazos."},
        {"name": "Curl en Banco Scott", "category": "strength", "muscle_groups": ["biceps"], 
         "instructions": "Apoyado en el banco Scott, realiza curls aislando el bíceps."},
        {"name": "Curl Concentrado", "category": "strength", "muscle_groups": ["biceps"], 
         "instructions": "Sentado, apoya el codo en la pierna y realiza curls de forma concentrada."},
        {"name": "Curl con Cable", "category": "strength", "muscle_groups": ["biceps"], 
         "instructions": "De pie con cable, realiza curls manteniendo la tensión constante."},
        
        # EJERCICIOS DE TRÍCEPS
        {"name": "Fondos en Paralelas", "category": "bodyweight", "muscle_groups": ["triceps", "chest"], 
         "instructions": "Suspéndete en barras paralelas, baja flexionando los brazos y empuja hacia arriba."},
        {"name": "Extensiones de Tríceps", "category": "strength", "muscle_groups": ["triceps"], 
         "instructions": "Con mancuerna o barra detrás de la cabeza, extiende los brazos presionando hacia arriba."},
        {"name": "Press Francés", "category": "strength", "muscle_groups": ["triceps"], 
         "instructions": "Acostado en el banco, baja la barra hacia la frente y presiona hacia arriba."},
        {"name": "Patadas de Tríceps", "category": "strength", "muscle_groups": ["triceps"], 
         "instructions": "Inclinado, flexiona el brazo hacia atrás como si dieras patadas."},
        {"name": "Empujes con Cable", "category": "strength", "muscle_groups": ["triceps"], 
         "instructions": "Con cable desde arriba, presiona hacia abajo extendiendo los brazos completamente."},
        {"name": "Dips en Banco", "category": "bodyweight", "muscle_groups": ["triceps", "shoulders"], 
         "instructions": "Con las manos en el banco detrás de ti, baja el cuerpo flexionando los brazos."},
        
        # EJERCICIOS DE CORE
        {"name": "Plancha", "category": "bodyweight", "muscle_groups": ["core"], 
         "instructions": "En posición de flexión pero apoyado en antebrazos, mantén el cuerpo recto."},
        {"name": "Plancha Lateral", "category": "bodyweight", "muscle_groups": ["core", "obliques"], 
         "instructions": "De lado, apoya el antebrazo y mantén el cuerpo recto lateralmente."},
        {"name": "Abdominales", "category": "bodyweight", "muscle_groups": ["abs"], 
         "instructions": "Acostado boca arriba, eleva el torso hacia las rodillas."},
        {"name": "Crunches", "category": "bodyweight", "muscle_groups": ["abs"], 
         "instructions": "Acostado, eleva solo los hombros del suelo, sin levantar toda la espalda."},
        {"name": "Levantamiento de Piernas", "category": "bodyweight", "muscle_groups": ["abs", "hip_flexors"], 
         "instructions": "Acostado, levanta las piernas rectas hasta 90 grados."},
        {"name": "Mountain Climbers", "category": "bodyweight", "muscle_groups": ["core", "shoulders"], 
         "instructions": "En posición de plancha, alterna llevando las rodillas al pecho rápidamente."},
        {"name": "Escaladores", "category": "bodyweight", "muscle_groups": ["core", "shoulders"], 
         "instructions": "Similar a mountain climbers pero de lado, cruzando las piernas."},
        {"name": "Toque de Talón", "category": "bodyweight", "muscle_groups": ["abs", "obliques"], 
         "instructions": "Acostado, toca alternativamente los talones con las manos."},
        {"name": "Russian Twist", "category": "bodyweight", "muscle_groups": ["abs", "obliques"], 
         "instructions": "Sentado, rota el torso de lado a lado con o sin peso."},
        {"name": "V-Ups", "category": "bodyweight", "muscle_groups": ["abs"], 
         "instructions": "Acostado, eleva torso y piernas simultáneamente para formar una V."},
        {"name": "Hollow Body Hold", "category": "bodyweight", "muscle_groups": ["core"], 
         "instructions": "Acostado, levanta piernas y torso creando un 'hueco' con el cuerpo."},
        {"name": "Dragon Flag", "category": "bodyweight", "muscle_groups": ["abs", "core"], 
         "instructions": "Sujetándote en un banco, mantén el cuerpo recto y horizontal."},
        
        # EJERCICIOS DE CARDIO
        {"name": "Burpees", "category": "cardio", "muscle_groups": ["full_body"], 
         "instructions": "Combinación de sentadilla, flexión, salto y elevación de brazos."},
        {"name": "Jumping Jacks", "category": "cardio", "muscle_groups": ["full_body"], 
         "instructions": "Salta abriendo piernas y levantando brazos por encima de la cabeza."},
        {"name": "Correr en el Lugar", "category": "cardio", "muscle_groups": ["legs", "cardio"], 
         "instructions": "Simula correr levantando las rodillas alternativamente."},
        {"name": "Jump Squats", "category": "cardio", "muscle_groups": ["quads", "glutes"], 
         "instructions": "Haz una sentadilla y salta lo más alto que puedas al subir."},
        {"name": "High Knees", "category": "cardio", "muscle_groups": ["legs", "cardio"], 
         "instructions": "Corre en el lugar elevando las rodillas lo más alto posible."},
        {"name": "Butt Kicks", "category": "cardio", "muscle_groups": ["hamstrings"], 
         "instructions": "Corre en el lugar intentando tocar los glúteos con los talones."},
        {"name": "Skip A", "category": "cardio", "muscle_groups": ["legs"], 
         "instructions": "Corre exagerando el movimiento de las rodillas y brazos."},
        {"name": "Crab Walk", "category": "bodyweight", "muscle_groups": ["shoulders", "core", "glutes"], 
         "instructions": "En cuadrupedia invertida (boca arriba), camina con manos y pies."},
        
        # EJERCICIOS FUNCIONALES
        {"name": "Kettlebell Swings", "category": "functional", "muscle_groups": ["glutes", "hamstrings", "core"], 
         "instructions": "Con kettlebell entre las piernas, balancéala hacia arriba usando las caderas."},
        {"name": "Paseo del Cangrejo", "category": "bodyweight", "muscle_groups": ["shoulders", "core", "glutes"], 
         "instructions": "Sentado, camina con las manos y pies elevando las caderas."},
        {"name": "Bear Crawl", "category": "bodyweight", "muscle_groups": ["full_body"], 
         "instructions": "En cuadrupedia, camina con manos y pies sin tocar las rodillas."},
        {"name": "Turkish Get-up", "category": "functional", "muscle_groups": ["full_body"], 
         "instructions": "Complejo movimiento de tumbado a de pie manteniendo peso arriba."},
        {"name": "Sled Push", "category": "functional", "muscle_groups": ["legs", "shoulders"], 
         "instructions": "Empuja un trineo cargado con todo el cuerpo."},
        
        # EJERCICIOS DE PANTORRILLA
        {"name": "Elevación de Gemelos de Pie", "category": "strength", "muscle_groups": ["calves"], 
         "instructions": "De pie, eleva los talones presionando sobre los dedos de los pies."},
        {"name": "Elevación de Gemelos Sentado", "category": "strength", "muscle_groups": ["calves"], 
         "instructions": "Sentado con peso en las rodillas, eleva los talones."},
        {"name": "Elevación de Gemelos Unilateral", "category": "strength", "muscle_groups": ["calves"], 
         "instructions": "Realiza elevaciones de gemelos con una sola pierna para mayor intensidad."},
        
        # EJERCICIOS DE ESTIRAMIENTO/MOBILIDAD
        {"name": "Estiramiento de Cuádriceps", "category": "stretch", "muscle_groups": ["quads"], 
         "instructions": "De pie, flexiona la rodilla llevando el talón al glúteo."},
        {"name": "Estiramiento de Isquiotibiales", "category": "stretch", "muscle_groups": ["hamstrings"], 
         "instructions": "Sentado con piernas rectas, inclínate hacia adelante desde la cadera."},
        {"name": "Estiramiento de Glúteo", "category": "stretch", "muscle_groups": ["glutes"], 
         "instructions": "Acostado boca arriba, cruza el tobillo sobre la rodilla opuesta y tira."},
        {"name": "Gato-Vaca", "category": "stretch", "muscle_groups": ["back", "core"], 
         "instructions": "En cuadrupedia, arquea la espalda hacia arriba y luego hacia abajo."},
        {"name": "Rotación de Columna", "category": "stretch", "muscle_groups": ["back", "core"], 
         "instructions": "Sentado o acostado, rota la columna suavemente de lado a lado."},
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
    
    return Exercise.objects.all()


def create_workout_plans(exercises):
    """Crear planes de entrenamiento completos"""
    
    # Obtener o crear usuario admin
    admin_user = CustomUser.objects.filter(is_superuser=True).first()
    if not admin_user:
        admin_user = CustomUser.objects.first()
        if not admin_user:
            return
    
    def get_exercise(name):
        return Exercise.objects.filter(name__icontains=name).first()
    
    # === PLAN 1: ENTRENAMIENTO PARA PRINCIPIANTES (3 días/semana) ===
    plan1, _ = WorkoutPlanTemplate.objects.get_or_create(
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
    
    if not plan1.days.all().exists():
        # Día 1 - Tren Superior
        day1 = WorkoutPlanDay.objects.create(
            plan=plan1,
            day_name="Día 1 - Tren Superior",
            day_number=1,
            is_rest_day=False,
            notes="Trabajo completo de tren superior",
            order_index=1
        )
        
        exercises_day1 = [
            (get_exercise("Flexiones"), 3, "10", "", 0, 60),
            (get_exercise("Remo con Mancuernas"), 3, "12", "", 0, 60),
            (get_exercise("Plancha"), 1, "30 segundos", "", 30, 60),
            (get_exercise("Curl con Mancuernas"), 3, "10", "", 0, 60),
        ]
        
        for i, (ex, sets, reps, weight, duration, rest) in enumerate(exercises_day1):
            if ex:
                WorkoutPlanExercise.objects.create(
                    workout_day=day1,
                    exercise=ex,
                    sets=sets,
                    reps=reps,
                    weight=weight,
                    duration=duration,
                    rest_time=rest,
                    notes=f"{ex.name} para principiantes",
                    order_index=i+1
                )
        
        # Día 2 - Descanso
        WorkoutPlanDay.objects.create(
            plan=plan1,
            day_name="Día 2 - Descanso",
            day_number=2,
            is_rest_day=True,
            notes="Día de descanso activo - caminar 30 minutos",
            order_index=2
        )
        
        # Día 3 - Piernas
        day3 = WorkoutPlanDay.objects.create(
            plan=plan1,
            day_name="Día 3 - Tren Inferior",
            day_number=3,
            is_rest_day=False,
            notes="Trabajo de piernas y glúteos",
            order_index=3
        )
        
        exercises_day3 = [
            (get_exercise("Sentadillas"), 3, "15", "", 0, 90),
            (get_exercise("Zancadas"), 3, "12 por pierna", "", 0, 60),
            (get_exercise("Elevación de Talones"), 3, "15", "", 0, 45),
            (get_exercise("Plancha"), 1, "30 segundos", "", 30, 60),
        ]
        
        for i, (ex, sets, reps, weight, duration, rest) in enumerate(exercises_day3):
            if ex:
                WorkoutPlanExercise.objects.create(
                    workout_day=day3,
                    exercise=ex,
                    sets=sets,
                    reps=reps,
                    weight=weight,
                    duration=duration,
                    rest_time=rest,
                    notes=f"{ex.name} para principiantes",
                    order_index=i+1
                )
    
    
    # === PLAN 2: ENTRENAMIENTO INTERMEDIO (4 días/semana) ===
    plan2, _ = WorkoutPlanTemplate.objects.get_or_create(
        name="Plan Intermedio - Volumen Completo",
        defaults={
            "description": "Plan de 4 días para intermedios enfocado en crecimiento muscular",
            "difficulty": "intermediate",
            "goal": "muscle_gain",
            "duration_weeks": 6,
            "days_per_week": 4,
            "is_active": True,
            "is_public": True,
            "created_by": admin_user,
            "tags": ["intermedio", "hipertrofia", "volumen"]
        }
    )
    
    if not plan2.days.all().exists():
        # Día 1 - Pecho y Tríceps
        day1 = WorkoutPlanDay.objects.create(
            plan=plan2,
            day_name="Día 1 - Pecho y Tríceps",
            day_number=1,
            is_rest_day=False,
            notes="Trabajo enfocado en pecho y tríceps",
            order_index=1
        )
        
        exercises_day1 = [
            (get_exercise("Press de Banca"), 4, "8-10", "", 0, 120),
            (get_exercise("Press Inclinado"), 3, "10-12", "", 0, 90),
            (get_exercise("Aperturas con Mancuernas"), 3, "12", "", 0, 60),
            (get_exercise("Fondos en Paralelas"), 3, "10", "", 0, 90),
            (get_exercise("Extensiones de Tríceps"), 3, "12", "", 0, 60),
        ]
        
        for i, (ex, sets, reps, weight, duration, rest) in enumerate(exercises_day1):
            if ex:
                WorkoutPlanExercise.objects.create(
                    workout_day=day1,
                    exercise=ex,
                    sets=sets,
                    reps=reps,
                    weight=weight,
                    duration=duration,
                    rest_time=rest,
                    notes=f"{ex.name} intermedio",
                    order_index=i+1
                )
        
        # Día 2 - Espalda y Bíceps
        day2 = WorkoutPlanDay.objects.create(
            plan=plan2,
            day_name="Día 2 - Espalda y Bíceps",
            day_number=2,
            is_rest_day=False,
            notes="Enfoque en espalda ancha y bíceps",
            order_index=2
        )
        
        exercises_day2 = [
            (get_exercise("Dominadas"), 4, "8-10", "", 0, 120),
            (get_exercise("Remo con Barra"), 4, "10-12", "", 0, 90),
            (get_exercise("Jalones al Pecho"), 3, "12", "", 0, 60),
            (get_exercise("Curl con Barra"), 3, "10", "", 0, 60),
            (get_exercise("Curl Martillo"), 3, "12", "", 0, 60),
        ]
        
        for i, (ex, sets, reps, weight, duration, rest) in enumerate(exercises_day2):
            if ex:
                WorkoutPlanExercise.objects.create(
                    workout_day=day2,
                    exercise=ex,
                    sets=sets,
                    reps=reps,
                    weight=weight,
                    duration=duration,
                    rest_time=rest,
                    notes=f"{ex.name} intermedio",
                    order_index=i+1
                )
        
        # Día 3 - Piernas
        day3 = WorkoutPlanDay.objects.create(
            plan=plan2,
            day_name="Día 3 - Piernas Completo",
            day_number=3,
            is_rest_day=False,
            notes="Trabajo exhaustivo de piernas",
            order_index=3
        )
        
        exercises_day3 = [
            (get_exercise("Sentadillas con Barra"), 5, "8-10", "", 0, 180),
            (get_exercise("Peso Muerto"), 4, "6-8", "", 0, 180),
            (get_exercise("Prensa de Piernas"), 4, "12-15", "", 0, 120),
            (get_exercise("Zancadas con Barra"), 3, "10 por pierna", "", 0, 90),
            (get_exercise("Elevación de Gemelos de Pie"), 4, "15-20", "", 0, 60),
        ]
        
        for i, (ex, sets, reps, weight, duration, rest) in enumerate(exercises_day3):
            if ex:
                WorkoutPlanExercise.objects.create(
                    workout_day=day3,
                    exercise=ex,
                    sets=sets,
                    reps=reps,
                    weight=weight,
                    duration=duration,
                    rest_time=rest,
                    notes=f"{ex.name} intermedio",
                    order_index=i+1
                )
        
        # Día 4 - Hombros y Core
        day4 = WorkoutPlanDay.objects.create(
            plan=plan2,
            day_name="Día 4 - Hombros y Core",
            day_number=4,
            is_rest_day=False,
            notes="Desarrollo de hombros y core",
            order_index=4
        )
        
        exercises_day4 = [
            (get_exercise("Press Militar"), 4, "8-10", "", 0, 120),
            (get_exercise("Elevaciones Laterales"), 3, "12", "", 0, 60),
            (get_exercise("Vuelos Posteriores"), 3, "12", "", 0, 60),
            (get_exercise("Plancha"), 3, "45 segundos", "", 45, 60),
            (get_exercise("Russian Twist"), 3, "20", "", 0, 30),
            (get_exercise("Mountain Climbers"), 3, "15 por lado", "", 0, 30),
        ]
        
        for i, (ex, sets, reps, weight, duration, rest) in enumerate(exercises_day4):
            if ex:
                WorkoutPlanExercise.objects.create(
                    workout_day=day4,
                    exercise=ex,
                    sets=sets,
                    reps=reps,
                    weight=weight,
                    duration=duration,
                    rest_time=rest,
                    notes=f"{ex.name} intermedio",
                    order_index=i+1
                )
    
    
    # === PLAN 3: PLAN AVANZADO (5 días/semana) ===
    plan3, _ = WorkoutPlanTemplate.objects.get_or_create(
        name="Plan Avanzado - Push Pull Legs",
        defaults={
            "description": "Plan avanzado Push-Pull-Legs para atletas experimentados",
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
    
    if not plan3.days.all().exists():
        # Push Day 1 - Pecho, Hombros, Tríceps
        day1 = WorkoutPlanDay.objects.create(
            plan=plan3,
            day_name="Push Day 1",
            day_number=1,
            is_rest_day=False,
            notes="Día de empuje - pecho enfocado",
            order_index=1
        )
        
        exercises_day1 = [
            (get_exercise("Press de Banca"), 5, "5", "", 0, 180),
            (get_exercise("Press Inclinado"), 4, "8", "", 0, 150),
            (get_exercise("Press Declinado"), 3, "10", "", 0, 120),
            (get_exercise("Press Militar"), 4, "8", "", 0, 120),
            (get_exercise("Extensiones de Tríceps"), 3, "12", "", 0, 90),
        ]
        
        for i, (ex, sets, reps, weight, duration, rest) in enumerate(exercises_day1):
            if ex:
                WorkoutPlanExercise.objects.create(
                    workout_day=day1,
                    exercise=ex,
                    sets=sets,
                    reps=reps,
                    weight=weight,
                    duration=duration,
                    rest_time=rest,
                    notes=f"{ex.name} avanzado",
                    order_index=i+1
                )
        
        # Pull Day 2 - Espalda, Bíceps
        day2 = WorkoutPlanDay.objects.create(
            plan=plan3,
            day_name="Pull Day 2",
            day_number=2,
            is_rest_day=False,
            notes="Día de tirón - espalda ancha",
            order_index=2
        )
        
        exercises_day2 = [
            (get_exercise("Peso Muerto"), 5, "5", "", 0, 240),
            (get_exercise("Dominadas con Peso"), 4, "8", "", 0, 180),
            (get_exercise("Remo con Barra"), 4, "8", "", 0, 150),
            (get_exercise("Remo con Mancuernas"), 3, "10", "", 0, 120),
            (get_exercise("Curl con Barra"), 4, "10", "", 0, 90),
        ]
        
        for i, (ex, sets, reps, weight, duration, rest) in enumerate(exercises_day2):
            if ex:
                WorkoutPlanExercise.objects.create(
                    workout_day=day2,
                    exercise=ex,
                    sets=sets,
                    reps=reps,
                    weight=weight,
                    duration=duration,
                    rest_time=rest,
                    notes=f"{ex.name} avanzado",
                    order_index=i+1
                )
        
        # Legs Day 3 - Piernas Completo
        day3 = WorkoutPlanDay.objects.create(
            plan=plan3,
            day_name="Legs Day 3",
            day_number=3,
            is_rest_day=False,
            notes="Día de piernas exhaustivo",
            order_index=3
        )
        
        exercises_day3 = [
            (get_exercise("Sentadillas con Barra"), 5, "6", "", 0, 240),
            (get_exercise("Sentadillas Frontales"), 4, "8", "", 0, 180),
            (get_exercise("Peso Muerto Rumano"), 4, "8", "", 0, 180),
            (get_exercise("Prensa de Piernas"), 4, "10", "", 0, 150),
            (get_exercise("Extensiones de Cuádriceps"), 3, "12", "", 0, 90),
            (get_exercise("Elevación de Gemelos de Pie"), 4, "15", "", 0, 60),
        ]
        
        for i, (ex, sets, reps, weight, duration, rest) in enumerate(exercises_day3):
            if ex:
                WorkoutPlanExercise.objects.create(
                    workout_day=day3,
                    exercise=ex,
                    sets=sets,
                    reps=reps,
                    weight=weight,
                    duration=duration,
                    rest_time=rest,
                    notes=f"{ex.name} avanzado",
                    order_index=i+1
                )
        
        # Push Day 4 - Hombros
        day4 = WorkoutPlanDay.objects.create(
            plan=plan3,
            day_name="Push Day 4 - Hombros",
            day_number=4,
            is_rest_day=False,
            notes="Día de empuje - hombros enfocado",
            order_index=4
        )
        
        exercises_day4 = [
            (get_exercise("Press Militar"), 5, "8", "", 0, 150),
            (get_exercise("Press Frontal con Mancuernas"), 4, "10", "", 0, 120),
            (get_exercise("Elevaciones Laterales"), 4, "12", "", 0, 90),
            (get_exercise("Vuelos Posteriores"), 4, "12", "", 0, 90),
            (get_exercise("Elevaciones Frontales"), 3, "15", "", 0, 60),
        ]
        
        for i, (ex, sets, reps, weight, duration, rest) in enumerate(exercises_day4):
            if ex:
                WorkoutPlanExercise.objects.create(
                    workout_day=day4,
                    exercise=ex,
                    sets=sets,
                    reps=reps,
                    weight=weight,
                    duration=duration,
                    rest_time=rest,
                    notes=f"{ex.name} avanzado",
                    order_index=i+1
                )
        
        # Pull Day 5 - Espalda
        day5 = WorkoutPlanDay.objects.create(
            plan=plan3,
            day_name="Pull Day 5 - Espalda",
            day_number=5,
            is_rest_day=False,
            notes="Día de tirón - espalda posterior",
            order_index=5
        )
        
        exercises_day5 = [
            (get_exercise("Dominadas con Peso"), 5, "8", "", 0, 180),
            (get_exercise("Jalones al Pecho"), 4, "10", "", 0, 120),
            (get_exercise("Remo en T"), 4, "10", "", 0, 120),
            (get_exercise("Encogimiento de Hombros"), 4, "12", "", 0, 90),
            (get_exercise("Curl Martillo"), 3, "12", "", 0, 60),
        ]
        
        for i, (ex, sets, reps, weight, duration, rest) in enumerate(exercises_day5):
            if ex:
                WorkoutPlanExercise.objects.create(
                    workout_day=day5,
                    exercise=ex,
                    sets=sets,
                    reps=reps,
                    weight=weight,
                    duration=duration,
                    rest_time=rest,
                    notes=f"{ex.name} avanzado",
                    order_index=i+1
                )
    
    


if __name__ == "__main__":
    
    exercises = create_exercises()
    
    create_workout_plans(exercises)
    



