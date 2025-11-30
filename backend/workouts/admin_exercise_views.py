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
    """ViewSet para gestión de ejercicios por administradores"""
    permission_classes = [IsAdminOrStaff]
    pagination_class = LargeResultsSetPagination
    
    def get_queryset(self):
        return Exercise.objects.all().order_by('name')
    
    def get_serializer_class(self):
        return ExerciseSerializer
    
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












