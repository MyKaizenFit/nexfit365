from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg, Max, Min
from django.utils import timezone
from datetime import timedelta

from .models import ProgressPhoto, WeightEntry, BodyMeasurement, DailyWellness
from .serializers import (
    ProgressPhotoSerializer, WeightEntrySerializer, BodyMeasurementSerializer,
    ProgressSummarySerializer, DailyWellnessSerializer
)
from workouts.models import WorkoutLog
from nutrition.models import MealLog  # Modelo eliminado
from django.db.models import Sum, Avg, Count, Q
from datetime import datetime, timedelta

class ProgressPhotoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para fotos de progreso
    """
    serializer_class = ProgressPhotoSerializer
    permission_classes = [IsAuthenticated]  # Solo requiere autenticación
    parser_classes = [MultiPartParser, FormParser]  # Para aceptar multipart/form-data
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ["photo_type", "date"]
    ordering_fields = ["date", "created_at", "weight"]
    ordering = ["-date", "-created_at"]
    search_fields = ["notes"]
    
    def create(self, request, *args, **kwargs):
        """Override del método create para agregar logging"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"🔍 Método create llamado - Usuario: {request.user.email}")
        logger.info(f"🔍 Headers: {dict(request.headers)}")
        logger.info(f"🔍 Content-Type: {request.content_type}")
        logger.info(f"🔍 Datos recibidos: {request.data}")
        
        # Log detallado de los archivos
        if 'photo' in request.FILES:
            photo_files = request.FILES.getlist('photo')
            logger.info(f"🔍 Archivos photo recibidos: {len(photo_files)}")
            for i, file in enumerate(photo_files):
                logger.info(f"🔍 Archivo {i}: {file.name} - {file.size} bytes - {file.content_type}")
        else:
            logger.warning("⚠️ No se encontró el campo 'photo' en request.FILES")
        
        # Log de todos los archivos
        logger.info(f"🔍 Todos los archivos en request.FILES: {list(request.FILES.keys())}")
        
        try:
            response = super().create(request, *args, **kwargs)
            logger.info(f"✅ ProgressPhoto creado exitosamente: {response.data}")
            return response
        except Exception as e:
            logger.error(f"❌ Error en create: {str(e)}")
            logger.error(f"❌ Tipo de error: {type(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            
            # Devolver un error más informativo
            from rest_framework.response import Response
            from rest_framework import status
            
            error_message = str(e)
            if hasattr(e, 'detail'):
                error_message = str(e.detail)
            
            return Response(
                {"error": error_message, "detail": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    def list(self, request, *args, **kwargs):
        """Override del método list para debug"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"🔍 Método list llamado - Usuario: {request.user}")
        logger.info(f"🔍 Headers: {dict(request.headers)}")
        logger.info(f"🔍 Query params: {dict(request.query_params)}")
        
        # Llamar al método original
        response = super().list(request, *args, **kwargs)
        
        logger.info(f"🔍 Respuesta del list: {len(response.data)} fotos")
        logger.info(f"🔍 Datos de respuesta: {response.data}")
        
        return response
    
    def get_queryset(self):
        """Filtrar fotos por usuario autenticado"""
        import logging
        logger = logging.getLogger(__name__)
        
        # Debug logging
        logger.info(f"🔍 get_queryset llamado - Usuario: {self.request.user}")
        logger.info(f"🔍 Usuario autenticado: {self.request.user.is_authenticated}")
        logger.info(f"🔍 ID del usuario: {self.request.user.id}")
        logger.info(f"🔍 Email del usuario: {self.request.user.email}")
        
        # Obtener todas las fotos para debug
        all_photos = ProgressPhoto.objects.all()
        logger.info(f"🔍 Total de fotos en BD: {all_photos.count()}")
        
        # Obtener fotos del usuario específico
        user_photos = ProgressPhoto.objects.filter(user=self.request.user)
        logger.info(f"🔍 Fotos del usuario {self.request.user.email}: {user_photos.count()}")
        
        # Log de las fotos encontradas
        for photo in user_photos:
            logger.info(f"🔍 Foto encontrada: ID={photo.id}, Tipo={photo.photo_type}, Fecha={photo.date}")
        
        return user_photos
    
    def get_serializer_context(self):
        """Agregar el request al contexto del serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Crear foto con usuario autenticado"""
        try:
            # Asignar usuario automáticamente
            photo = serializer.save(user=self.request.user)

            # Registrar peso en historial si es posible
            try:
                from decimal import Decimal
                from dashboard.models import UserStats

                date = serializer.validated_data.get("date") or getattr(photo, "date", None)
                weight = serializer.validated_data.get("weight")

                if weight is None:
                    weight = getattr(photo, "weight", None)

                if weight is None:
                    weight = getattr(self.request.user, "weight", None)

                if weight is None:
                    latest_entry = WeightEntry.objects.filter(
                        user=self.request.user
                    ).order_by("-date", "-created_at").first()
                    if latest_entry:
                        weight = latest_entry.weight

                if weight is not None and date is not None:
                    weight_entry, created = WeightEntry.objects.get_or_create(
                        user=self.request.user,
                        date=date,
                        defaults={
                            "weight": Decimal(str(weight)),
                            "notes": "Auto desde foto de progreso"
                        }
                    )

                    if created:
                        stats, _ = UserStats.objects.get_or_create(user=self.request.user)
                        stats.current_weight = weight
                        stats.save()

                        self.request.user.weight = weight
                        self.request.user.save(update_fields=["weight"])
            except Exception:
                pass
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error al crear ProgressPhoto: {str(e)}")
            raise
    
    @action(detail=False, methods=["get"])
    def test_upload(self, request):
        """Endpoint de prueba para verificar la configuración"""
        return Response({
            "status": "ok",
            "message": "ProgressPhoto endpoint funcionando",
            "photo_types": ["front", "back", "side", "other"],
            "max_file_size_mb": 5
        })
    
    @action(detail=False, methods=["get"])
    def summary(self, request, user_id=None):
        """Obtener resumen de fotos de progreso"""
        user_id = user_id or request.user.id
        queryset = self.get_queryset()
        
        # Estadísticas básicas
        total_photos = queryset.count()
        photos_this_month = queryset.filter(
            date__gte=timezone.now().date().replace(day=1)
        ).count()
        
        # Última foto
        latest_photo = queryset.first()
        latest_weight = latest_photo.weight if latest_photo else None
        latest_weight_date = latest_photo.date if latest_photo else None
        
        # Cambio de peso (si hay al menos 2 fotos)
        weight_change = None
        weight_change_percentage = None
        if queryset.count() >= 2:
            first_weight = queryset.order_by("date").first().weight
            last_weight = queryset.order_by("-date").first().weight
            if first_weight and last_weight:
                weight_change = last_weight - first_weight
                weight_change_percentage = (weight_change / first_weight) * 100
        
        data = {
            "total_photos": total_photos,
            "photos_this_month": photos_this_month,
            "latest_weight": latest_weight,
            "latest_weight_date": latest_weight_date,
            "weight_change": weight_change,
            "weight_change_percentage": weight_change_percentage,
        }
        
        serializer = ProgressSummarySerializer(data)
        return Response(serializer.data)

class WeightEntryViewSet(viewsets.ModelViewSet):
    """
    ViewSet para entradas de peso
    """
    serializer_class = WeightEntrySerializer
    permission_classes = [IsAuthenticated]  # Solo requiere autenticación
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["date"]
    ordering_fields = ["date", "weight", "created_at"]
    ordering = ["-date", "-created_at"]
    
    def get_queryset(self):
        """Filtrar entradas por usuario autenticado"""
        return WeightEntry.objects.filter(user=self.request.user)
    
    def get_serializer_context(self):
        """Agregar el request al contexto del serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Crear entrada con usuario autenticado"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"🔍 Creando entrada de peso para usuario: {self.request.user.email}")
        logger.info(f"🔍 Datos validados: {serializer.validated_data}")
        logger.info(f"🔍 Tipos de datos: {[(k, type(v)) for k, v in serializer.validated_data.items()]}")
        
        try:
            entry = serializer.save(user=self.request.user)
            logger.info(f"✅ Entrada de peso creada exitosamente: ID={entry.id}")
            return entry
        except Exception as e:
            logger.error(f"❌ Error creando entrada de peso: {str(e)}")
            logger.error(f"❌ Tipo de error: {type(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            raise
    
    @action(detail=False, methods=["get"])
    def summary(self, request, user_id=None):
        """Obtener resumen de entradas de peso"""
        user_id = user_id or request.user.id
        queryset = self.get_queryset()
        
        # Estadísticas básicas
        total_entries = queryset.count()
        entries_this_month = queryset.filter(
            date__gte=timezone.now().date().replace(day=1)
        ).count()
        
        # Última entrada
        latest_entry = queryset.first()
        latest_weight = latest_entry.weight if latest_entry else None
        latest_date = latest_entry.date if latest_entry else None
        
        # Cambio de peso (si hay al menos 2 entradas)
        weight_change = None
        weight_change_percentage = None
        if queryset.count() >= 2:
            first_weight = queryset.order_by("date").first().weight
            last_weight = queryset.order_by("-date").first().weight
            if first_weight and last_weight:
                weight_change = last_weight - first_weight
                weight_change_percentage = (weight_change / first_weight) * 100
        
        data = {
            "total_entries": total_entries,
            "entries_this_month": entries_this_month,
            "latest_weight": latest_weight,
            "latest_date": latest_date,
            "weight_change": weight_change,
            "weight_change_percentage": weight_change_percentage,
        }
        
        return Response(data)

class ProgressStatsViewSet(viewsets.ViewSet):
    """
    ViewSet para estadísticas generales de progreso
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=["get"])
    def analysis(self, request):
        """
        Obtener análisis completo de progreso con recomendaciones automáticas.
        GET /api/progress/progress-stats/analysis/?weeks=4
        """
        from progress.services import ProgressAnalysisService
        
        weeks = int(request.query_params.get('weeks', 4))
        weeks = max(1, min(weeks, 12))  # Limitar entre 1 y 12 semanas
        
        try:
            analysis_service = ProgressAnalysisService(request.user)
            analysis = analysis_service.get_comprehensive_analysis(weeks=weeks)
            
            # Verificar si se debe sugerir ajuste de plan
            should_adjust, suggestion = analysis_service.should_suggest_plan_adjustment()
            if should_adjust:
                analysis['plan_adjustment_suggestion'] = suggestion
            
            return Response(analysis)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error en análisis de progreso: {str(e)}")
            return Response(
                {'error': 'Error al analizar progreso'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=["get"])
    def dashboard(self, request):
        """Obtener estadísticas para el dashboard de progreso"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            user = request.user
            logger.info(f"🔍 Obteniendo estadísticas para usuario: {user.email}")
            
            today = timezone.now().date()
            week_start = today - timedelta(days=today.weekday())
            month_start = today.replace(day=1)
        
            # Estadísticas de peso
            weight_entries = WeightEntry.objects.filter(user=user)
            current_weight = weight_entries.order_by('-date').first()
            weight_change = None
            if weight_entries.count() >= 2:
                first_weight = weight_entries.order_by('date').first().weight
                last_weight = weight_entries.order_by('-date').first().weight
                weight_change = last_weight - first_weight
            
            # Estadísticas de entrenamientos
            workout_logs = WorkoutLog.objects.filter(user=user)
            workouts_this_week = workout_logs.filter(
                date__gte=week_start
            ).count()
            workouts_this_month = workout_logs.filter(
                date__gte=month_start
            ).count()
            total_workout_time = workout_logs.filter(
                date__gte=month_start
            ).aggregate(total_time=Sum('duration_minutes'))['total_time'] or 0
            
            # Estadísticas de nutrición
            meal_selections = MealLog.objects.filter(user=user)
            meals_this_week = meal_selections.filter(
                date__gte=week_start
            ).count()
            meals_this_month = meal_selections.filter(
                date__gte=month_start
            ).count()
            
            # Objetivos (puedes personalizar estos valores)
            weight_goal = 65  # kg - objetivo de peso
            workout_goal = 5  # entrenamientos por semana
            nutrition_goal = 21  # comidas por semana (3 por día)
            
            # Cálculo de progreso (asegurar que todos sean float para evitar errores de tipo)
            weight_progress = 0.0
            if current_weight and weight_goal:
                current_weight_float = float(current_weight.weight)
                weight_goal_float = float(weight_goal)
                if weight_change is not None:
                    weight_change_float = float(weight_change)
                    if weight_change_float < 0:  # Pérdida de peso
                        diff = abs(current_weight_float - weight_goal_float)
                        if diff > 0:
                            weight_progress = min(100.0, abs(weight_change_float) / diff * 100.0)
                    else:
                        weight_progress = 0.0
                else:
                    weight_progress = 0.0
            
            workout_progress = float(min(100, (workouts_this_week / workout_goal) * 100))
            nutrition_progress = float(min(100, (meals_this_week / nutrition_goal) * 100))
            
            # Asegurar que total_workout_time sea un número
            total_workout_time_float = float(total_workout_time) if total_workout_time else 0.0
            
            data = {
                "weight": {
                    "current": float(current_weight.weight) if current_weight else None,
                    "goal": float(weight_goal),
                    "change": float(weight_change) if weight_change is not None else None,
                    "progress": round(float(weight_progress), 1),
                    "entries_count": weight_entries.count(),
                    "entries_this_month": weight_entries.filter(date__gte=month_start).count()
                },
                "workouts": {
                    "this_week": workouts_this_week,
                    "this_month": workouts_this_month,
                    "goal_per_week": workout_goal,
                    "progress": round(float(workout_progress), 1),
                    "total_time_month": int(total_workout_time_float),
                    "avg_time_per_workout": round(total_workout_time_float / workouts_this_month, 1) if workouts_this_month > 0 else 0.0
                },
                "nutrition": {
                    "meals_this_week": meals_this_week,
                    "meals_this_month": meals_this_month,
                    "goal_per_week": nutrition_goal,
                    "progress": round(float(nutrition_progress), 1)
                },
                "photos": {
                    "total": ProgressPhoto.objects.filter(user=user).count(),
                    "this_month": ProgressPhoto.objects.filter(
                        user=user,
                        date__gte=month_start
                    ).count()
                },
                "overall_progress": round((float(weight_progress) + float(workout_progress) + float(nutrition_progress)) / 3.0, 1)
            }
            
            logger.info(f"✅ Estadísticas generadas exitosamente para usuario: {user.email}")
            return Response(data)
            
        except Exception as e:
            logger.error(f"❌ Error obteniendo estadísticas: {str(e)}")
            logger.error(f"❌ Tipo de error: {type(e)}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return Response(
                {"error": f"Error interno del servidor: {str(e)}"}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class BodyMeasurementViewSet(viewsets.ModelViewSet):
    """
    ViewSet para medidas corporales
    """
    serializer_class = BodyMeasurementSerializer
    permission_classes = [IsAuthenticated]  # Solo requiere autenticación
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["date"]
    ordering_fields = ["date", "created_at"]
    ordering = ["-date", "-created_at"]
    
    def get_queryset(self):
        """Filtrar mediciones por usuario autenticado"""
        return BodyMeasurement.objects.filter(user=self.request.user)
    
    def get_serializer_context(self):
        """Agregar el request al contexto del serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Crear medición con usuario autenticado"""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=["get"])
    def summary(self, request, user_id=None):
        """Obtener resumen de medidas corporales"""
        user_id = user_id or request.user.id
        queryset = self.get_queryset()
        
        # Estadísticas básicas
        total_measurements = queryset.count()
        measurements_this_month = queryset.filter(
            date__gte=timezone.now().date().replace(day=1)
        ).count()
        
        # Última medición
        latest_measurement = queryset.first()
        latest_date = latest_measurement.date if latest_measurement else None
        
        data = {
            "total_measurements": total_measurements,
            "measurements_this_month": measurements_this_month,
            "latest_date": latest_date,
        }
        
        return Response(data)


class DailyWellnessViewSet(viewsets.ModelViewSet):
    """
    ViewSet para registros diarios de bienestar (sueño y motivación)
    """
    serializer_class = DailyWellnessSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["date"]
    ordering_fields = ["date", "created_at"]
    ordering = ["-date", "-created_at"]
    
    def get_queryset(self):
        """Filtrar registros por usuario autenticado"""
        return DailyWellness.objects.filter(user=self.request.user)
    
    def get_serializer_context(self):
        """Agregar el request al contexto del serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Crear registro con usuario autenticado"""
        serializer.save(user=self.request.user)
    
    @action(detail=False, methods=["get"])
    def today(self, request):
        """Obtener registro de hoy"""
        today = timezone.now().date()
        entry = DailyWellness.objects.filter(user=request.user, date=today).first()
        
        if entry:
            serializer = self.get_serializer(entry)
            return Response(serializer.data)
        return Response({
            "id": None,
            "date": today.isoformat(),
            "sleep_hours": None,
            "motivation_score": None,
            "notes": "",
            "exists": False,
        })
