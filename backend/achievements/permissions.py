from rest_framework import permissions


class AchievementPermission(permissions.BasePermission):
    """
    Permisos para módulo de logros:
    - Usuarios pueden ver logros disponibles y sus propios logros
    - Solo staff puede crear/editar logros
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Para crear/editar logros, solo staff
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            return request.user.is_staff
        
        return True
    
    def has_object_permission(self, request, view, obj):
        # Staff puede acceder a todo
        if request.user.is_staff:
            return True
        
        # Usuarios solo pueden ver logros (no editarlos)
        return request.method in permissions.SAFE_METHODS


class UserAchievementPermission(permissions.BasePermission):
    """
    Permisos para logros de usuario:
    - Usuarios pueden ver solo sus propios logros
    - Solo staff puede asignar/revocar logros manualmente
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        if request.method not in permissions.SAFE_METHODS:
            return request.user.is_staff
        
        return True
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_staff:
            return True
        
        return obj.user == request.user and request.method in permissions.SAFE_METHODS


class AchievementProgressPermission(permissions.BasePermission):
    """
    Permisos para ver progreso hacia logros:
    - Usuarios pueden ver solo su propio progreso
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Staff puede acceder a todo
        if request.user.is_staff:
            return True
        
        # Usuarios solo pueden ver su propio progreso
        return obj.user == request.user 