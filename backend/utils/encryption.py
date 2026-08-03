"""
Utilidades de encriptación para datos sensibles
"""

from cryptography.fernet import Fernet
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
import logging

logger = logging.getLogger(__name__)


class SensitiveDataEncryption:
    """
    Clase para encriptar/desencriptar datos sensibles
    
    NOTA: Django automáticamente hashea contraseñas.
    Esta clase es para otros datos sensibles como:
    - Números de teléfono
    - Direcciones
    - Información médica
    - Datos bancarios (si aplica)
    """
    
    def __init__(self):
        """Inicializar con la clave de Fernet de Django"""
        key = getattr(settings, 'ENCRYPTION_KEY', None)
        if not key:
            # Fail closed outside DEBUG: never invent an ephemeral prod key.
            if not getattr(settings, 'DEBUG', False):
                raise ImproperlyConfigured(
                    "ENCRYPTION_KEY is required when DEBUG is False"
                )
            logger.warning(
                "ENCRYPTION_KEY no configurada. Usando clave efímera (solo DEBUG)."
            )
            key = Fernet.generate_key()
        if isinstance(key, str):
            key = key.encode()
        
        try:
            self.cipher = Fernet(key)
        except Exception as e:
            logger.error(f"❌ Error inicializando Fernet: {e}")
            raise
    
    def encrypt(self, data: str) -> str:
        """
        Encriptar datos sensibles
        
        Args:
            data: String a encriptar
            
        Returns:
            String encriptado (bytes decodificados a UTF-8)
        """
        if not data:
            return ""
        
        try:
            encrypted = self.cipher.encrypt(data.encode())
            return encrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"❌ Error encriptando datos: {e}")
            raise
    
    def decrypt(self, encrypted_data: str) -> str:
        """
        Desencriptar datos sensibles
        
        Args:
            encrypted_data: String encriptado
            
        Returns:
            String desencriptado
        """
        if not encrypted_data:
            return ""
        
        try:
            decrypted = self.cipher.decrypt(encrypted_data.encode())
            return decrypted.decode('utf-8')
        except Exception as e:
            logger.error(f"❌ Error desencriptando datos: {e}")
            raise


# Instancia global (lazy via helpers if import-time settings lack key in edge cases)
encryption = SensitiveDataEncryption()


def encrypt_sensitive_field(data: str) -> str:
    """Función helper para encriptar"""
    return encryption.encrypt(data)


def decrypt_sensitive_field(encrypted_data: str) -> str:
    """Función helper para desencriptar"""
    return encryption.decrypt(encrypted_data)


def looks_like_fernet_token(value: str) -> bool:
    return isinstance(value, str) and value.startswith("gAAAA")
