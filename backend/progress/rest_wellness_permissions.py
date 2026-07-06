from rest_framework import permissions

from .rest_wellness_access import can_access_rest_wellness, can_coach_rest_wellness


class CanAccessRestWellness(permissions.BasePermission):
    message = "Esta función no está disponible para tu cuenta."

    def has_permission(self, request, view):
        return can_access_rest_wellness(request.user)


class CanCoachRestWellness(permissions.BasePermission):
    message = "Esta función no está disponible para tu cuenta."

    def has_permission(self, request, view):
        return can_coach_rest_wellness(request.user)
