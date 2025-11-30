from rest_framework.permissions import BasePermission, SAFE_METHODS

def _is(user, role: str) -> bool:
    return bool(user and user.is_authenticated and getattr(user, "role", None) == role)

class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_superuser or _is(request.user, "ADMIN")))

class IsTrainer(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and _is(request.user, "TRAINER"))

class IsMember(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and _is(request.user, "MEMBER"))

class IsOwnerOrAdmin(BasePermission):
    def has_object_permission(self, request, view, obj):
        if getattr(request.user, "is_superuser", False) or _is(request.user, "ADMIN"):
            return True
        user_fk = getattr(obj, "user", None) or getattr(obj, "owner", None)
        if user_fk and getattr(user_fk, "id", None) == request.user.id:
            return True
        if hasattr(obj, "id") and obj.id == request.user.id:
            return True
        return False

class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in SAFE_METHODS
