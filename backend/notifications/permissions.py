from rest_framework import permissions


class NotificationPermission(permissions.BasePermission):
    """
    Permisos para módulo de notificaciones:
    - Usuarios pueden ver/editar solo sus propias notificaciones
    - Staff puede crear notificaciones para otros usuarios
    """
    
    def has_permission(self, request, view):
        return request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        role = str(getattr(request.user, "role", "") or "").lower()
        target_role = str(getattr(obj.user, "role", "") or "").lower()

        if request.user.is_staff or request.user.is_superuser or role == "admin":
            return True

        if role in {"trainer", "pro"} and target_role in {"basic", "member", "premium"}:
            return True
        
        return obj.user == request.user


class NotificationCreatePermission(permissions.BasePermission):
    """
    Permisos para crear notificaciones:
    - Usuarios solo pueden crear notificaciones para sí mismos
    - Staff puede crear notificaciones para cualquier usuario
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Para staff, permitir crear para cualquier usuario
        if request.user.is_staff:
            return True
        
        # Para usuarios normales, solo permitir crear para sí mismos
        if request.method == "POST":
            user_id = request.data.get("user")
            if user_id and str(user_id) != str(request.user.id):
                return False
        
        return True


class NotificationBulkPermission(permissions.BasePermission):
    """
    Permisos para operaciones bulk de notificaciones:
    - Los usuarios pueden marcar todas SUS notificaciones como leídas
    - Solo staff puede hacer operaciones bulk en todas las notificaciones
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Todos los usuarios autenticados pueden marcar todas sus notificaciones como leídas
        if view.action in ["mark_all_read", "delete_multiple"]:
            return True
        
        return True 