# backend/urls.py
from django.contrib import admin
from django.urls import path, include, re_path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from api.views import health, public_health
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

urlpatterns = [
    path("admin/", admin.site.urls),

    # Healthcheck
    path("api/health/", health),
    path("api/public-health/", public_health),  # Endpoint completamente público

    # Rutas de tu API
    path("api/", include("api.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("dashboard.urls")),
    path("api/", include("progress.urls")),
    path("api/", include("workouts.urls")),
    path("api/nutrition/", include("nutrition.urls")),  # Prefijo nutrition/ para las URLs
    path("api/", include("achievements.urls")),
    path("api/", include("notifications.urls")),
    
    # Rutas de administración
    path("api/admin/users/", include("accounts.admin_urls")),
    path("api/admin/workouts/", include("workouts.admin_urls")),
    path("api/admin/exercises/", include("workouts.admin_exercise_urls")),
            path("api/admin/nutrition/", include("nutrition.admin_urls")),
            path("api/admin/nutrition/", include("nutrition.admin_recipe_urls")),
    path("api/admin/notifications/", include("notifications.admin_urls")),
    path("api/admin/dashboard/", include("dashboard.admin_urls")),

    # OpenAPI schema & Swagger UI
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="docs"),
]

# Servir archivos media (funciona tanto en DEBUG como en producción)
# En producción sin nginx, Django sirve los archivos media directamente
# Si tienes nginx configurado como proxy reverso, nginx debería interceptar estas rutas
urlpatterns += [
    re_path(r'^media/(?P<path>.*)$', serve, {
        'document_root': settings.MEDIA_ROOT,
    }),
]

# Servir archivos estáticos en DEBUG
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
