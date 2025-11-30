# accounts/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('register/', views.register, name='register'),
    path('profile/', views.profile, name='profile'),
    path('profile/goals/', views.update_goals, name='update_goals'),
    path('profile/summary/', views.profile_summary, name='profile_summary'),
    path('profile/initial-registration/', views.complete_initial_registration, name='complete_initial_registration'),
    path('profile/initial-registration/status/', views.initial_registration_status, name='initial_registration_status'),
]