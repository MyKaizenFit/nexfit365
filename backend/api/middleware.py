# api/middleware.py
# Middleware para asegurar UTF-8 en todas las respuestas

from django.utils.deprecation import MiddlewareMixin

from .error_reporting import capture_error_report


class UTF8ResponseMiddleware(MiddlewareMixin):
    """
    Middleware que asegura que todas las respuestas JSON incluyan charset=utf-8
    """
    def process_response(self, request, response):
        # Si es una respuesta JSON, asegurar charset UTF-8
        content_type = response.get('Content-Type', '')
        if 'application/json' in content_type and 'charset' not in content_type:
            response['Content-Type'] = 'application/json; charset=utf-8'
        elif 'application/json' in content_type:
            # Si ya tiene charset pero no es utf-8, cambiarlo
            if 'charset=' in content_type and 'utf-8' not in content_type.lower():
                response['Content-Type'] = 'application/json; charset=utf-8'
        
        return response


class ErrorReportMiddleware(MiddlewareMixin):
    """
    Captura excepciones no gestionadas fuera de DRF y las guarda/notifica.
    """

    def process_exception(self, request, exception):
        if getattr(request, "_nexfit_error_report_logged", False):
            return None
        capture_error_report(
            request=request,
            exc=exception,
            response_status=500,
            source="django_middleware",
        )
        setattr(request, "_nexfit_error_report_logged", True)
        return None





