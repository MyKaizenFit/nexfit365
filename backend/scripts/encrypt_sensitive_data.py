#!/usr/bin/env python
"""
Script para encriptar datos sensibles existentes en la BD

CAMPOS A ENCRIPTAR:
- phone_number: Números de teléfono
- injuries_or_medical_issues: Información médica sensible
- disliked_foods: Alergias/restricciones

NOTA: 
- Las contraseñas YA están hasheadas (Django las protege automáticamente)
- Los emails se mantienen en texto plano para login/recovery
- Los datos de fitness (peso, altura, etc) son semi-públicos en fitness apps

Este script es IDEMPOTENTE: puede ejecutarse múltiples veces sin duplicar encriptación
"""

import os
import sys
import django
from django.conf import settings

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from accounts.models import CustomUser
from utils.encryption import encrypt_sensitive_field, decrypt_sensitive_field
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s: %(message)s'
)


class EncryptSensitiveDataMigration:
    """Script para encriptar datos sensibles en la BD"""
    
    def __init__(self):
        self.encrypted_count = 0
        self.already_encrypted_count = 0
        self.error_count = 0
        self.total_users = 0
    
    def is_encrypted(self, data: str) -> bool:
        """Detectar si un dato ya está encriptado (comienza con 'gAAAAAA')"""
        if not data:
            return False
        return data.startswith('gAAAA')
    
    def encrypt_phone_numbers(self):
        """Encriptar números de teléfono"""
        logger.info("🔐 Encriptando números de teléfono...")
        
        users = CustomUser.objects.filter(phone_number__isnull=False).exclude(phone_number='')
        
        for user in users:
            self.total_users += 1
            try:
                if self.is_encrypted(user.phone_number):
                    self.already_encrypted_count += 1
                    continue
                
                user.phone_number = encrypt_sensitive_field(user.phone_number)
                user.save(update_fields=['phone_number'])
                self.encrypted_count += 1
                
                if self.encrypted_count % 10 == 0:
                    logger.info(f"  ✓ {self.encrypted_count} teléfonos encriptados")
            
            except Exception as e:
                self.error_count += 1
                logger.error(f"  ❌ Error encriptando teléfono de {user.email}: {e}")
    
    def encrypt_medical_info(self):
        """Encriptar información médica"""
        logger.info("🔐 Encriptando información médica...")
        
        users = CustomUser.objects.filter(
            injuries_or_medical_issues__isnull=False
        ).exclude(injuries_or_medical_issues='')
        
        for user in users:
            self.total_users += 1
            try:
                if self.is_encrypted(user.injuries_or_medical_issues):
                    self.already_encrypted_count += 1
                    continue
                
                user.injuries_or_medical_issues = encrypt_sensitive_field(
                    user.injuries_or_medical_issues
                )
                user.save(update_fields=['injuries_or_medical_issues'])
                self.encrypted_count += 1
                
                if self.encrypted_count % 10 == 0:
                    logger.info(f"  ✓ {self.encrypted_count} registros médicos encriptados")
            
            except Exception as e:
                self.error_count += 1
                logger.error(f"  ❌ Error encriptando info médica de {user.email}: {e}")
    
    def encrypt_disliked_foods(self):
        """Encriptar alimentos no deseados (pueden ser alergias)"""
        logger.info("🔐 Encriptando información de alimentos no deseados...")
        
        users = CustomUser.objects.filter(
            disliked_foods__isnull=False
        ).exclude(disliked_foods='')
        
        for user in users:
            self.total_users += 1
            try:
                if self.is_encrypted(user.disliked_foods):
                    self.already_encrypted_count += 1
                    continue
                
                user.disliked_foods = encrypt_sensitive_field(user.disliked_foods)
                user.save(update_fields=['disliked_foods'])
                self.encrypted_count += 1
                
                if self.encrypted_count % 10 == 0:
                    logger.info(f"  ✓ {self.encrypted_count} registros encriptados")
            
            except Exception as e:
                self.error_count += 1
                logger.error(f"  ❌ Error encriptando alimentos de {user.email}: {e}")
    
    def run(self):
        """Ejecutar todas las migraciones"""
        logger.info("=" * 60)
        logger.info("🔐 INICIANDO ENCRIPTACIÓN DE DATOS SENSIBLES")
        logger.info("=" * 60)
        
        self.encrypt_phone_numbers()
        self.encrypt_medical_info()
        self.encrypt_disliked_foods()
        
        logger.info("")
        logger.info("=" * 60)
        logger.info("✅ ENCRIPTACIÓN COMPLETADA")
        logger.info("=" * 60)
        logger.info(f"Total usuarios procesados: {self.total_users}")
        logger.info(f"Datos encriptados: {self.encrypted_count}")
        logger.info(f"Ya estaban encriptados: {self.already_encrypted_count}")
        logger.info(f"Errores: {self.error_count}")
        
        if self.error_count > 0:
            logger.warning(f"⚠️  {self.error_count} errores encontrados")
            return False
        
        logger.info("🎉 Sin errores")
        return True


if __name__ == '__main__':
    migration = EncryptSensitiveDataMigration()
    success = migration.run()
    sys.exit(0 if success else 1)
