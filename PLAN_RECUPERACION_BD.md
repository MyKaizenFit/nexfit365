# Plan de Recuperación de Base de Datos - Dev

## 📋 Situación Actual

La base de datos de desarrollo comenzó a tener problemas después de intentar cargar menús usando el script `crear_menus_desde_recetas.sh`, que intenta ejecutar un comando Django inexistente (`create_meals_from_recipes`).

### Problemas Detectados

1. **Comando inexistente**: El script intenta ejecutar `python manage.py create_meals_from_recipes`, que no existe
2. **Posible corrupción de datos**: Menús huérfanos (sin plan asociado) o datos inconsistentes
3. **Backend no inicia**: Posiblemente debido a datos corruptos o problemas de integridad

---

## 🔍 Scripts de Diagnóstico Creados

### 1. `verificar_db_completo.sh`
Script bash para verificar el estado completo de la base de datos:
- Verifica contenedores
- Cuenta registros en tablas principales
- Detecta menús huérfanos
- Verifica integridad de foreign keys

**Uso:**
```bash
cd /srv/mykaizenfit/pro
./verificar_db_completo.sh
```

### 2. `backend/verificar_integridad_bd.py`
Script Python para verificar integridad de datos:
- Verifica conexión
- Detecta menús huérfanos
- Verifica selecciones inválidas
- Verifica campos NULL
- Verifica integridad de foreign keys

**Uso:**
```bash
cd /srv/mykaizenfit/pro
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python verificar_integridad_bd.py
```

### 3. `diagnosticar_y_recuperar_bd.sh` ⭐ **RECOMENDADO**
Script interactivo para diagnosticar y recuperar la base de datos:
- Muestra backups disponibles
- Verifica estado actual
- Permite restaurar desde backup
- Permite limpiar datos corruptos

**Uso:**
```bash
cd /srv/mykaizenfit/pro
./diagnosticar_y_recuperar_bd.sh
```

---

## 💾 Backups Disponibles

Se encontraron backups diarios desde el **17 de noviembre de 2025**:

| Fecha | Tamaño | Estado |
|-------|--------|--------|
| 2025-11-17 | 35K | ⭐ Más grande (probablemente más completo) |
| 2025-11-18 | 17K | |
| 2025-11-19 | 18K | |
| 2025-11-20 | 22K | |
| 2025-11-21 | 23K | |
| 2025-11-22 | 27K | |
| 2025-11-23 | 27K | |
| 2025-11-24 | 28K | |
| 2025-11-25 | 31K | Más reciente |

**Ubicación:** `/srv/mykaizenfit/pro/backups/daily/`

---

## 🚀 Pasos Recomendados para Recuperación

### Opción 1: Restaurar desde Backup (RECOMENDADO)

Si los menús se cargaron después del 17 de noviembre, el backup del 17 es probablemente el más seguro para restaurar.

1. **Ejecutar script interactivo:**
   ```bash
   cd /srv/mykaizenfit/pro
   ./diagnosticar_y_recuperar_bd.sh
   ```

2. **Seleccionar Opción A** (Restaurar desde backup más antiguo)

3. **Elegir el backup del 17 de noviembre** (`mykaizenfit-20251117.sql.gz`)

4. **Confirmar la restauración** (escribe 'SI' cuando se solicite)

5. **El script automáticamente:**
   - Creará un backup de seguridad del estado actual
   - Parará el backend
   - Eliminará la base de datos corrupta
   - Creará una nueva base de datos
   - Restaurará desde el backup seleccionado
   - Reiniciará el backend

### Opción 2: Limpiar Solo Datos Corruptos

Si prefieres mantener los datos recientes y solo eliminar lo corrupto:

1. **Ejecutar script interactivo:**
   ```bash
   cd /srv/mykaizenfit/pro
   ./diagnosticar_y_recuperar_bd.sh
   ```

2. **Seleccionar Opción B** (Eliminar solo datos corruptos)

3. **Confirmar la limpieza** (escribe 'SI' cuando se solicite)

4. Esto eliminará solo los menús huérfanos, manteniendo el resto de datos

### Opción 3: Verificación Manual

1. **Verificar estado actual:**
   ```bash
   cd /srv/mykaizenfit/pro
   ./verificar_db_completo.sh
   ```

2. **Verificar integridad con Python:**
   ```bash
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python verificar_integridad_bd.py
   ```

---

## ⚠️ Consideraciones Importantes

### Antes de Restaurar

1. **Verifica que el contenedor de BD esté corriendo:**
   ```bash
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps db
   ```

2. **Si no está corriendo, levanta los servicios:**
   ```bash
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d db
   ```

3. **Asegúrate de tener permisos Docker:**
   - Los scripts usan `COMPOSE_PROJECT_NAME` sin sudo
   - Si necesitas sudo, modifica los scripts o ejecuta con sudo

### Después de Restaurar

1. **Verifica que el backend se reinició correctamente:**
   ```bash
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs backend --tail=50
   ```

2. **Verifica que la base de datos esté limpia:**
   ```bash
   ./verificar_db_completo.sh
   ```

3. **Si el backend no inicia:**
   - Revisa los logs del backend
   - Verifica las migraciones: `docker compose exec backend python manage.py showmigrations`
   - Aplica migraciones si es necesario: `docker compose exec backend python manage.py migrate`

---

## 🔧 Correcciones Futuras

### Problema con `crear_menus_desde_recetas.sh`

El script actual intenta ejecutar un comando que no existe. Debería usar uno de estos:

1. **`populate_expanded_nutrition_plans`** - Crea planes de nutrición completos con menús
2. **`populate_expanded_recipes`** - Crea recetas primero

**Script corregido debería ser:**
```bash
#!/bin/bash
echo "🍽️ Creando menús desde recetas..."
echo ""

# Primero cargar recetas (si no existen)
docker exec nexfit-pro-backend-1 python manage.py populate_expanded_recipes

# Luego crear planes con menús
docker exec nexfit-pro-backend-1 python manage.py populate_expanded_nutrition_plans

echo ""
echo "✅ Proceso completado"
```

---

## 📝 Notas

- Los backups se almacenan en formato `.sql.gz` (comprimido)
- El script de restauración descomprime automáticamente
- Se crea un backup de seguridad antes de restaurar (en `/tmp/`)
- Los backups diarios se generan automáticamente a las 3:00 AM

---

## ✅ Checklist de Recuperación

- [ ] Verificar que el contenedor de BD esté corriendo
- [ ] Ejecutar diagnóstico: `./verificar_db_completo.sh`
- [ ] Ejecutar script de recuperación: `./diagnosticar_y_recuperar_bd.sh`
- [ ] Seleccionar backup apropiado (recomendado: 2025-11-17)
- [ ] Confirmar restauración
- [ ] Verificar que el backend se reinició
- [ ] Verificar que la base de datos esté limpia
- [ ] Probar que la aplicación funciona correctamente

---

**Última actualización:** $(date)
**Entorno:** Desarrollo (`/srv/mykaizenfit/pro/`)
