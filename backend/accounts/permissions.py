from rest_framework import permissions
from django.contrib.auth import get_user_model

User = get_user_model()


def user_has_staff_access(user) -> bool:
    """Elevated API access: Django staff/superuser only (not role=admin alone)."""
    return bool(
        user
        and getattr(user, "is_authenticated", False)
        and (user.is_staff or user.is_superuser)
    )


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permite acceso solo al propietario del objeto o a administradores.
    """
    
    def has_object_permission(self, request, view, obj):
        # Los administradores pueden acceder a todo
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # El propietario puede acceder a su propio objeto
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'id'):
            return obj.id == request.user.id
        
        return False


class IsOwnerOrStaff(permissions.BasePermission):
    """
    Permite acceso solo al propietario del objeto o a staff.
    """
    
    def has_object_permission(self, request, view, obj):
        # El staff puede acceder a todo
        if request.user.is_staff:
            return True
        
        # El propietario puede acceder a su propio objeto
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'id'):
            return obj.id == request.user.id
        
        return False


class IsOwnerOrTrainer(permissions.BasePermission):
    """
    Permite acceso al propietario o a entrenadores asignados.
    """
    
    def has_object_permission(self, request, view, obj):
        # Los administradores pueden acceder a todo
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # El propietario puede acceder a su propio objeto
        if hasattr(obj, 'user'):
            if obj.user == request.user:
                return True
        
        # Coach/trainer roles only — never treat paid tier `pro` as staff.
        if request.user.role in ['TRAINER', 'trainer']:
            # Por ahora, permitimos acceso a usuarios con rol 'basic' (antes 'MEMBER')
            if hasattr(obj, 'user') and obj.user.role in ['basic', 'MEMBER', 'member']:
                return True
            elif hasattr(obj, 'role') and obj.role in ['basic', 'MEMBER', 'member']:
                return True
        
        return False


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permite acceso de lectura a todos, pero solo administradores pueden modificar.
    """
    
    def has_permission(self, request, view):
        # Permitir acceso de lectura a todos
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Solo administradores pueden modificar
        return request.user.is_staff or request.user.is_superuser


class IsStaffOrReadOnly(permissions.BasePermission):
    """
    Permite acceso de lectura a todos, pero solo staff puede modificar.
    """
    
    def has_permission(self, request, view):
        # Permitir acceso de lectura a todos
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Solo staff puede modificar
        return request.user.is_staff


class IsOwnerOrAdminOrTrainer(permissions.BasePermission):
    """
    Permite acceso al propietario, administradores o entrenadores.
    """
    
    def has_object_permission(self, request, view, obj):
        # Los administradores pueden acceder a todo
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # El propietario puede acceder a su propio objeto
        if hasattr(obj, 'user'):
            if obj.user == request.user:
                return True
        
        # Los entrenadores pueden acceder a ciertos objetos
        if request.user.role == 'TRAINER':
            # Acceso a usuarios con rol 'basic' (antes 'MEMBER')
            if hasattr(obj, 'user') and obj.user.role in ['basic', 'MEMBER', 'member']:
                return True
            elif hasattr(obj, 'role') and obj.role in ['basic', 'MEMBER', 'member']:
                return True
        
        return False


class UserProfilePermission(permissions.BasePermission):
    """
    Permisos específicos para perfiles de usuario.
    """
    
    def has_permission(self, request, view):
        # Solo usuarios autenticados pueden acceder
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Los administradores pueden acceder a todo
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # El propietario puede acceder a su propio perfil
        if obj == request.user:
            return True
        
        # Los entrenadores pueden ver perfiles de usuarios asignados
        if request.user.role in ['TRAINER', 'trainer'] and obj.role in ['basic', 'MEMBER', 'member']:
            return True
        
        return False


class UserManagementPermission(permissions.BasePermission):
    """
    Permisos para gestión de usuarios (solo administradores).
    """
    
    def has_permission(self, request, view):
        # Solo administradores pueden gestionar usuarios
        return request.user.is_staff or request.user.is_superuser
    
    def has_object_permission(self, request, view, obj):
        # Los administradores pueden gestionar cualquier usuario
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        # No permitir que un usuario se elimine a sí mismo
        if request.method == 'DELETE' and obj == request.user:
            return False
        
        return False


class RoleBasedPermission(permissions.BasePermission):
    """
    Permisos basados en roles específicos.
    """
    
    def __init__(self, allowed_roles=None):
        self.allowed_roles = allowed_roles or []
        super().__init__()
    
    def has_permission(self, request, view):
        # Verificar si el usuario tiene un rol permitido
        if not self.allowed_roles:
            return True
        
        return request.user.role in self.allowed_roles
    
    def has_object_permission(self, request, view, obj):
        # Aplicar la misma lógica de permisos
        return self.has_permission(request, view)


# Permisos predefinidos para roles específicos
class IsAdminOnly(permissions.BasePermission):
    """Solo staff/superuser (role=admin sin is_staff no basta)."""

    def has_permission(self, request, view):
        return user_has_staff_access(request.user)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsTrainerOrAdmin(permissions.BasePermission):
    """Entrenadores (role) o staff."""

    def has_permission(self, request, view):
        if user_has_staff_access(request.user):
            return True
        role = str(getattr(request.user, "role", "") or "").lower()
        return role == "trainer"

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)


class IsMemberOrStaff(RoleBasedPermission):
    """Miembros y staff"""
    def __init__(self):
        super().__init__(allowed_roles=['admin', 'ADMIN', 'pro', 'TRAINER', 'trainer', 'basic', 'MEMBER', 'member'])


class IsAdminOrStaff(permissions.BasePermission):
    """Permite acceso solo a staff / superuser."""

    def has_permission(self, request, view):
        return user_has_staff_access(request.user)

    def has_object_permission(self, request, view, obj):
        return self.has_permission(request, view)
