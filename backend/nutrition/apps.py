from django.apps import AppConfig

class NutritionConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "nutrition"
    verbose_name = "Nutrition"
    
    def ready(self):
        """Importar signals cuando la app esté lista"""
        import nutrition.signals  # noqa

