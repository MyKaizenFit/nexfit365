#!/usr/bin/env python3
"""
🔧 Script de Configuración del Entorno - Nex-Fit Backend

Este script configura automáticamente el entorno para testing:
1. Verifica dependencias
2. Configura base de datos
3. Crea datos de prueba
4. Verifica configuración

Uso:
    python scripts/setup_environment.py [--force] [--clean]

Autor: Equipo Nex-Fit
Versión: 1.0.0
"""

import os
import sys
import subprocess
import argparse
import logging
from pathlib import Path
from typing import List, Dict, Tuple

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scripts/logs/setup.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class EnvironmentSetup:
    """Clase para configurar el entorno de testing"""
    
    def __init__(self, force: bool = False, clean: bool = False):
        self.force = force
        self.clean = clean
        self.project_root = Path(__file__).parent.parent
        self.logs_dir = self.project_root / "scripts" / "logs"
        self.setup_results = {
            "dependencies": {},
            "database": {},
            "test_data": {},
            "configuration": {},
            "timestamp": None
        }
        
    def check_python_version(self) -> bool:
        """Verificar versión de Python"""
        logger.info("🐍 Verificando versión de Python...")
        
        try:
            version = sys.version_info
            if version.major == 3 and version.minor >= 11:
                logger.info(f"✅ Python {version.major}.{version.minor}.{version.micro} - OK")
                self.setup_results["dependencies"]["python_version"] = f"{version.major}.{version.minor}.{version.micro}"
                return True
            else:
                logger.error(f"❌ Python {version.major}.{version.minor}.{version.micro} - Se requiere Python 3.11+")
                return False
        except Exception as e:
            logger.error(f"❌ Error verificando Python: {e}")
            return False
    
    def check_dependencies(self) -> bool:
        """Verificar dependencias instaladas"""
        logger.info("📦 Verificando dependencias...")
        
        required_packages = [
            "django",
            "djangorestframework",
            "djangorestframework-simplejwt",
            "psycopg2-binary",
            "redis",
            "django-redis",
            "drf-spectacular",
            "pytest",
            "pytest-django",
            "pytest-cov",
            "factory-boy",
            "freezegun"
        ]
        
        missing_packages = []
        
        for package in required_packages:
            try:
                __import__(package.replace("-", "_"))
                logger.info(f"✅ {package} - OK")
                self.setup_results["dependencies"][package] = "installed"
            except ImportError:
                logger.warning(f"⚠️  {package} - NO INSTALADO")
                missing_packages.append(package)
                self.setup_results["dependencies"][package] = "missing"
        
        if missing_packages:
            logger.error(f"❌ Faltan {len(missing_packages)} dependencias")
            logger.info("💡 Instala con: pip install -r requirements.txt")
            return False
        
        logger.info("✅ Todas las dependencias están instaladas")
        return True
    
    def check_virtual_environment(self) -> bool:
        """Verificar entorno virtual"""
        logger.info("🔒 Verificando entorno virtual...")
        
        if os.getenv("VIRTUAL_ENV"):
            venv_path = os.getenv("VIRTUAL_ENV")
            logger.info(f"✅ Entorno virtual activo: {venv_path}")
            self.setup_results["dependencies"]["virtual_env"] = venv_path
            return True
        else:
            logger.warning("⚠️  No se detectó entorno virtual activo")
            logger.info("💡 Activa con: source .venv/bin/activate")
            self.setup_results["dependencies"]["virtual_env"] = "not_active"
            return False
    
    def check_django_configuration(self) -> bool:
        """Verificar configuración de Django"""
        logger.info("⚙️  Verificando configuración de Django...")
        
        try:
            # Cambiar al directorio del proyecto
            os.chdir(self.project_root)
            
            # Verificar configuración
            result = subprocess.run(
                ["python", "manage.py", "check", "--deploy"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                logger.info("✅ Configuración de Django - OK")
                self.setup_results["configuration"]["django_check"] = "passed"
                return True
            else:
                logger.error(f"❌ Configuración de Django - ERROR")
                logger.error(f"   {result.stderr}")
                self.setup_results["configuration"]["django_check"] = "failed"
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("⏰ Timeout verificando Django")
            self.setup_results["configuration"]["django_check"] = "timeout"
            return False
        except Exception as e:
            logger.error(f"❌ Error verificando Django: {e}")
            self.setup_results["configuration"]["django_check"] = "error"
            return False
    
    def check_database_connection(self) -> bool:
        """Verificar conexión a base de datos"""
        logger.info("🗄️  Verificando conexión a base de datos...")
        
        try:
            # Verificar conexión
            result = subprocess.run(
                ["python", "manage.py", "check", "--database", "default"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                logger.info("✅ Conexión a base de datos - OK")
                self.setup_results["database"]["connection"] = "ok"
                return True
            else:
                logger.error(f"❌ Conexión a base de datos - ERROR")
                logger.error(f"   {result.stderr}")
                self.setup_results["database"]["connection"] = "failed"
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("⏰ Timeout verificando base de datos")
            self.setup_results["database"]["connection"] = "timeout"
            return False
        except Exception as e:
            logger.error(f"❌ Error verificando base de datos: {e}")
            self.setup_results["database"]["connection"] = "error"
            return False
    
    def run_migrations(self) -> bool:
        """Ejecutar migraciones"""
        logger.info("🔄 Ejecutando migraciones...")
        
        try:
            result = subprocess.run(
                ["python", "manage.py", "migrate"],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                logger.info("✅ Migraciones ejecutadas correctamente")
                self.setup_results["database"]["migrations"] = "ok"
                return True
            else:
                logger.error(f"❌ Error en migraciones")
                logger.error(f"   {result.stderr}")
                self.setup_results["database"]["migrations"] = "failed"
                return False
                
        except subprocess.TimeoutExpired:
            logger.error("⏰ Timeout ejecutando migraciones")
            self.setup_results["database"]["migrations"] = "timeout"
            return False
        except Exception as e:
            logger.error(f"❌ Error ejecutando migraciones: {e}")
            self.setup_results["database"]["migrations"] = "error"
            return False
    
    def create_superuser(self) -> bool:
        """Crear superusuario si no existe"""
        logger.info("👑 Verificando superusuario...")
        
        try:
            # Verificar si existe algún superusuario
            result = subprocess.run(
                ["python", "manage.py", "shell", "-c", 
                 "from django.contrib.auth import get_user_model; "
                 "User = get_user_model(); "
                 "print('SUPERUSERS:', User.objects.filter(is_superuser=True).count())"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0 and "SUPERUSERS: 0" in result.stdout:
                logger.info("⚠️  No hay superusuarios, creando uno...")
                
                # Crear superusuario con datos por defecto
                create_cmd = [
                    "python", "manage.py", "createsuperuser",
                    "--noinput",
                    "--username", "admin",
                    "--email", "admin@mykaizenfit.com"
                ]
                
                # Establecer contraseña
                env = os.environ.copy()
                env["DJANGO_SUPERUSER_PASSWORD"] = "admin123"
                
                result = subprocess.run(
                    create_cmd,
                    env=env,
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    logger.info("✅ Superusuario creado exitosamente")
                    self.setup_results["database"]["superuser"] = "created"
                else:
                    logger.warning(f"⚠️  Error creando superusuario")
                    self.setup_results["database"]["superuser"] = "error"
            else:
                logger.info("✅ Ya existe un superusuario")
                self.setup_results["database"]["superuser"] = "exists"
            
            return True
            
        except Exception as e:
            logger.warning(f"⚠️  Error verificando superusuario: {e}")
            self.setup_results["database"]["superuser"] = "error"
            return True  # No es crítico
    
    def create_test_data(self) -> bool:
        """Crear datos de prueba"""
        logger.info("🎭 Creando datos de prueba...")
        
        try:
            result = subprocess.run(
                ["python", "manage.py", "seed_demo", "--clear"],
                capture_output=True,
                text=True,
                timeout=120
            )
            
            if result.returncode == 0:
                logger.info("✅ Datos de prueba creados correctamente")
                self.setup_results["test_data"]["seed_demo"] = "ok"
                return True
            else:
                logger.warning(f"⚠️  Advertencia creando datos: {result.stderr}")
                self.setup_results["test_data"]["seed_demo"] = "warning"
                return True  # No es crítico
                
        except subprocess.TimeoutExpired:
            logger.warning("⏰ Timeout creando datos de prueba")
            self.setup_results["test_data"]["seed_demo"] = "timeout"
            return True  # No es crítico
        except Exception as e:
            logger.warning(f"⚠️  Error creando datos de prueba: {e}")
            self.setup_results["test_data"]["seed_demo"] = "error"
            return True  # No es crítico
    
    def check_redis_connection(self) -> bool:
        """Verificar conexión a Redis"""
        logger.info("🔴 Verificando conexión a Redis...")
        
        try:
            result = subprocess.run(
                ["python", "manage.py", "shell", "-c",
                 "from django.core.cache import cache; "
                 "cache.set('test_key', 'test_value', 10); "
                 "print('REDIS:', cache.get('test_key'))"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0 and "REDIS: test_value" in result.stdout:
                logger.info("✅ Conexión a Redis - OK")
                self.setup_results["configuration"]["redis"] = "ok"
                return True
            else:
                logger.warning("⚠️  Redis no disponible, usando cache local")
                self.setup_results["configuration"]["redis"] = "local"
                return True  # No es crítico
                
        except Exception as e:
            logger.warning(f"⚠️  Error verificando Redis: {e}")
            self.setup_results["configuration"]["redis"] = "error"
            return True  # No es crítico
    
    def check_static_files(self) -> bool:
        """Verificar archivos estáticos"""
        logger.info("📁 Verificando archivos estáticos...")
        
        try:
            result = subprocess.run(
                ["python", "manage.py", "collectstatic", "--noinput", "--dry-run"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                logger.info("✅ Archivos estáticos - OK")
                self.setup_results["configuration"]["static_files"] = "ok"
                return True
            else:
                logger.warning(f"⚠️  Advertencia en archivos estáticos: {result.stderr}")
                self.setup_results["configuration"]["static_files"] = "warning"
                return True  # No es crítico
                
        except Exception as e:
            logger.warning(f"⚠️  Error verificando archivos estáticos: {e}")
            self.setup_results["configuration"]["static_files"] = "error"
            return True  # No es crítico
    
    def run_tests_basic(self) -> bool:
        """Ejecutar tests básicos para verificar configuración"""
        logger.info("🧪 Ejecutando tests básicos de verificación...")
        
        try:
            result = subprocess.run(
                ["pytest", "--collect-only", "-q"],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                # Contar tests disponibles
                test_count = len([line for line in result.stdout.split('\n') if '::' in line])
                logger.info(f"✅ Tests básicos - OK ({test_count} tests disponibles)")
                self.setup_results["configuration"]["basic_tests"] = "ok"
                return True
            else:
                logger.warning(f"⚠️  Advertencia en tests básicos: {result.stderr}")
                self.setup_results["configuration"]["basic_tests"] = "warning"
                return True  # No es crítico
                
        except subprocess.TimeoutExpired:
            logger.warning("⏰ Timeout en tests básicos")
            self.setup_results["configuration"]["basic_tests"] = "timeout"
            return True  # No es crítico
        except Exception as e:
            logger.warning(f"⚠️  Error en tests básicos: {e}")
            self.setup_results["configuration"]["basic_tests"] = "error"
            return True  # No es crítico
    
    def save_setup_results(self):
        """Guardar resultados de la configuración"""
        logger.info("💾 Guardando resultados de configuración...")
        
        try:
            from datetime import datetime
            self.setup_results["timestamp"] = datetime.now().isoformat()
            
            results_file = self.logs_dir / f"setup_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(results_file, 'w', encoding='utf-8') as f:
                import json
                json.dump(self.setup_results, f, indent=2, ensure_ascii=False)
            
            logger.info(f"✅ Resultados guardados en: {results_file}")
            
        except Exception as e:
            logger.error(f"❌ Error guardando resultados: {e}")
    
    def show_setup_summary(self):
        """Mostrar resumen de la configuración"""
        
        # Dependencias
        deps = self.setup_results.get("dependencies", {})
        for dep, status in deps.items():
            if status == "installed" or status == "ok":
            elif status == "missing":
            else:
        
        # Base de datos
        db = self.setup_results.get("database", {})
        for item, status in db.items():
            if status == "ok":
            elif status == "failed":
            else:
        
        # Configuración
        config = self.setup_results.get("configuration", {})
        for item, status in config.items():
            if status == "ok":
            elif status == "failed":
            else:
        
        # Datos de prueba
        test_data = self.setup_results.get("test_data", {})
        for item, status in test_data.items():
            if status == "ok":
            else:
        
        
        # Recomendaciones
        
        if any(status == "missing" for status in deps.values()):
        
        if db.get("connection") == "failed":
        
        if config.get("redis") == "error":
        
    
    def run(self) -> bool:
        """Ejecutar toda la configuración"""
        logger.info("🚀 Iniciando configuración del entorno...")
        
        try:
            # Crear directorio de logs
            self.logs_dir.mkdir(parents=True, exist_ok=True)
            
            # Verificaciones básicas
            if not self.check_python_version():
                return False
            
            if not self.check_virtual_environment():
                logger.warning("⚠️  Continuando sin entorno virtual...")
            
            if not self.check_dependencies():
                return False
            
            # Verificaciones de Django
            if not self.check_django_configuration():
                return False
            
            if not self.check_database_connection():
                return False
            
            # Configuración de base de datos
            if not self.run_migrations():
                return False
            
            self.create_superuser()
            
            # Datos de prueba
            self.create_test_data()
            
            # Verificaciones adicionales
            self.check_redis_connection()
            self.check_static_files()
            self.run_tests_basic()
            
            # Guardar y mostrar resultados
            self.save_setup_results()
            self.show_setup_summary()
            
            logger.info("✅ Configuración del entorno completada")
            return True
            
        except KeyboardInterrupt:
            logger.info("⏹️  Configuración interrumpida por el usuario")
            return False
        except Exception as e:
            logger.error(f"💥 Error inesperado: {e}")
            return False


def main():
    """Función principal"""
    parser = argparse.ArgumentParser(
        description="🔧 Script de Configuración del Entorno - Nex-Fit Backend",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python scripts/setup_environment.py              # Configuración básica
  python scripts/setup_environment.py --force      # Forzar configuración
  python scripts/setup_environment.py --clean      # Limpiar antes de configurar
        """
    )
    
    parser.add_argument(
        "--force",
        action="store_true",
        help="Forzar configuración incluso si hay errores"
    )
    
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Limpiar configuración existente antes de configurar"
    )
    
    args = parser.parse_args()
    
    # Crear y ejecutar setup
    setup = EnvironmentSetup(
        force=args.force,
        clean=args.clean
    )
    
    # Ejecutar configuración
    success = setup.run()
    
    # Código de salida
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main() 