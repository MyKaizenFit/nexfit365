# accounts/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from api.auth_views import (
    LoginView,
    LogoutView,
    RegisterView,
    ForgotPasswordView,
    ResetPasswordView,
    ChangePasswordView,
    ChangePasswordAfterTemporaryView,
)
from . import views

urlpatterns = [
    # Autenticación JWT
    path('auth/login/', LoginView.as_view(), name='token_obtain_pair'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),  # Logout endpoint
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path('auth/forgot-password/', ForgotPasswordView.as_view(), name='auth-forgot-password'),
    path('auth/reset-password/', ResetPasswordView.as_view(), name='auth-reset-password'),
    path('auth/change-password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/change-password-after-temporary/', ChangePasswordAfterTemporaryView.as_view(), name='auth-change-password-after-temporary'),
    
    # Registro y perfil
    path('register/', RegisterView.as_view(), name='register'),
    path('auth/register/', RegisterView.as_view(), name='auth_register'),  # Alias para frontend
    path('auth/register/', RegisterView.as_view(), name='auth-register'),
    path('profile/', views.profile, name='profile'),
    path('me/', views.profile, name='me'),  # Endpoint principal para frontend
    path('auth/me/', views.profile, name='auth_me'),  # Alias alternativo
    path('profile/goals/', views.update_goals, name='update_goals'),
    path('profile/summary/', views.profile_summary, name='profile_summary'),
    path('profile/initial-registration/', views.complete_initial_registration, name='complete_initial_registration'),
    path('profile/initial-registration/status/', views.initial_registration_status, name='initial_registration_status'),
    # GDPR
    path('gdpr/export/', views.gdpr_export_data, name='gdpr_export_data'),
    path('gdpr/delete/', views.gdpr_request_deletion, name='gdpr_request_deletion'),
]
