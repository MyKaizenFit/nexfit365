#!/usr/bin/env python3
"""
🧹 Script de Mantenimiento - Nex-Fit Backend

Este script realiza tareas de mantenimiento y limpieza:
1. Limpiar archivos temporales
2. Optimizar base de datos
3. Verificar integridad
4. Generar reportes de estado

Uso:
    python scripts/maintenance.py [--clean] [--optimize] [--check] [--report]

Autor: Equipo Nex-Fit
Versión: 1.0.0
"""

import os
import sys
import subprocess
import argparse
import logging
import shutil
from pathlib import Path
from typing import List, Dict, Tuple
from datetime import datetime

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scripts/logs/maintenance.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class MaintenanceTool:
    """Clase para tareas de mantenimiento"""
    
    def __init__(self, clean: bool = False, optimize: bool = False, check: bool = False, report: bool = False):
        self.clean = clean
        self.optimize = optimize
        self.check = check
        self.report = report
        self.project_root = Path(__file__).parent.parent
        self.logs_dir = self.project_root / "scripts" / "logs"
        self.maintenance_results = {
            "cleanup": {},
            "optimization": {},
            "health_check": {},
            "timestamp": None
        }
        
    def cleanup_temp_files(self) -> bool:
        """Limpiar archivos temporales"""
        logger.info("🧹 Limpiando archivos temporales...")
        
        cleanup_items = {
            "python_cache": {
                "pattern": "__pycache__",
                "description": "Directorios __pycache__"
            },
            "pyc_files": {
                "pattern": "*.pyc",
                "description": "Archivos .pyc"
            },
            "egg_info": {
                "pattern": "*.egg-info",
                "description": "Directorios .egg-info"
            },
            "pytest_cache": {
                "pattern": ".pytest_cache",
                "description": "Directorio .pytest_cache"
            },
            "coverage_files": {
                "pattern": ".coverage",
                "description": "Archivo .coverage"
            },
            "htmlcov": {
                "pattern": "htmlcov",
                "description": "Directorio htmlcov"
            },
            "test_logs": {
                "pattern": "test.log",
                "description": "Archivo test.log"
            },
            "test_media": {
                "pattern": "test_media",
                "description": "Directorio test_media"
            }
        }
        
        total_cleaned = 0
        
        for item_name, item_info in cleanup_items.items():
            try:
                if item_info["pattern"].endswith("*"):
                    # Buscar archivos con patrón
                    files = list(self.project_root.rglob(item_info["pattern"]))
                else:
                    # Buscar directorios/archivos específicos
                    files = list(self.project_root.rglob(item_info["pattern"]))
                
                cleaned_count = 0
                for file_path in files:
                    try:
                        if file_path.is_file():
                            file_path.unlink()
                            cleaned_count += 1
                        elif file_path.is_dir():
                            shutil.rmtree(file_path)
                            cleaned_count += 1
                    except Exception as e:
                        logger.warning(f"⚠️  No se pudo eliminar {file_path}: {e}")
                
                if cleaned_count > 0:
                    logger.info(f"✅ {item_info['description']}: {cleaned_count} elementos eliminados")
                    total_cleaned += cleaned_count
                    self.maintenance_results["cleanup"][item_name] = cleaned_count
                else:
                    logger.info(f"ℹ️  {item_info['description']}: Nada que limpiar")
                    self.maintenance_results["cleanup"][item_name] = 0
                    
            except Exception as e:
                logger.error(f"❌ Error limpiando {item_info['description']}: {e}")
                self.maintenance_results["cleanup"][item_name] = "error"
        
        logger.info(f"✅ Limpieza completada: {total_cleaned} elementos eliminados")
        return True
    
    def cleanup_docker(self) -> bool:
        """Limpiar recursos de Docker"""
        logger.info("🐳 Limpiando recursos de Docker...")
        
        try:
            # Parar contenedores
            subprocess.run(["docker-compose", "down"], cwd=self.project_root, check=False)
            
            # Limpiar contenedores huérfanos
            result = subprocess.run(
                ["docker", "container", "prune", "-f"],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                logger.info("✅ Contenedores Docker limpiados")
                self.maintenance_results["cleanup"]["docker_containers"] = "ok"
            else:
                logger.warning("⚠️  No se pudieron limpiar contenedores Docker")
                self.maintenance_results["cleanup"]["docker_containers"] = "warning"
            
            # Limpiar imágenes no utilizadas
            result = subprocess.run(
                ["docker", "image", "prune", "-f"],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                logger.info("✅ Imágenes Docker limpiadas")
                self.maintenance_results["cleanup"]["docker_images"] = "ok"
            else:
                logger.warning("⚠️  No se pudieron limpiar imágenes Docker")
                self.maintenance_results["cleanup"]["docker_images"] = "warning"
            
            # Limpiar volúmenes no utilizados
            result = subprocess.run(
                ["docker", "volume", "prune", "-f"],
                capture_output=True,
                text=True,
                check=False
            )
            
            if result.returncode == 0:
                logger.info("✅ Volúmenes Docker limpiados")
                self.maintenance_results["cleanup"]["docker_volumes"] = "ok"
            else:
                logger.warning("⚠️  No se pudieron limpiar volúmenes Docker")
                self.maintenance_results["cleanup"]["docker_volumes"] = "warning"
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error limpiando Docker: {e}")
            self.maintenance_results["cleanup"]["docker"] = "error"
            return False
    
    def optimize_database(self) -> bool:
        """Optimizar base de datos"""
        logger.info("🗄️  Optimizando base de datos...")
        
        try:
            # Cambiar al directorio del proyecto
            os.chdir(self.project_root)
            
            # Verificar estado de migraciones
            result = subprocess.run(
                ["python", "manage.py", "showmigrations"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                logger.info("✅ Estado de migraciones verificado")
                self.maintenance_results["optimization"]["migrations_check"] = "ok"
            else:
                logger.warning("⚠️  Error verificando migraciones")
                self.maintenance_results["optimization"]["migrations_check"] = "warning"
            
            # Ejecutar validación de base de datos
            result = subprocess.run(
                ["python", "manage.py", "check", "--database", "default"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                logger.info("✅ Validación de base de datos - OK")
                self.maintenance_results["optimization"]["db_validation"] = "ok"
            else:
                logger.warning("⚠️  Advertencias en validación de base de datos")
                self.maintenance_results["optimization"]["db_validation"] = "warning"
            
            # Limpiar sesiones expiradas
            result = subprocess.run(
                ["python", "manage.py", "clearsessions"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                logger.info("✅ Sesiones expiradas limpiadas")
                self.maintenance_results["optimization"]["sessions_cleanup"] = "ok"
            else:
                logger.warning("⚠️  Error limpiando sesiones")
                self.maintenance_results["optimization"]["sessions_cleanup"] = "warning"
            
            return True
            
        except subprocess.TimeoutExpired:
            logger.error("⏰ Timeout optimizando base de datos")
            self.maintenance_results["optimization"]["timeout"] = True
            return False
        except Exception as e:
            logger.error(f"❌ Error optimizando base de datos: {e}")
            self.maintenance_results["optimization"]["error"] = str(e)
            return False
    
    def health_check(self) -> bool:
        """Verificar salud del sistema"""
        logger.info("🏥 Verificando salud del sistema...")
        
        try:
            # Verificar configuración general
            result = subprocess.run(
                ["python", "manage.py", "check", "--deploy"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                logger.info("✅ Configuración general - OK")
                self.maintenance_results["health_check"]["config"] = "ok"
            else:
                logger.warning("⚠️  Advertencias en configuración")
                self.maintenance_results["health_check"]["config"] = "warning"
            
            # Verificar archivos estáticos
            result = subprocess.run(
                ["python", "manage.py", "collectstatic", "--noinput", "--dry-run"],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            if result.returncode == 0:
                logger.info("✅ Archivos estáticos - OK")
                self.maintenance_results["health_check"]["static_files"] = "ok"
            else:
                logger.warning("⚠️  Advertencias en archivos estáticos")
                self.maintenance_results["health_check"]["static_files"] = "warning"
            
            # Verificar dependencias
            result = subprocess.run(
                ["python", "-c", "import django, rest_framework, pytest; print('OK')"],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode == 0:
                logger.info("✅ Dependencias principales - OK")
                self.maintenance_results["health_check"]["dependencies"] = "ok"
            else:
                logger.error("❌ Error en dependencias principales")
                self.maintenance_results["health_check"]["dependencies"] = "error"
            
            # Verificar permisos de archivos
            critical_files = ["manage.py", "requirements.txt", ".env"]
            permissions_ok = True
            
            for file_name in critical_files:
                file_path = self.project_root / file_name
                if file_path.exists():
                    if not os.access(file_path, os.R_OK):
                        logger.warning(f"⚠️  {file_name}: Sin permisos de lectura")
                        permissions_ok = False
                else:
                    logger.warning(f"⚠️  {file_name}: No encontrado")
                    permissions_ok = False
            
            if permissions_ok:
                logger.info("✅ Permisos de archivos - OK")
                self.maintenance_results["health_check"]["permissions"] = "ok"
            else:
                logger.warning("⚠️  Problemas con permisos de archivos")
                self.maintenance_results["health_check"]["permissions"] = "warning"
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error en health check: {e}")
            self.maintenance_results["health_check"]["error"] = str(e)
            return False
    
    def generate_report(self) -> bool:
        """Generar reporte de mantenimiento"""
        logger.info("📊 Generando reporte de mantenimiento...")
        
        try:
            # Crear directorio de logs si no existe
            self.logs_dir.mkdir(parents=True, exist_ok=True)
            
            # Timestamp
            self.maintenance_results["timestamp"] = datetime.now().isoformat()
            
            # Guardar reporte JSON
            report_file = self.logs_dir / f"maintenance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(report_file, 'w', encoding='utf-8') as f:
                import json
                json.dump(self.maintenance_results, f, indent=2, ensure_ascii=False)
            
            # Generar reporte legible
            txt_report_file = self.logs_dir / f"maintenance_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            with open(txt_report_file, 'w', encoding='utf-8') as f:
                f.write("🧹 REPORTE DE MANTENIMIENTO - Nex-Fit Backend\n")
                f.write("=" * 60 + "\n\n")
                f.write(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
                
                # Limpieza
                f.write("LIMPEZA:\n")
                f.write("-" * 20 + "\n")
                cleanup = self.maintenance_results.get("cleanup", {})
                for item, status in cleanup.items():
                    if isinstance(status, int):
                        f.write(f"• {item}: {status} elementos\n")
                    else:
                        f.write(f"• {item}: {status}\n")
                
                # Optimización
                f.write(f"\nOPTIMIZACIÓN:\n")
                f.write("-" * 20 + "\n")
                optimization = self.maintenance_results.get("optimization", {})
                for item, status in optimization.items():
                    f.write(f"• {item}: {status}\n")
                
                # Health Check
                f.write(f"\nHEALTH CHECK:\n")
                f.write("-" * 20 + "\n")
                health = self.maintenance_results.get("health_check", {})
                for item, status in health.items():
                    f.write(f"• {item}: {status}\n")
                
                f.write("\n" + "=" * 60 + "\n")
            
            logger.info(f"✅ Reporte generado:")
            logger.info(f"   📄 JSON: {report_file}")
            logger.info(f"   📄 TXT: {txt_report_file}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error generando reporte: {e}")
            return False
    
    def show_maintenance_summary(self):
        """Mostrar resumen de mantenimiento"""
        
        # Limpieza
        cleanup = self.maintenance_results.get("cleanup", {})
        for item, status in cleanup.items():
            if isinstance(status, int) and status > 0:
            elif status == "ok":
            elif status == "warning":
            elif status == "error":
            else:
        
        # Optimización
        optimization = self.maintenance_results.get("optimization", {})
        for item, status in optimization.items():
            if status == "ok":
            elif status == "warning":
            else:
        
        # Health Check
        health = self.maintenance_results.get("health_check", {})
        for item, status in health.items():
            if status == "ok":
            elif status == "warning":
            else:
        
        
        # Recomendaciones
        
        if any(status == "error" for status in cleanup.values()):
        
        if any(status == "warning" for status in optimization.values()):
        
        if any(status == "warning" for status in health.values()):
        
    
    def run(self) -> bool:
        """Ejecutar todas las tareas de mantenimiento"""
        logger.info("🚀 Iniciando mantenimiento del sistema...")
        
        try:
            # Crear directorio de logs
            self.logs_dir.mkdir(parents=True, exist_ok=True)
            
            # Limpieza
            if self.clean:
                self.cleanup_temp_files()
                self.cleanup_docker()
            
            # Optimización
            if self.optimize:
                self.optimize_database()
            
            # Health Check
            if self.check:
                self.health_check()
            
            # Reporte
            if self.report:
                self.generate_report()
                self.show_maintenance_summary()
            
            # Si no se especificó ninguna opción, ejecutar todo
            if not any([self.clean, self.optimize, self.check, self.report]):
                logger.info("🔄 Ejecutando todas las tareas de mantenimiento...")
                self.cleanup_temp_files()
                self.cleanup_docker()
                self.optimize_database()
                self.health_check()
                self.generate_report()
                self.show_maintenance_summary()
            
            logger.info("✅ Mantenimiento completado")
            return True
            
        except KeyboardInterrupt:
            logger.info("⏹️  Mantenimiento interrumpido por el usuario")
            return False
        except Exception as e:
            logger.error(f"💥 Error inesperado: {e}")
            return False


def main():
    """Función principal"""
    parser = argparse.ArgumentParser(
        description="🧹 Script de Mantenimiento - Nex-Fit Backend",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python scripts/maintenance.py                    # Mantenimiento completo
  python scripts/maintenance.py --clean            # Solo limpieza
  python scripts/maintenance.py --optimize         # Solo optimización
  python scripts/maintenance.py --check            # Solo health check
  python scripts/maintenance.py --report           # Solo reporte
        """
    )
    
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Ejecutar limpieza de archivos temporales y Docker"
    )
    
    parser.add_argument(
        "--optimize",
        action="store_true",
        help="Optimizar base de datos y sesiones"
    )
    
    parser.add_argument(
        "--check",
        action="store_true",
        help="Ejecutar health check del sistema"
    )
    
    parser.add_argument(
        "--report",
        action="store_true",
        help="Generar reporte de mantenimiento"
    )
    
    args = parser.parse_args()
    
    # Crear y ejecutar herramienta de mantenimiento
    maintenance = MaintenanceTool(
        clean=args.clean,
        optimize=args.optimize,
        check=args.check,
        report=args.report
    )
    
    # Ejecutar mantenimiento
    success = maintenance.run()
    
    # Código de salida
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main() 