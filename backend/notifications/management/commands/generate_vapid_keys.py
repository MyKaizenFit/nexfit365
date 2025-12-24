"""
Django management command para generar claves VAPID para push notifications.

Uso:
    python manage.py generate_vapid_keys

Esto generará un par de claves VAPID (pública y privada) que se deben
configurar en las variables de entorno VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY.
"""

from django.core.management.base import BaseCommand
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64


class Command(BaseCommand):
    help = 'Genera claves VAPID para push notifications'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Generando claves VAPID...'))
        
        try:
            # Generar clave privada usando cryptography directamente
            private_key = ec.generate_private_key(ec.SECP256R1())
            public_key = private_key.public_key()
            
            # Obtener claves en formato PEM
            private_key_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ).decode('utf-8')
            
            public_key_pem = public_key.public_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PublicFormat.SubjectPublicKeyInfo
            ).decode('utf-8')
            
            # Extraer solo la parte de la clave (sin headers PEM) para base64 URL-safe
            # Esto es lo que necesita el frontend
            private_key_content = private_key_pem.replace('-----BEGIN PRIVATE KEY-----', '').replace('-----END PRIVATE KEY-----', '').replace('\n', '').replace('\r', '')
            public_key_content = public_key_pem.replace('-----BEGIN PUBLIC KEY-----', '').replace('-----END PUBLIC KEY-----', '').replace('\n', '').replace('\r', '')
            
            # Para el backend, guardamos el PEM completo
            # Para el frontend, necesitamos base64 URL-safe sin padding
            public_key_b64 = public_key_content.rstrip('=')
            
            self.stdout.write(self.style.SUCCESS('\n✅ Claves VAPID generadas exitosamente!\n'))
            self.stdout.write(self.style.WARNING('⚠️  IMPORTANTE: Guarda estas claves de forma segura\n'))
            self.stdout.write(self.style.SUCCESS('=' * 70))
            self.stdout.write(self.style.SUCCESS('Clave Pública VAPID (VAPID_PUBLIC_KEY):'))
            self.stdout.write(self.style.SUCCESS(public_key_b64))
            self.stdout.write(self.style.SUCCESS('=' * 70))
            self.stdout.write(self.style.SUCCESS('\nClave Privada VAPID (VAPID_PRIVATE_KEY) - PEM completo:'))
            self.stdout.write(self.style.SUCCESS(private_key_pem))
            self.stdout.write(self.style.SUCCESS('=' * 70))
            self.stdout.write(self.style.WARNING('\n📝 Agrega estas claves a tu archivo .env:'))
            self.stdout.write(self.style.SUCCESS(f'\nVAPID_PUBLIC_KEY={public_key_b64}'))
            self.stdout.write(self.style.SUCCESS(f'VAPID_PRIVATE_KEY={repr(private_key_pem)}'))
            self.stdout.write(self.style.SUCCESS('\nY también en frontend/.env.local:'))
            self.stdout.write(self.style.SUCCESS(f'\nNEXT_PUBLIC_VAPID_PUBLIC_KEY={public_key_b64}'))
            self.stdout.write(self.style.SUCCESS('\n'))
            self.stdout.write(self.style.WARNING('💡 Nota: La clave privada debe guardarse como texto completo (PEM)'))
            self.stdout.write(self.style.SUCCESS('\n'))
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error generando claves: {str(e)}'))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))
