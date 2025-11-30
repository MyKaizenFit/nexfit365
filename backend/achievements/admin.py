from django.contrib import admin
from .models import Achievement, UserAchievement


@admin.register(Achievement)
class AchievementAdmin(admin.ModelAdmin):
    list_display = ["name", "category", "points", "is_active", "created_at"]
    list_filter = ["category", "is_active", "created_at"]
    search_fields = ["name", "description", "key"]
    readonly_fields = ["created_at", "updated_at"]
    
    fieldsets = (
        ("Información Básica", {
            "fields": ("key", "name", "description", "category")
        }),
        ("Configuración", {
            "fields": ("icon", "points", "is_active")
        }),
        ("Criterios", {
            "fields": ("criteria",),
            "description": "Criterios JSON para desbloquear el logro"
        }),
        ("Metadatos", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
    
    actions = ["activate_achievements", "deactivate_achievements"]
    
    def activate_achievements(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} logros activados")
    activate_achievements.short_description = "Activar logros seleccionados"
    
    def deactivate_achievements(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} logros desactivados")
    deactivate_achievements.short_description = "Desactivar logros seleccionados"


@admin.register(UserAchievement)
class UserAchievementAdmin(admin.ModelAdmin):
    list_display = ["user", "achievement", "unlocked_at", "days_since_unlocked"]
    list_filter = ["achievement__category", "unlocked_at", "achievement__is_active"]
    search_fields = ["user__email", "achievement__name"]
    readonly_fields = ["created_at", "updated_at", "days_since_unlocked"]
    date_hierarchy = "unlocked_at"
    
    fieldsets = (
        ("Usuario y Logro", {
            "fields": ("user", "achievement")
        }),
        ("Progreso", {
            "fields": ("progress",)
        }),
        ("Metadatos", {
            "fields": ("unlocked_at", "created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
    
    actions = ["recalculate_progress"]
    
    def recalculate_progress(self, request, queryset):
        # Aquí implementarías la lógica para recalcular el progreso
        # Por ahora solo un mensaje informativo
        self.message_user(request, "Función de recálculo de progreso no implementada")
    recalculate_progress.short_description = "Recalcular progreso" 