from django.contrib import admin
from .models import DashboardData, WellnessTip


@admin.register(DashboardData)
class DashboardDataAdmin(admin.ModelAdmin):
    list_display = ["user", "data_type", "date", "last_calculated", "expires_at", "is_expired"]
    list_filter = ["data_type", "date", "last_calculated", "expires_at"]
    search_fields = ["user__email"]
    readonly_fields = ["created_at", "updated_at", "last_calculated", "is_expired"]
    date_hierarchy = "date"
    
    fieldsets = (
        ("Usuario y Tipo", {
            "fields": ("user", "data_type", "date")
        }),
        ("Datos del Dashboard", {
            "fields": ("nutrition_data", "workout_data", "progress_data", "achievements_data")
        }),
        ("Metadatos", {
            "fields": ("last_calculated", "expires_at", "created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
    
    actions = ["refresh_cache", "clear_expired_cache"]
    
    def refresh_cache(self, request, queryset):
        # Aquí implementarías la lógica para refrescar el cache
        # Por ahora solo un mensaje informativo
        self.message_user(request, "Función de refrescar cache no implementada")
    refresh_cache.short_description = "Refrescar cache del dashboard"
    
    def clear_expired_cache(self, request, queryset):
        from django.utils import timezone
        
        expired_count = queryset.filter(expires_at__lt=timezone.now()).count()
        queryset.filter(expires_at__lt=timezone.now()).delete()
        
        self.message_user(request, f"{expired_count} entradas de cache expiradas eliminadas")
    clear_expired_cache.short_description = "Limpiar cache expirado" 


@admin.register(WellnessTip)
class WellnessTipAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "audience", "is_active", "is_highlighted", "created_at", "created_by"]
    list_filter = ["is_active", "is_highlighted", "category", "audience", "created_at"]
    search_fields = ["title", "summary", "content", "created_by__email"]
    readonly_fields = ["created_at", "updated_at", "created_by"]
    ordering = ["-is_highlighted", "-created_at"]

    def save_model(self, request, obj, form, change):
        if not obj.created_by:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)