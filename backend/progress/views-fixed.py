from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.shortcuts import get_object_or_404
from django.db.models import Q, Count, Avg, Max, Min
from django.utils import timezone
from datetime import timedelta

from .models import ProgressPhoto, WeightEntry, BodyMeasurement
from .serializers import (
    ProgressPhotoSerializer, WeightEntrySerializer, BodyMeasurementSerializer,
    ProgressSummarySerializer
)

class ProgressPhotoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para fotos de progreso
    """
    serializer_class = ProgressPhotoSerializer
    permission_classes = [IsAuthenticated]  # Solo requiere autenticación
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ["photo_type", "date"]
    ordering_fields = ["date", "created_at", "weight"]
    ordering = ["-date", "-created_at"]
    search_fields = ["notes"]
    
    def get_queryset(self):
        """Filtrar fotos por usuario autenticado"""
        return ProgressPhoto.objects.filter(user=self.request.user)
    
    def get_serializer_context(self):
        """Agregar el request al contexto del serializer"""
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    def perform_create(self, serializer):
        """Crear foto con usuario autenticado"""
        try:
            # Asignar usuario automáticamente
            serializer.save(user=self.request.user)
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
        serializer.save(user=self.request.user)
    
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







