"""
Utilidades de encriptación para datos sensibles
"""

from cryptography.fernet import Fernet
from django.conf import settings
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
        # La clave debe estar en settings.ENCRYPTION_KEY
        key = getattr(settings, 'ENCRYPTION_KEY', None)
        if not key:
            logger.warning("⚠️  ENCRYPTION_KEY no configurada. Usando generada en tiempo real.")
            key = Fernet.generate_key()
        
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


# Instancia global
encryption = SensitiveDataEncryption()


def encrypt_sensitive_field(data: str) -> str:
    """Función helper para encriptar"""
    return encryption.encrypt(data)


def decrypt_sensitive_field(encrypted_data: str) -> str:
    """Función helper para desencriptar"""
    return encryption.decrypt(encrypted_data)
