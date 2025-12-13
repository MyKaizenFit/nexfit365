# 🔄 Flujo de Trabajo: Desarrollo y Producción

## 📋 Visión General

Este documento describe el flujo de trabajo recomendado para desarrollar y desplegar NexFit365, separando claramente los entornos de **desarrollo** y **producción**.

## 🏗️ Arquitectura de Entornos

### En tu Máquina Local (Desarrollo)
- Clonas el repositorio
- Trabajas en la rama `develop`
- Pruebas cambios localmente
- Haces commits y push

### En el Servidor

#### Entorno de Desarrollo
- **Puertos**: 3001 (frontend), 8001 (backend), 5434 (DB)
- **Base de datos**: `mykaizenfit_dev`
- **Datos**: `/srv/mykaizenfit/pro/data-dev/`
- **Uso**: Probar cambios antes de producción
- **Comando**: `./dev.sh up`

#### Entorno de Producción
- **Puertos**: 3000 (frontend), 8000 (backend), 5433 (DB)
- **Base de datos**: `mykaizenfit`
- **Datos**: `/srv/mykaizenfit/pro/data/`
- **Uso**: Usuarios finales
- **Comando**: Ver `deploy.sh` o comandos manuales

## 🌿 Estructura de Ramas Git

```
main (producción)
  └── develop (desarrollo)
       └── feature/nombre-feature (nuevas funcionalidades)
```

### Ramas

- **`main`**: Código en producción. Solo código estable y probado.
- **`develop`**: Rama de desarrollo. Integración de nuevas features.
- **`feature/*`**: Ramas temporales para nuevas funcionalidades.

## 🔄 Flujo de Trabajo Recomendado

### 1️⃣ Trabajo Diario en Desarrollo

```bash
# En tu máquina local

# 1. Clonar el repositorio (primera vez)
git clone <url-del-repositorio> nexfit365
cd nexfit365

# 2. Crear y cambiar a rama develop
git checkout -b develop
git push -u origin develop

# 3. Trabajar en una nueva feature
git checkout develop
git pull origin develop
git checkout -b feature/nueva-funcionalidad

# 4. Hacer cambios y commits
git add .
git commit -m "feat: descripción de la nueva funcionalidad"
git push origin feature/nueva-funcionalidad

# 5. Cuando termines, mergear a develop
git checkout develop
git merge feature/nueva-funcionalidad
git push origin develop
```

### 2️⃣ Pruebas en Entorno de Desarrollo (Servidor)

```bash
# En el servidor, en /srv/mykaizenfit/pro/

# 1. Cambiar a rama develop
git checkout develop
git pull origin develop

# 2. Iniciar entorno de desarrollo
./dev.sh up

# 3. Probar cambios en http://localhost:3001
./dev.sh logs  # Ver logs si hay problemas

# 4. Si todo está bien, continuar con el flujo
# Si hay problemas, corregir y volver al paso 1
```

### 3️⃣ Deploy a Producción

```bash
# En el servidor, en /srv/mykaizenfit/pro/

# Opción A: Usar script de deploy (RECOMENDADO)
./deploy.sh

# Opción B: Manual
git checkout main
git pull origin main
git merge develop  # O mergear desde la feature específica
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d --build
```

## 🚀 Script de Deploy Automático

El script `deploy.sh` automatiza el proceso:

1. ✅ Hace backup de la base de datos
2. ✅ Verifica que estás en la rama correcta
3. ✅ Pull del código más reciente
4. ✅ Construye y despliega los contenedores
5. ✅ Ejecuta migraciones
6. ✅ Verifica que todo esté funcionando

### Uso del Script

```bash
./deploy.sh
```

## 📝 Convenciones de Commits

Usa mensajes de commit descriptivos:

- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Cambios en documentación
- `style:` Cambios de formato (no afectan código)
- `refactor:` Refactorización de código
- `test:` Añadir o modificar tests
- `chore:` Tareas de mantenimiento

Ejemplo:
```bash
git commit -m "feat: añadir sistema de notificaciones push"
git commit -m "fix: corregir error al guardar entrenamientos"
```

## ⚠️ Buenas Prácticas

### ✅ HACER

1. **Siempre trabajar en ramas separadas** para nuevas features
2. **Probar en entorno de desarrollo** antes de producción
3. **Hacer commits frecuentes** con mensajes claros
4. **Revisar cambios** antes de hacer merge a `main`
5. **Hacer backups** antes de despliegues importantes
6. **Usar `./dev.sh`** para desarrollo, nunca tocar producción directamente

### ❌ NO HACER

1. ❌ **NO hacer commits directos a `main`** (excepto hotfixes urgentes)
2. ❌ **NO modificar producción directamente** sin pasar por desarrollo
3. ❌ **NO hacer push a producción** sin probar antes
4. ❌ **NO ignorar los logs** cuando algo falla
5. ❌ **NO mezclar configuraciones** de dev y prod

## 🔧 Comandos Útiles

### Desarrollo Local
```bash
./dev.sh up          # Iniciar desarrollo
./dev.sh down        # Detener desarrollo
./dev.sh logs        # Ver logs
./dev.sh rebuild     # Reconstruir servicios
./dev.sh migrate     # Ejecutar migraciones
```

### Producción
```bash
# Ver estado
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps

# Ver logs
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs -f

# Reconstruir un servicio específico
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d --build backend

# Ejecutar migraciones
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py migrate
```

## 🆘 Solución de Problemas

### Si algo falla en producción

1. **No entrar en pánico** 🧘
2. **Revisar logs**: `docker compose -f docker-compose.prod.yml logs -f`
3. **Revisar estado**: `docker compose -f docker-compose.prod.yml ps`
4. **Rollback si es necesario**: Volver a commit anterior
   ```bash
   git checkout main
   git reset --hard <commit-anterior>
   ./deploy.sh
   ```

### Si hay conflicto de puertos

- Desarrollo usa: 3001, 8001, 5434
- Producción usa: 3000, 8000, 5433
- Verificar que no haya conflictos: `netstat -tulpn | grep -E '3000|3001|8000|8001'`

## 📚 Recursos Adicionales

- Ver `README.md` para información general
- Ver `docker-compose.dev.yml` para configuración de desarrollo
- Ver `docker-compose.prod.yml` para configuración de producción

