# api/renderers.py
# Renderer personalizado para asegurar UTF-8 en las respuestas JSON

from rest_framework.renderers import JSONRenderer
from rest_framework.settings import api_settings
import json


class UTF8JSONRenderer(JSONRenderer):
    """
    Renderer JSON que asegura que los caracteres especiales (acentos, etc.)
    se codifiquen correctamente en UTF-8
    """
    charset = 'utf-8'
    media_type = 'application/json'
    
    def render(self, data, accepted_media_type=None, renderer_context=None):
        """
        Renderiza los datos en JSON con encoding UTF-8 explícito
        """
        if data is None:
            return b''
        
        renderer_context = renderer_context or {}
        indent = self.get_indent(accepted_media_type, renderer_context)
        
        if indent is None:
            separators = (',', ':')
        else:
            separators = (',', ': ')
        
        # Serializar JSON con ensure_ascii=False para permitir caracteres UTF-8
        ret = json.dumps(
            data,
            ensure_ascii=False,  # CRÍTICO: Permitir caracteres no ASCII (acentos, ñ, etc.)
            indent=indent,
            separators=separators
        )
        
        # Asegurar que el Content-Type incluya charset=utf-8 en la respuesta
        if renderer_context:
            response = renderer_context.get('response')
            if response:
                # Establecer el Content-Type con charset explícito
                response['Content-Type'] = 'application/json; charset=utf-8'
                # También asegurar que el charset esté en el header
                response.charset = 'utf-8'
        
        # Codificar explícitamente en UTF-8
        return ret.encode('utf-8')

