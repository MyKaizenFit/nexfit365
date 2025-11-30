from rest_framework import permissions


class DashboardPermission(permissions.BasePermission):
    """
    Permisos para módulo de dashboard:
    - Usuarios pueden ver solo su propio dashboard
    - Staff puede ver dashboard de cualquier usuario
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Staff puede acceder a todo
        if request.user.is_staff:
            return True
        
        # Usuarios solo pueden acceder a su propio dashboard
        return obj.user == request.user


class DashboardDataPermission(permissions.BasePermission):
    """
    Permisos para datos del dashboard:
    - Usuarios pueden ver solo sus propios datos
    - Staff puede ver datos de cualquier usuario
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Staff puede acceder a todo
        if request.user.is_staff:
            return True
        
        # Usuarios solo pueden acceder a sus propios datos
        return obj.user == request.user


class DashboardStatsPermission(permissions.BasePermission):
    """
    Permisos para estadísticas del dashboard:
    - Usuarios pueden ver solo sus propias estadísticas
    - Staff puede ver estadísticas de cualquier usuario
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Staff puede acceder a todo
        if request.user.is_staff:
            return True
        
        # Usuarios solo pueden acceder a sus propias estadísticas
        return obj.user == request.user 