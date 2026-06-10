"""
Utilidades para la API de Nex-Fit
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

from .error_reporting import capture_error_report, should_capture_error_report

logger = logging.getLogger(__name__)


def _first_error_message(value):
    if isinstance(value, dict):
        for field, detail in value.items():
            message = _first_error_message(detail)
            if message:
                return f"{field}: {message}" if field != "detail" else message
        return "Error de validacion"
    if isinstance(value, list):
        return _first_error_message(value[0]) if value else "Error de validacion"
    if value:
        return str(value)
    return "Error de validacion"


def custom_exception_handler(exc, context):
    """
    Manejador personalizado de excepciones para la API
    """
    # Llamar al manejador por defecto de DRF
    response = exception_handler(exc, context)
    
    if response is not None:
        # Log de la excepción
        logger.error(f"API Exception: {exc} in {context['view'].__class__.__name__}")
        
        # Asegurar que la respuesta siempre tenga el formato correcto
        if isinstance(response.data, dict):
            # Si ya es un dict, asegurar que tenga 'detail' si es un error de validación
            if 'detail' not in response.data and response.status_code == 400:
                # Si es un error de validación sin 'detail', agregarlo
                response.data = {
                    'detail': _first_error_message(response.data),
                    'errors': response.data,
                }
            elif response.status_code == 400 and isinstance(response.data.get('detail'), (dict, list)):
                response.data = {
                    'detail': _first_error_message(response.data['detail']),
                    'errors': response.data['detail'],
                }
        elif isinstance(response.data, list):
            # Si es una lista (errores de campo), convertir a formato estándar
            response.data = {
                'detail': response.data[0] if response.data else 'Error de validación',
                'errors': response.data
            }
        elif isinstance(response.data, str):
            # Si es un string, convertir a formato estándar
            response.data = {'detail': response.data}
        
        # Personalizar la respuesta si es necesario
        if response.status_code == 500:
            response.data = {
                'detail': 'Ha ocurrido un error interno. Por favor, inténtalo de nuevo.',
                'code': 'INTERNAL_ERROR'
            }

        try:
            request = context.get("request")
            if (
                request
                and not getattr(request, "_nexfit_error_report_logged", False)
                and should_capture_error_report(
                    request=request,
                    response_status=response.status_code,
                    response_data=response.data,
                    exc=exc,
                )
            ):
                capture_error_report(
                    request=request,
                    exc=exc,
                    context=context,
                    response_status=response.status_code,
                    response_data=response.data,
                    source="drf_exception_handler",
                )
                setattr(request, "_nexfit_error_report_logged", True)
        except Exception:
            logger.exception("Could not capture API error report")
    
    return response
