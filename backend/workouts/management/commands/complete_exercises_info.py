"""
Comando para completar la información de los ejercicios
con descripciones detalladas e información completa
"""
from django.core.management.base import BaseCommand
from workouts.models import Exercise

class Command(BaseCommand):
    help = 'Completa la información de los ejercicios con descripciones detalladas'

    def handle(self, *args, **options):
        self.stdout.write('=' * 80)
        self.stdout.write('COMPLETANDO INFORMACIÓN DE EJERCICIOS')
        self.stdout.write('=' * 80)
        
        # Diccionario con descripciones detalladas para ejercicios comunes
        exercise_descriptions = {
            'Press de Banca': {
                'instructions': '''Acuéstate en el banco plano con los pies firmes en el suelo. 
Agarra la barra con las manos ligeramente más anchas que los hombros. 
Baja la barra de forma controlada hasta tocar el pecho (a la altura de los pezones). 
Empuja la barra hacia arriba hasta extender completamente los brazos. 
Mantén los omóplatos retraídos y el core activado durante todo el movimiento.''',
                'muscle_groups': ['chest', 'triceps', 'shoulders']
            },
            'Sentadillas': {
                'instructions': '''Párate con los pies al ancho de los hombros, dedos de los pies ligeramente hacia afuera. 
Mantén la espalda recta y el pecho levantado. 
Baja el cuerpo como si te fueras a sentar, llevando las caderas hacia atrás y doblando las rodillas. 
Baja hasta que los muslos estén paralelos al suelo (o más abajo si tu flexibilidad lo permite). 
Empuja con los talones para volver a la posición inicial. 
Mantén las rodillas alineadas con los dedos de los pies durante todo el movimiento.''',
                'muscle_groups': ['quads', 'glutes', 'calves', 'core']
            },
            'Peso Muerto': {
                'instructions': '''Párate con los pies al ancho de los hombros, barra en el suelo frente a ti. 
Agarra la barra con agarre mixto o prono, manos ligeramente más anchas que los hombros. 
Mantén la espalda recta, pecho levantado y core activado. 
Levanta la barra extendiendo las caderas y las rodillas simultáneamente. 
Mantén la barra cerca del cuerpo durante todo el movimiento. 
En la parte superior, contrae los glúteos y mantén los hombros hacia atrás. 
Baja la barra de forma controlada invirtiendo el movimiento.''',
                'muscle_groups': ['hamstrings', 'glutes', 'lower_back', 'lats', 'traps']
            },
            'Dominadas': {
                'instructions': '''Cuelga de la barra con las manos al ancho de los hombros, agarre prono. 
Mantén el cuerpo recto, core activado y las piernas ligeramente dobladas o cruzadas. 
Tira del cuerpo hacia arriba llevando los codos hacia abajo y atrás. 
Sube hasta que la barbilla pase la barra. 
Baja de forma controlada hasta extender completamente los brazos. 
Mantén el movimiento controlado, sin balancearse.''',
                'muscle_groups': ['lats', 'biceps', 'rhomboids', 'rear_delts']
            },
            'Plancha': {
                'instructions': '''Colócate en posición de flexión, pero apoyado en los antebrazos en lugar de las manos. 
Los codos deben estar directamente debajo de los hombros. 
Mantén el cuerpo en línea recta desde la cabeza hasta los talones. 
Contrae el core, glúteos y cuádriceps. 
Respira normalmente y mantén la posición el tiempo indicado. 
No dejes que las caderas se hundan o se eleven.''',
                'muscle_groups': ['core', 'abs', 'shoulders', 'glutes']
            },
            'Flexiones': {
                'instructions': '''Colócate en posición de plancha, manos al ancho de los hombros, dedos apuntando hacia adelante. 
Mantén el cuerpo en línea recta desde la cabeza hasta los talones. 
Baja el cuerpo doblando los codos hasta que el pecho casi toque el suelo. 
Los codos deben estar a unos 45 grados del cuerpo. 
Empuja hacia arriba hasta extender completamente los brazos. 
Mantén el core activado durante todo el movimiento.''',
                'muscle_groups': ['chest', 'triceps', 'shoulders', 'core']
            },
            'Press Militar': {
                'instructions': '''Párate con los pies al ancho de los hombros, barra a la altura de los hombros. 
Agarra la barra con las manos ligeramente más anchas que los hombros. 
Mantén el core activado y la espalda recta. 
Presiona la barra hacia arriba hasta extender completamente los brazos. 
Mantén los codos ligeramente hacia adelante durante el movimiento. 
Baja la barra de forma controlada hasta la posición inicial.''',
                'muscle_groups': ['shoulders', 'triceps', 'core']
            },
            'Remo con Barra': {
                'instructions': '''Párate con los pies al ancho de los hombros, barra en el suelo. 
Inclínate hacia adelante manteniendo la espalda recta, caderas hacia atrás. 
Agarra la barra con las manos al ancho de los hombros. 
Tira de la barra hacia el abdomen, llevando los codos hacia atrás. 
Aprieta los omóplatos en la parte superior del movimiento. 
Baja la barra de forma controlada hasta extender los brazos.''',
                'muscle_groups': ['lats', 'rhomboids', 'biceps', 'rear_delts']
            },
            'Zancadas': {
                'instructions': '''Párate erguido con los pies al ancho de los hombros. 
Da un paso adelante con una pierna, manteniendo el torso recto. 
Baja el cuerpo doblando ambas rodillas hasta que ambas estén en 90 grados. 
La rodilla trasera no debe tocar el suelo. 
Empuja con el talón del pie delantero para volver a la posición inicial. 
Alterna las piernas o completa todas las repeticiones con una pierna antes de cambiar.''',
                'muscle_groups': ['quads', 'glutes', 'hamstrings', 'calves']
            },
            'Curl con Barra': {
                'instructions': '''Párate con los pies al ancho de los hombros, barra en las manos. 
Mantén los codos pegados al cuerpo y los brazos extendidos. 
Flexiona los brazos llevando la barra hacia el pecho. 
Contrae los bíceps en la parte superior del movimiento. 
Baja la barra de forma controlada hasta extender completamente los brazos. 
No balancees el cuerpo ni uses impulso.''',
                'muscle_groups': ['biceps', 'brachialis']
            },
        }
        
        updated_count = 0
        created_count = 0
        
        # Actualizar ejercicios existentes
        for exercise in Exercise.objects.all():
            updated = False
            
            # Actualizar descripción si está vacía o es muy corta
            if exercise.name in exercise_descriptions:
                desc_data = exercise_descriptions[exercise.name]
                
                if not exercise.instructions or len(exercise.instructions) < 50:
                    exercise.instructions = desc_data['instructions']
                    updated = True
                
                # Actualizar grupos musculares si están vacíos
                if not exercise.muscle_groups and 'muscle_groups' in desc_data:
                    exercise.muscle_groups = desc_data['muscle_groups']
                    updated = True
                
                # Asegurar categoría
                if not exercise.category:
                    if 'chest' in exercise.muscle_groups or 'triceps' in exercise.muscle_groups:
                        exercise.category = 'strength'
                    elif 'core' in exercise.muscle_groups or 'abs' in exercise.muscle_groups:
                        exercise.category = 'bodyweight'
                    else:
                        exercise.category = 'strength'
                    updated = True
                
                if updated:
                    exercise.save()
                    updated_count += 1
                    self.stdout.write(f'   ✅ Actualizado: {exercise.name}')
        
        # Para ejercicios que no están en el diccionario, agregar descripciones básicas
        for exercise in Exercise.objects.filter(instructions=''):
            if exercise.name not in exercise_descriptions:
                # Crear descripción básica basada en el nombre y categoría
                basic_instruction = f'''Ejecuta {exercise.name.lower()} con buena forma y control. 
Mantén el core activado y respira correctamente durante el ejercicio. 
Ajusta la intensidad según tu nivel de condición física.'''
                
                exercise.instructions = basic_instruction
                
                # Asegurar categoría
                if not exercise.category:
                    exercise.category = 'strength'
                
                exercise.save()
                created_count += 1
                self.stdout.write(f'   📝 Descripción básica agregada: {exercise.name}')
        
        self.stdout.write('\n' + '=' * 80)
        self.stdout.write(self.style.SUCCESS(
            f'✅ PROCESO COMPLETADO:\n'
            f'   • Ejercicios actualizados: {updated_count}\n'
            f'   • Descripciones básicas agregadas: {created_count}\n'
            f'   • Total de ejercicios con información completa: {Exercise.objects.exclude(instructions="").count()}'
        ))
        self.stdout.write('=' * 80)

