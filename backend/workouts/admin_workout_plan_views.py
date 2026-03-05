# workouts/admin_workout_plan_views.py
"""
Views para export/import de planes de entrenamiento
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
import csv
import io
from datetime import datetime

from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

from .models import WorkoutProgram, Exercise


class AdminWorkoutPlanExportImportViewSet(viewsets.GenericViewSet):
    """ViewSet para export/import de planes de entrenamiento"""
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """Exporta todos los planes de entrenamiento a CSV"""
        try:
            plans = WorkoutProgram.objects.filter(is_system=True).values(
                'id', 'name', 'description', 'difficulty', 'goal', 'location',
                'duration_weeks', 'estimated_duration_minutes', 'is_active', 'is_template'
            )

            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=[
                'id', 'name', 'description', 'difficulty', 'goal', 'location',
                'duration_weeks', 'estimated_duration_minutes', 'is_active', 'is_template'
            ])
            
            writer.writeheader()
            for plan in plans:
                writer.writerow({
                    'id': plan['id'],
                    'name': plan['name'] or '',
                    'description': plan['description'] or '',
                    'difficulty': plan['difficulty'] or '',
                    'goal': plan['goal'] or '',
                    'location': plan['location'] or '',
                    'duration_weeks': plan['duration_weeks'] or 4,
                    'estimated_duration_minutes': plan['estimated_duration_minutes'] or 60,
                    'is_active': 'true' if plan['is_active'] else 'false',
                    'is_template': 'true' if plan['is_template'] else 'false',
                })

            response = Response(output.getvalue(), content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = 'attachment; filename="workout_plans_export.csv"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def export_excel(self, request):
        """Exporta todos los planes de entrenamiento a Excel con 2 hojas"""
        try:
            wb = Workbook()
            ws = wb.active
            ws.title = "Planes"

            # Headers
            headers = ['ID', 'Nombre', 'Descripción', 'Dificultad', 'Objetivo', 
                      'Ubicación', 'Semanas', 'Duración (min)', 'Activo', 'Plantilla']
            ws.append(headers)

            # Estilos para header
            header_fill = PatternFill(start_color="4472C4", end_color="4472C4", fill_type="solid")
            header_font = Font(bold=True, color="FFFFFF")

            for cell in ws[1]:
                cell.fill = header_fill
                cell.font = header_font
                cell.alignment = Alignment(horizontal='center', vertical='center')

            # Datos
            plans = WorkoutProgram.objects.filter(is_system=True).values(
                'id', 'name', 'description', 'difficulty', 'goal', 'location',
                'duration_weeks', 'estimated_duration_minutes', 'is_active', 'is_template'
            )

            for plan in plans:
                ws.append([
                    str(plan['id']),
                    plan['name'] or '',
                    plan['description'] or '',
                    plan['difficulty'] or '',
                    plan['goal'] or '',
                    plan['location'] or '',
                    plan['duration_weeks'] or 4,
                    plan['estimated_duration_minutes'] or 60,
                    'Sí' if plan['is_active'] else 'No',
                    'Sí' if plan['is_template'] else 'No',
                ])

            # Auto-adjust column widths
            for column in ws.columns:
                max_length = 0
                column_letter = column[0].column_letter
                for cell in column:
                    try:
                        if len(str(cell.value)) > max_length:
                            max_length = len(str(cell.value))
                    except:
                        pass
                ws.column_dimensions[column_letter].width = min(max_length + 2, 50)

            # Segunda hoja: Referencias
            ws_ref = wb.create_sheet("Referencias")
            
            # Dificultades
            ws_ref.append(['Dificultades Disponibles'])
            for diff in ['beginner', 'intermediate', 'advanced']:
                ws_ref.append([diff])
            
            # Objetivos
            ws_ref.append(['Objetivos Disponibles'])
            objectives = ['weight_loss', 'muscle_gain', 'strength_building', 'endurance', 'general_fitness']
            for obj in objectives:
                ws_ref.append([obj])
            
            # Ubicaciones
            ws_ref.append(['Ubicaciones Disponibles'])
            for loc in ['home', 'gym']:
                ws_ref.append([loc])

            output = io.BytesIO()
            wb.save(output)
            output.seek(0)

            response = Response(output.getvalue(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename="workout_plans_export.xlsx"'
            return response
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def import_csv(self, request):
        """Importa planes de entrenamiento desde CSV"""
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'Archivo no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded = file.read().decode('utf-8')
        except UnicodeDecodeError:
            return Response({'error': 'El archivo debe estar en formato UTF-8'}, status=status.HTTP_400_BAD_REQUEST)

        reader = csv.DictReader(decoded.splitlines())
        created, updated, skipped = 0, 0, 0
        errors = []

        for row_num, row in enumerate(reader, start=2):
            try:
                name = row.get('name', '').strip()
                if not name:
                    errors.append(f"Fila {row_num}: 'name' es requerido")
                    skipped += 1
                    continue

                plan = WorkoutProgram.objects.filter(name=name).first()
                fields = {
                    'description': row.get('description', '').strip(),
                    'difficulty': row.get('difficulty', 'beginner').strip(),
                    'goal': row.get('goal', '').strip(),
                    'location': row.get('location', '').strip(),
                    'duration_weeks': int(row.get('duration_weeks', 4)) if row.get('duration_weeks') else 4,
                    'estimated_duration_minutes': int(row.get('estimated_duration_minutes', 60)) if row.get('estimated_duration_minutes') else 60,
                    'is_active': row.get('is_active', 'true').lower() in ['true', '1', 'yes'],
                    'is_template': row.get('is_template', 'true').lower() in ['true', '1', 'yes'],
                    'is_system': True,
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
        """Importa planes de entrenamiento desde Excel"""
        file = request.FILES.get('file')
        if not file:
            return Response({'error': 'Archivo no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            from openpyxl import load_workbook
            wb = load_workbook(file)
            ws = wb.active
            
            created, updated, skipped = 0, 0, 0
            errors = []

            # Ignorar header
            for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                try:
                    if not row[0] or row[0] is None:  # Skip empty rows
                        continue

                    name = str(row[1]).strip() if row[1] else None
                    if not name:
                        errors.append(f"Fila {row_num}: 'name' es requerido")
                        skipped += 1
                        continue

                    plan = WorkoutProgram.objects.filter(name=name).first()
                    fields = {
                        'description': str(row[2]).strip() if row[2] else '',
                        'difficulty': str(row[3]).strip() if row[3] else 'beginner',
                        'goal': str(row[4]).strip() if row[4] else '',
                        'location': str(row[5]).strip() if row[5] else '',
                        'duration_weeks': int(row[6]) if row[6] else 4,
                        'estimated_duration_minutes': int(row[7]) if row[7] else 60,
                        'is_active': str(row[8]).lower() in ['sí', 'true', '1', 'yes'] if row[8] else True,
                        'is_template': str(row[9]).lower() in ['sí', 'true', '1', 'yes'] if row[9] else True,
                        'is_system': True,
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
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
