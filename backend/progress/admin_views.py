from datetime import datetime, timedelta

from django.contrib.auth import get_user_model
from django.db.models import Avg, Max, Min, Sum
from django.shortcuts import get_object_or_404
from rest_framework import permissions, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import WeightEntry, DailyWellness
from .serializers import WeightEntrySerializer, DailyWellnessSerializer

User = get_user_model()


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
        user_id = self.kwargs.get("user_id")
        return get_object_or_404(User, pk=user_id)

    def get_queryset(self):
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
                }
            )

        latest = qs.first()
        previous = qs[1] if qs.count() > 1 else None

        aggregates = qs.aggregate(
            min_weight=Min("weight"),
            max_weight=Max("weight"),
            avg_weight=Avg("weight"),
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
        user_id = self.kwargs.get("user_id")
        return get_object_or_404(User, pk=user_id)

    def get_queryset(self):
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

        return Response(
            {
                "user_id": user.id,
                "count": qs.count(),
                "current": WeightEntrySerializer(latest).data,
                "previous": WeightEntrySerializer(previous).data if previous else None,
                "change": float(latest.weight - previous.weight) if previous else None,
                "min": float(aggregates["min_weight"]) if aggregates["min_weight"] is not None else None,
                "max": float(aggregates["max_weight"]) if aggregates["max_weight"] is not None else None,
                "avg": float(aggregates["avg_weight"]) if aggregates["avg_weight"] is not None else None,
            }
        )


