# 🔧 Scripts de Automatización - Nex-Fit Backend

Esta carpeta contiene scripts automatizados para configurar, ejecutar tests y mantener el proyecto Nex-Fit Backend.

## 📋 Scripts Disponibles

### 🚀 **quick_start.sh** - Inicio Rápido del Proyecto
**Descripción**: Script principal para configurar y ejecutar el proyecto de forma rápida.

**Uso**:
```bash
# Setup básico
./scripts/quick_start.sh

# Setup con Docker
./scripts/quick_start.sh --docker

# Setup + ejecutar tests
./scripts/quick_start.sh --test

# Limpiar + setup
./scripts/quick_start.sh --clean

# Docker + tests
./scripts/quick_start.sh --docker --test
```

**Funcionalidades**:
- ✅ Verifica prerrequisitos (Python 3.11+, pip, Docker)
- ✅ Configura entorno virtual
- ✅ Instala dependencias
- ✅ Configura variables de entorno
- ✅ Ejecuta migraciones de base de datos
- ✅ Crea datos demo
- ✅ Ejecuta tests (opcional)
- ✅ Inicia servidor
- ✅ Soporte para Docker y modo local

---

### 🧪 **run_tests.py** - Testing Automatizado Completo
**Descripción**: Script Python que ejecuta todos los tests del proyecto con reportes detallados.

**Uso**:
```bash
# Tests básicos
python scripts/run_tests.py

# Tests con cobertura
python scripts/run_tests.py --coverage

# Tests con logging detallado
python scripts/run_tests.py --verbose

# Modo headless (sin interacción)
python scripts/run_tests.py --headless
```

**Funcionalidades**:
- ✅ Levanta servidor local automáticamente
- ✅ Ejecuta tests de todas las apps
- ✅ Genera reportes de cobertura
- ✅ Logs detallados de cada prueba
- ✅ Reportes gráficos de resultados
- ✅ Tests de API endpoints
- ✅ Tests de base de datos
- ✅ Tests de permisos y seguridad
- ✅ Genera reportes HTML y JSON

---

### 🔧 **setup_environment.py** - Configuración del Entorno
**Descripción**: Script para configurar automáticamente el entorno de testing.

**Uso**:
```bash
# Configuración básica
python scripts/setup_environment.py

# Forzar configuración
python scripts/setup_environment.py --force

# Limpiar antes de configurar
python scripts/setup_environment.py --clean
```

**Funcionalidades**:
- ✅ Verifica versión de Python
- ✅ Verifica dependencias instaladas
- ✅ Verifica entorno virtual
- ✅ Verifica configuración de Django
- ✅ Verifica conexión a base de datos
- ✅ Ejecuta migraciones
- ✅ Crea superusuario
- ✅ Crea datos de prueba
- ✅ Verifica Redis y archivos estáticos
- ✅ Ejecuta tests básicos de verificación

---

### 🧹 **maintenance.py** - Mantenimiento y Limpieza
**Descripción**: Script para tareas de mantenimiento y limpieza del proyecto.

**Uso**:
```bash
# Mantenimiento completo
python scripts/maintenance.py

# Solo limpieza
python scripts/maintenance.py --clean

# Solo optimización
python scripts/maintenance.py --optimize

# Solo health check
python scripts/maintenance.py --check

# Solo reporte
python scripts/maintenance.py --report
```

**Funcionalidades**:
- ✅ Limpieza de archivos temporales
- ✅ Limpieza de recursos Docker
- ✅ Optimización de base de datos
- ✅ Limpieza de sesiones expiradas
- ✅ Health check del sistema
- ✅ Verificación de permisos
- ✅ Verificación de dependencias
- ✅ Generación de reportes
- ✅ Limpieza de cache y logs

---

## 📁 Estructura de Directorios

```
scripts/
├── README.md                 # Esta documentación
├── quick_start.sh            # Script de inicio rápido (bash)
├── run_tests.py              # Script de testing automatizado
├── setup_environment.py      # Script de configuración
├── maintenance.py            # Script de mantenimiento
└── logs/                     # Directorio de logs
    ├── test_runner.log       # Logs del test runner
    ├── setup.log             # Logs de configuración
    ├── maintenance.log       # Logs de mantenimiento
    ├── test_results_*.json   # Resultados de tests en JSON
    ├── test_summary_*.txt    # Resúmenes de tests en texto
    ├── setup_results_*.json  # Resultados de configuración
    └── maintenance_report_*.txt # Reportes de mantenimiento
```

---

## 🚀 **Flujo de Uso Recomendado**

### **1. Primera vez (Setup inicial)**
```bash
# Configurar entorno
python scripts/setup_environment.py

# Inicio rápido
./scripts/quick_start.sh
```

### **2. Desarrollo diario**
```bash
# Ejecutar tests
python scripts/run_tests.py

# Mantenimiento semanal
python scripts/maintenance.py --clean
```

### **3. Antes de commit**
```bash
# Limpiar y verificar
python scripts/maintenance.py --clean --check

# Ejecutar tests completos
python scripts/run_tests.py --coverage
```

---

## 🔧 **Configuración de Scripts**

### **Variables de Entorno**
Los scripts leen automáticamente las variables del archivo `.env`:
- `DEBUG`: Modo debug
- `DB_*`: Configuración de base de datos
- `REDIS_URL`: URL de Redis
- `JWT_*`: Configuración de JWT

### **Dependencias Requeridas**
- **Python 3.11+**
- **pip** para instalar dependencias
- **Docker** (opcional, para modo Docker)
- **PostgreSQL** o acceso a base de datos
- **Redis** (opcional, para cache)

---

## 📊 **Reportes Generados**

### **Tests**
- **JSON**: Resultados detallados en formato JSON
- **HTML**: Reporte de cobertura en formato HTML
- **TXT**: Resumen legible de resultados
- **Logs**: Logs detallados de cada prueba

### **Configuración**
- **JSON**: Estado de configuración del entorno
- **TXT**: Resumen de configuración
- **Logs**: Logs de proceso de configuración

### **Mantenimiento**
- **JSON**: Reporte de tareas de mantenimiento
- **TXT**: Resumen de mantenimiento
- **Logs**: Logs de proceso de mantenimiento

---

## 🚨 **Solución de Problemas**

### **Error: Permisos denegados**
```bash
chmod +x scripts/quick_start.sh
```

### **Error: Python no encontrado**
```bash
# Verificar Python
python3 --version

# Usar python3 explícitamente
python3 scripts/run_tests.py
```

### **Error: Dependencias faltantes**
```bash
# Instalar dependencias
pip install -r requirements.txt

# O usar el script de setup
python scripts/setup_environment.py
```

### **Error: Base de datos no accesible**
```bash
# Verificar configuración
python manage.py check --database default

# Verificar archivo .env
cat .env
```

---

## 📚 **Documentación Relacionada**

- **[docs/README.md](../docs/README.md)** - Documentación general del proyecto
- **[docs/deployment.md](../docs/deployment.md)** - Guía de despliegue
- **[docs/testing.md](../docs/testing.md)** - Guía de testing
- **[docs/urls.md](../docs/urls.md)** - Documentación de endpoints

---

## 🎯 **Próximas Mejoras**

### **Versión 2.0**
- [ ] **Script de CI/CD** para GitHub Actions
- [ ] **Script de backup** de base de datos
- [ ] **Script de monitoreo** en tiempo real
- [ ] **Script de deployment** automático

### **Versión 3.0**
- [ ] **Interfaz web** para scripts
- [ ] **Scheduling** automático de tareas
- [ ] **Notificaciones** por email/Slack
- [ ] **Métricas** de performance

---

## 📞 **Soporte**

### **Para reportar problemas:**
1. **Revisar logs** en `scripts/logs/`
2. **Verificar configuración** del entorno
3. **Ejecutar script de setup** para verificar dependencias
4. **Crear issue** en GitHub con detalles del error

### **Para contribuir:**
1. **Fork** del repositorio
2. **Crear branch** para tu feature
3. **Implementar** siguiendo estándares del proyecto
4. **Tests** para nueva funcionalidad
5. **Pull Request** con descripción detallada

---

**¡Happy Scripting! 🚀**

---

*Última actualización: Enero 2025*  
*Versión: 1.0.0*  
*Responsable: Equipo de Desarrollo Nex-Fit* 