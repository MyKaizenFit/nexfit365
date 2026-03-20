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

    def _get_export_plans(self):
        return WorkoutProgram.objects.all().select_related('user', 'created_by').prefetch_related(
            'days__exercises__exercise'
        )

    def _get_plan_category(self, plan: WorkoutProgram):
        if getattr(plan, 'user_id', None):
            return 'Usuario'
        if getattr(plan, 'is_system', False):
            return 'Sistema'
        if getattr(plan, 'is_template', False):
            return 'Plantilla'
        return 'Otro'
    
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Exporta CSV completo: plan + día + ejercicio + sustitutos (sin IDs), en español."""
        try:
            difficulty_map = {
                'beginner': 'Principiante',
                'intermediate': 'Intermedio',
                'advanced': 'Avanzado',
            }
            goal_map = {
                'weight_loss': 'Pérdida de peso',
                'muscle_gain': 'Ganancia muscular',
                'strength': 'Fuerza',
                'endurance': 'Resistencia',
                'general_fitness': 'Fitness general',
                'body_recomposition': 'Recomposición corporal',
            }
            location_map = {
                'gym': 'Gimnasio',
                'home': 'Casa',
                'outdoor': 'Exterior',
                'any': 'Cualquier lugar',
            }
            day_map = {
                'monday': 'Lunes',
                'tuesday': 'Martes',
                'wednesday': 'Miércoles',
                'thursday': 'Jueves',
                'friday': 'Viernes',
                'saturday': 'Sábado',
                'sunday': 'Domingo',
            }

            def to_spanish(value, mapping):
                key = (value or '').strip().lower()
                return mapping.get(key, value or '')

            plans = self._get_export_plans()

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
                'categoria_plan', 'usuario_referencia', 'creado_por',
                'nombre_plan', 'descripcion_plan', 'dificultad_plan', 'objetivo_plan', 'ubicacion_plan',
                'duracion_semanas_plan', 'dias_por_semana_plan', 'duracion_estimada_minutos_plan',
                'equipo_necesario_plan', 'etiquetas_plan', 'imagen_url_plan', 'plan_activo', 'plan_plantilla',
                'numero_dia', 'nombre_dia', 'dia_semana', 'dia_descanso', 'duracion_dia_minutos',
                'enfoque_dia', 'notas_dia', 'orden_dia',
                'orden_ejercicio', 'nombre_ejercicio', 'series', 'reps', 'peso',
                'duracion_segundos', 'descanso_segundos', 'notas_ejercicio', 'grupo_superset',
                'sustitutos'
            ])

            writer.writeheader()
            for plan in plans:
                base_row = {
                    'categoria_plan': self._get_plan_category(plan),
                    'usuario_referencia': getattr(plan.user, 'email', '') or '',
                    'creado_por': getattr(plan.created_by, 'email', '') or '',
                    'nombre_plan': plan.name or '',
                    'descripcion_plan': plan.description or '',
                    'dificultad_plan': to_spanish(plan.difficulty, difficulty_map),
                    'objetivo_plan': to_spanish(plan.goal, goal_map),
                    'ubicacion_plan': to_spanish(plan.location, location_map),
                    'duracion_semanas_plan': plan.duration_weeks or 4,
                    'dias_por_semana_plan': plan.days_per_week or 3,
                    'duracion_estimada_minutos_plan': plan.estimated_duration_minutes or 60,
                    'equipo_necesario_plan': ', '.join(plan.equipment_needed or []),
                    'etiquetas_plan': ', '.join(plan.tags or []),
                    'imagen_url_plan': plan.image_url or '',
                    'plan_activo': 'Sí' if plan.is_active else 'No',
                    'plan_plantilla': 'Sí' if plan.is_template else 'No',
                }

                days = list(plan.days.all().order_by('order_index', 'day_number'))
                if not days:
                    writer.writerow(base_row)
                    continue

                for day in days:
                    day_row = {
                        **base_row,
                        'numero_dia': day.day_number,
                        'nombre_dia': day.name or '',
                        'dia_semana': to_spanish(day.day_of_week, day_map),
                        'dia_descanso': 'Sí' if day.is_rest_day else 'No',
                        'duracion_dia_minutos': day.duration_minutes or '',
                        'enfoque_dia': day.focus or '',
                        'notas_dia': day.notes or '',
                        'orden_dia': day.order_index,
                    }

                    day_exercises = list(day.exercises.all().select_related('exercise').order_by('order_index'))
                    if not day_exercises:
                        writer.writerow(day_row)
                        continue

                    for workout_exercise in day_exercises:
                        substitutes = substitutions_map.get(str(workout_exercise.exercise_id), [])
                        writer.writerow({
                            **day_row,
                            'orden_ejercicio': workout_exercise.order_index,
                            'nombre_ejercicio': workout_exercise.exercise.name,
                            'series': workout_exercise.sets or 3,
                            'reps': workout_exercise.reps or '10',
                            'peso': workout_exercise.weight or '',
                            'duracion_segundos': workout_exercise.duration_seconds or '',
                            'descanso_segundos': workout_exercise.rest_seconds or 60,
                            'notas_ejercicio': workout_exercise.notes or '',
                            'grupo_superset': workout_exercise.superset_group or '',
                            'sustitutos': ' | '.join(substitutes),
                        })

            response = HttpResponse(output.getvalue(), content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = 'attachment; filename="workout_plans_export.csv"'
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Exporta planes completos a Excel sin IDs (editable por negocio)."""
        try:
            def parse_bool_label(value):
                return 'Sí' if value else 'No'

            difficulty_map = {
                'beginner': 'Principiante',
                'intermediate': 'Intermedio',
                'advanced': 'Avanzado',
            }
            goal_map = {
                'weight_loss': 'Pérdida de peso',
                'muscle_gain': 'Ganancia muscular',
                'strength': 'Fuerza',
                'endurance': 'Resistencia',
                'general_fitness': 'Fitness general',
                'body_recomposition': 'Recomposición corporal',
            }
            location_map = {
                'gym': 'Gimnasio',
                'home': 'Casa',
                'outdoor': 'Exterior',
                'any': 'Cualquier lugar',
            }
            day_map = {
                'monday': 'Lunes',
                'tuesday': 'Martes',
                'wednesday': 'Miércoles',
                'thursday': 'Jueves',
                'friday': 'Viernes',
                'saturday': 'Sábado',
                'sunday': 'Domingo',
            }

            def to_spanish(value, mapping):
                key = (value or '').strip().lower()
                return mapping.get(key, value or '')

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
                'Categoría Plan', 'Usuario Referencia', 'Creado Por', 'Nombre Plan', 'Descripción Plan', 'Dificultad', 'Objetivo', 'Ubicación',
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
                'Categoría', 'Usuario Referencia', 'Creado Por', 'Nombre', 'Descripción', 'Dificultad', 'Objetivo', 'Ubicación',
                'Semanas', 'Días/Semana', 'Duración (min)', 'Equipo (coma separado)',
                'Tags (coma separado)', 'Imagen URL', 'Activo', 'Plantilla'
            ])
            apply_header_style(ws_plans)
            
            plans = list(self._get_export_plans())
            base_plans = [plan for plan in plans if not getattr(plan, 'user_id', None)]
            user_plans = [plan for plan in plans if getattr(plan, 'user_id', None)]
            for plan in plans:
                ws_plans.append([
                    self._get_plan_category(plan),
                    getattr(plan.user, 'email', '') or '',
                    getattr(plan.created_by, 'email', '') or '',
                    plan.name or '',
                    plan.description or '',
                    to_spanish(plan.difficulty or 'beginner', difficulty_map),
                    to_spanish(plan.goal or '', goal_map),
                    to_spanish(plan.location or '', location_map),
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
                'Categoría Plan', 'Usuario Referencia', 'Nombre Plan', 'Número Día', 'Nombre Día', 'Día Semana', 'Es Descanso',
                'Duración (min)', 'Enfoque', 'Notas', 'Orden'
            ])
            apply_header_style(ws_days)
            
            for plan in plans:
                for day in plan.days.all().order_by('order_index', 'day_number'):
                    ws_days.append([
                        self._get_plan_category(plan),
                        getattr(plan.user, 'email', '') or '',
                        plan.name,
                        day.day_number,
                        day.name or '',
                        to_spanish(day.day_of_week or '', day_map),
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
                'Categoría Plan', 'Usuario Referencia', 'Nombre Plan', 'Número Día', 'Nombre Día', 'Orden', 'Nombre Ejercicio',
                'Series', 'Reps', 'Peso', 'Duración (seg)', 'Descanso (seg)',
                'Notas', 'Grupo Superset'
            ])
            apply_header_style(ws_exercises)
            
            for plan in plans:
                for day in plan.days.all().order_by('order_index', 'day_number'):
                    for exercise in day.exercises.all().select_related('exercise').order_by('order_index'):
                        ws_exercises.append([
                            self._get_plan_category(plan),
                            getattr(plan.user, 'email', '') or '',
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

            ws_user_plans = wb.create_sheet("Planes_Usuario")
            ws_user_plans.append([
                'Usuario Referencia', 'Creado Por', 'Nombre', 'Descripción', 'Dificultad', 'Objetivo', 'Ubicación',
                'Semanas', 'Días/Semana', 'Duración (min)', 'Activo'
            ])
            apply_header_style(ws_user_plans)
            for plan in user_plans:
                ws_user_plans.append([
                    getattr(plan.user, 'email', '') or '',
                    getattr(plan.created_by, 'email', '') or '',
                    plan.name or '',
                    plan.description or '',
                    to_spanish(plan.difficulty or 'beginner', difficulty_map),
                    to_spanish(plan.goal or '', goal_map),
                    to_spanish(plan.location or '', location_map),
                    plan.duration_weeks or 4,
                    plan.days_per_week or 3,
                    plan.estimated_duration_minutes or 60,
                    parse_bool_label(plan.is_active),
                ])
            auto_adjust_columns(ws_user_plans)

            ws_base_plans = wb.create_sheet("Planes_Base")
            ws_base_plans.append([
                'Categoría', 'Nombre', 'Descripción', 'Dificultad', 'Objetivo', 'Ubicación',
                'Semanas', 'Días/Semana', 'Duración (min)', 'Activo', 'Plantilla'
            ])
            apply_header_style(ws_base_plans)
            for plan in base_plans:
                ws_base_plans.append([
                    self._get_plan_category(plan),
                    plan.name or '',
                    plan.description or '',
                    to_spanish(plan.difficulty or 'beginner', difficulty_map),
                    to_spanish(plan.goal or '', goal_map),
                    to_spanish(plan.location or '', location_map),
                    plan.duration_weeks or 4,
                    plan.days_per_week or 3,
                    plan.estimated_duration_minutes or 60,
                    parse_bool_label(plan.is_active),
                    parse_bool_label(plan.is_template),
                ])
            auto_adjust_columns(ws_base_plans)

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
                        self._get_plan_category(plan),
                        getattr(plan.user, 'email', '') or '',
                        getattr(plan.created_by, 'email', '') or '',
                        plan.name or '',
                        plan.description or '',
                        to_spanish(plan.difficulty or '', difficulty_map),
                        to_spanish(plan.goal or '', goal_map),
                        to_spanish(plan.location or '', location_map),
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
                            self._get_plan_category(plan),
                            getattr(plan.user, 'email', '') or '',
                            getattr(plan.created_by, 'email', '') or '',
                            plan.name or '',
                            plan.description or '',
                            to_spanish(plan.difficulty or '', difficulty_map),
                            to_spanish(plan.goal or '', goal_map),
                            to_spanish(plan.location or '', location_map),
                            plan.duration_weeks or 4,
                            plan.days_per_week or 3,
                            plan.estimated_duration_minutes or 60,
                            day.day_number,
                            day.name or '',
                            to_spanish(day.day_of_week or '', day_map),
                            parse_bool_label(day.is_rest_day),
                            '', '', '', '', '', '', '', '', ''
                        ])
                        continue

                    for exercise in day_exercises:
                        substitutes = summary_substitutions_map.get(str(exercise.exercise_id), [])
                        ws_summary.append([
                            self._get_plan_category(plan),
                            getattr(plan.user, 'email', '') or '',
                            getattr(plan.created_by, 'email', '') or '',
                            plan.name or '',
                            plan.description or '',
                            to_spanish(plan.difficulty or '', difficulty_map),
                            to_spanish(plan.goal or '', goal_map),
                            to_spanish(plan.location or '', location_map),
                            plan.duration_weeks or 4,
                            plan.days_per_week or 3,
                            plan.estimated_duration_minutes or 60,
                            day.day_number,
                            day.name or '',
                            to_spanish(day.day_of_week or '', day_map),
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
            
            ws_ref.append(['Dificultad', 'Principiante, Intermedio, Avanzado', 'Nivel de dificultad'])
            ws_ref.append(['Objetivo', 'Pérdida de peso, Ganancia muscular, Fuerza, Resistencia, Fitness general, Recomposición corporal', 'Objetivo del plan'])
            ws_ref.append(['Ubicación', 'Gimnasio, Casa, Exterior, Cualquier lugar', 'Lugar de entrenamiento'])
            ws_ref.append(['Día Semana', 'Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo', 'Día de la semana'])
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
            response['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response['Pragma'] = 'no-cache'
            response['Expires'] = '0'
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

        difficulty_map = {
            'principiante': 'beginner',
            'intermedio': 'intermediate',
            'avanzado': 'advanced',
        }
        goal_map = {
            'pérdida de peso': 'weight_loss',
            'perdida de peso': 'weight_loss',
            'ganancia muscular': 'muscle_gain',
            'fuerza': 'strength',
            'resistencia': 'endurance',
            'fitness general': 'general_fitness',
            'recomposición corporal': 'body_recomposition',
            'recomposicion corporal': 'body_recomposition',
        }
        location_map = {
            'gimnasio': 'gym',
            'casa': 'home',
            'exterior': 'outdoor',
            'cualquier lugar': 'any',
        }
        day_map = {
            'lunes': 'monday',
            'martes': 'tuesday',
            'miércoles': 'wednesday',
            'miercoles': 'wednesday',
            'jueves': 'thursday',
            'viernes': 'friday',
            'sábado': 'saturday',
            'sabado': 'saturday',
            'domingo': 'sunday',
        }

        complete_aliases = {
            'plan_name': ['plan_name', 'nombre_plan'],
            'plan_description': ['plan_description', 'descripcion_plan', 'descripción_plan'],
            'plan_difficulty': ['plan_difficulty', 'dificultad_plan'],
            'plan_goal': ['plan_goal', 'objetivo_plan'],
            'plan_location': ['plan_location', 'ubicacion_plan', 'ubicación_plan'],
            'plan_duration_weeks': ['plan_duration_weeks', 'duracion_semanas_plan', 'duración_semanas_plan'],
            'plan_days_per_week': ['plan_days_per_week', 'dias_por_semana_plan', 'días_por_semana_plan'],
            'plan_estimated_duration_minutes': ['plan_estimated_duration_minutes', 'duracion_estimada_minutos_plan', 'duración_estimada_minutos_plan'],
            'plan_equipment_needed': ['plan_equipment_needed', 'equipo_necesario_plan'],
            'plan_tags': ['plan_tags', 'etiquetas_plan'],
            'plan_image_url': ['plan_image_url', 'imagen_url_plan'],
            'plan_is_active': ['plan_is_active', 'plan_activo'],
            'plan_is_template': ['plan_is_template', 'plan_plantilla'],
            'day_number': ['day_number', 'numero_dia', 'número_dia'],
            'day_name': ['day_name', 'nombre_dia', 'nombre_día'],
            'day_of_week': ['day_of_week', 'dia_semana', 'día_semana'],
            'day_is_rest_day': ['day_is_rest_day', 'dia_descanso', 'día_descanso'],
            'day_duration_minutes': ['day_duration_minutes', 'duracion_dia_minutos', 'duración_dia_minutos'],
            'day_focus': ['day_focus', 'enfoque_dia', 'enfoque_día'],
            'day_notes': ['day_notes', 'notas_dia', 'notas_día'],
            'day_order': ['day_order', 'orden_dia', 'orden_día'],
            'exercise_order': ['exercise_order', 'orden_ejercicio'],
            'exercise_name': ['exercise_name', 'nombre_ejercicio'],
            'sets': ['sets', 'series'],
            'reps': ['reps'],
            'weight': ['weight', 'peso'],
            'duration_seconds': ['duration_seconds', 'duracion_segundos', 'duración_segundos'],
            'rest_seconds': ['rest_seconds', 'descanso_segundos'],
            'exercise_notes': ['exercise_notes', 'notas_ejercicio'],
            'superset_group': ['superset_group', 'grupo_superset'],
            'substitutes': ['substitutes', 'sustitutos'],
        }

        simple_aliases = {
            'name': ['name', 'nombre'],
            'description': ['description', 'descripcion', 'descripción'],
            'difficulty': ['difficulty', 'dificultad'],
            'goal': ['goal', 'objetivo'],
            'location': ['location', 'ubicacion', 'ubicación'],
            'duration_weeks': ['duration_weeks', 'duracion_semanas', 'duración_semanas'],
            'days_per_week': ['days_per_week', 'dias_por_semana', 'días_por_semana'],
            'estimated_duration_minutes': ['estimated_duration_minutes', 'duracion_estimada_minutos', 'duración_estimada_minutos'],
            'equipment_needed': ['equipment_needed', 'equipo_necesario'],
            'tags': ['tags', 'etiquetas'],
            'image_url': ['image_url', 'imagen_url'],
            'is_active': ['is_active', 'activo'],
            'is_template': ['is_template', 'plantilla'],
        }

        def normalize_choice(value, translation_map):
            normalized = (value or '').strip().lower()
            return translation_map.get(normalized, (value or '').strip())

        def get_value(row, aliases, default=''):
            for key in aliases:
                if key in row and row.get(key) not in [None, '']:
                    return row.get(key)
            return default

        reader = csv.DictReader(decoded.splitlines())
        created, updated, skipped = 0, 0, 0
        errors = []

        fieldnames = {str(name).strip().lower() for name in (reader.fieldnames or [])}
        is_complete_format = 'plan_name' in fieldnames or 'nombre_plan' in fieldnames

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
                        plan_name = str(get_value(row, complete_aliases['plan_name'], '') or '').strip()
                        if not plan_name:
                            errors.append(f"Fila {row_num}: 'plan_name'/'nombre_plan' es requerido")
                            stats['plans']['skipped'] += 1
                            skipped += 1
                            continue

                        plan = WorkoutProgram.objects.filter(name=plan_name, is_template=True).first()
                        plan_fields = {
                            'name': plan_name,
                            'description': str(get_value(row, complete_aliases['plan_description'], '') or '').strip(),
                            'difficulty': normalize_choice(str(get_value(row, complete_aliases['plan_difficulty'], 'beginner') or 'beginner'), difficulty_map) or 'beginner',
                            'goal': normalize_choice(str(get_value(row, complete_aliases['plan_goal'], 'general_fitness') or 'general_fitness'), goal_map) or 'general_fitness',
                            'location': normalize_choice(str(get_value(row, complete_aliases['plan_location'], 'any') or 'any'), location_map) or 'any',
                            'duration_weeks': parse_int(get_value(row, complete_aliases['plan_duration_weeks']), default=4),
                            'days_per_week': parse_int(get_value(row, complete_aliases['plan_days_per_week']), default=3),
                            'estimated_duration_minutes': parse_int(get_value(row, complete_aliases['plan_estimated_duration_minutes']), default=60),
                            'equipment_needed': parse_list(get_value(row, complete_aliases['plan_equipment_needed'])),
                            'tags': parse_list(get_value(row, complete_aliases['plan_tags'])),
                            'image_url': str(get_value(row, complete_aliases['plan_image_url'], '') or '').strip(),
                            'is_active': parse_bool(get_value(row, complete_aliases['plan_is_active']), default=True),
                            'is_template': parse_bool(get_value(row, complete_aliases['plan_is_template']), default=True),
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

                        day_number = parse_int(get_value(row, complete_aliases['day_number']), default=None)
                        if day_number is None:
                            continue

                        day = WorkoutDay.objects.filter(program=plan, day_number=day_number).first()
                        day_fields = {
                            'program': plan,
                            'day_number': day_number,
                            'name': (str(get_value(row, complete_aliases['day_name'], f'Día {day_number}') or f'Día {day_number}').strip()) or f'Día {day_number}',
                            'day_of_week': normalize_choice(str(get_value(row, complete_aliases['day_of_week'], '') or '').strip(), day_map),
                            'is_rest_day': parse_bool(get_value(row, complete_aliases['day_is_rest_day']), default=False),
                            'duration_minutes': parse_int(get_value(row, complete_aliases['day_duration_minutes']), default=None),
                            'focus': str(get_value(row, complete_aliases['day_focus'], '') or '').strip(),
                            'notes': str(get_value(row, complete_aliases['day_notes'], '') or '').strip(),
                            'order_index': parse_int(get_value(row, complete_aliases['day_order']), default=day_number),
                        }

                        if day:
                            for key, value in day_fields.items():
                                setattr(day, key, value)
                            day.save()
                            stats['days']['updated'] += 1
                        else:
                            day = WorkoutDay.objects.create(**day_fields)
                            stats['days']['created'] += 1

                        exercise_name = str(get_value(row, complete_aliases['exercise_name'], '') or '').strip()
                        if not exercise_name:
                            continue

                        exercise = Exercise.objects.filter(name=exercise_name).first()
                        if not exercise:
                            errors.append(f"Fila {row_num}: Ejercicio '{exercise_name}' no encontrado")
                            stats['exercises']['skipped'] += 1
                            skipped += 1
                            continue

                        exercise_order = parse_int(get_value(row, complete_aliases['exercise_order']), default=1)
                        workout_exercise = WorkoutDayExercise.objects.filter(
                            workout_day=day,
                            order_index=exercise_order,
                        ).first()

                        exercise_fields = {
                            'workout_day': day,
                            'exercise': exercise,
                            'sets': parse_int(get_value(row, complete_aliases['sets']), default=3),
                            'reps': (str(get_value(row, complete_aliases['reps'], '10') or '10').strip()) or '10',
                            'weight': str(get_value(row, complete_aliases['weight'], '') or '').strip(),
                            'duration_seconds': parse_int(get_value(row, complete_aliases['duration_seconds']), default=None),
                            'rest_seconds': parse_int(get_value(row, complete_aliases['rest_seconds']), default=60),
                            'notes': str(get_value(row, complete_aliases['exercise_notes'], '') or '').strip(),
                            'order_index': exercise_order,
                            'superset_group': parse_int(get_value(row, complete_aliases['superset_group']), default=None),
                        }

                        if workout_exercise:
                            for key, value in exercise_fields.items():
                                setattr(workout_exercise, key, value)
                            workout_exercise.save()
                            stats['exercises']['updated'] += 1
                        else:
                            WorkoutDayExercise.objects.create(**exercise_fields)
                            stats['exercises']['created'] += 1

                        substitutes_raw = str(get_value(row, complete_aliases['substitutes'], '') or '').strip()
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
                name = str(get_value(row, simple_aliases['name'], '') or '').strip()
                if not name:
                    errors.append(f"Fila {row_num}: 'name'/'nombre' es requerido")
                    skipped += 1
                    continue

                plan = WorkoutProgram.objects.filter(name=name, is_template=True).first()
                fields = {
                    'description': str(get_value(row, simple_aliases['description'], '') or '').strip(),
                    'difficulty': normalize_choice(str(get_value(row, simple_aliases['difficulty'], 'beginner') or 'beginner'), difficulty_map) or 'beginner',
                    'goal': normalize_choice(str(get_value(row, simple_aliases['goal'], 'general_fitness') or 'general_fitness'), goal_map) or 'general_fitness',
                    'location': normalize_choice(str(get_value(row, simple_aliases['location'], 'any') or 'any'), location_map) or 'any',
                    'duration_weeks': parse_int(get_value(row, simple_aliases['duration_weeks']), default=4),
                    'days_per_week': parse_int(get_value(row, simple_aliases['days_per_week']), default=3),
                    'estimated_duration_minutes': parse_int(get_value(row, simple_aliases['estimated_duration_minutes']), default=60),
                    'equipment_needed': parse_list(get_value(row, simple_aliases['equipment_needed'])),
                    'tags': parse_list(get_value(row, simple_aliases['tags'])),
                    'image_url': str(get_value(row, simple_aliases['image_url'], '') or '').strip(),
                    'is_active': parse_bool(get_value(row, simple_aliases['is_active'], 'true'), default=True),
                    'is_template': parse_bool(get_value(row, simple_aliases['is_template'], 'true'), default=True),
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

            difficulty_map = {
                'principiante': 'beginner',
                'intermedio': 'intermediate',
                'avanzado': 'advanced',
            }
            goal_map = {
                'pérdida de peso': 'weight_loss',
                'perdida de peso': 'weight_loss',
                'ganancia muscular': 'muscle_gain',
                'fuerza': 'strength',
                'resistencia': 'endurance',
                'fitness general': 'general_fitness',
                'recomposición corporal': 'body_recomposition',
                'recomposicion corporal': 'body_recomposition',
            }
            location_map = {
                'gimnasio': 'gym',
                'casa': 'home',
                'exterior': 'outdoor',
                'cualquier lugar': 'any',
            }
            day_map = {
                'lunes': 'monday',
                'martes': 'tuesday',
                'miércoles': 'wednesday',
                'miercoles': 'wednesday',
                'jueves': 'thursday',
                'viernes': 'friday',
                'sábado': 'saturday',
                'sabado': 'saturday',
                'domingo': 'sunday',
            }

            def normalize_choice(value, translation_map):
                normalized = str(value).strip().lower() if value is not None else ''
                return translation_map.get(normalized, str(value).strip() if value is not None else '')

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
                                'difficulty': normalize_choice(str(row[2]).strip() if row[2] else 'beginner', difficulty_map) or 'beginner',
                                'goal': normalize_choice(str(row[3]).strip() if row[3] else 'general_fitness', goal_map) or 'general_fitness',
                                'location': normalize_choice(str(row[4]).strip() if row[4] else 'any', location_map) or 'any',
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
                                'day_of_week': normalize_choice(str(row[3]).strip() if row[3] else '', day_map),
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
