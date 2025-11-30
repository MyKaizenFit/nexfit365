from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from workouts.models import WorkoutPlanTemplate, WorkoutPlanDay, WorkoutPlanExercise, Exercise

User = get_user_model()

class Command(BaseCommand):
    help = 'Crear plantillas de entrenamiento por defecto'

    def handle(self, *args, **options):
        self.stdout.write('🏋️ Creando plantillas de entrenamiento...')
        
        # Obtener o crear usuario admin
        admin_user, created = User.objects.get_or_create(
            email='admin@mykaizenfit.com',
            defaults={
                'first_name': 'Admin',
                'last_name': 'System',
                'is_staff': True,
                'is_superuser': True
            }
        )
        
        templates_data = [
            {
                'name': 'Rutina Principiante - Fuerza Total',
                'description': 'Rutina perfecta para principiantes que quieren ganar fuerza y masa muscular',
                'difficulty': 'beginner',
                'goal': 'strength_building',
                'duration_weeks': 8,
                'days_per_week': 3,
                'is_active': True,
                'is_public': True,
                'tags': ['principiante', 'fuerza', 'musculación'],
                'days': [
                    {
                        'day_name': 'Día 1 - Tren Superior',
                        'day_number': 1,
                        'is_rest_day': False,
                        'notes': 'Enfocado en pecho, espalda y brazos',
                        'exercises': [
                            {'exercise_name': 'Press de banca', 'sets': 3, 'reps': '8-10', 'rest_time': 90},
                            {'exercise_name': 'Remo con barra', 'sets': 3, 'reps': '8-10', 'rest_time': 90},
                            {'exercise_name': 'Press inclinado con mancuernas', 'sets': 3, 'reps': '10-12', 'rest_time': 60},
                            {'exercise_name': 'Jalones al pecho', 'sets': 3, 'reps': '10-12', 'rest_time': 60},
                            {'exercise_name': 'Curl de bíceps con barra', 'sets': 3, 'reps': '12-15', 'rest_time': 45},
                            {'exercise_name': 'Press francés', 'sets': 3, 'reps': '12-15', 'rest_time': 45},
                        ]
                    },
                    {
                        'day_name': 'Día 2 - Tren Inferior',
                        'day_number': 2,
                        'is_rest_day': False,
                        'notes': 'Enfocado en piernas y glúteos',
                        'exercises': [
                            {'exercise_name': 'Sentadillas con barra', 'sets': 4, 'reps': '8-10', 'rest_time': 120},
                            {'exercise_name': 'Peso muerto', 'sets': 3, 'reps': '8-10', 'rest_time': 120},
                            {'exercise_name': 'Zancadas', 'sets': 3, 'reps': '12-15', 'rest_time': 60},
                            {'exercise_name': 'Prensa de piernas', 'sets': 3, 'reps': '12-15', 'rest_time': 60},
                            {'exercise_name': 'Plancha', 'sets': 3, 'reps': '30-45 seg', 'rest_time': 45},
                        ]
                    },
                    {
                        'day_name': 'Día 3 - Hombros y Brazos',
                        'day_number': 3,
                        'is_rest_day': False,
                        'notes': 'Enfocado en hombros y brazos',
                        'exercises': [
                            {'exercise_name': 'Press militar', 'sets': 3, 'reps': '8-10', 'rest_time': 90},
                            {'exercise_name': 'Elevaciones laterales', 'sets': 3, 'reps': '12-15', 'rest_time': 45},
                            {'exercise_name': 'Elevaciones frontales', 'sets': 3, 'reps': '12-15', 'rest_time': 45},
                            {'exercise_name': 'Curl de bíceps con mancuernas', 'sets': 3, 'reps': '12-15', 'rest_time': 45},
                            {'exercise_name': 'Fondos en paralelas', 'sets': 3, 'reps': '8-12', 'rest_time': 60},
                            {'exercise_name': 'Crunches', 'sets': 3, 'reps': '15-20', 'rest_time': 30},
                        ]
                    }
                ]
            },
            {
                'name': 'Rutina Intermedia - Push/Pull/Legs',
                'description': 'Rutina intermedia con división push/pull/legs para mayor volumen',
                'difficulty': 'intermediate',
                'goal': 'muscle_gain',
                'duration_weeks': 12,
                'days_per_week': 6,
                'is_active': True,
                'is_public': True,
                'tags': ['intermedio', 'hipertrofia', 'push-pull-legs'],
                'days': [
                    {
                        'day_name': 'Push 1 - Pecho y Hombros',
                        'day_number': 1,
                        'is_rest_day': False,
                        'notes': 'Día de empuje - pecho y hombros',
                        'exercises': [
                            {'exercise_name': 'Press de banca', 'sets': 4, 'reps': '6-8', 'rest_time': 120},
                            {'exercise_name': 'Press inclinado con mancuernas', 'sets': 3, 'reps': '8-10', 'rest_time': 90},
                            {'exercise_name': 'Aperturas con mancuernas', 'sets': 3, 'reps': '12-15', 'rest_time': 60},
                            {'exercise_name': 'Press militar', 'sets': 3, 'reps': '8-10', 'rest_time': 90},
                            {'exercise_name': 'Elevaciones laterales', 'sets': 3, 'reps': '12-15', 'rest_time': 45},
                            {'exercise_name': 'Press francés', 'sets': 3, 'reps': '10-12', 'rest_time': 60},
                        ]
                    },
                    {
                        'day_name': 'Pull 1 - Espalda y Bíceps',
                        'day_number': 2,
                        'is_rest_day': False,
                        'notes': 'Día de tracción - espalda y bíceps',
                        'exercises': [
                            {'exercise_name': 'Peso muerto', 'sets': 4, 'reps': '5-6', 'rest_time': 180},
                            {'exercise_name': 'Dominadas', 'sets': 4, 'reps': '6-10', 'rest_time': 90},
                            {'exercise_name': 'Remo con barra', 'sets': 3, 'reps': '8-10', 'rest_time': 90},
                            {'exercise_name': 'Jalones al pecho', 'sets': 3, 'reps': '10-12', 'rest_time': 60},
                            {'exercise_name': 'Curl de bíceps con barra', 'sets': 3, 'reps': '10-12', 'rest_time': 60},
                            {'exercise_name': 'Curl martillo', 'sets': 3, 'reps': '12-15', 'rest_time': 45},
                        ]
                    },
                    {
                        'day_name': 'Legs 1 - Piernas y Glúteos',
                        'day_number': 3,
                        'is_rest_day': False,
                        'notes': 'Día de piernas - cuádriceps y glúteos',
                        'exercises': [
                            {'exercise_name': 'Sentadillas con barra', 'sets': 4, 'reps': '6-8', 'rest_time': 120},
                            {'exercise_name': 'Prensa de piernas', 'sets': 3, 'reps': '12-15', 'rest_time': 90},
                            {'exercise_name': 'Zancadas', 'sets': 3, 'reps': '12-15', 'rest_time': 60},
                            {'exercise_name': 'Extensiones de tríceps con mancuerna', 'sets': 3, 'reps': '12-15', 'rest_time': 45},
                            {'exercise_name': 'Plancha', 'sets': 3, 'reps': '45-60 seg', 'rest_time': 60},
                        ]
                    },
                    {
                        'day_name': 'Push 2 - Hombros y Tríceps',
                        'day_number': 4,
                        'is_rest_day': False,
                        'notes': 'Segundo día de empuje - hombros y tríceps',
                        'exercises': [
                            {'exercise_name': 'Press militar', 'sets': 4, 'reps': '6-8', 'rest_time': 120},
                            {'exercise_name': 'Elevaciones laterales', 'sets': 3, 'reps': '12-15', 'rest_time': 60},
                            {'exercise_name': 'Elevaciones frontales', 'sets': 3, 'reps': '12-15', 'rest_time': 60},
                            {'exercise_name': 'Fondos en paralelas', 'sets': 3, 'reps': '8-12', 'rest_time': 90},
                            {'exercise_name': 'Press francés', 'sets': 3, 'reps': '10-12', 'rest_time': 60},
                            {'exercise_name': 'Mountain climbers', 'sets': 3, 'reps': '30-45 seg', 'rest_time': 45},
                        ]
                    },
                    {
                        'day_name': 'Pull 2 - Espalda y Bíceps',
                        'day_number': 5,
                        'is_rest_day': False,
                        'notes': 'Segundo día de tracción - espalda y bíceps',
                        'exercises': [
                            {'exercise_name': 'Remo con barra', 'sets': 4, 'reps': '6-8', 'rest_time': 120},
                            {'exercise_name': 'Jalones al pecho', 'sets': 3, 'reps': '8-10', 'rest_time': 90},
                            {'exercise_name': 'Dominadas', 'sets': 3, 'reps': '8-12', 'rest_time': 90},
                            {'exercise_name': 'Curl de bíceps con mancuernas', 'sets': 3, 'reps': '10-12', 'rest_time': 60},
                            {'exercise_name': 'Curl martillo', 'sets': 3, 'reps': '12-15', 'rest_time': 45},
                            {'exercise_name': 'Crunches', 'sets': 3, 'reps': '20-25', 'rest_time': 30},
                        ]
                    },
                    {
                        'day_name': 'Legs 2 - Piernas y Glúteos',
                        'day_number': 6,
                        'is_rest_day': False,
                        'notes': 'Segundo día de piernas - isquiotibiales y glúteos',
                        'exercises': [
                            {'exercise_name': 'Peso muerto', 'sets': 4, 'reps': '6-8', 'rest_time': 120},
                            {'exercise_name': 'Zancadas', 'sets': 4, 'reps': '12-15', 'rest_time': 60},
                            {'exercise_name': 'Prensa de piernas', 'sets': 3, 'reps': '15-20', 'rest_time': 60},
                            {'exercise_name': 'Sentadillas', 'sets': 3, 'reps': '15-20', 'rest_time': 60},
                            {'exercise_name': 'Plancha', 'sets': 3, 'reps': '60 seg', 'rest_time': 60},
                        ]
                    }
                ]
            },
            {
                'name': 'Rutina Avanzada - Upper/Lower',
                'description': 'Rutina avanzada con división upper/lower para atletas experimentados',
                'difficulty': 'advanced',
                'goal': 'strength_building',
                'duration_weeks': 16,
                'days_per_week': 4,
                'is_active': True,
                'is_public': True,
                'tags': ['avanzado', 'fuerza', 'upper-lower'],
                'days': [
                    {
                        'day_name': 'Upper 1 - Fuerza',
                        'day_number': 1,
                        'is_rest_day': False,
                        'notes': 'Día de fuerza del tren superior',
                        'exercises': [
                            {'exercise_name': 'Press de banca', 'sets': 5, 'reps': '3-5', 'rest_time': 180},
                            {'exercise_name': 'Remo con barra', 'sets': 5, 'reps': '3-5', 'rest_time': 180},
                            {'exercise_name': 'Press militar', 'sets': 4, 'reps': '6-8', 'rest_time': 120},
                            {'exercise_name': 'Dominadas', 'sets': 4, 'reps': '6-10', 'rest_time': 120},
                            {'exercise_name': 'Curl de bíceps con barra', 'sets': 3, 'reps': '8-10', 'rest_time': 90},
                            {'exercise_name': 'Press francés', 'sets': 3, 'reps': '8-10', 'rest_time': 90},
                        ]
                    },
                    {
                        'day_name': 'Lower 1 - Fuerza',
                        'day_number': 2,
                        'is_rest_day': False,
                        'notes': 'Día de fuerza del tren inferior',
                        'exercises': [
                            {'exercise_name': 'Sentadillas con barra', 'sets': 5, 'reps': '3-5', 'rest_time': 180},
                            {'exercise_name': 'Peso muerto', 'sets': 5, 'reps': '3-5', 'rest_time': 180},
                            {'exercise_name': 'Prensa de piernas', 'sets': 4, 'reps': '8-10', 'rest_time': 120},
                            {'exercise_name': 'Zancadas', 'sets': 3, 'reps': '12-15', 'rest_time': 90},
                            {'exercise_name': 'Plancha', 'sets': 3, 'reps': '60-90 seg', 'rest_time': 90},
                        ]
                    },
                    {
                        'day_name': 'Upper 2 - Hipertrofia',
                        'day_number': 3,
                        'is_rest_day': False,
                        'notes': 'Día de hipertrofia del tren superior',
                        'exercises': [
                            {'exercise_name': 'Press inclinado con mancuernas', 'sets': 4, 'reps': '8-10', 'rest_time': 120},
                            {'exercise_name': 'Jalones al pecho', 'sets': 4, 'reps': '8-10', 'rest_time': 120},
                            {'exercise_name': 'Aperturas con mancuernas', 'sets': 3, 'reps': '12-15', 'rest_time': 60},
                            {'exercise_name': 'Elevaciones laterales', 'sets': 3, 'reps': '12-15', 'rest_time': 60},
                            {'exercise_name': 'Curl de bíceps con mancuernas', 'sets': 3, 'reps': '10-12', 'rest_time': 60},
                            {'exercise_name': 'Fondos en paralelas', 'sets': 3, 'reps': '8-12', 'rest_time': 90},
                        ]
                    },
                    {
                        'day_name': 'Lower 2 - Hipertrofia',
                        'day_number': 4,
                        'is_rest_day': False,
                        'notes': 'Día de hipertrofia del tren inferior',
                        'exercises': [
                            {'exercise_name': 'Sentadillas con barra', 'sets': 4, 'reps': '8-10', 'rest_time': 120},
                            {'exercise_name': 'Prensa de piernas', 'sets': 4, 'reps': '12-15', 'rest_time': 90},
                            {'exercise_name': 'Zancadas', 'sets': 4, 'reps': '12-15', 'rest_time': 60},
                            {'exercise_name': 'Peso muerto', 'sets': 3, 'reps': '8-10', 'rest_time': 120},
                            {'exercise_name': 'Mountain climbers', 'sets': 3, 'reps': '45-60 seg', 'rest_time': 60},
                        ]
                    }
                ]
            },
            {
                'name': 'Rutina Cardio HIIT',
                'description': 'Rutina de alta intensidad para quemar grasa y mejorar condición cardiovascular',
                'difficulty': 'intermediate',
                'goal': 'weight_loss',
                'duration_weeks': 6,
                'days_per_week': 4,
                'is_active': True,
                'is_public': True,
                'tags': ['cardio', 'hiit', 'pérdida de peso'],
                'days': [
                    {
                        'day_name': 'HIIT 1 - Full Body',
                        'day_number': 1,
                        'is_rest_day': False,
                        'notes': 'Entrenamiento HIIT de cuerpo completo',
                        'exercises': [
                            {'exercise_name': 'Burpees', 'sets': 4, 'reps': '30 seg', 'rest_time': 30},
                            {'exercise_name': 'Mountain climbers', 'sets': 4, 'reps': '30 seg', 'rest_time': 30},
                            {'exercise_name': 'Jumping jacks', 'sets': 4, 'reps': '30 seg', 'rest_time': 30},
                            {'exercise_name': 'High knees', 'sets': 4, 'reps': '30 seg', 'rest_time': 30},
                            {'exercise_name': 'Plancha', 'sets': 3, 'reps': '45 seg', 'rest_time': 60},
                        ]
                    },
                    {
                        'day_name': 'HIIT 2 - Cardio',
                        'day_number': 2,
                        'is_rest_day': False,
                        'notes': 'Entrenamiento HIIT cardiovascular',
                        'exercises': [
                            {'exercise_name': 'High knees', 'sets': 5, 'reps': '30 seg', 'rest_time': 30},
                            {'exercise_name': 'Jumping jacks', 'sets': 5, 'reps': '30 seg', 'rest_time': 30},
                            {'exercise_name': 'Burpees', 'sets': 4, 'reps': '30 seg', 'rest_time': 30},
                            {'exercise_name': 'Mountain climbers', 'sets': 4, 'reps': '30 seg', 'rest_time': 30},
                        ]
                    },
                    {
                        'day_name': 'HIIT 3 - Core',
                        'day_number': 3,
                        'is_rest_day': False,
                        'notes': 'Entrenamiento HIIT enfocado en core',
                        'exercises': [
                            {'exercise_name': 'Plancha', 'sets': 4, 'reps': '45 seg', 'rest_time': 30},
                            {'exercise_name': 'Crunches', 'sets': 4, 'reps': '30 seg', 'rest_time': 30},
                            {'exercise_name': 'Mountain climbers', 'sets': 4, 'reps': '30 seg', 'rest_time': 30},
                            {'exercise_name': 'Burpees', 'sets': 3, 'reps': '30 seg', 'rest_time': 60},
                        ]
                    },
                    {
                        'day_name': 'HIIT 4 - Full Body',
                        'day_number': 4,
                        'is_rest_day': False,
                        'notes': 'Entrenamiento HIIT de cuerpo completo intenso',
                        'exercises': [
                            {'exercise_name': 'Burpees', 'sets': 5, 'reps': '30 seg', 'rest_time': 30},
                            {'exercise_name': 'Mountain climbers', 'sets': 5, 'reps': '30 seg', 'rest_time': 30},
                            {'exercise_name': 'High knees', 'sets': 5, 'reps': '30 seg', 'rest_time': 30},
                            {'exercise_name': 'Jumping jacks', 'sets': 5, 'reps': '30 seg', 'rest_time': 30},
                        ]
                    }
                ]
            }
        ]
        
        created_count = 0
        
        for template_data in templates_data:
            days_data = template_data.pop('days')
            
            template, created = WorkoutPlanTemplate.objects.get_or_create(
                name=template_data['name'],
                defaults={
                    **template_data,
                    'created_by': admin_user
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(f'  ✅ Creada plantilla: {template.name}')
                
                # Crear días de la plantilla
                for day_data in days_data:
                    exercises_data = day_data.pop('exercises')
                    
                    day = WorkoutPlanDay.objects.create(
                        plan=template,
                        **day_data
                    )
                    
                    # Crear ejercicios del día
                    for exercise_data in exercises_data:
                        exercise_name = exercise_data.pop('exercise_name')
                        try:
                            exercise = Exercise.objects.get(name=exercise_name)
                            WorkoutPlanExercise.objects.create(
                                workout_day=day,
                                exercise=exercise,
                                **exercise_data
                            )
                        except Exercise.DoesNotExist:
                            self.stdout.write(f'    ⚠️ Ejercicio no encontrado: {exercise_name}')
            else:
                self.stdout.write(f'  🔄 Plantilla ya existe: {template.name}')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'🎉 Completado! Plantillas creadas: {created_count}'
            )
        )























