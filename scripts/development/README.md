# Scripts de Desarrollo

## Copiar Base de Datos de Producción a Desarrollo

### Descripción
Este script copia la base de datos de producción (`mykaizenfit`) a la base de datos de desarrollo (`mykaizenfit_dev`) para poder trabajar con datos reales sin afectar producción.

### Requisitos
- Docker Desktop debe estar corriendo
- El entorno de producción debe estar activo (para hacer el backup)
- El entorno de desarrollo debe estar activo o se iniciará automáticamente

### Uso

#### Opción 1: Con confirmación (recomendado)
```powershell
.\scripts\development\copy-prod-db-to-dev.ps1
```

#### Opción 2: Sin confirmación (útil para automatización)
```powershell
.\scripts\development\copy-prod-db-to-dev.ps1 -Force
```

### ¿Qué hace el script?

1. ✅ Verifica que Docker esté corriendo
2. ✅ Verifica que los contenedores de producción y desarrollo estén activos
3. ✅ Crea un backup de la BD de producción
4. ✅ Detiene temporalmente el backend de desarrollo
5. ✅ Elimina la BD de desarrollo actual
6. ✅ Crea una nueva BD de desarrollo
7. ✅ Restaura el backup de producción en la BD de desarrollo
8. ✅ Reinicia el backend de desarrollo

### Seguridad

- ⚠️ **La BD de producción NO se modifica** - Solo se lee para hacer el backup
- ⚠️ **La BD de desarrollo se reemplaza completamente** - Todos los datos actuales se perderán
- ✅ El backup se guarda en `./backups/` por si necesitas restaurarlo manualmente

### Ejemplo de uso completo

```powershell
# 1. Asegúrate de que Docker Desktop esté corriendo

# 2. Levanta el entorno de desarrollo
docker compose -f docker-compose.dev.yml up -d

# 3. Copia la BD de producción a desarrollo
.\scripts\development\copy-prod-db-to-dev.ps1

# 4. ¡Listo! Ya tienes los datos de producción en desarrollo
```

### Solución de problemas

#### Error: "Docker Desktop no está corriendo"
- Inicia Docker Desktop manualmente desde el menú de inicio

#### Error: "No se encontró el contenedor de BD de producción"
- Asegúrate de que el entorno de producción esté corriendo:
  ```powershell
  COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps
  ```

#### Error: "No se pudo crear BD de desarrollo"
- Verifica que el contenedor de desarrollo esté corriendo:
  ```powershell
  COMPOSE_PROJECT_NAME=nexfit-dev docker compose -f docker-compose.dev.yml ps
  ```

### Notas importantes

- Los backups se guardan en `./backups/` con el formato: `backup_prod_to_dev_YYYYMMDD_HHMMSS.sql`
- El proceso puede tardar varios minutos dependiendo del tamaño de la BD
- Durante el proceso, el backend de desarrollo estará temporalmente inaccesible


