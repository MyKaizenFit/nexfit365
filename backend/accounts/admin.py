from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    model = CustomUser

    list_display = (
        "id",
        "email",
        "first_name",
        "last_name",
        "is_active",
        "is_staff",
        "is_superuser",
        "role",
        "activity_level",
    )
    list_filter = ("is_active", "is_staff", "is_superuser", "role", "activity_level", "gender")
    search_fields = ("email", "first_name", "last_name")
    ordering = ("id",)

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Información personal", {
            "fields": (
                "first_name", "last_name", "birth_date", "gender", 
                "height", "weight", "target_weight"
            )
        }),
        ("Objetivos y Preferencias", {
            "fields": (
                "main_goal", "activity_level", "training_location",
                "training_days_per_week", "training_days",
                "dietary_restrictions", "allergies",
                "equipment_available"
            )
        }),
        ("Permisos", {"fields": ("is_active", "is_staff", "is_superuser", "role", "groups", "user_permissions")}),
        ("Onboarding", {"fields": ("onboarding_completed", "onboarding_step")}),
        ("Fechas", {"fields": ("last_login", "date_joined", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": ("email", "password1", "password2", "is_active"),
        }),
    )

    readonly_fields = ("created_at", "updated_at", "date_joined", "last_login")
