# accounts/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from api.auth_views import LoginView, LogoutView
from . import views

urlpatterns = [
    # Autenticación JWT
    path('auth/login/', LoginView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),  # Logout endpoint
    
    # Registro y perfil
    path('register/', views.register, name='register'),
    path('auth/register/', views.register, name='auth_register'),  # Alias para frontend
    path('profile/', views.profile, name='profile'),
    path('me/', views.profile, name='me'),  # Endpoint principal para frontend
    path('auth/me/', views.profile, name='auth_me'),  # Alias alternativo
    path('profile/goals/', views.update_goals, name='update_goals'),
    path('profile/summary/', views.profile_summary, name='profile_summary'),
    path('profile/initial-registration/', views.complete_initial_registration, name='complete_initial_registration'),
    path('profile/initial-registration/status/', views.initial_registration_status, name='initial_registration_status'),
]