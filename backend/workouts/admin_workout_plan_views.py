# workouts/admin_workout_plan_views.py
"""
Views para export/import de planes de entrenamiento
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser
from django.http import HttpResponse
import csv
import io

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

from .models import WorkoutProgram, Exercise, WorkoutDay, WorkoutDayExercise, ExerciseSubstitution


class AdminWorkoutPlanExportImportViewSet(viewsets.GenericViewSet):
    """ViewSet para export/import de planes de entrenamiento"""
    permission_classes = [IsAdminUser]
    parser_classes = [MultiPartParser, FormParser]
    queryset = WorkoutProgram.objects.all()  # Required for router registration
    
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Exporta CSV completo: plan + día + ejercicio + sustitutos (sin IDs)."""
        try:
            plans = WorkoutProgram.objects.filter(is_template=True).prefetch_related(
                'days__exercises__exercise'
            )

            used_exercise_ids = set()
            for plan in plans:
                for day in plan.days.all():
                    for workout_exercise in day.exercises.all():
                        used_exercise_ids.add(workout_exercise.exercise_id)

            substitutions_map = {}
            substitutions = ExerciseSubstitution.objects.filter(
                exercise_id__in=used_exercise_ids
            ).select_related('substitute').order_by('exercise_id', 'priority', 'created_at')
            for substitution in substitutions:
                substitutions_map.setdefault(str(substitution.exercise_id), []).append(substitution.substitute.name)

            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=[
                'plan_name', 'plan_description', 'plan_difficulty', 'plan_goal', 'plan_location',
                'plan_duration_weeks', 'plan_days_per_week', 'plan_estimated_duration_minutes',
                'plan_equipment_needed', 'plan_tags', 'plan_image_url', 'plan_is_active', 'plan_is_template',
                'day_number', 'day_name', 'day_of_week', 'day_is_rest_day', 'day_duration_minutes',
                'day_focus', 'day_notes', 'day_order',
                'exercise_order', 'exercise_name', 'sets', 'reps', 'weight',
                'duration_seconds', 'rest_seconds', 'exercise_notes', 'superset_group',
                'substitutes'
            ])
            
            writer.writeheader()
            for plan in plans:
                base_row = {
                    'plan_name': plan.name or '',
                    'plan_description': plan.description or '',
                    'plan_difficulty': plan.difficulty or '',
                    'plan_goal': plan.goal or '',
                    'plan_location': plan.location or '',
                    'plan_duration_weeks': plan.duration_weeks or 4,
                    'plan_days_per_week': plan.days_per_week or 3,
                    'plan_estimated_duration_minutes': plan.estimated_duration_minutes or 60,
                    'plan_equipment_needed': ', '.join(plan.equipment_needed or []),
                    'plan_tags': ', '.join(plan.tags or []),
                    'plan_image_url': plan.image_url or '',
                    'plan_is_active': 'true' if plan.is_active else 'false',
                    'plan_is_template': 'true' if plan.is_template else 'false',
                }

                days = list(plan.days.all().order_by('order_index', 'day_number'))
                if not days:
                    writer.writerow(base_row)
                    continue

                for day in days:
                    day_row = {
                        **base_row,
                        'day_number': day.day_number,
                        'day_name': day.name or '',
                        'day_of_week': day.day_of_week or '',
                        'day_is_rest_day': 'true' if day.is_rest_day else 'false',
                        'day_duration_minutes': day.duration_minutes or '',
                        'day_focus': day.focus or '',
                        'day_notes': day.notes or '',
                        'day_order': day.order_index,
                    }

                    day_exercises = list(day.exercises.all().select_related('exercise').order_by('order_index'))
                    if not day_exercises:
                        writer.writerow(day_row)
                        continue

                    for workout_exercise in day_exercises:
                        substitutes = substitutions_map.get(str(workout_exercise.exercise_id), [])
                        writer.writerow({
                            **day_row,
                            'exercise_order': workout_exercise.order_index,
                            'exercise_name': workout_exercise.exercise.name,
                            'sets': workout_exercise.sets or 3,
                            'reps': workout_exercise.reps or '10',
                            'weight': workout_exercise.weight or '',
                            'duration_seconds': workout_exercise.duration_seconds or '',
                            'rest_seconds': workout_exercise.rest_seconds or 60,
                            'exercise_notes': workout_exercise.notes or '',
                            'superset_group': workout_exercise.superset_group or '',
                            'substitutes': ' | '.join(substitutes),
                        })

            response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = 'attachment; filename="workout_plans_export.csv"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Exporta planes completos a Excel sin IDs (editable por negocio)."""
        try:
            def parse_bool_label(value):
                return 'Sí' if value else 'No'

            def apply_header_style(ws):
                """Aplica estilo a la primera fila"""
                header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
                header_font = Font(bold=True, color="FFFFFF")
                for cell in ws[1]:
                    cell.fill = header_fill
                    cell.font = header_font
                    cell.alignment = Alignment(horizontal='center', vertical='center')
            
            def auto_adjust_columns(ws):
                """Ajusta el ancho de columnas automáticamente"""
                for column in ws.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    for cell in column:
                        try:
                            if cell.value and len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except Exception:
                            pass
                    ws.column_dimensions[column_letter].width = min(max_length + 2, 50)

            wb = Workbook()
            ws_summary = wb.active
            ws_summary.title = "Resumen completo"
            ws_summary.append([
                'Nombre Plan', 'Descripción Plan', 'Dificultad', 'Objetivo', 'Ubicación',
                'Semanas', 'Días/Semana', 'Duración Plan (min)',
                'Número Día', 'Nombre Día', 'Día Semana', 'Descanso',
                'Orden Ejercicio', 'Nombre Ejercicio', 'Series', 'Reps',
                'Peso', 'Duración (seg)', 'Descanso (seg)', 'Grupo Superset',
                'Sustitutos (separados por |)'
            ])
            apply_header_style(ws_summary)
            
            # === HOJA 1: PLANES ===
            ws_plans = wb.create_sheet("Planes")
            ws_plans.append([
                'Nombre', 'Descripción', 'Dificultad', 'Objetivo', 'Ubicación',
                'Semanas', 'Días/Semana', 'Duración (min)', 'Equipo (coma separado)',
                'Tags (coma separado)', 'Imagen URL', 'Activo', 'Plantilla'
            ])
            apply_header_style(ws_plans)
            
            plans = WorkoutProgram.objects.filter(is_template=True).prefetch_related('days__exercises__exercise')
            for plan in plans:
                ws_plans.append([
                    plan.name or '',
                    plan.description or '',
                    plan.difficulty or 'beginner',
                    plan.goal or '',
                    plan.location or '',
                    plan.duration_weeks or 4,
                    plan.days_per_week or 3,
                    plan.estimated_duration_minutes or 60,
                    ', '.join(plan.equipment_needed or []),
                    ', '.join(plan.tags or []),
                    plan.image_url or '',
                    parse_bool_label(plan.is_active),
                    parse_bool_label(plan.is_template),
                ])
            auto_adjust_columns(ws_plans)

            # === HOJA 2: DÍAS ===
            ws_days = wb.create_sheet("Días")
            ws_days.append([
                'Nombre Plan', 'Número Día', 'Nombre Día', 'Día Semana', 'Es Descanso',
                'Duración (min)', 'Enfoque', 'Notas', 'Orden'
            ])
            apply_header_style(ws_days)
            
            for plan in plans:
                for day in plan.days.all().order_by('order_index', 'day_number'):
                    ws_days.append([
                        plan.name,
                        day.day_number,
                        day.name or '',
                        day.day_of_week or '',
                        parse_bool_label(day.is_rest_day),
                        day.duration_minutes or '',
                        day.focus or '',
                        day.notes or '',
                        day.order_index,
                    ])
            auto_adjust_columns(ws_days)

            # === HOJA 3: EJERCICIOS ===
            ws_exercises = wb.create_sheet("Ejercicios")
            ws_exercises.append([
                'Nombre Plan', 'Número Día', 'Nombre Día', 'Orden', 'Nombre Ejercicio',
                'Series', 'Reps', 'Peso', 'Duración (seg)', 'Descanso (seg)',
                'Notas', 'Grupo Superset'
            ])
            apply_header_style(ws_exercises)
            
            for plan in plans:
                for day in plan.days.all().order_by('order_index', 'day_number'):
                    for exercise in day.exercises.all().select_related('exercise').order_by('order_index'):
                        ws_exercises.append([
                            plan.name,
                            day.day_number,
                            day.name,
                            exercise.order_index,
                            exercise.exercise.name,
                            exercise.sets or 3,
                            exercise.reps or '10',
                            exercise.weight or '',
                            exercise.duration_seconds or '',
                            exercise.rest_seconds or 60,
                            exercise.notes or '',
                            exercise.superset_group or '',
                        ])
            auto_adjust_columns(ws_exercises)

            # === HOJA 4: SUSTITUTOS ===
            ws_subs = wb.create_sheet("Sustitutos")
            ws_subs.append(['Nombre Ejercicio', 'Nombre Sustituto', 'Prioridad', 'Notas'])
            apply_header_style(ws_subs)
            
            # Obtener todos los ejercicios usados en los planes
            used_exercise_ids = set()
            for plan in plans:
                for day in plan.days.all():
                    for ex in day.exercises.all():
                        used_exercise_ids.add(ex.exercise.id)
            
            # Exportar sustitutos de los ejercicios usados
            substitutions = ExerciseSubstitution.objects.filter(
                exercise_id__in=used_exercise_ids
            ).select_related('exercise', 'substitute').order_by('exercise__name', 'priority')

            summary_substitutions_map = {}
            for sub in substitutions:
                summary_substitutions_map.setdefault(str(sub.exercise_id), []).append(sub.substitute.name)
            
            for sub in substitutions:
                ws_subs.append([
                    sub.exercise.name,
                    sub.substitute.name,
                    sub.priority,
                    sub.notes or '',
                ])
            auto_adjust_columns(ws_subs)

            # Completar hoja principal de resumen completo
            for plan in plans:
                days = list(plan.days.all().order_by('order_index', 'day_number'))
                if not days:
                    ws_summary.append([
                        plan.name or '',
                        plan.description or '',
                        plan.difficulty or '',
                        plan.goal or '',
                        plan.location or '',
                        plan.duration_weeks or 4,
                        plan.days_per_week or 3,
                        plan.estimated_duration_minutes or 60,
                        '', '', '', '', '', '', '', '', '', '', '', '', ''
                    ])
                    continue

                for day in days:
                    day_exercises = list(day.exercises.all().select_related('exercise').order_by('order_index'))
                    if not day_exercises:
                        ws_summary.append([
                            plan.name or '',
                            plan.description or '',
                            plan.difficulty or '',
                            plan.goal or '',
                            plan.location or '',
                            plan.duration_weeks or 4,
                            plan.days_per_week or 3,
                            plan.estimated_duration_minutes or 60,
                            day.day_number,
                            day.name or '',
                            day.day_of_week or '',
                            parse_bool_label(day.is_rest_day),
                            '', '', '', '', '', '', '', '', ''
                        ])
                        continue

                    for exercise in day_exercises:
                        substitutes = summary_substitutions_map.get(str(exercise.exercise_id), [])
                        ws_summary.append([
                            plan.name or '',
                            plan.description or '',
                            plan.difficulty or '',
                            plan.goal or '',
                            plan.location or '',
                            plan.duration_weeks or 4,
                            plan.days_per_week or 3,
                            plan.estimated_duration_minutes or 60,
                            day.day_number,
                            day.name or '',
                            day.day_of_week or '',
                            parse_bool_label(day.is_rest_day),
                            exercise.order_index,
                            exercise.exercise.name,
                            exercise.sets or 3,
                            exercise.reps or '10',
                            exercise.weight or '',
                            exercise.duration_seconds or '',
                            exercise.rest_seconds or 60,
                            exercise.superset_group or '',
                            ' | '.join(substitutes),
                        ])
            auto_adjust_columns(ws_summary)

            # === HOJA 5: REFERENCIAS ===
            ws_ref = wb.create_sheet("Referencias")
            ws_ref.append(['CAMPO', 'VALORES VÁLIDOS', 'DESCRIPCIÓN'])
            apply_header_style(ws_ref)
            
            ws_ref.append(['Dificultad', 'beginner, intermediate, advanced', 'Nivel de dificultad'])
            ws_ref.append(['Objetivo', 'weight_loss, muscle_gain, strength, endurance, general_fitness, body_recomposition', 'Objetivo del plan'])
            ws_ref.append(['Ubicación', 'gym, home, outdoor, any', 'Lugar de entrenamiento'])
            ws_ref.append(['Día Semana', 'monday, tuesday, wednesday, thursday, friday, saturday, sunday', 'Día de la semana'])
            ws_ref.append(['Es Descanso', 'Sí, No', 'Indica si es día de descanso'])
            ws_ref.append(['Activo', 'Sí, No', 'Plan activo o inactivo'])
            ws_ref.append(['Plantilla', 'Sí, No', 'Es una plantilla reutilizable'])
            ws_ref.append(['Regla de actualización', 'Por Nombre del plan', 'El import actualiza solo por nombre del plan'])
            auto_adjust_columns(ws_ref)

            output = io.BytesIO()
            wb.save(output)
            output.seek(0)

            response = HttpResponse(output.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename="workout_plans_complete.xlsx"'
            return response
        except Exception as e:
            import traceback
            return Response({'error': str(e), 'traceback': traceback.format_exc()}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def import_csv(self, request):
        """Importa CSV de planes (formato simple o formato completo) sin IDs."""
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'Archivo no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = file.read().decode('utf-8')
        except UnicodeDecodeError:
            return Response({'error': 'El archivo debe estar en formato UTF-8'}, status=status.HTTP_400_BAD_REQUEST)

        def parse_bool(value, default=False):
            if value is None or str(value).strip() == '':
                return default
            return str(value).strip().lower() in ['sí', 'si', 'true', '1', 'yes', 'y']

        def parse_list(value):
            if value is None:
                return []
            if isinstance(value, list):
                return value
            return [item.strip() for item in str(value).split(',') if item and item.strip()]

        def parse_int(value, default=None):
            if value is None or str(value).strip() == '':
                return default
            return int(value)

        reader = csv.DictReader(decoded.splitlines())
        created, updated, skipped = 0, 0, 0
        errors = []

        fieldnames = set(reader.fieldnames or [])
        is_complete_format = 'plan_name' in fieldnames

        if is_complete_format:
            from django.db import transaction

            stats = {
                'plans': {'created': 0, 'updated': 0, 'skipped': 0},
                'days': {'created': 0, 'updated': 0, 'skipped': 0},
                'exercises': {'created': 0, 'updated': 0, 'skipped': 0},
                'substitutes': {'created': 0, 'updated': 0, 'skipped': 0},
            }

            with transaction.atomic():
                for row_num, row in enumerate(reader, start=2):
                    try:
                        plan_name = (row.get('plan_name') or '').strip()
                        if not plan_name:
                            errors.append(f"Fila {row_num}: 'plan_name' es requerido")
                            stats['plans']['skipped'] += 1
                            skipped += 1
                            continue

                        plan = WorkoutProgram.objects.filter(name=plan_name, is_template=True).first()
                        plan_fields = {
                            'name': plan_name,
                            'description': (row.get('plan_description') or '').strip(),
                            'difficulty': (row.get('plan_difficulty') or 'beginner').strip() or 'beginner',
                            'goal': (row.get('plan_goal') or 'general_fitness').strip() or 'general_fitness',
                            'location': (row.get('plan_location') or 'any').strip() or 'any',
                            'duration_weeks': parse_int(row.get('plan_duration_weeks'), default=4),
                            'days_per_week': parse_int(row.get('plan_days_per_week'), default=3),
                            'estimated_duration_minutes': parse_int(row.get('plan_estimated_duration_minutes'), default=60),
                            'equipment_needed': parse_list(row.get('plan_equipment_needed')),
                            'tags': parse_list(row.get('plan_tags')),
                            'image_url': (row.get('plan_image_url') or '').strip(),
                            'is_active': parse_bool(row.get('plan_is_active'), default=True),
                            'is_template': parse_bool(row.get('plan_is_template'), default=True),
                            'is_system': False,
                        }

                        if plan:
                            for key, value in plan_fields.items():
                                setattr(plan, key, value)
                            plan.save()
                            stats['plans']['updated'] += 1
                        else:
                            plan = WorkoutProgram.objects.create(**plan_fields)
                            stats['plans']['created'] += 1

                        day_number = parse_int(row.get('day_number'), default=None)
                        if day_number is None:
                            continue

                        day = WorkoutDay.objects.filter(program=plan, day_number=day_number).first()
                        day_fields = {
                            'program': plan,
                            'day_number': day_number,
                            'name': (row.get('day_name') or f'Día {day_number}').strip() or f'Día {day_number}',
                            'day_of_week': (row.get('day_of_week') or '').strip(),
                            'is_rest_day': parse_bool(row.get('day_is_rest_day'), default=False),
                            'duration_minutes': parse_int(row.get('day_duration_minutes'), default=None),
                            'focus': (row.get('day_focus') or '').strip(),
                            'notes': (row.get('day_notes') or '').strip(),
                            'order_index': parse_int(row.get('day_order'), default=day_number),
                        }

                        if day:
                            for key, value in day_fields.items():
                                setattr(day, key, value)
                            day.save()
                            stats['days']['updated'] += 1
                        else:
                            day = WorkoutDay.objects.create(**day_fields)
                            stats['days']['created'] += 1

                        exercise_name = (row.get('exercise_name') or '').strip()
                        if not exercise_name:
                            continue

                        exercise = Exercise.objects.filter(name=exercise_name).first()
                        if not exercise:
                            errors.append(f"Fila {row_num}: Ejercicio '{exercise_name}' no encontrado")
                            stats['exercises']['skipped'] += 1
                            skipped += 1
                            continue

                        exercise_order = parse_int(row.get('exercise_order'), default=1)
                        workout_exercise = WorkoutDayExercise.objects.filter(
                            workout_day=day,
                            order_index=exercise_order,
                        ).first()

                        exercise_fields = {
                            'workout_day': day,
                            'exercise': exercise,
                            'sets': parse_int(row.get('sets'), default=3),
                            'reps': (row.get('reps') or '10').strip() or '10',
                            'weight': (row.get('weight') or '').strip(),
                            'duration_seconds': parse_int(row.get('duration_seconds'), default=None),
                            'rest_seconds': parse_int(row.get('rest_seconds'), default=60),
                            'notes': (row.get('exercise_notes') or '').strip(),
                            'order_index': exercise_order,
                            'superset_group': parse_int(row.get('superset_group'), default=None),
                        }

                        if workout_exercise:
                            for key, value in exercise_fields.items():
                                setattr(workout_exercise, key, value)
                            workout_exercise.save()
                            stats['exercises']['updated'] += 1
                        else:
                            WorkoutDayExercise.objects.create(**exercise_fields)
                            stats['exercises']['created'] += 1

                        substitutes_raw = (row.get('substitutes') or '').strip()
                        if substitutes_raw:
                            substitute_names = [name.strip() for name in substitutes_raw.split('|') if name and name.strip()]
                            for index, substitute_name in enumerate(substitute_names, start=1):
                                substitute = Exercise.objects.filter(name=substitute_name).first()
                                if not substitute:
                                    errors.append(f"Fila {row_num}: Sustituto '{substitute_name}' no encontrado")
                                    stats['substitutes']['skipped'] += 1
                                    skipped += 1
                                    continue

                                relation = ExerciseSubstitution.objects.filter(
                                    exercise=exercise,
                                    substitute=substitute,
                                ).first()
                                if relation:
                                    relation.priority = index
                                    relation.save()
                                    stats['substitutes']['updated'] += 1
                                else:
                                    ExerciseSubstitution.objects.create(
                                        exercise=exercise,
                                        substitute=substitute,
                                        priority=index,
                                    )
                                    stats['substitutes']['created'] += 1

                    except Exception as e:
                        errors.append(f"Fila {row_num}: {str(e)}")
                        skipped += 1

            return Response({
                'message': 'Importación CSV completa finalizada',
                'stats': stats,
                'errors': errors if errors else None
            })

        for row_num, row in enumerate(reader, start=2):
            try:
                name = row.get('name', '').strip()
                if not name:
                    errors.append(f"Fila {row_num}: 'name' es requerido")
                    skipped += 1
                    continue

                plan = WorkoutProgram.objects.filter(name=name, is_template=True).first()
                fields = {
                    'description': row.get('description', '').strip(),
                    'difficulty': row.get('difficulty', 'beginner').strip(),
                    'goal': row.get('goal', '').strip(),
                    'location': row.get('location', '').strip(),
                    'duration_weeks': int(row.get('duration_weeks', 4)) if row.get('duration_weeks') else 4,
                    'days_per_week': int(row.get('days_per_week', 3)) if row.get('days_per_week') else 3,
                    'estimated_duration_minutes': int(row.get('estimated_duration_minutes', 60)) if row.get('estimated_duration_minutes') else 60,
                    'equipment_needed': parse_list(row.get('equipment_needed', '')),
                    'tags': parse_list(row.get('tags', '')),
                    'image_url': row.get('image_url', '').strip(),
                    'is_active': parse_bool(row.get('is_active', 'true'), default=True),
                    'is_template': parse_bool(row.get('is_template', 'true'), default=True),
                    'is_system': False,
                }

                if plan:
                    for k, v in fields.items():
                        setattr(plan, k, v)
                    plan.save()
                    updated += 1
                else:
                    WorkoutProgram.objects.create(name=name, **fields)
                    created += 1
            except Exception as e:
                errors.append(f"Fila {row_num}: {str(e)}")
                skipped += 1

        message = f"Importación completada. {created} planes creados, {updated} actualizados"
        if skipped > 0:
            message += f", {skipped} omitidos"

        return Response({
            'message': message,
            'created': created,
            'updated': updated,
            'skipped': skipped,
            'errors': errors if errors else None
        })

    @action(detail=False, methods=['post'])
    def import_excel(self, request):
        """Importa planes completos desde Excel sin IDs, actualizando por nombre de plan."""
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'Archivo no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from openpyxl import load_workbook
            from django.db import transaction
            
            wb = load_workbook(file)
            stats = {
                'plans': {'created': 0, 'updated': 0, 'skipped': 0},
                'days': {'created': 0, 'updated': 0, 'skipped': 0, 'deleted': 0},
                'exercises': {'created': 0, 'updated': 0, 'skipped': 0, 'deleted': 0},
                'substitutes': {'created': 0, 'updated': 0, 'skipped': 0},
            }
            errors = []
            
            def parse_bool(value, default=False):
                if value is None or str(value).strip() == '':
                    return default
                return str(value).strip().lower() in ['sí', 'si', 'true', '1', 'yes', 'y']

            def parse_list(value):
                if value is None:
                    return []
                if isinstance(value, list):
                    return value
                return [item.strip() for item in str(value).split(',') if item and item.strip()]

            with transaction.atomic():
                # === IMPORTAR PLANES ===
                if 'Planes' in wb.sheetnames:
                    ws_plans = wb['Planes']
                    for row_num, row in enumerate(ws_plans.iter_rows(min_row=2, values_only=True), start=2):
                        try:
                            if not row[0]:
                                continue

                            name = str(row[0]).strip() if row[0] else None
                            
                            if not name:
                                errors.append(f"Planes - Fila {row_num}: 'Nombre' es requerido")
                                stats['plans']['skipped'] += 1
                                continue
                            
                            plan = WorkoutProgram.objects.filter(name=name, is_template=True).first()
                            
                            fields = {
                                'name': name,
                                'description': str(row[1]).strip() if row[1] else '',
                                'difficulty': str(row[2]).strip() if row[2] else 'beginner',
                                'goal': str(row[3]).strip() if row[3] else 'general_fitness',
                                'location': str(row[4]).strip() if row[4] else 'any',
                                'duration_weeks': int(row[5]) if row[5] else 4,
                                'days_per_week': int(row[6]) if row[6] else 3,
                                'estimated_duration_minutes': int(row[7]) if row[7] else 60,
                                'equipment_needed': parse_list(row[8]),
                                'tags': parse_list(row[9]),
                                'image_url': str(row[10]).strip() if row[10] else '',
                                'is_active': parse_bool(row[11], default=True),
                                'is_template': parse_bool(row[12], default=True),
                                'is_system': False,
                            }
                            
                            if plan:
                                for k, v in fields.items():
                                    setattr(plan, k, v)
                                plan.save()
                                stats['plans']['updated'] += 1
                            else:
                                plan = WorkoutProgram.objects.create(**fields)
                                stats['plans']['created'] += 1
                                
                        except Exception as e:
                            errors.append(f"Planes - Fila {row_num}: {str(e)}")
                            stats['plans']['skipped'] += 1

                # === IMPORTAR DÍAS (match por Nombre Plan + Número Día) ===
                if 'Días' in wb.sheetnames:
                    ws_days = wb['Días']
                    
                    for row_num, row in enumerate(ws_days.iter_rows(min_row=2, values_only=True), start=2):
                        try:
                            if not row[0]:
                                continue

                            plan_name = str(row[0]).strip() if row[0] else ''
                            day_number = int(row[1]) if row[1] else 1
                            name = str(row[2]).strip() if row[2] else f'Día {day_number}'
                            
                            plan = WorkoutProgram.objects.filter(name=plan_name, is_template=True).first()
                            if not plan:
                                errors.append(f"Días - Fila {row_num}: Plan '{plan_name}' no encontrado")
                                stats['days']['skipped'] += 1
                                continue

                            day = WorkoutDay.objects.filter(program=plan, day_number=day_number).first()
                            
                            fields = {
                                'program': plan,
                                'name': name,
                                'day_number': day_number,
                                'day_of_week': str(row[3]).strip() if row[3] else '',
                                'is_rest_day': parse_bool(row[4], default=False),
                                'duration_minutes': int(row[5]) if row[5] else None,
                                'focus': str(row[6]).strip() if row[6] else '',
                                'notes': str(row[7]).strip() if row[7] else '',
                                'order_index': int(row[8]) if row[8] else day_number,
                            }
                            
                            if day:
                                for k, v in fields.items():
                                    setattr(day, k, v)
                                day.save()
                                stats['days']['updated'] += 1
                            else:
                                day = WorkoutDay.objects.create(**fields)
                                stats['days']['created'] += 1
                            
                        except Exception as e:
                            errors.append(f"Días - Fila {row_num}: {str(e)}")
                            stats['days']['skipped'] += 1

                # === IMPORTAR EJERCICIOS (match por Plan + Día + Orden) ===
                if 'Ejercicios' in wb.sheetnames:
                    ws_ex = wb['Ejercicios']
                    
                    for row_num, row in enumerate(ws_ex.iter_rows(min_row=2, values_only=True), start=2):
                        try:
                            if not row[0]:
                                continue

                            plan_name = str(row[0]).strip() if row[0] else ''
                            day_number = int(row[1]) if row[1] else None
                            order_index = int(row[3]) if row[3] else 1
                            exercise_name = str(row[4]).strip() if row[4] else ''

                            if not plan_name or day_number is None or not exercise_name:
                                errors.append(f"Ejercicios - Fila {row_num}: Plan, Número Día y Nombre Ejercicio son requeridos")
                                stats['exercises']['skipped'] += 1
                                continue

                            plan = WorkoutProgram.objects.filter(name=plan_name, is_template=True).first()
                            if not plan:
                                errors.append(f"Ejercicios - Fila {row_num}: Plan '{plan_name}' no encontrado")
                                stats['exercises']['skipped'] += 1
                                continue

                            day = WorkoutDay.objects.filter(program=plan, day_number=day_number).first()
                            if not day:
                                errors.append(f"Ejercicios - Fila {row_num}: Día {day_number} no encontrado en plan '{plan_name}'")
                                stats['exercises']['skipped'] += 1
                                continue

                            exercise = Exercise.objects.filter(name=exercise_name).first()
                            if not exercise:
                                errors.append(f"Ejercicios - Fila {row_num}: Ejercicio '{exercise_name}' no encontrado")
                                stats['exercises']['skipped'] += 1
                                continue

                            workout_ex = WorkoutDayExercise.objects.filter(
                                workout_day=day,
                                order_index=order_index,
                            ).first()
                            
                            fields = {
                                'workout_day': day,
                                'exercise': exercise,
                                'sets': int(row[5]) if row[5] else 3,
                                'reps': str(row[6]).strip() if row[6] else '10',
                                'weight': str(row[7]).strip() if row[7] else '',
                                'duration_seconds': int(row[8]) if row[8] else None,
                                'rest_seconds': int(row[9]) if row[9] else 60,
                                'notes': str(row[10]).strip() if row[10] else '',
                                'order_index': order_index,
                                'superset_group': int(row[11]) if row[11] else None,
                            }
                            
                            if workout_ex:
                                for k, v in fields.items():
                                    setattr(workout_ex, k, v)
                                workout_ex.save()
                                stats['exercises']['updated'] += 1
                            else:
                                workout_ex = WorkoutDayExercise.objects.create(**fields)
                                stats['exercises']['created'] += 1
                            
                        except Exception as e:
                            errors.append(f"Ejercicios - Fila {row_num}: {str(e)}")
                            stats['exercises']['skipped'] += 1

                # === IMPORTAR SUSTITUTOS (match por nombre ejercicio) ===
                if 'Sustitutos' in wb.sheetnames:
                    ws_subs = wb['Sustitutos']
                    
                    for row_num, row in enumerate(ws_subs.iter_rows(min_row=2, values_only=True), start=2):
                        try:
                            if not row[0]:
                                continue

                            exercise_name = str(row[0]).strip() if row[0] else ''
                            substitute_name = str(row[1]).strip() if row[1] else ''

                            if not exercise_name or not substitute_name:
                                errors.append(f"Sustitutos - Fila {row_num}: Nombre Ejercicio y Nombre Sustituto son requeridos")
                                stats['substitutes']['skipped'] += 1
                                continue

                            exercise = Exercise.objects.filter(name=exercise_name).first()
                            if not exercise:
                                errors.append(f"Sustitutos - Fila {row_num}: Ejercicio '{exercise_name}' no encontrado")
                                stats['substitutes']['skipped'] += 1
                                continue

                            substitute = Exercise.objects.filter(name=substitute_name).first()
                            if not substitute:
                                errors.append(f"Sustitutos - Fila {row_num}: Sustituto '{substitute_name}' no encontrado")
                                stats['substitutes']['skipped'] += 1
                                continue
                            
                            # Buscar sustitución existente
                            sub_relation = ExerciseSubstitution.objects.filter(
                                exercise=exercise, 
                                substitute=substitute
                            ).first()
                            
                            fields = {
                                'exercise': exercise,
                                'substitute': substitute,
                                'priority': int(row[2]) if row[2] else 1,
                                'notes': str(row[3]).strip() if row[3] else '',
                            }
                            
                            if sub_relation:
                                sub_relation.priority = fields['priority']
                                sub_relation.notes = fields['notes']
                                sub_relation.save()
                                stats['substitutes']['updated'] += 1
                            else:
                                ExerciseSubstitution.objects.create(**fields)
                                stats['substitutes']['created'] += 1
                                
                        except Exception as e:
                            errors.append(f"Sustitutos - Fila {row_num}: {str(e)}")
                            stats['substitutes']['skipped'] += 1

            return Response({
                'message': 'Importación completada exitosamente',
                'stats': stats,
                'errors': errors if errors else None
            })
            
        except Exception as e:
            import traceback
            return Response({
                'error': str(e),
                'traceback': traceback.format_exc()
            }, status=status.HTTP_400_BAD_REQUEST)
