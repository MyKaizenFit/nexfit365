from django.contrib import admin
from django.utils import timezone
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["user", "type", "title", "is_read", "created_at", "expires_at"]
    list_filter = ["type", "read_at", "created_at", "expires_at"]
    search_fields = ["user__email", "title", "message"]
    readonly_fields = ["created_at", "updated_at", "is_read", "is_expired"]
    date_hierarchy = "created_at"
    
    fieldsets = (
        ("Usuario y Tipo", {
            "fields": ("user", "type")
        }),
        ("Contenido", {
            "fields": ("title", "message", "data", "action_url")
        }),
        ("Estado", {
            "fields": ("read_at", "expires_at")
        }),
        ("Metadatos", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )
    
    actions = ["mark_as_read", "mark_as_unread", "extend_expiration"]
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(read_at=timezone.now())
        self.message_user(request, f"{updated} notificaciones marcadas como leídas")
    mark_as_read.short_description = "Marcar como leídas"
    
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(read_at=None)
        self.message_user(request, f"{updated} notificaciones marcadas como no leídas")
    mark_as_unread.short_description = "Marcar como no leídas"
    
    def extend_expiration(self, request, queryset):
        from django.utils import timezone
        from datetime import timedelta
        
        new_expiration = timezone.now() + timedelta(days=7)
        updated = queryset.update(expires_at=new_expiration)
        self.message_user(request, f"{updated} notificaciones extendidas por 7 días")
    extend_expiration.short_description = "Extender expiración por 7 días" 