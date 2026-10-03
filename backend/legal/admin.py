from django.contrib import admin

from legal.models import HealthDataDeletionJob, LegalDocument, PrivacySuppressionRecord, UserLegalEvent
from legal.tasks import cleanup_health_data_task


@admin.register(LegalDocument)
class LegalDocumentAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "version",
        "locale",
        "is_active",
        "requires_acceptance",
        "requires_reacceptance",
        "withdrawable",
        "published_at",
    )
    list_filter = ("code", "locale", "is_active", "requires_acceptance", "withdrawable")
    search_fields = ("code", "version", "title")
    readonly_fields = ("content_hash", "created_at")

    def get_readonly_fields(self, request, obj=None):
        if obj and obj.published_at:
            return (
                "code",
                "version",
                "locale",
                "title",
                "body",
                "content_hash",
                "requires_acceptance",
                "requires_reacceptance",
                "withdrawable",
                "effective_at",
                "published_at",
                "created_at",
            )
        return self.readonly_fields

    def has_delete_permission(self, request, obj=None):
        if obj and obj.published_at:
            return False
        return super().has_delete_permission(request, obj)


@admin.register(UserLegalEvent)
class UserLegalEventAdmin(admin.ModelAdmin):
    list_display = ("user_id", "document", "purpose", "event_type", "source", "created_at")
    list_filter = ("event_type", "purpose", "source", "document__code", "document__version")
    search_fields = ("user__id", "document__code", "document__version")
    readonly_fields = (
        "user",
        "document",
        "purpose",
        "event_type",
        "legal_basis",
        "source",
        "created_at",
    )

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.action(description="Reintentar trabajos fallidos")
def retry_failed_health_cleanup(modeladmin, request, queryset):
    for job_id in queryset.filter(status="failed").values_list("id", flat=True):
        cleanup_health_data_task.delay(job_id)


@admin.register(HealthDataDeletionJob)
class HealthDataDeletionJobAdmin(admin.ModelAdmin):
    list_display = ("id", "user_id", "purpose", "status", "generation", "attempts", "created_at", "started_at", "completed_at")
    list_filter = ("status", "purpose")
    readonly_fields = (
        "user",
        "purpose",
        "status",
        "generation",
        "withdrawal_event",
        "cutoff_at",
        "attempts",
        "error_code",
        "started_at",
        "completed_at",
        "created_at",
        "updated_at",
    )
    actions = (retry_failed_health_cleanup,)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(PrivacySuppressionRecord)
class PrivacySuppressionRecordAdmin(admin.ModelAdmin):
    list_display = ("id", "user_id", "purpose", "generation", "deleted_at")
    readonly_fields = ("user", "purpose", "generation", "withdrawal_event", "deleted_at")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
