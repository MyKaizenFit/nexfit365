from django.core.management.base import BaseCommand
from workouts.models import Exercise

class Command(BaseCommand):
    help = 'Poblar la base de datos con ejercicios por defecto'

    def handle(self, *args, **options):
        self.stdout.write('🏋️ Poblando ejercicios por defecto...')
        
        exercises_data = [
            # PECHO
            {
                'name': 'Press de banca',
                'category': 'chest',
                'muscle_groups': ['pectorales', 'tríceps', 'deltoides'],
                'instructions': 'Acuéstate en un banco, baja la barra hasta el pecho y empuja hacia arriba. Mantén los pies firmes en el suelo y la espalda recta.',
                'video_url': '',
                'image_url': ''
            },
            {
                'name': 'Press inclinado con mancuernas',
                'category': 'chest',
                'muscle_groups': ['pectorales superiores', 'deltoides', 'tríceps'],
                'instructions': 'Inclina el banco 30-45 grados, presiona las mancuernas hacia arriba. Controla el movimiento en ambas direcciones.',
                'video_url': '',
                'image_url': ''
            },
            {
                'name': 'Flexiones',
                'category': 'chest',
                'muscle_groups': ['pectorales', 'tríceps', 'deltoides', 'core'],
                'description': 'Ejercicio de peso corporal para el pecho',
                'instructions': 'Mantén el cuerpo recto, baja el pecho al suelo y empuja hacia arriba',
                'difficulty': 'beginner',
                'equipment': 'ninguno'
            },
            {
                'name': 'Aperturas con mancuernas',
                'category': 'chest',
                'muscle_groups': ['pectorales', 'deltoides'],
                'description': 'Ejercicio de aislamiento para el pecho',
                'instructions': 'Acuéstate en banco, abre los brazos en arco y cierra con control',
                'difficulty': 'beginner',
                'equipment': 'mancuernas, banco'
            },
            
            # ESPALDA
            {
                'name': 'Dominadas',
                'category': 'back',
                'muscle_groups': ['dorsales', 'bíceps', 'deltoides posteriores'],
                'description': 'Ejercicio fundamental para el desarrollo de la espalda',
                'instructions': 'Cuelga de una barra, tira del cuerpo hacia arriba hasta que el mentón pase la barra',
                'difficulty': 'intermediate',
                'equipment': 'barra de dominadas'
            },
            {
                'name': 'Remo con barra',
                'category': 'back',
                'muscle_groups': ['dorsales', 'romboides', 'deltoides posteriores', 'bíceps'],
                'description': 'Ejercicio compuesto para la espalda',
                'instructions': 'Inclínate hacia adelante, tira la barra hacia el abdomen',
                'difficulty': 'intermediate',
                'equipment': 'barra, discos'
            },
            {
                'name': 'Jalones al pecho',
                'category': 'back',
                'muscle_groups': ['dorsales', 'bíceps', 'deltoides posteriores'],
                'description': 'Ejercicio de máquina para la espalda',
                'instructions': 'Siéntate en la máquina, tira la barra hacia el pecho',
                'difficulty': 'beginner',
                'equipment': 'máquina de jalones'
            },
            {
                'name': 'Peso muerto',
                'category': 'back',
                'muscle_groups': ['dorsales', 'glúteos', 'isquiotibiales', 'trapecios'],
                'description': 'Ejercicio fundamental para toda la cadena posterior',
                'instructions': 'Levanta la barra del suelo manteniendo la espalda recta',
                'difficulty': 'advanced',
                'equipment': 'barra, discos'
            },
            
            # PIERNAS
            {
                'name': 'Sentadillas',
                'category': 'legs',
                'muscle_groups': ['cuádriceps', 'glúteos', 'isquiotibiales'],
                'description': 'Ejercicio fundamental para las piernas',
                'instructions': 'Baja como si te sentaras en una silla, mantén las rodillas alineadas con los pies',
                'difficulty': 'beginner',
                'equipment': 'ninguno'
            },
            {
                'name': 'Sentadillas con barra',
                'category': 'legs',
                'muscle_groups': ['cuádriceps', 'glúteos', 'isquiotibiales', 'core'],
                'description': 'Sentadillas con peso adicional',
                'instructions': 'Coloca la barra en los trapecios, baja hasta que los muslos estén paralelos al suelo',
                'difficulty': 'intermediate',
                'equipment': 'barra, discos, rack'
            },
            {
                'name': 'Zancadas',
                'category': 'legs',
                'muscle_groups': ['cuádriceps', 'glúteos', 'isquiotibiales'],
                'description': 'Ejercicio unilateral para las piernas',
                'instructions': 'Da un paso largo hacia adelante, baja la rodilla trasera casi al suelo',
                'difficulty': 'beginner',
                'equipment': 'ninguno'
            },
            {
                'name': 'Prensa de piernas',
                'category': 'legs',
                'muscle_groups': ['cuádriceps', 'glúteos', 'isquiotibiales'],
                'description': 'Ejercicio de máquina para las piernas',
                'instructions': 'Siéntate en la máquina, empuja la plataforma con las piernas',
                'difficulty': 'beginner',
                'equipment': 'máquina de prensa'
            },
            
            # HOMBROS
            {
                'name': 'Press militar',
                'category': 'shoulders',
                'muscle_groups': ['deltoides', 'tríceps', 'trapecios'],
                'description': 'Ejercicio fundamental para los hombros',
                'instructions': 'Levanta la barra desde los hombros hasta arriba de la cabeza',
                'difficulty': 'intermediate',
                'equipment': 'barra, discos'
            },
            {
                'name': 'Elevaciones laterales',
                'category': 'shoulders',
                'muscle_groups': ['deltoides laterales'],
                'description': 'Ejercicio de aislamiento para los deltoides laterales',
                'instructions': 'Levanta las mancuernas lateralmente hasta la altura de los hombros',
                'difficulty': 'beginner',
                'equipment': 'mancuernas'
            },
            {
                'name': 'Elevaciones frontales',
                'category': 'shoulders',
                'muscle_groups': ['deltoides frontales'],
                'description': 'Ejercicio de aislamiento para los deltoides frontales',
                'instructions': 'Levanta las mancuernas hacia adelante hasta la altura de los hombros',
                'difficulty': 'beginner',
                'equipment': 'mancuernas'
            },
            
            # BÍCEPS
            {
                'name': 'Curl de bíceps con barra',
                'category': 'arms',
                'muscle_groups': ['bíceps'],
                'description': 'Ejercicio fundamental para los bíceps',
                'instructions': 'Mantén los codos pegados al cuerpo, flexiona los brazos llevando la barra hacia el pecho',
                'difficulty': 'beginner',
                'equipment': 'barra, discos'
            },
            {
                'name': 'Curl de bíceps con mancuernas',
                'category': 'arms',
                'muscle_groups': ['bíceps'],
                'description': 'Curl de bíceps con mancuernas para mayor rango de movimiento',
                'instructions': 'Alterna el movimiento de cada brazo, mantén el control en todo momento',
                'difficulty': 'beginner',
                'equipment': 'mancuernas'
            },
            {
                'name': 'Curl martillo',
                'category': 'arms',
                'muscle_groups': ['bíceps', 'antebrazos'],
                'description': 'Variación del curl que trabaja también los antebrazos',
                'instructions': 'Mantén las mancuernas en posición neutra, flexiona los brazos',
                'difficulty': 'beginner',
                'equipment': 'mancuernas'
            },
            
            # TRÍCEPS
            {
                'name': 'Fondos en paralelas',
                'category': 'arms',
                'muscle_groups': ['tríceps', 'deltoides', 'pectorales'],
                'description': 'Ejercicio de peso corporal para los tríceps',
                'instructions': 'Baja el cuerpo entre las barras paralelas, empuja hacia arriba',
                'difficulty': 'intermediate',
                'equipment': 'barras paralelas'
            },
            {
                'name': 'Press francés',
                'category': 'arms',
                'muscle_groups': ['tríceps'],
                'description': 'Ejercicio de aislamiento para los tríceps',
                'instructions': 'Acuéstate en banco, baja la barra hacia la frente, extiende los brazos',
                'difficulty': 'intermediate',
                'equipment': 'barra, banco'
            },
            {
                'name': 'Extensiones de tríceps con mancuerna',
                'category': 'arms',
                'muscle_groups': ['tríceps'],
                'description': 'Ejercicio de aislamiento para los tríceps con mancuerna',
                'instructions': 'Sostén la mancuerna con ambas manos, extiende los brazos por encima de la cabeza',
                'difficulty': 'beginner',
                'equipment': 'mancuerna'
            },
            
            # CORE
            {
                'name': 'Plancha',
                'category': 'core',
                'muscle_groups': ['abdominales', 'oblicuos', 'deltoides', 'glúteos'],
                'description': 'Ejercicio isométrico para el core',
                'instructions': 'Mantén el cuerpo recto apoyado en antebrazos y puntas de pies',
                'difficulty': 'beginner',
                'equipment': 'ninguno'
            },
            {
                'name': 'Crunches',
                'category': 'core',
                'muscle_groups': ['abdominales'],
                'description': 'Ejercicio básico para los abdominales',
                'instructions': 'Acuéstate boca arriba, levanta los hombros del suelo',
                'difficulty': 'beginner',
                'equipment': 'ninguno'
            },
            {
                'name': 'Mountain climbers',
                'category': 'core',
                'muscle_groups': ['abdominales', 'deltoides', 'glúteos', 'cuádriceps'],
                'description': 'Ejercicio dinámico para el core',
                'instructions': 'En posición de plancha, alterna llevando las rodillas al pecho',
                'difficulty': 'intermediate',
                'equipment': 'ninguno'
            },
            
            # CARDIO
            {
                'name': 'Burpees',
                'category': 'cardio',
                'muscle_groups': ['todo el cuerpo'],
                'description': 'Ejercicio de alta intensidad para cardio',
                'instructions': 'Flexión, salto a sentadilla, salto vertical, repite',
                'difficulty': 'advanced',
                'equipment': 'ninguno'
            },
            {
                'name': 'Jumping jacks',
                'category': 'cardio',
                'muscle_groups': ['todo el cuerpo'],
                'description': 'Ejercicio de cardio básico',
                'instructions': 'Salta abriendo piernas y brazos simultáneamente',
                'difficulty': 'beginner',
                'equipment': 'ninguno'
            },
            {
                'name': 'High knees',
                'category': 'cardio',
                'muscle_groups': ['cuádriceps', 'glúteos', 'core'],
                'description': 'Ejercicio de cardio de alta intensidad',
                'instructions': 'Corre en el lugar llevando las rodillas al pecho',
                'difficulty': 'beginner',
                'equipment': 'ninguno'
            }
        ]
        
        created_count = 0
        updated_count = 0
        
        for exercise_data in exercises_data:
            exercise, created = Exercise.objects.get_or_create(
                name=exercise_data['name'],
                defaults=exercise_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'  ✅ Creado: {exercise.name}')
            else:
                # Actualizar datos si el ejercicio ya existe
                for key, value in exercise_data.items():
                    setattr(exercise, key, value)
                exercise.save()
                updated_count += 1
                self.stdout.write(f'  🔄 Actualizado: {exercise.name}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'🎉 Completado! Creados: {created_count}, Actualizados: {updated_count}'
            )
        )
