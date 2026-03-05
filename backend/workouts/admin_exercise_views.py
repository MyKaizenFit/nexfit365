# workouts/admin_exercise_views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAdminUser
from django.db.models import Count, Q
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import timedelta

from .models import Exercise, ExerciseSubstitution
from .serializers import ExerciseSerializer
from accounts.permissions import IsAdminOrStaff


class LargeResultsSetPagination(PageNumberPagination):
    """Paginación personalizada para listados grandes"""
    page_size = 1000  # Devolver hasta 1000 elementos por defecto
    page_size_query_param = 'page_size'
    max_page_size = 10000


class AdminExerciseViewSet(viewsets.ModelViewSet):
    @action(detail=False, methods=['post'], url_path='import-csv')
    def import_csv(self, request):
                """Importa ejercicios desde un archivo CSV. Solo añade o modifica, nunca elimina.
                
                Formato esperado:
                - name (requerido): Nombre del ejercicio
                - description: Descripción detallada
                - instructions: Instrucciones paso a paso
                - category: Categoría (cardio, strength, flexibility, etc.)
                - muscle_groups: Grupos musculares separados por comas
                - equipment: Equipamiento separado por comas
                - difficulty: beginner, intermediate, advanced
                - video_url: URL del video
                - google_drive_file_id: ID del archivo en Google Drive
                - is_system: True/False (ejercicios del sistema)
                - is_active: True/False (ejercicio activo)
                - tags: Tags separados por comas
                """
                import csv
                from django.core.files.uploadedfile import UploadedFile
                
                file = request.FILES.get('file')
                if not file or not isinstance(file, UploadedFile):
                    return Response({'error': 'Archivo CSV no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)
                
                try:
                    decoded = file.read().decode('utf-8')
                except UnicodeDecodeError:
                    return Response({'error': 'El archivo debe estar en formato UTF-8'}, status=status.HTTP_400_BAD_REQUEST)
                
                reader = csv.DictReader(decoded.splitlines())
                updated, created, skipped = 0, 0, 0
                errors = []
                
                for row_num, row in enumerate(reader, start=2):
                    try:
                        name = row.get('name', '').strip()
                        if not name:
                            errors.append(f"Fila {row_num}: 'name' es requerido")
                            skipped += 1
                            continue
                        
                        exercise = Exercise.objects.filter(name=name).first()
                        fields = {
                            'description': row.get('description', '').strip(),
                            'instructions': row.get('instructions', '').strip(),
                            'category': row.get('category', '').strip(),
                            'muscle_groups': [m.strip() for m in row.get('muscle_groups', '').split(',') if m.strip()],
                            'equipment': [e.strip() for e in row.get('equipment', '').split(',') if e.strip()],
                            'difficulty': row.get('difficulty', '').strip(),
                            'video_url': row.get('video_url', '').strip(),
                            'google_drive_file_id': row.get('google_drive_file_id', '').strip(),
                            'is_system': row.get('is_system', '').strip().lower() in ['true', '1', 'yes'],
                            'is_active': row.get('is_active', '').strip().lower() in ['true', '1', 'yes', ''] or row.get('is_active', '').strip() == '',
                            'tags': [t.strip() for t in row.get('tags', '').split(',') if t.strip()],
                        }
                        
                        if exercise:
                            for k, v in fields.items():
                                setattr(exercise, k, v)
                            exercise.save()
                            updated += 1
                        else:
                            Exercise.objects.create(name=name, **fields)
                            created += 1
                    except Exception as e:
                        errors.append(f"Fila {row_num}: {str(e)}")
                        skipped += 1
                
                message = f"Importación completada. {created} ejercicios creados, {updated} actualizados"
                if skipped > 0:
                    message += f", {skipped} omitidos"
                if errors:
                    message += f". {len(errors)} error(es) encontrado(s)"
                
                return Response({
                    'created': created,
                    'updated': updated,
                    'skipped': skipped,
                    'message': message,
                    'errors': errors[:10] if errors else []
                }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='import-excel')
    def import_excel(self, request):
                """Importa ejercicios desde un archivo Excel. Solo añade o modifica, nunca elimina.
                
                Lee la primera hoja del archivo Excel. La segunda hoja (Referencias) se ignora.
                
                Formato esperado (igual que CSV):
                - name (requerido): Nombre del ejercicio
                - description: Descripción detallada
                - instructions: Instrucciones paso a paso
                - category: Categoría
                - muscle_groups: Grupos musculares separados por comas
                - equipment: Equipamiento separado por comas
                - difficulty: beginner, intermediate, advanced
                - video_url: URL del video
                - google_drive_file_id: ID del archivo en Google Drive
                - is_system: True/False
                - is_active: True/False
                - tags: Tags separados por comas
                """
                import openpyxl
                from django.core.files.uploadedfile import UploadedFile
                
                file = request.FILES.get('file')
                if not file or not isinstance(file, UploadedFile):
                    return Response({'error': 'Archivo Excel no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)
                
                try:
                    wb = openpyxl.load_workbook(file)
                    ws = wb.active
                except Exception as e:
                    return Response({'error': f'Error al leer el archivo Excel: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
                
                headers = [cell.value for cell in ws[1]]
                updated, created, skipped = 0, 0, 0
                errors = []
                
                for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                    try:
                        row_dict = dict(zip(headers, row))
                        name = str(row_dict.get('name', '')).strip() if row_dict.get('name') else ''
                        
                        if not name:
                            errors.append(f"Fila {row_num}: 'name' es requerido")
                            skipped += 1
                            continue
                        
                        exercise = Exercise.objects.filter(name=name).first()
                        
                        # Función auxiliar para convertir valores a string y limpiar
                        def clean_str(val):
                            return str(val).strip() if val is not None else ''
                        
                        def to_bool(val):
                            if val is None or val == '':
                                return True  # Por defecto is_active=True
                            return str(val).lower() in ['true', '1', 'yes']
                        
                        fields = {
                            'description': clean_str(row_dict.get('description', '')),
                            'instructions': clean_str(row_dict.get('instructions', '')),
                            'category': clean_str(row_dict.get('category', '')),
                            'muscle_groups': [m.strip() for m in clean_str(row_dict.get('muscle_groups', '')).split(',') if m.strip()],
                            'equipment': [e.strip() for e in clean_str(row_dict.get('equipment', '')).split(',') if e.strip()],
                            'difficulty': clean_str(row_dict.get('difficulty', '')),
                            'video_url': clean_str(row_dict.get('video_url', '')),
                            'google_drive_file_id': clean_str(row_dict.get('google_drive_file_id', '')),
                            'is_system': to_bool(row_dict.get('is_system', False)),
                            'is_active': to_bool(row_dict.get('is_active', True)),
                            'tags': [t.strip() for t in clean_str(row_dict.get('tags', '')).split(',') if t.strip()],
                        }
                        
                        if exercise:
                            for k, v in fields.items():
                                setattr(exercise, k, v)
                            exercise.save()
                            updated += 1
                        else:
                            Exercise.objects.create(name=name, **fields)
                            created += 1
                    except Exception as e:
                        errors.append(f"Fila {row_num}: {str(e)}")
                        skipped += 1
                
                message = f"Importación completada. {created} ejercicios creados, {updated} actualizados"
                if skipped > 0:
                    message += f", {skipped} omitidos"
                if errors:
                    message += f". {len(errors)} error(es) encontrado(s)"
                
                return Response({
                    'created': created,
                    'updated': updated,
                    'skipped': skipped,
                    'message': message,
                    'errors': errors[:10] if errors else []
                }, status=status.HTTP_200_OK)
    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
            """Exporta todos los ejercicios en formato CSV"""
            import csv
            from django.http import HttpResponse
        
            exercises = self.get_queryset()
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = 'attachment; filename="exercises_export.csv"'
        
            fieldnames = [
                'name', 'description', 'instructions', 'category', 'muscle_groups',
                'equipment', 'difficulty', 'video_url', 'google_drive_file_id',
                'is_system', 'is_active', 'tags'
            ]
            writer = csv.DictWriter(response, fieldnames=fieldnames)
            writer.writeheader()
            for exercise in exercises:
                writer.writerow({
                    'name': exercise.name,
                    'description': exercise.description or '',
                    'instructions': exercise.instructions or '',
                    'category': exercise.category or '',
                    'muscle_groups': ','.join(exercise.muscle_groups or []),
                    'equipment': ','.join(exercise.equipment or []),
                    'difficulty': exercise.difficulty or '',
                    'video_url': exercise.video_url or '',
                    'google_drive_file_id': exercise.google_drive_file_id or '',
                    'is_system': exercise.is_system if hasattr(exercise, 'is_system') else False,
                    'is_active': exercise.is_active if hasattr(exercise, 'is_active') else True,
                    'tags': ','.join(exercise.tags or []),
                })
            return response

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
            """Exporta ejercicios en Excel con dos hojas:
            1. Ejercicios: Todos los ejercicios con sus detalles
            2. Referencias: Categorías, grupos musculares, equipamiento y dificultades disponibles
            """
            import io
            import xlsxwriter
            from django.http import HttpResponse
            from collections import defaultdict
        
            exercises = self.get_queryset()
            output = io.BytesIO()
            workbook = xlsxwriter.Workbook(output, {'in_memory': True})
            
            # ========== HOJA 1: EJERCICIOS ==========
            worksheet = workbook.add_worksheet('Ejercicios')
        
            headers = [
                'name', 'description', 'instructions', 'category', 'muscle_groups',
                'equipment', 'difficulty', 'video_url', 'google_drive_file_id',
                'is_system', 'is_active', 'tags'
            ]
            
            # Formato para headers
            header_format = workbook.add_format({'bold': True, 'bg_color': '#D3D3D3'})
            for col, header in enumerate(headers):
                worksheet.write(0, col, header, header_format)
            
            # Recopilar datos para la hoja de referencias
            all_categories = set()
            all_muscle_groups = set()
            all_equipment = set()
            all_difficulties = set()
            
            for row_idx, exercise in enumerate(exercises, start=1):
                # Recopilar valores únicos para referencias
                if exercise.category:
                    all_categories.add(exercise.category)
                if exercise.difficulty:
                    all_difficulties.add(exercise.difficulty)
                for mg in (exercise.muscle_groups or []):
                    all_muscle_groups.add(mg)
                for eq in (exercise.equipment or []):
                    all_equipment.add(eq)
                
                # Escribir datos del ejercicio
                worksheet.write(row_idx, 0, exercise.name)
                worksheet.write(row_idx, 1, exercise.description or '')
                worksheet.write(row_idx, 2, exercise.instructions or '')
                worksheet.write(row_idx, 3, exercise.category or '')
                worksheet.write(row_idx, 4, ','.join(exercise.muscle_groups or []))
                worksheet.write(row_idx, 5, ','.join(exercise.equipment or []))
                worksheet.write(row_idx, 6, exercise.difficulty or '')
                worksheet.write(row_idx, 7, exercise.video_url or '')
                worksheet.write(row_idx, 8, exercise.google_drive_file_id or '')
                worksheet.write(row_idx, 9, getattr(exercise, 'is_system', False))
                worksheet.write(row_idx, 10, getattr(exercise, 'is_active', True))
                worksheet.write(row_idx, 11, ','.join(exercise.tags or []))
            
            # Ajustar ancho de columnas
            worksheet.set_column('A:A', 30)  # name
            worksheet.set_column('B:B', 40)  # description
            worksheet.set_column('C:C', 50)  # instructions
            worksheet.set_column('D:G', 20)  # category, muscle_groups, equipment, difficulty
            
            # ========== HOJA 2: REFERENCIAS ==========
            ref_worksheet = workbook.add_worksheet('Referencias')
            
            # Escribir categorías
            ref_worksheet.write(0, 0, 'CATEGORÍAS DISPONIBLES', header_format)
            sorted_categories = sorted(all_categories) if all_categories else ['cardio', 'strength', 'flexibility', 'bodyweight', 'hiit']
            for idx, cat in enumerate(sorted_categories, start=1):
                ref_worksheet.write(idx, 0, cat)
            
            # Escribir grupos musculares
            ref_worksheet.write(0, 2, 'GRUPOS MUSCULARES', header_format)
            sorted_muscle_groups = sorted(all_muscle_groups) if all_muscle_groups else [
                'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
                'abs', 'core', 'obliques', 'quads', 'hamstrings', 'glutes', 'calves'
            ]
            for idx, mg in enumerate(sorted_muscle_groups, start=1):
                ref_worksheet.write(idx, 2, mg)
            
            # Escribir equipamiento
            ref_worksheet.write(0, 4, 'EQUIPAMIENTO', header_format)
            sorted_equipment = sorted(all_equipment) if all_equipment else [
                'barbell', 'dumbbells', 'kettlebell', 'resistance bands', 'bodyweight',
                'machine', 'cable', 'bench', 'pull-up bar', 'treadmill'
            ]
            for idx, eq in enumerate(sorted_equipment, start=1):
                ref_worksheet.write(idx, 4, eq)
            
            # Escribir dificultades
            ref_worksheet.write(0, 6, 'DIFICULTADES', header_format)
            difficulties = sorted(all_difficulties) if all_difficulties else ['beginner', 'intermediate', 'advanced']
            for idx, diff in enumerate(difficulties, start=1):
                ref_worksheet.write(idx, 6, diff)
            
            # Ajustar ancho de columnas en Referencias
            ref_worksheet.set_column('A:G', 25)
            
            workbook.close()
            output.seek(0)
            response = HttpResponse(output.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename="exercises_export.xlsx"'
            return response
    """ViewSet para gestión de ejercicios por administradores"""
    permission_classes = [IsAdminOrStaff]
    pagination_class = LargeResultsSetPagination
    
    def get_queryset(self):
        return Exercise.objects.all().order_by('name')
    
    def get_serializer_class(self):
        return ExerciseSerializer
    
    def perform_create(self, serializer):
        """Guardar el ejercicio con el usuario que lo crea"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas de ejercicios"""
        queryset = self.get_queryset()
        
        # Ejercicios por categoría
        category_stats = {}
        for exercise in queryset:
            category = exercise.category or 'Sin categoría'
            category_stats[category] = category_stats.get(category, 0) + 1
        
        # Ejercicios por grupo muscular
        muscle_group_stats = {}
        for exercise in queryset:
            for muscle_group in exercise.muscle_groups or []:
                muscle_group_stats[muscle_group] = muscle_group_stats.get(muscle_group, 0) + 1
        
        # Ejercicios recientes (últimos 30 días)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        recent_exercises = queryset.filter(created_at__gte=thirty_days_ago).count()
        
        stats = {
            'total_exercises': queryset.count(),
            'exercises_by_category': category_stats,
            'exercises_by_muscle_group': muscle_group_stats,
            'recent_exercises': recent_exercises
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        """Eliminar múltiples ejercicios"""
        exercise_ids = request.data.get('exercise_ids', [])
        
        if not exercise_ids:
            return Response(
                {'error': 'Se requieren IDs de ejercicios'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deleted_count, _ = Exercise.objects.filter(
            id__in=exercise_ids
        ).delete()
        
        return Response({
            'message': f'{deleted_count} ejercicios eliminados correctamente',
            'deleted_count': deleted_count
        })
    
    @action(detail=False, methods=['post'])
    def sync_from_google_drive(self, request):
        """
        Sincroniza ejercicios desde Google Drive
        Lista todos los videos de la carpeta configurada y crea/actualiza ejercicios
        """
        try:
            from .google_drive_service import get_google_drive_service
            from .models import Exercise
            import re
            
            service = get_google_drive_service()
            
            if not service.is_configured():
                return Response(
                    {
                        'error': 'Google Drive API no está configurada',
                        'message': 'Configura GOOGLE_DRIVE_CREDENTIALS_PATH o GOOGLE_DRIVE_API_KEY en settings'
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Obtener folder_id del request o usar el configurado por defecto
            folder_id = request.data.get('folder_id', None)
            
            # Listar videos de Google Drive
            videos = service.list_videos_from_folder(folder_id)
            
            if not videos:
                return Response(
                    {
                        'message': 'No se encontraron videos en la carpeta',
                        'videos_count': 0
                    },
                    status=status.HTTP_200_OK
                )
            
            # Procesar cada video
            created = 0
            updated = 0
            skipped = 0
            errors = []
            
            for video in videos:
                try:
                    exercise_name = video['name']
                    file_id = video['file_id']
                    
                    if not exercise_name or not file_id:
                        skipped += 1
                        continue
                    
                    # Crear o actualizar ejercicio
                    exercise, was_created = Exercise.objects.get_or_create(
                        name=exercise_name,
                        defaults={
                            'google_drive_file_id': file_id,
                            'video_url': f"https://drive.google.com/file/d/{file_id}/preview",
                            'category': 'strength',  # Por defecto
                        }
                    )
                    
                    if not was_created:
                        # Actualizar ejercicio existente con el ID de Google Drive
                        exercise.google_drive_file_id = file_id
                        exercise.video_url = f"https://drive.google.com/file/d/{file_id}/preview"
                        exercise.save()
                        updated += 1
                    else:
                        created += 1
                        
                except Exception as e:
                    errors.append({
                        'video': video.get('filename', 'Desconocido'),
                        'error': str(e)
                    })
                    skipped += 1
            
            return Response({
                'message': 'Sincronización completada',
                'total_videos': len(videos),
                'created': created,
                'updated': updated,
                'skipped': skipped,
                'errors': errors if errors else None
            }, status=status.HTTP_200_OK)
            
        except ImportError as e:
            return Response(
                {
                    'error': 'Dependencias faltantes',
                    'message': str(e),
                    'solution': 'Instala las dependencias: pip install google-api-python-client google-auth'
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            return Response(
                {
                    'error': 'Error al sincronizar desde Google Drive',
                    'message': str(e)
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'], url_path='add_substitute')
    def add_substitute(self, request, pk=None):
        """Añadir un ejercicio sustituto"""
        exercise = self.get_object()
        substitute_id = request.data.get('substitute_id')
        priority = request.data.get('priority', 1)
        notes = request.data.get('notes', '')
        
        if not substitute_id:
            return Response({'error': 'substitute_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        substitute = get_object_or_404(Exercise, id=substitute_id)
        
        if substitute.id == exercise.id:
            return Response({'error': 'Un ejercicio no puede ser sustituto de sí mismo'}, status=status.HTTP_400_BAD_REQUEST)
        
        sub, created = ExerciseSubstitution.objects.get_or_create(
            exercise=exercise,
            substitute=substitute,
            defaults={'priority': priority, 'notes': notes}
        )
        
        if not created:
            sub.priority = priority
            sub.notes = notes
            sub.save()
        
        return Response({
            'id': sub.id,
            'substitute_id': str(substitute.id),
            'substitute_name': substitute.name,
            'priority': sub.priority,
            'notes': sub.notes,
            'created': created
        })
    
    @action(detail=True, methods=['post'], url_path='remove_substitute')
    def remove_substitute(self, request, pk=None):
        """Eliminar un ejercicio sustituto"""
        exercise = self.get_object()
        substitute_id = request.data.get('substitute_id')
        
        if not substitute_id:
            return Response({'error': 'substitute_id es requerido'}, status=status.HTTP_400_BAD_REQUEST)
        
        deleted, _ = ExerciseSubstitution.objects.filter(
            exercise=exercise,
            substitute_id=substitute_id
        ).delete()
        
        return Response({'removed': deleted > 0})
    
    @action(detail=True, methods=['get'], url_path='substitutes')
    def list_substitutes(self, request, pk=None):
        """Listar sustitutos de un ejercicio"""
        exercise = self.get_object()
        subs = exercise.substitutions.all().select_related('substitute').order_by('priority')
        
        return Response([{
            'id': s.id,
            'substitute_id': str(s.substitute.id),
            'substitute_name': s.substitute.name,
            'category': s.substitute.category,
            'priority': s.priority,
            'notes': s.notes
        } for s in subs])








