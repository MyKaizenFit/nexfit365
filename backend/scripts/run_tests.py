#!/usr/bin/env python3
"""
🧪 Script de Testing Automatizado - Nex-Fit Backend

Este script ejecuta todas las pruebas del proyecto de forma automatizada:
1. Levanta el servidor local
2. Ejecuta todos los tests disponibles
3. Genera reportes gráficos de resultados
4. Documenta logs detallados de cada prueba

Uso:
    python scripts/run_tests.py [--headless] [--coverage] [--verbose]

Autor: Equipo Nex-Fit
Versión: 1.0.0
"""

import os
import sys
import time
import json
import subprocess
import threading
import signal
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import argparse
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scripts/logs/test_runner.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class TestRunner:
    """Clase principal para ejecutar tests automatizados"""
    
    def __init__(self, headless: bool = False, coverage: bool = False, verbose: bool = False):
        self.headless = headless
        self.coverage = coverage
        self.verbose = verbose
        self.project_root = Path(__file__).parent.parent
        self.logs_dir = self.project_root / "scripts" / "logs"
        self.results = {
            "start_time": datetime.now().isoformat(),
            "tests": {},
            "coverage": {},
            "server_status": "stopped",
            "summary": {}
        }
        self.server_process = None
        self.test_results = {}
        
    def setup_environment(self) -> bool:
        """Configurar el entorno de testing"""
        logger.info("🔧 Configurando entorno de testing...")
        
        try:
            # Verificar que estamos en el directorio correcto
            if not (self.project_root / "manage.py").exists():
                logger.error("❌ No se encontró manage.py. Ejecuta desde el directorio backend/")
                return False
            
            # Verificar entorno virtual
            if not os.getenv("VIRTUAL_ENV"):
                logger.warning("⚠️  No se detectó entorno virtual activo")
                logger.info("💡 Activa el entorno virtual: source .venv/bin/activate")
            
            # Verificar dependencias
            logger.info("📦 Verificando dependencias...")
            result = subprocess.run(
                ["python", "-c", "import django, rest_framework, pytest"],
                capture_output=True,
                text=True
            )
            
            if result.returncode != 0:
                logger.error("❌ Faltan dependencias. Instala con: pip install -r requirements.txt")
                return False
            
            # Crear directorios necesarios
            self.logs_dir.mkdir(parents=True, exist_ok=True)
            
            logger.info("✅ Entorno configurado correctamente")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error configurando entorno: {e}")
            return False
    
    def start_server(self) -> bool:
        """Iniciar servidor Django en background"""
        logger.info("🚀 Iniciando servidor Django...")
        
        try:
            # Comando para iniciar servidor
            cmd = [
                "python", "manage.py", "runserver", 
                "--noreload",  # Sin auto-reload para tests
                "127.0.0.1:8000"
            ]
            
            # Iniciar servidor en background
            self.server_process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=self.project_root
            )
            
            # Esperar a que el servidor esté listo
            logger.info("⏳ Esperando que el servidor esté listo...")
            for i in range(30):  # 30 segundos máximo
                try:
                    import requests
                    response = requests.get("http://127.0.0.1:8000/api/health/", timeout=1)
                    if response.status_code == 200:
                        logger.info("✅ Servidor iniciado correctamente en http://127.0.0.1:8000")
                        self.results["server_status"] = "running"
                        return True
                except:
                    pass
                time.sleep(1)
            
            logger.error("❌ Timeout esperando servidor")
            return False
            
        except Exception as e:
            logger.error(f"❌ Error iniciando servidor: {e}")
            return False
    
    def stop_server(self):
        """Detener servidor Django"""
        if self.server_process:
            logger.info("🛑 Deteniendo servidor...")
            self.server_process.terminate()
            try:
                self.server_process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.server_process.kill()
            self.results["server_status"] = "stopped"
            logger.info("✅ Servidor detenido")
    
    def run_migrations(self) -> bool:
        """Ejecutar migraciones de base de datos"""
        logger.info("🗄️  Ejecutando migraciones...")
        
        try:
            result = subprocess.run(
                ["python", "manage.py", "migrate"],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if result.returncode == 0:
                logger.info("✅ Migraciones ejecutadas correctamente")
                return True
            else:
                logger.error(f"❌ Error en migraciones: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error ejecutando migraciones: {e}")
            return False
    
    def create_test_data(self) -> bool:
        """Crear datos de prueba"""
        logger.info("🎭 Creando datos de prueba...")
        
        try:
            result = subprocess.run(
                ["python", "manage.py", "seed_demo", "--clear"],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if result.returncode == 0:
                logger.info("✅ Datos de prueba creados correctamente")
                return True
            else:
                logger.warning(f"⚠️  Advertencia creando datos: {result.stderr}")
                return True  # No es crítico
                
        except Exception as e:
            logger.warning(f"⚠️  Error creando datos de prueba: {e}")
            return True  # No es crítico
    
    def run_tests(self) -> Dict:
        """Ejecutar todos los tests disponibles"""
        logger.info("🧪 Ejecutando tests...")
        
        test_results = {}
        apps = [
            "accounts", "nutrition", "workouts", "progress", 
            "notifications", "achievements", "dashboard", "api"
        ]
        
        for app in apps:
            logger.info(f"📱 Probando app: {app}")
            
            try:
                # Comando pytest para la app
                cmd = ["pytest", f"{app}/tests/", "-v", "--tb=short"]
                
                if self.coverage:
                    cmd.extend(["--cov", app, "--cov-report=term-missing"])
                
                if self.verbose:
                    cmd.append("--log-cli-level=DEBUG")
                
                # Ejecutar tests
                start_time = time.time()
                result = subprocess.run(
                    cmd,
                    capture_output=True,
                    text=True,
                    cwd=self.project_root,
                    timeout=300  # 5 minutos máximo por app
                )
                end_time = time.time()
                
                # Procesar resultados
                test_results[app] = {
                    "status": "passed" if result.returncode == 0 else "failed",
                    "return_code": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                    "duration": round(end_time - start_time, 2),
                    "timestamp": datetime.now().isoformat()
                }
                
                # Log del resultado
                if result.returncode == 0:
                    logger.info(f"✅ {app}: Tests pasaron ({test_results[app]['duration']}s)")
                else:
                    logger.error(f"❌ {app}: Tests fallaron ({test_results[app]['duration']}s)")
                
            except subprocess.TimeoutExpired:
                test_results[app] = {
                    "status": "timeout",
                    "return_code": -1,
                    "stdout": "",
                    "stderr": "Timeout después de 5 minutos",
                    "duration": 300,
                    "timestamp": datetime.now().isoformat()
                }
                logger.error(f"⏰ {app}: Timeout en tests")
                
            except Exception as e:
                test_results[app] = {
                    "status": "error",
                    "return_code": -1,
                    "stdout": "",
                    "stderr": str(e),
                    "duration": 0,
                    "timestamp": datetime.now().isoformat()
                }
                logger.error(f"💥 {app}: Error ejecutando tests: {e}")
        
        # Tests generales
        logger.info("🌐 Ejecutando tests generales...")
        try:
            cmd = ["pytest", "--tb=short"]
            if self.coverage:
                cmd.extend(["--cov", ".", "--cov-report=html", "--cov-report=term-missing"])
            if self.verbose:
                cmd.append("--log-cli-level=DEBUG")
            
            start_time = time.time()
            result = subprocess.run(cmd, capture_output=True, text=True, cwd=self.project_root, timeout=600)
            end_time = time.time()
            
            test_results["general"] = {
                "status": "passed" if result.returncode == 0 else "failed",
                "return_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "duration": round(end_time - start_time, 2),
                "timestamp": datetime.now().isoformat()
            }
            
            if result.returncode == 0:
                logger.info(f"✅ Tests generales: Pasaron ({test_results['general']['duration']}s)")
            else:
                logger.error(f"❌ Tests generales: Fallaron ({test_results['general']['duration']}s)")
                
        except Exception as e:
            test_results["general"] = {
                "status": "error",
                "return_code": -1,
                "stdout": "",
                "stderr": str(e),
                "duration": 0,
                "timestamp": datetime.now().isoformat()
            }
            logger.error(f"💥 Tests generales: Error: {e}")
        
        return test_results
    
    def generate_coverage_report(self) -> Dict:
        """Generar reporte de cobertura"""
        if not self.coverage:
            return {}
        
        logger.info("📊 Generando reporte de cobertura...")
        
        try:
            # Ejecutar coverage report
            result = subprocess.run(
                ["coverage", "report", "--show-missing"],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if result.returncode == 0:
                # Parsear salida de coverage
                coverage_data = {}
                lines = result.stdout.strip().split('\n')
                
                for line in lines:
                    if 'TOTAL' in line:
                        parts = line.split()
                        if len(parts) >= 4:
                            coverage_data["total"] = {
                                "statements": parts[1],
                                "missing": parts[2],
                                "coverage": parts[3]
                            }
                        break
                
                logger.info("✅ Reporte de cobertura generado")
                return coverage_data
            else:
                logger.warning(f"⚠️  Error generando coverage: {result.stderr}")
                return {}
                
        except Exception as e:
            logger.warning(f"⚠️  Error en coverage: {e}")
            return {}
    
    def test_api_endpoints(self) -> Dict:
        """Probar endpoints de la API"""
        logger.info("🌐 Probando endpoints de la API...")
        
        api_tests = {}
        
        try:
            import requests
            
            # Health check
            try:
                response = requests.get("http://127.0.0.1:8000/api/health/", timeout=5)
                api_tests["health_check"] = {
                    "status": "passed" if response.status_code == 200 else "failed",
                    "status_code": response.status_code,
                    "response_time": response.elapsed.total_seconds(),
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                api_tests["health_check"] = {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
            
            # Swagger docs
            try:
                response = requests.get("http://127.0.0.1:8000/api/docs/", timeout=5)
                api_tests["swagger_docs"] = {
                    "status": "passed" if response.status_code == 200 else "failed",
                    "status_code": response.status_code,
                    "response_time": response.elapsed.total_seconds(),
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                api_tests["swagger_docs"] = {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
            
            # OpenAPI schema
            try:
                response = requests.get("http://127.0.0.1:8000/api/schema/", timeout=5)
                api_tests["openapi_schema"] = {
                    "status": "passed" if response.status_code == 200 else "failed",
                    "status_code": response.status_code,
                    "response_time": response.elapsed.total_seconds(),
                    "timestamp": datetime.now().isoformat()
                }
            except Exception as e:
                api_tests["openapi_schema"] = {
                    "status": "error",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                }
            
            logger.info("✅ Tests de API completados")
            return api_tests
            
        except ImportError:
            logger.warning("⚠️  Requests no disponible, saltando tests de API")
            return {}
        except Exception as e:
            logger.error(f"❌ Error en tests de API: {e}")
            return {}
    
    def generate_summary(self) -> Dict:
        """Generar resumen de resultados"""
        logger.info("📋 Generando resumen de resultados...")
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for app, result in self.test_results.items() if result["status"] == "passed")
        failed_tests = sum(1 for app, result in self.test_results.items() if result["status"] == "failed")
        error_tests = sum(1 for app, result in self.test_results.items() if result["status"] in ["error", "timeout"])
        
        total_duration = sum(result["duration"] for result in self.test_results.values())
        
        summary = {
            "total_apps": total_tests,
            "passed": passed_tests,
            "failed": failed_tests,
            "errors": error_tests,
            "success_rate": round((passed_tests / total_tests) * 100, 2) if total_tests > 0 else 0,
            "total_duration": round(total_duration, 2),
            "timestamp": datetime.now().isoformat()
        }
        
        return summary
    
    def save_results(self):
        """Guardar resultados en archivos"""
        logger.info("💾 Guardando resultados...")
        
        try:
            # Resultados completos en JSON
            results_file = self.logs_dir / f"test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            with open(results_file, 'w', encoding='utf-8') as f:
                json.dump(self.results, f, indent=2, ensure_ascii=False)
            
            # Resumen en formato legible
            summary_file = self.logs_dir / f"test_summary_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            with open(summary_file, 'w', encoding='utf-8') as f:
                f.write("🧪 RESUMEN DE TESTS - Nex-Fit Backend\n")
                f.write("=" * 50 + "\n\n")
                f.write(f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"Servidor: {self.results['server_status']}\n\n")
                
                f.write("RESULTADOS POR APP:\n")
                f.write("-" * 30 + "\n")
                
                for app, result in self.test_results.items():
                    status_emoji = {
                        "passed": "✅",
                        "failed": "❌",
                        "error": "💥",
                        "timeout": "⏰"
                    }.get(result["status"], "❓")
                    
                    f.write(f"{status_emoji} {app}: {result['status'].upper()}")
                    if result["duration"] > 0:
                        f.write(f" ({result['duration']}s)")
                    f.write("\n")
                
                f.write(f"\nRESUMEN GENERAL:\n")
                f.write("-" * 30 + "\n")
                f.write(f"Total de apps: {self.results['summary']['total_apps']}\n")
                f.write(f"Tests pasados: {self.results['summary']['passed']}\n")
                f.write(f"Tests fallidos: {self.results['summary']['failed']}\n")
                f.write(f"Errores: {self.results['summary']['errors']}\n")
                f.write(f"Tasa de éxito: {self.results['summary']['success_rate']}%\n")
                f.write(f"Tiempo total: {self.results['summary']['total_duration']}s\n")
            
            logger.info(f"✅ Resultados guardados en:")
            logger.info(f"   📄 JSON: {results_file}")
            logger.info(f"   📄 TXT: {summary_file}")
            
        except Exception as e:
            logger.error(f"❌ Error guardando resultados: {e}")
    
    def run(self) -> bool:
        """Ejecutar todo el proceso de testing"""
        logger.info("🚀 Iniciando proceso de testing automatizado...")
        
        try:
            # Setup
            if not self.setup_environment():
                return False
            
            # Migraciones
            if not self.run_migrations():
                return False
            
            # Datos de prueba
            self.create_test_data()
            
            # Iniciar servidor
            if not self.start_server():
                return False
            
            # Esperar un poco para que el servidor esté completamente listo
            time.sleep(2)
            
            # Tests de API
            self.results["api_tests"] = self.test_api_endpoints()
            
            # Ejecutar tests
            self.test_results = self.run_tests()
            self.results["tests"] = self.test_results
            
            # Coverage
            if self.coverage:
                self.results["coverage"] = self.generate_coverage_report()
            
            # Generar resumen
            self.results["summary"] = self.generate_summary()
            
            # Guardar resultados
            self.save_results()
            
            # Mostrar resumen final
            self.show_final_summary()
            
            return True
            
        except KeyboardInterrupt:
            logger.info("⏹️  Proceso interrumpido por el usuario")
            return False
        except Exception as e:
            logger.error(f"💥 Error inesperado: {e}")
            return False
        finally:
            # Limpiar
            self.stop_server()
    
    def show_final_summary(self):
        """Mostrar resumen final en consola"""
        
        summary = self.results["summary"]
        
        
        for app, result in self.test_results.items():
            status_emoji = {
                "passed": "✅",
                "failed": "❌",
                "error": "💥",
                "timeout": "⏰"
            }.get(result["status"], "❓")
            
            if result["duration"] > 0:
        
        
        if self.coverage and self.results.get("coverage"):
            coverage = self.results["coverage"]
            if "total" in coverage:
                total = coverage["total"]
        
        
        if self.coverage:
        
        
        # Recomendaciones
        if summary["success_rate"] == 100:
        elif summary["success_rate"] >= 80:
        elif summary["success_rate"] >= 60:
        else:
        


def main():
    """Función principal"""
    parser = argparse.ArgumentParser(
        description="🧪 Script de Testing Automatizado - Nex-Fit Backend",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Ejemplos de uso:
  python scripts/run_tests.py                    # Tests básicos
  python scripts/run_tests.py --coverage         # Con reporte de cobertura
  python scripts/run_tests.py --verbose          # Logs detallados
  python scripts/run_tests.py --headless         # Sin interacción
        """
    )
    
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Ejecutar en modo headless (sin interacción)"
    )
    
    parser.add_argument(
        "--coverage",
        action="store_true",
        help="Generar reporte de cobertura de código"
    )
    
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Mostrar logs detallados"
    )
    
    args = parser.parse_args()
    
    # Configurar logging según verbosidad
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
    
    # Crear y ejecutar test runner
    runner = TestRunner(
        headless=args.headless,
        coverage=args.coverage,
        verbose=args.verbose
    )
    
    # Manejar señales para limpieza
    def signal_handler(signum, frame):
        logger.info(f"📡 Señal {signum} recibida, limpiando...")
        runner.stop_server()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Ejecutar tests
    success = runner.run()
    
    # Código de salida
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main() 