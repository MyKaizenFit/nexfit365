from django.contrib import admin
from .models import ProgressPhoto, WeightEntry, BodyMeasurement


@admin.register(ProgressPhoto)
class ProgressPhotoAdmin(admin.ModelAdmin):
    list_display = ["user", "photo_type", "date", "weight", "created_at"]
    list_filter = ["photo_type", "date", "created_at"]
    search_fields = ["user__email", "notes"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "date"
    
    fieldsets = (
        ("Usuario y Fecha", {
            "fields": ("user", "date", "photo_type")
        }),
        ("Archivos", {
            "fields": ("photo", "thumbnail")
        }),
        ("Datos", {
            "fields": ("weight", "measurements", "notes")
        }),
        ("Metadatos", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )


@admin.register(WeightEntry)
class WeightEntryAdmin(admin.ModelAdmin):
    list_display = ["user", "weight", "date", "created_at"]
    list_filter = ["date", "created_at"]
    search_fields = ["user__email", "notes"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "date"
    
    fieldsets = (
        ("Usuario y Fecha", {
            "fields": ("user", "date")
        }),
        ("Datos", {
            "fields": ("weight", "notes")
        }),
        ("Metadatos", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    )


@admin.register(BodyMeasurement)
class BodyMeasurementAdmin(admin.ModelAdmin):
    list_display = ["user", "date", "chest", "waist", "hips", "created_at"]
    list_filter = ["date", "created_at"]
    search_fields = ["user__email", "notes"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "date"
    
    fieldsets = (
        ("Usuario y Fecha", {
            "fields": ("user", "date")
        }),
        ("Medidas Principales", {
            "fields": ("chest", "waist", "hips")
        }),
        ("Medidas Secundarias", {
            "fields": ("arms", "thighs", "neck", "forearms", "calves")
        }),
        ("Notas", {
            "fields": ("notes",)
        }),
        ("Metadatos", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",)
        }),
    ) 