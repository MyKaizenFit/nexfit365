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
from notifications.models import FeedbackMessage
from workouts.models import WorkoutLog
from nutrition.models import MealLog  # Modelo eliminado
from django.db.models import Sum, Avg, Count, Q
from datetime import datetime, timedelta


def calculate_weight_goal_progress(user, weight_entries):
    """Calculate progress from the first tracked weight toward the user's target."""
    target_weight = getattr(user, "target_weight", None)
    if not target_weight:
        return 0.0

    first_entry = weight_entries.order_by("date", "created_at").first()
    current_entry = weight_entries.order_by("-date", "-created_at").first()
    if not first_entry or not current_entry:
        return 0.0

    start_weight = float(first_entry.weight)
    current_weight = float(current_entry.weight)
    target = float(target_weight)
    total_needed = abs(start_weight - target)
    if total_needed == 0:
        return 100.0

    if target < start_weight:
        moved_toward_goal = start_weight - current_weight
    else:
        moved_toward_goal = current_weight - start_weight

    if moved_toward_goal <= 0:
        return 0.0

    return round(min(100.0, (moved_toward_goal / total_needed) * 100.0), 1)


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
        weight_queryset = WeightEntry.objects.filter(user_id=user_id)
        measurement_queryset = BodyMeasurement.objects.filter(user_id=user_id)
        
        # Estadísticas básicas
        total_photos = queryset.count()
        photos_this_month = queryset.filter(
            date__gte=timezone.now().date().replace(day=1)
        ).count()
        total_weight_entries = weight_queryset.count()
        total_measurements = measurement_queryset.count()
        weight_entries_this_month = weight_queryset.filter(
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
            "total_weight_entries": total_weight_entries,
            "total_measurements": total_measurements,
            "photos_this_month": photos_this_month,
            "weight_entries_this_month": weight_entries_this_month,
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

    def _get_quinzenal_review_status(self, user):
        today = timezone.now().date()
        window_start = today - timedelta(days=14)

        photos_last_15_days = ProgressPhoto.objects.filter(
            user=user,
            date__gte=window_start,
            date__lte=today,
        ).count()

        measurements_last_15_days = BodyMeasurement.objects.filter(
            user=user,
            date__gte=window_start,
            date__lte=today,
        ).count()

        last_review_request = FeedbackMessage.objects.filter(
            user=user,
            subject__startswith="Revisión quincenal",
        ).order_by("-created_at").first()

        last_review_sent_at = last_review_request.created_at.date() if last_review_request else None
        next_review_date = (last_review_sent_at + timedelta(days=15)) if last_review_sent_at else today
        days_until_review = max(0, (next_review_date - today).days)
        review_sent_recently = bool(last_review_sent_at and (today - last_review_sent_at).days < 15)

        needs_photos = photos_last_15_days == 0
        needs_measurements = measurements_last_15_days == 0
        can_send = (not needs_photos) and (not needs_measurements) and (not review_sent_recently)

        return {
            "today": today,
            "window_start": window_start,
            "photos_last_15_days": photos_last_15_days,
            "measurements_last_15_days": measurements_last_15_days,
            "needs_photos": needs_photos,
            "needs_measurements": needs_measurements,
            "can_send": can_send,
            "review_sent_recently": review_sent_recently,
            "last_review_sent_at": last_review_sent_at.isoformat() if last_review_sent_at else None,
            "next_review_date": next_review_date.isoformat(),
            "days_until_review": days_until_review,
        }
    
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
            
            # Objetivos
            weight_goal = user.target_weight
            workout_goal = 5  # entrenamientos por semana
            nutrition_goal = 21  # comidas por semana (3 por día)
            
            # Cálculo de progreso (asegurar que todos sean float para evitar errores de tipo)
            weight_progress = calculate_weight_goal_progress(user, weight_entries)
            
            workout_progress = float(min(100, (workouts_this_week / workout_goal) * 100))
            nutrition_progress = float(min(100, (meals_this_week / nutrition_goal) * 100))
            
            # Asegurar que total_workout_time sea un número
            total_workout_time_float = float(total_workout_time) if total_workout_time else 0.0
            
            data = {
                "weight": {
                    "current": float(current_weight.weight) if current_weight else None,
                    "goal": float(weight_goal) if weight_goal else None,
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

    @action(detail=False, methods=["get"], url_path="sleep-performance")
    def sleep_performance(self, request):
        """
        Datos para gráfico de sueño vs rendimiento.
        GET /api/progress/progress-stats/sleep-performance/?days=30
        """
        user = request.user
        days = int(request.query_params.get("days", 30))
        days = max(7, min(days, 90))

        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days - 1)

        wellness_qs = DailyWellness.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date,
        ).order_by("date")

        workout_qs = WorkoutLog.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date,
            completed=True,
        ).order_by("date")

        wellness_by_date = {entry.date: entry for entry in wellness_qs}
        workout_by_date = {}
        for log in workout_qs:
            if log.date not in workout_by_date:
                workout_by_date[log.date] = []
            workout_by_date[log.date].append(log)

        points = []
        correlation_pairs_x = []
        correlation_pairs_y = []

        current = start_date
        while current <= end_date:
            wellness = wellness_by_date.get(current)
            day_logs = workout_by_date.get(current, [])

            avg_rating = None
            avg_duration = None
            avg_calories = None

            if day_logs:
                ratings = [log.rating for log in day_logs if log.rating is not None]
                durations = [log.duration_minutes for log in day_logs if log.duration_minutes is not None]
                calories = [log.calories_burned for log in day_logs if log.calories_burned is not None]

                if ratings:
                    avg_rating = round(sum(ratings) / len(ratings), 2)
                if durations:
                    avg_duration = round(sum(durations) / len(durations), 2)
                if calories:
                    avg_calories = round(sum(calories) / len(calories), 2)

            sleep_hours = float(wellness.sleep_hours) if wellness and wellness.sleep_hours is not None else None
            motivation_score = wellness.motivation_score if wellness else None

            if sleep_hours is not None and avg_rating is not None:
                correlation_pairs_x.append(sleep_hours)
                correlation_pairs_y.append(avg_rating)

            points.append({
                "date": current.isoformat(),
                "sleep_hours": sleep_hours,
                "motivation_score": motivation_score,
                "workout_completed": bool(day_logs),
                "workout_count": len(day_logs),
                "workout_avg_rating": avg_rating,
                "workout_avg_duration_minutes": avg_duration,
                "workout_avg_calories_burned": avg_calories,
            })

            current += timedelta(days=1)

        correlation = None
        if len(correlation_pairs_x) >= 2:
            n = len(correlation_pairs_x)
            mean_x = sum(correlation_pairs_x) / n
            mean_y = sum(correlation_pairs_y) / n
            num = sum((x - mean_x) * (y - mean_y) for x, y in zip(correlation_pairs_x, correlation_pairs_y))
            den_x = sum((x - mean_x) ** 2 for x in correlation_pairs_x)
            den_y = sum((y - mean_y) ** 2 for y in correlation_pairs_y)
            den = (den_x * den_y) ** 0.5
            if den > 0:
                correlation = round(num / den, 4)

        return Response({
            "period_days": days,
            "from": start_date.isoformat(),
            "to": end_date.isoformat(),
            "summary": {
                "wellness_days": len(wellness_by_date),
                "workout_days": len(workout_by_date),
                "sleep_rating_pairs": len(correlation_pairs_x),
                "sleep_vs_rating_correlation": correlation,
            },
            "points": points,
        })

    @action(detail=False, methods=["get"], url_path="quinzenal-review")
    def quinzenal_review(self, request):
        status_data = self._get_quinzenal_review_status(request.user)

        return Response({
            "days_until_review": status_data["days_until_review"],
            "next_review_date": status_data["next_review_date"],
            "last_review_sent_at": status_data["last_review_sent_at"],
            "review_sent_recently": status_data["review_sent_recently"],
            "photos_last_15_days": status_data["photos_last_15_days"],
            "measurements_last_15_days": status_data["measurements_last_15_days"],
            "needs_photos": status_data["needs_photos"],
            "needs_measurements": status_data["needs_measurements"],
            "can_send": status_data["can_send"],
            "window_start": status_data["window_start"].isoformat(),
            "window_end": status_data["today"].isoformat(),
        })

    @action(detail=False, methods=["post"], url_path="quinzenal-review/submit")
    def submit_quinzenal_review(self, request):
        status_data = self._get_quinzenal_review_status(request.user)

        if status_data["review_sent_recently"]:
            return Response(
                {
                    "detail": "Ya has enviado una revisión en los últimos 15 días.",
                    "next_review_date": status_data["next_review_date"],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if status_data["needs_photos"] or status_data["needs_measurements"]:
            return Response(
                {
                    "detail": "Completa los requisitos antes de enviar la revisión.",
                    "needs_photos": status_data["needs_photos"],
                    "needs_measurements": status_data["needs_measurements"],
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        notes = (request.data.get("notes") or "").strip()
        message_lines = [
            "Solicitud de revisión quincenal enviada desde la app.",
            "",
            f"Usuario: {request.user.email}",
            f"Fotos últimos 15 días: {status_data['photos_last_15_days']}",
            f"Medidas últimos 15 días: {status_data['measurements_last_15_days']}",
        ]

        if notes:
            message_lines.extend(["", "Notas del usuario:", notes])

        FeedbackMessage.objects.create(
            user=request.user,
            subject="Revisión quincenal solicitada",
            message="\n".join(message_lines),
            category="other",
            priority="high",
        )

        refreshed = self._get_quinzenal_review_status(request.user)
        return Response(
            {
                "success": True,
                "message": "Revisión enviada correctamente.",
                "last_review_sent_at": refreshed["last_review_sent_at"],
                "next_review_date": refreshed["next_review_date"],
                "days_until_review": refreshed["days_until_review"],
            },
            status=status.HTTP_201_CREATED,
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
