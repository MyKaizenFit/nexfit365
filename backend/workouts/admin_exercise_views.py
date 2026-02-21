# workouts/admin_exercise_views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import Exercise
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
                """Importa ejercicios desde un archivo CSV. Solo añade o modifica, nunca elimina."""
                import csv
                from django.core.files.uploadedfile import UploadedFile
                file = request.FILES.get('file')
                if not file or not isinstance(file, UploadedFile):
                    return Response({'error': 'Archivo CSV no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)
                decoded = file.read().decode('utf-8')
                reader = csv.DictReader(decoded.splitlines())
                updated, created, skipped = 0, 0, 0
                for row in reader:
                    name = row.get('name')
                    if not name:
                        skipped += 1
                        continue
                    exercise = Exercise.objects.filter(name=name).first()
                    fields = {
                        'description': row.get('description', ''),
                        'instructions': row.get('instructions', ''),
                        'category': row.get('category', ''),
                        'muscle_groups': [m.strip() for m in row.get('muscle_groups', '').split(',') if m.strip()],
                        'equipment': [e.strip() for e in row.get('equipment', '').split(',') if e.strip()],
                        'difficulty': row.get('difficulty', ''),
                        'video_url': row.get('video_url', ''),
                        'image_url': row.get('image_url', ''),
                        'google_drive_file_id': row.get('google_drive_file_id', ''),
                        'is_system': row.get('is_system', '') == 'True',
                        'is_active': row.get('is_active', '') == 'True',
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
                return Response({
                    'created': created,
                    'updated': updated,
                    'skipped': skipped,
                    'message': f"Se subió el archivo correctamente. {created} ejercicios añadidos, {updated} modificados. Los ejercicios no presentes en el archivo no se eliminaron."
                }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='import-excel')
    def import_excel(self, request):
                """Importa ejercicios desde un archivo Excel. Solo añade o modifica, nunca elimina."""
                import openpyxl
                from django.core.files.uploadedfile import UploadedFile
                file = request.FILES.get('file')
                if not file or not isinstance(file, UploadedFile):
                    return Response({'error': 'Archivo Excel no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)
                wb = openpyxl.load_workbook(file)
                ws = wb.active
                headers = [cell.value for cell in ws[1]]
                updated, created, skipped = 0, 0, 0
                for row in ws.iter_rows(min_row=2, values_only=True):
                    row_dict = dict(zip(headers, row))
                    name = row_dict.get('name')
                    if not name:
                        skipped += 1
                        continue
                    exercise = Exercise.objects.filter(name=name).first()
                    fields = {
                        'description': row_dict.get('description', ''),
                        'instructions': row_dict.get('instructions', ''),
                        'category': row_dict.get('category', ''),
                        'muscle_groups': [m.strip() for m in (row_dict.get('muscle_groups', '') or '').split(',') if m.strip()],
                        'equipment': [e.strip() for e in (row_dict.get('equipment', '') or '').split(',') if e.strip()],
                        'difficulty': row_dict.get('difficulty', ''),
                        'video_url': row_dict.get('video_url', ''),
                        'image_url': row_dict.get('image_url', ''),
                        'google_drive_file_id': row_dict.get('google_drive_file_id', ''),
                        'is_system': row_dict.get('is_system', '') == 'True',
                        'is_active': row_dict.get('is_active', '') == 'True',
                        'tags': [t.strip() for t in (row_dict.get('tags', '') or '').split(',') if t.strip()],
                    }
                    if exercise:
                        for k, v in fields.items():
                            setattr(exercise, k, v)
                        exercise.save()
                        updated += 1
                    else:
                        Exercise.objects.create(name=name, **fields)
                        created += 1
                return Response({
                    'created': created,
                    'updated': updated,
                    'skipped': skipped,
                    'message': f"Se subió el archivo correctamente. {created} ejercicios añadidos, {updated} modificados. Los ejercicios no presentes en el archivo no se eliminaron."
                }, status=status.HTTP_200_OK)
    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
            """Exporta todos los ejercicios en formato CSV"""
            import csv
            from django.http import HttpResponse
        
            exercises = self.get_queryset()
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="exercises_export.csv"'
        
            fieldnames = [
                'id', 'name', 'description', 'instructions', 'category', 'muscle_groups',
                'equipment', 'difficulty', 'video_url', 'image_url', 'google_drive_file_id',
                'is_system', 'is_active', 'tags'
            ]
            writer = csv.DictWriter(response, fieldnames=fieldnames)
            writer.writeheader()
            for exercise in exercises:
                writer.writerow({
                    'id': str(exercise.id),
                    'name': exercise.name,
                    'description': exercise.description or '',
                    'instructions': exercise.instructions or '',
                    'category': exercise.category or '',
                    'muscle_groups': ','.join(exercise.muscle_groups or []),
                    'equipment': ','.join(exercise.equipment or []),
                    'difficulty': exercise.difficulty or '',
                    'video_url': exercise.video_url or '',
                    'image_url': exercise.image_url or '',
                    'google_drive_file_id': exercise.google_drive_file_id or '',
                    'is_system': exercise.is_system if hasattr(exercise, 'is_system') else '',
                    'is_active': exercise.is_active if hasattr(exercise, 'is_active') else '',
                    'tags': ','.join(exercise.tags or []),
                })
            return response

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
            """Exporta todos los ejercicios en formato Excel (XLSX)"""
            import io
            import xlsxwriter
            from django.http import HttpResponse
        
            exercises = self.get_queryset()
            output = io.BytesIO()
            workbook = xlsxwriter.Workbook(output, {'in_memory': True})
            worksheet = workbook.add_worksheet('Ejercicios')
        
            headers = [
                'id', 'name', 'description', 'instructions', 'category', 'muscle_groups',
                'equipment', 'difficulty', 'video_url', 'image_url', 'google_drive_file_id',
                'is_system', 'is_active', 'tags'
            ]
            for col, header in enumerate(headers):
                worksheet.write(0, col, header)
            for row_idx, exercise in enumerate(exercises, start=1):
                worksheet.write(row_idx, 0, str(exercise.id))
                worksheet.write(row_idx, 1, exercise.name)
                worksheet.write(row_idx, 2, exercise.description or '')
                worksheet.write(row_idx, 3, exercise.instructions or '')
                worksheet.write(row_idx, 4, exercise.category or '')
                worksheet.write(row_idx, 5, ','.join(exercise.muscle_groups or []))
                worksheet.write(row_idx, 6, ','.join(exercise.equipment or []))
                worksheet.write(row_idx, 7, exercise.difficulty or '')
                worksheet.write(row_idx, 8, exercise.video_url or '')
                worksheet.write(row_idx, 9, exercise.image_url or '')
                worksheet.write(row_idx, 10, exercise.google_drive_file_id or '')
                worksheet.write(row_idx, 11, getattr(exercise, 'is_system', ''))
                worksheet.write(row_idx, 12, getattr(exercise, 'is_active', ''))
                worksheet.write(row_idx, 13, ','.join(exercise.tags or []))
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












