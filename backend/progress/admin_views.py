from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Max, Min, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import WeightEntry, DailyWellness, ProgressPhoto, RestWellnessAssessment
from .serializers import (
    WeightEntrySerializer,
    DailyWellnessSerializer,
    ProgressPhotoSerializer,
    RestWellnessAssessmentDetailSerializer,
    RestWellnessAssessmentListSerializer,
)
from .timeline import build_progress_timeline, first_last_by_type
from .photo_idempotency import get_cached_photo_id, get_idempotency_key, set_cached_photo_id
from rest_framework import status
from workouts.models import WorkoutLog

User = get_user_model()


def build_sleep_performance_payload(user, days):
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
        workout_by_date.setdefault(log.date, []).append(log)

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

        points.append(
            {
                "date": current.isoformat(),
                "sleep_hours": sleep_hours,
                "motivation_score": motivation_score,
                "workout_completed": bool(day_logs),
                "workout_count": len(day_logs),
                "workout_avg_rating": avg_rating,
                "workout_avg_duration_minutes": avg_duration,
                "workout_avg_calories_burned": avg_calories,
            }
        )

        current += timedelta(days=1)

    correlation = None
    if len(correlation_pairs_x) >= 2:
        total_pairs = len(correlation_pairs_x)
        mean_x = sum(correlation_pairs_x) / total_pairs
        mean_y = sum(correlation_pairs_y) / total_pairs
        numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(correlation_pairs_x, correlation_pairs_y))
        denominator_x = sum((x - mean_x) ** 2 for x in correlation_pairs_x)
        denominator_y = sum((y - mean_y) ** 2 for y in correlation_pairs_y)
        denominator = (denominator_x * denominator_y) ** 0.5
        if denominator > 0:
            correlation = round(numerator / denominator, 4)

    return {
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
    }


class AdminWeightEntryViewSet(viewsets.ModelViewSet):
    """
    Gestión de historial de peso para un usuario (solo admin/staff).
    Prefijo: /api/admin/progress/users/<user_id>/weight-history/
    """

    serializer_class = WeightEntrySerializer
    permission_classes = [permissions.IsAdminUser]
    filterset_fields = ["date"]
    ordering_fields = ["date", "weight", "created_at"]
    ordering = ["-date", "-created_at"]

    def get_user(self):
        if getattr(self, "swagger_fake_view", False):
            return None
        user_id = self.kwargs.get("user_id")
        return get_object_or_404(User, pk=user_id)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return WeightEntry.objects.none()
        user = self.get_user()
        return WeightEntry.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.get_user())

    def perform_update(self, serializer):
        serializer.save(user=self.get_user())

    @action(detail=False, methods=["get"])
    def summary(self, request, user_id=None):
        """
        Resumen rápido: peso actual, inicial, mínimo, máximo y cambio reciente.
        """
        user = self.get_user()
        qs = WeightEntry.objects.filter(user=user).order_by("-date", "-created_at")
        if not qs.exists():
            return Response(
                {
                    "user_id": user.id,
                    "count": 0,
                    "current": None,
                    "previous": None,
                    "change": None,
                    "min": None,
                    "max": None,
                    "avg": None,
                }
            )

        latest = qs.first()
        previous = qs[1] if qs.count() > 1 else None

        aggregates = qs.aggregate(
            min_weight=Min("weight"),
            max_weight=Max("weight"),
            avg_weight=Avg("weight"),
        )

        return Response(
            {
                "user_id": user.id,
                "count": qs.count(),
                "current": WeightEntrySerializer(latest).data,
                "previous": WeightEntrySerializer(previous).data if previous else None,
                "change": float(latest.weight - previous.weight) if previous and latest.weight and previous.weight else None,
                "min": float(aggregates["min_weight"]) if aggregates["min_weight"] is not None else None,
                "max": float(aggregates["max_weight"]) if aggregates["max_weight"] is not None else None,
                "avg": float(aggregates["avg_weight"]) if aggregates["avg_weight"] is not None else None,
            }
        )

class AdminDailyWellnessViewSet(viewsets.ModelViewSet):
    """
    Gestión de bienestar diario para un usuario (solo admin/staff).
    Prefijo: /api/admin/progress/users/<user_id>/wellness/
    """

    serializer_class = DailyWellnessSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["date", "created_at"]
    ordering = ["-date", "-created_at"]

    def get_user(self):
        if getattr(self, "swagger_fake_view", False):
            return None
        user_id = self.kwargs.get("user_id")
        return get_object_or_404(User, pk=user_id)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return DailyWellness.objects.none()
        return DailyWellness.objects.filter(user=self.get_user())

    def perform_create(self, serializer):
        serializer.save(user=self.get_user())

    def perform_update(self, serializer):
        serializer.save(user=self.get_user())

    @action(detail=False, methods=["get"])
    def summary(self, request, user_id=None):
        """
        Resumen: promedios y última entrada (últimos 30 días).
        """
        user = self.get_user()
        qs = self.get_queryset()
        last_30 = qs.filter(date__gte=timezone.now().date() - timezone.timedelta(days=30))

        if not qs.exists():
            return Response({
                "user_id": user.id,
                "count": 0,
                "avg_sleep": None,
                "avg_motivation": None,
                "last": None,
            })

        aggregates = last_30.aggregate(
            avg_sleep=Avg("sleep_hours"),
            avg_motivation=Avg("motivation_score"),
        )
        last = qs.first()

        return Response({
            "user_id": user.id,
            "count": qs.count(),
            "avg_sleep": float(aggregates["avg_sleep"]) if aggregates["avg_sleep"] is not None else None,
            "avg_motivation": float(aggregates["avg_motivation"]) if aggregates["avg_motivation"] is not None else None,
            "last": DailyWellnessSerializer(last).data if last else None,
        })

    @action(detail=False, methods=["get"], url_path="sleep-performance")
    def sleep_performance(self, request, user_id=None):
        """
        Datos para gráfico admin de sueño vs rendimiento de un usuario.
        GET /api/admin/progress/users/<user_id>/wellness/sleep-performance/?days=30
        """
        try:
            days = int(request.query_params.get("days", 30))
        except (TypeError, ValueError):
            days = 30

        return Response(build_sleep_performance_payload(self.get_user(), days))


class AdminProgressPhotoViewSet(viewsets.ModelViewSet):
    """
    Gestión de fotos de progreso para un usuario (solo admin/staff).
    Prefijo: /api/admin/progress/users/<user_id>/photos/
    """

    serializer_class = ProgressPhotoSerializer
    permission_classes = [permissions.IsAdminUser]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["date", "created_at", "photo_type"]
    ordering = ["-date", "-created_at"]

    def get_user(self):
        if getattr(self, "swagger_fake_view", False):
            return None
        user_id = self.kwargs.get("user_id")
        return get_object_or_404(User, pk=user_id)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ProgressPhoto.objects.none()
        user = self.get_user()
        return ProgressPhoto.objects.filter(user=user)

    def get_serializer_context(self):
        """Agregar el request al contexto del serializer para generar URLs correctas"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        idem_key = get_idempotency_key(request)
        user = self.get_user()
        if idem_key:
            cached_id = get_cached_photo_id(user.id, idem_key)
            if cached_id:
                existing = self.get_queryset().filter(pk=cached_id).first()
                if existing:
                    serializer = self.get_serializer(existing)
                    return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        if idem_key:
            set_cached_photo_id(user.id, idem_key, serializer.instance.id)

        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        user = self.get_user()
        photo = serializer.save(user=user)

        from progress.weight_sync import upsert_weight_entry

        date = serializer.validated_data.get("date") or getattr(photo, "date", None)
        weight = serializer.validated_data.get("weight")
        if weight is None:
            weight = getattr(photo, "weight", None)

        if weight is not None and date is not None:
            upsert_weight_entry(
                user,
                weight,
                date,
                notes="Auto desde foto de progreso (admin)",
            )

    def perform_update(self, serializer):
        serializer.save(user=self.get_user())

    @action(detail=False, methods=["get"], url_path="timeline")
    def timeline(self, request, user_id=None):
        user = self.get_user()
        return Response({
            "timeline": build_progress_timeline(user, request),
            "comparison_by_type": first_last_by_type(user, request),
            "weight_history": [
                {
                    "id": str(e.id),
                    "date": e.date.isoformat(),
                    "weight": float(e.weight),
                    "notes": e.notes or "",
                    "source": "weight_entry",
                }
                for e in WeightEntry.objects.filter(user=user).order_by("date", "created_at")
            ],
        })


class AdminRestWellnessAssessmentViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Formularios de descanso de un usuario (solo admin/staff).
    Prefijo: /api/admin/progress/users/<user_id>/rest-wellness/
    """

    permission_classes = [permissions.IsAdminUser]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at"]
    ordering = ["-created_at"]

    def get_user(self):
        if getattr(self, "swagger_fake_view", False):
            return None
        user_id = self.kwargs.get("user_id")
        return get_object_or_404(User, pk=user_id)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return RestWellnessAssessment.objects.none()
        return RestWellnessAssessment.objects.filter(user=self.get_user())

    def get_serializer_class(self):
        if self.action == "retrieve":
            return RestWellnessAssessmentDetailSerializer
        return RestWellnessAssessmentListSerializer
