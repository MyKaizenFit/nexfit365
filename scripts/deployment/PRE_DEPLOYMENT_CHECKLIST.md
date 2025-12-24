# 📋 Checklist Pre-Deployment a Producción

Este checklist debe completarse antes de desplegar a producción.

## ✅ 1. Código y Git

- [ ] Todos los cambios están commiteados
- [ ] Todos los cambios están pusheados a la rama `develop` o `main`
- [ ] No hay cambios sin commitear en el directorio de trabajo
- [ ] Se ha revisado el historial de commits recientes
- [ ] Se ha verificado que no hay archivos sensibles en el repositorio

## ✅ 2. Migraciones de Base de Datos

- [ ] Todas las migraciones están creadas y commiteadas
- [ ] Se ha verificado que las migraciones no tienen errores:
  ```bash
  docker compose exec backend python manage.py makemigrations --check --dry-run
  ```
- [ ] Se ha probado aplicar las migraciones en desarrollo:
  ```bash
  docker compose exec backend python manage.py migrate
  ```
- [ ] Se ha verificado que no hay migraciones pendientes:
  ```bash
  docker compose exec backend python manage.py showmigrations
  ```

## ✅ 3. Variables de Entorno

- [ ] Archivo `.env.production` existe y está configurado (en el servidor de producción)
- [ ] Archivo `docker/backend.env.production` existe y está configurado
- [ ] Archivo `frontend/docker.env.production` existe y está configurado
- [ ] `SECRET_KEY` de Django está configurado y es seguro
- [ ] `ALLOWED_HOSTS` incluye los dominios de producción
- [ ] `CORS_ALLOWED_ORIGINS` incluye los dominios del frontend
- [ ] `POSTGRES_PASSWORD` y `DB_PASSWORD` coinciden
- [ ] `REDIS_PASSWORD` está configurado
- [ ] `NEXT_PUBLIC_API_URL` apunta a la URL correcta del backend

## ✅ 4. Base de Datos

- [ ] Se ha exportado la base de datos de desarrollo:
  ```powershell
  .\scripts\deployment\export-dev-db.ps1
  ```
- [ ] El archivo de exportación está disponible y verificado
- [ ] Se ha creado un backup de la base de datos de producción actual (si existe)
- [ ] Se ha planificado la importación de la BD de desarrollo a producción

## ✅ 5. Archivos Estáticos y Media

- [ ] Se ha verificado que `collectstatic` funciona correctamente:
  ```bash
  docker compose exec backend python manage.py collectstatic --noinput --dry-run
  ```
- [ ] Los archivos de media (imágenes, videos) están disponibles
- [ ] Se ha verificado el acceso a los archivos estáticos

## ✅ 6. Tests y Validación

- [ ] Se han ejecutado los tests (si existen):
  ```bash
  docker compose exec backend python manage.py test
  ```
- [ ] Se ha probado el flujo completo en desarrollo
- [ ] Se ha verificado que no hay errores en la consola del navegador
- [ ] Se ha verificado que las APIs responden correctamente

## ✅ 7. Seguridad

- [ ] `DEBUG=False` en producción
- [ ] No hay credenciales hardcodeadas en el código
- [ ] Los archivos `.env*` están en `.gitignore`
- [ ] Se han revisado los permisos de archivos sensibles
- [ ] Se ha verificado la configuración de CORS

## ✅ 8. Docker y Contenedores

- [ ] Los Dockerfiles están actualizados
- [ ] `docker-compose.prod.yml` está configurado correctamente
- [ ] Los healthchecks están configurados
- [ ] Los volúmenes están configurados correctamente
- [ ] Se ha verificado que los puertos no están en conflicto

## ✅ 9. Documentación

- [ ] Se ha actualizado la documentación si hay cambios importantes
- [ ] Se ha documentado cualquier cambio en el proceso de deployment
- [ ] Se han actualizado los scripts de deployment si es necesario

## ✅ 10. Plan de Rollback

- [ ] Se tiene un plan para revertir el deployment si algo sale mal
- [ ] Se tiene acceso a los backups de la base de datos
- [ ] Se sabe cómo detener los servicios de producción
- [ ] Se sabe cómo restaurar la versión anterior

---

## 🚀 Proceso de Deployment

Una vez completado el checklist, sigue estos pasos:

### Paso 1: Exportar Base de Datos de Desarrollo
```powershell
.\scripts\deployment\export-dev-db.ps1
```

### Paso 2: Copiar Archivo de Backup al Servidor de Producción
Copia el archivo generado (`.sql.gz` o `.sql.zip`) al servidor de producción.

### Paso 3: Importar Base de Datos en Producción
```powershell
.\scripts\deployment\import-to-prod.ps1 -BackupFile ".\backups\dev_database_export_YYYYMMDD_HHMMSS.sql.gz"
```

### Paso 4: Ejecutar Deployment
```bash
./deploy.sh
```

O manualmente:
```bash
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml build --no-cache
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py migrate --noinput
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py collectstatic --noinput
```

### Paso 5: Verificar Deployment
- Verificar que los servicios están corriendo:
  ```bash
  COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps
  ```
- Verificar health checks:
  ```bash
  curl http://localhost:8000/api/health/
  curl http://localhost:3000/
  ```
- Probar funcionalidades críticas en el navegador

---

## 📝 Notas Importantes

- ⚠️ **NUNCA** ejecutes `docker compose down -v` en producción (eliminaría los volúmenes)
- ⚠️ Siempre crea un backup antes de importar una nueva base de datos
- ⚠️ Verifica que las variables de entorno estén correctas antes del deployment
- ⚠️ El proceso de importación de BD puede tardar varios minutos dependiendo del tamaño

---

## 🆘 En Caso de Problemas

1. **Servicios no inician:**
   ```bash
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs
   ```

2. **Error en migraciones:**
   ```bash
   COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py showmigrations
   ```

3. **Error en base de datos:**
   - Verificar que el contenedor de BD está corriendo
   - Verificar credenciales en `backend.env.production`
   - Revisar logs: `docker logs <container-id>`

4. **Rollback:**
   - Detener servicios: `docker compose -f docker-compose.prod.yml down`
   - Restaurar backup de BD si es necesario
   - Volver a la versión anterior del código: `git checkout <previous-commit>`





