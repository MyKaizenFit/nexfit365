# api/middleware.py
# Middleware para asegurar UTF-8 en todas las respuestas

from django.utils.deprecation import MiddlewareMixin


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


