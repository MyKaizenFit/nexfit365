from django.core.management.base import BaseCommand
from workouts.models import Exercise

class Command(BaseCommand):
    help = 'Poblar la base de datos con ejercicios por defecto (versión simplificada)'

    def handle(self, *args, **options):
        self.stdout.write('🏋️ Poblando ejercicios por defecto...')
        
        exercises_data = [
            # PECHO
            {
                'name': 'Press de banca',
                'category': 'chest',
                'muscle_groups': ['pectorales', 'tríceps', 'deltoides'],
                'instructions': 'Acuéstate en un banco, baja la barra hasta el pecho y empuja hacia arriba. Mantén los pies firmes en el suelo y la espalda recta.',
            },
            {
                'name': 'Press inclinado con mancuernas',
                'category': 'chest',
                'muscle_groups': ['pectorales superiores', 'deltoides', 'tríceps'],
                'instructions': 'Inclina el banco 30-45 grados, presiona las mancuernas hacia arriba. Controla el movimiento en ambas direcciones.',
            },
            {
                'name': 'Flexiones',
                'category': 'chest',
                'muscle_groups': ['pectorales', 'tríceps', 'deltoides', 'core'],
                'instructions': 'Mantén el cuerpo recto apoyado en manos y puntas de pies. Baja el pecho al suelo y empuja hacia arriba.',
            },
            {
                'name': 'Aperturas con mancuernas',
                'category': 'chest',
                'muscle_groups': ['pectorales', 'deltoides'],
                'instructions': 'Acuéstate en banco, abre los brazos en arco y cierra con control. Mantén una ligera flexión en los codos.',
            },
            
            # ESPALDA
            {
                'name': 'Dominadas',
                'category': 'back',
                'muscle_groups': ['dorsales', 'bíceps', 'deltoides posteriores'],
                'instructions': 'Cuelga de una barra, tira del cuerpo hacia arriba hasta que el mentón pase la barra. Controla el descenso.',
            },
            {
                'name': 'Remo con barra',
                'category': 'back',
                'muscle_groups': ['dorsales', 'romboides', 'deltoides posteriores', 'bíceps'],
                'instructions': 'Inclínate hacia adelante, tira la barra hacia el abdomen. Mantén la espalda recta y los codos cerca del cuerpo.',
            },
            {
                'name': 'Jalones al pecho',
                'category': 'back',
                'muscle_groups': ['dorsales', 'bíceps', 'deltoides posteriores'],
                'instructions': 'Siéntate en la máquina, tira la barra hacia el pecho. Controla el movimiento y mantén el torso recto.',
            },
            {
                'name': 'Peso muerto',
                'category': 'back',
                'muscle_groups': ['dorsales', 'glúteos', 'isquiotibiales', 'trapecios'],
                'instructions': 'Levanta la barra del suelo manteniendo la espalda recta. Extiende caderas y rodillas simultáneamente.',
            },
            
            # PIERNAS
            {
                'name': 'Sentadillas',
                'category': 'legs',
                'muscle_groups': ['cuádriceps', 'glúteos', 'isquiotibiales'],
                'instructions': 'Baja como si te sentaras en una silla, mantén las rodillas alineadas con los pies. Regresa a la posición inicial.',
            },
            {
                'name': 'Sentadillas con barra',
                'category': 'legs',
                'muscle_groups': ['cuádriceps', 'glúteos', 'isquiotibiales', 'core'],
                'instructions': 'Coloca la barra en los trapecios, baja hasta que los muslos estén paralelos al suelo. Mantén el pecho alto.',
            },
            {
                'name': 'Zancadas',
                'category': 'legs',
                'muscle_groups': ['cuádriceps', 'glúteos', 'isquiotibiales'],
                'instructions': 'Da un paso largo hacia adelante, baja la rodilla trasera casi al suelo. Regresa a la posición inicial.',
            },
            {
                'name': 'Prensa de piernas',
                'category': 'legs',
                'muscle_groups': ['cuádriceps', 'glúteos', 'isquiotibiales'],
                'instructions': 'Siéntate en la máquina, empuja la plataforma con las piernas. Controla el movimiento completo.',
            },
            
            # HOMBROS
            {
                'name': 'Press militar',
                'category': 'shoulders',
                'muscle_groups': ['deltoides', 'tríceps', 'trapecios'],
                'instructions': 'Levanta la barra desde los hombros hasta arriba de la cabeza. Mantén el core activo.',
            },
            {
                'name': 'Elevaciones laterales',
                'category': 'shoulders',
                'muscle_groups': ['deltoides laterales'],
                'instructions': 'Levanta las mancuernas lateralmente hasta la altura de los hombros. Controla el descenso.',
            },
            {
                'name': 'Elevaciones frontales',
                'category': 'shoulders',
                'muscle_groups': ['deltoides frontales'],
                'instructions': 'Levanta las mancuernas hacia adelante hasta la altura de los hombros. Mantén los brazos ligeramente flexionados.',
            },
            
            # BÍCEPS
            {
                'name': 'Curl de bíceps con barra',
                'category': 'arms',
                'muscle_groups': ['bíceps'],
                'instructions': 'Mantén los codos pegados al cuerpo, flexiona los brazos llevando la barra hacia el pecho. Controla el descenso.',
            },
            {
                'name': 'Curl de bíceps con mancuernas',
                'category': 'arms',
                'muscle_groups': ['bíceps'],
                'instructions': 'Alterna el movimiento de cada brazo, mantén el control en todo momento. No uses el impulso.',
            },
            {
                'name': 'Curl martillo',
                'category': 'arms',
                'muscle_groups': ['bíceps', 'antebrazos'],
                'instructions': 'Mantén las mancuernas en posición neutra, flexiona los brazos. Trabaja también los antebrazos.',
            },
            
            # TRÍCEPS
            {
                'name': 'Fondos en paralelas',
                'category': 'arms',
                'muscle_groups': ['tríceps', 'deltoides', 'pectorales'],
                'instructions': 'Baja el cuerpo entre las barras paralelas, empuja hacia arriba. Mantén el cuerpo recto.',
            },
            {
                'name': 'Press francés',
                'category': 'arms',
                'muscle_groups': ['tríceps'],
                'instructions': 'Acuéstate en banco, baja la barra hacia la frente, extiende los brazos. Mantén los codos fijos.',
            },
            {
                'name': 'Extensiones de tríceps con mancuerna',
                'category': 'arms',
                'muscle_groups': ['tríceps'],
                'instructions': 'Sostén la mancuerna con ambas manos, extiende los brazos por encima de la cabeza. Controla el movimiento.',
            },
            
            # CORE
            {
                'name': 'Plancha',
                'category': 'core',
                'muscle_groups': ['abdominales', 'oblicuos', 'deltoides', 'glúteos'],
                'instructions': 'Mantén el cuerpo recto apoyado en antebrazos y puntas de pies. No dejes que la cadera se hunda.',
            },
            {
                'name': 'Crunches',
                'category': 'core',
                'muscle_groups': ['abdominales'],
                'instructions': 'Acuéstate boca arriba, levanta los hombros del suelo. Mantén la parte baja de la espalda en el suelo.',
            },
            {
                'name': 'Mountain climbers',
                'category': 'core',
                'muscle_groups': ['abdominales', 'deltoides', 'glúteos', 'cuádriceps'],
                'instructions': 'En posición de plancha, alterna llevando las rodillas al pecho. Mantén el core activo.',
            },
            
            # CARDIO
            {
                'name': 'Burpees',
                'category': 'cardio',
                'muscle_groups': ['todo el cuerpo'],
                'instructions': 'Flexión, salto a sentadilla, salto vertical, repite. Mantén un ritmo constante.',
            },
            {
                'name': 'Jumping jacks',
                'category': 'cardio',
                'muscle_groups': ['todo el cuerpo'],
                'instructions': 'Salta abriendo piernas y brazos simultáneamente. Mantén un ritmo constante.',
            },
            {
                'name': 'High knees',
                'category': 'cardio',
                'muscle_groups': ['cuádriceps', 'glúteos', 'core'],
                'instructions': 'Corre en el lugar llevando las rodillas al pecho. Mantén el torso recto.',
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























