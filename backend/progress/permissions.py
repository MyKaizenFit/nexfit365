from rest_framework import permissions


class ProgressPermission(permissions.BasePermission):
    """
    Permisos para módulo de progreso:
    - Usuarios pueden ver/editar solo su propio progreso
    - Staff puede ver/editar todo
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Staff puede acceder a todo
        if request.user.is_staff:
            return True
        
        # Usuarios solo pueden acceder a su propio progreso
        return obj.user == request.user


class ProgressPhotoPermission(ProgressPermission):
    """Permisos específicos para fotos de progreso"""
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        # Para crear fotos, verificar límites
        if request.method == "POST":
            from django.conf import settings
            from .models import ProgressPhoto
            
            # Verificar límite de fotos por día
            today_photos = ProgressPhoto.objects.filter(
                user=request.user,
                date=request.data.get("date")
            ).count()
            
            if today_photos >= 5:  # Máximo 5 fotos por día
                return False
        
        return True


class WeightEntryPermission(ProgressPermission):
    """Permisos específicos para entradas de peso"""
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        # Para crear entradas, verificar límites
        if request.method == "POST":
            from .models import WeightEntry
            
            # One weight entry per user/date (matches UniqueConstraint).
            today_entries = WeightEntry.objects.filter(
                user=request.user,
                date=request.data.get("date")
            ).count()
            
            if today_entries >= 1:
                return False
        
        return True


class BodyMeasurementPermission(ProgressPermission):
    """Permisos específicos para medidas corporales"""
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        # Para crear medidas, verificar límites
        if request.method == "POST":
            from .models import BodyMeasurement
            
            # Verificar límite de medidas por día
            today_measurements = BodyMeasurement.objects.filter(
                user=request.user,
                date=request.data.get("date")
            ).count()
            
            if today_measurements >= 2:  # Máximo 2 entradas por día
                return False
        
        return True 