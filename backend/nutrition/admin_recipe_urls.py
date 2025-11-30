# nutrition/admin_recipe_urls.py
# Este archivo está deprecado - usar admin_urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .admin_views import AdminRecipeViewSet

router = DefaultRouter()
router.register(r'', AdminRecipeViewSet, basename='admin-recipes')

urlpatterns = [
    path('', include(router.urls)),
]
