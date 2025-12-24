from django.contrib import admin
from .models import DashboardData, WellnessTip, HelpSettings, ProblemReport


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


@admin.register(HelpSettings)
class HelpSettingsAdmin(admin.ModelAdmin):
    list_display = ["is_active", "contact_email", "app_version", "last_update_date", "updated_at"]
    list_filter = ["is_active", "faq_enabled", "contact_enabled", "guides_enabled", "report_enabled"]
    
    fieldsets = (
        ("Estado", {
            "fields": ("is_active",)
        }),
        ("FAQ - Preguntas Frecuentes", {
            "fields": ("faq_enabled", "faq_url", "faq_content"),
            "description": "Configuración de la página de preguntas frecuentes"
        }),
        ("Contacto", {
            "fields": ("contact_enabled", "contact_email"),
            "description": "Configuración de contacto por email"
        }),
        ("Guías de Usuario", {
            "fields": ("guides_enabled", "guides_url", "guides_content"),
            "description": "Configuración de las guías de usuario"
        }),
        ("Reporte de Problemas", {
            "fields": ("report_enabled", "report_email", "report_redirect_url"),
            "description": "Configuración del formulario de reporte de problemas"
        }),
        ("Información de la Aplicación", {
            "fields": ("app_version", "last_update_date", "terms_url", "privacy_url"),
            "description": "Información general de la aplicación"
        }),
        ("Metadatos", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
    
    readonly_fields = ["created_at", "updated_at"]
    
    def has_add_permission(self, request):
        # Solo permitir agregar si no hay ninguna configuración activa
        if HelpSettings.objects.filter(is_active=True).exists():
            return False
        return super().has_add_permission(request)
    
    def save_model(self, request, obj, form, change):
        super().save_model(request, obj, form, change)
        # Si se marca como activa, desactivar las demás
        if obj.is_active:
            HelpSettings.objects.filter(is_active=True).exclude(pk=obj.pk).update(is_active=False)


@admin.register(ProblemReport)
class ProblemReportAdmin(admin.ModelAdmin):
    list_display = ["subject", "problem_type", "status", "user", "contact_email", "created_at"]
    list_filter = ["status", "problem_type", "created_at", "resolved_at"]
    search_fields = ["subject", "description", "user__email", "contact_email"]
    readonly_fields = ["created_at", "updated_at", "resolved_at", "resolved_by"]
    date_hierarchy = "created_at"
    
    fieldsets = (
        ("Información del Reporte", {
            "fields": ("user", "contact_email", "problem_type", "subject", "status")
        }),
        ("Descripción", {
            "fields": ("description", "steps_to_reproduce", "expected_behavior", "actual_behavior")
        }),
        ("Información Técnica", {
            "fields": ("browser_info", "device_info", "url", "screenshot_url"),
            "classes": ("collapse",)
        }),
        ("Gestión", {
            "fields": ("admin_notes", "resolved_by", "resolved_at"),
            "description": "Información de gestión del reporte"
        }),
        ("Metadatos", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
    
    actions = ["mark_as_resolved", "mark_as_in_review", "mark_as_closed"]
    
    def mark_as_resolved(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(
            status=ProblemReport.Status.RESOLVED,
            resolved_by=request.user,
            resolved_at=timezone.now()
        )
        self.message_user(request, f"{updated} reporte(s) marcado(s) como resuelto(s)")
    mark_as_resolved.short_description = "Marcar como resuelto"
    
    def mark_as_in_review(self, request, queryset):
        updated = queryset.update(status=ProblemReport.Status.IN_REVIEW)
        self.message_user(request, f"{updated} reporte(s) marcado(s) como en revisión")
    mark_as_in_review.short_description = "Marcar como en revisión"
    
    def mark_as_closed(self, request, queryset):
        updated = queryset.update(status=ProblemReport.Status.CLOSED)
        self.message_user(request, f"{updated} reporte(s) marcado(s) como cerrado(s)")
    mark_as_closed.short_description = "Marcar como cerrado"