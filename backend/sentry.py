"""
Configuración de Sentry para monitoreo de errores en producción
"""

import os
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.celery import CeleryIntegration
import sentry_sdk


def init_sentry():
    """Inicializar Sentry si está configurado"""
    sentry_dsn = os.getenv("SENTRY_DSN")
    
    if not sentry_dsn:
        return
    
    sentry_sdk.init(
        dsn=sentry_dsn,
        integrations=[
            DjangoIntegration(),
            RedisIntegration(),
            CeleryIntegration(),
        ],
        
        # Configuración de performance
        traces_sample_rate=0.1,  # 10% de las transacciones
        profiles_sample_rate=0.1,  # 10% de los perfiles
        
        # Configuración de errores
        send_default_pii=False,  # No enviar datos personales por defecto
        
        # Configuración de entorno
        environment=os.getenv("ENVIRONMENT", "development"),
        release=os.getenv("VERSION", "1.0.0"),
        
        # Configuración de filtros
        before_send=lambda event, hint: filter_sentry_events(event, hint),
        
        # Configuración de breadcrumbs
        max_breadcrumbs=50,
    )


def filter_sentry_events(event, hint):
    """Filtrar eventos de Sentry antes de enviarlos"""
    
    # No enviar errores de desarrollo
    if os.getenv("DEBUG", "False") == "True":
        return None
    
    # Filtrar errores específicos
    if "exception" in hint:
        exception = hint["exception"]
        
        # No enviar errores de validación
        if "ValidationError" in str(exception):
            return None
        
        # No enviar errores de permisos
        if "PermissionDenied" in str(exception):
            return None
    
    return event


def add_sentry_context(user=None, extra_data=None):
    """Agregar contexto adicional a Sentry"""
    if not user:
        return
    
    with sentry_sdk.configure_scope() as scope:
        # Información del usuario
        scope.set_user({
            "id": str(user.id),
            "email": user.email,
            "role": user.role,
        })
        
        # Información adicional
        if extra_data:
            scope.set_extra("extra_data", extra_data)
        
        # Tags útiles
        scope.set_tag("user_role", user.role)
        scope.set_tag("user_active", user.is_active)


def capture_exception_with_context(exception, user=None, extra_data=None):
    """Capturar excepción con contexto adicional"""
    add_sentry_context(user, extra_data)
    sentry_sdk.capture_exception(exception)


def capture_message_with_context(message, level="info", user=None, extra_data=None):
    """Capturar mensaje con contexto adicional"""
    add_sentry_context(user, extra_data)
    sentry_sdk.capture_message(message, level=level) 