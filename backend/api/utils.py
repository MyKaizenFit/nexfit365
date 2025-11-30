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
        
        # Personalizar la respuesta si es necesario
        if response.status_code == 500:
            response.data = {
                'error': 'Internal Server Error',
                'message': 'Ha ocurrido un error interno. Por favor, inténtalo de nuevo.',
                'code': 'INTERNAL_ERROR'
            }
    
    return response
