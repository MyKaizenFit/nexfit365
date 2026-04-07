"""
Django management command para generar claves VAPID para push notifications.

Uso:
    python manage.py generate_vapid_keys

Genera un par de claves VAPID correctamente formateadas:
- Clave pública: uncompressed EC point (65 bytes), base64url sin padding → para el browser
- Clave privada: PEM completo → para el backend
"""

from django.core.management.base import BaseCommand
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
import base64


class Command(BaseCommand):
    help = 'Genera claves VAPID para push notifications (formato correcto para Web Push API)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Generando claves VAPID...'))

        try:
            # Generar clave EC P-256
            private_key = ec.generate_private_key(ec.SECP256R1())
            public_key = private_key.public_key()

            # Clave pública en formato uncompressed point (04 || x || y, 65 bytes)
            # Este es el único formato válido para Web Push applicationServerKey
            pub_raw = public_key.public_bytes(
                encoding=serialization.Encoding.X962,
                format=serialization.PublicFormat.UncompressedPoint,
            )
            pub_b64url = base64.urlsafe_b64encode(pub_raw).rstrip(b'=').decode('utf-8')

            # Clave privada en PEM para el backend
            private_key_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption(),
            ).decode('utf-8')

            # Versión single-line para el .env (saltos de línea escapados)
            priv_env = private_key_pem.replace('\n', '\\n')

            self.stdout.write(self.style.SUCCESS('\n✅ Claves VAPID generadas exitosamente!\n'))
            self.stdout.write(self.style.WARNING('⚠️  IMPORTANTE: Guarda estas claves de forma segura\n'))
            self.stdout.write(self.style.SUCCESS('=' * 70))
            self.stdout.write(self.style.SUCCESS(f'Clave Pública VAPID ({len(pub_raw)} bytes → {len(pub_b64url)} chars base64url):'))
            self.stdout.write(self.style.SUCCESS(pub_b64url))
            self.stdout.write(self.style.SUCCESS('=' * 70))
            self.stdout.write(self.style.WARNING('\n📝 Agrega estas claves a tu archivo backend/.env:'))
            self.stdout.write(self.style.SUCCESS(f'\nVAPID_PUBLIC_KEY={pub_b64url}'))
            self.stdout.write(self.style.SUCCESS(f'VAPID_PRIVATE_KEY="{priv_env}"'))
            self.stdout.write(self.style.SUCCESS('VAPID_CLAIM_EMAIL=no-reply@nex-fit.local'))
            self.stdout.write(self.style.SUCCESS('\nY en frontend/docker.env y frontend/docker.env.production:'))
            self.stdout.write(self.style.SUCCESS(f'\nNEXT_PUBLIC_VAPID_PUBLIC_KEY={pub_b64url}'))
            self.stdout.write(self.style.SUCCESS('\n'))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error generando claves: {str(e)}'))
            import traceback
            self.stdout.write(self.style.ERROR(traceback.format_exc()))

