"""
Utilidades para la API de Nex-Fit
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


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
                if isinstance(exc, Exception):
                    response.data = {
                        'detail': str(exc) if not isinstance(response.data, dict) else response.data
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
    
    return response
