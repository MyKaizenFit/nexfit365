# 🛠️ Configuración para Desarrollo Local con Docker

## 📋 Resumen

Este documento explica cómo trabajar en desarrollo local con Docker y cómo se aplican los cambios en el código.

---

## 🔄 ¿Cómo Funcionan los Cambios en Docker?

### **Configuración Actual (Producción)**
El `docker-compose.yml` actual **NO tiene volúmenes montados** para el código fuente. Esto significa:
- ❌ Los cambios en el código **NO se reflejan automáticamente**
- ❌ Necesitas **reconstruir la imagen** cada vez que cambies código:
  ```bash
  docker compose build backend
  docker compose up -d backend
  ```
- ✅ Es adecuado para **producción** (código estático)

### **Configuración de Desarrollo (Recomendada)**
El `docker-compose.prod.yml` **SÍ tiene volúmenes montados** para el código fuente. Esto significa:
- ✅ Los cambios en el código **SE REFLEJAN AUTOMÁTICAMENTE**
- ✅ **NO necesitas reconstruir** la imagen
- ✅ **Hot-reload** automático en frontend y backend
- ✅ Ideal para **desarrollo** (código en constante cambio)

---

## 🚀 Levantar el Programa en Desarrollo

### **Opción 1: Usar docker-compose.prod.yml (Recomendado)**

```bash
# Levantar todos los servicios en modo desarrollo
docker compose -f docker-compose.prod.yml up -d

# Ver los logs en tiempo real
docker compose -f docker-compose.prod.yml logs -f

# Ver logs de un servicio específico
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml logs -f frontend
```

### **Opción 2: Usar docker-compose.yml (Producción)**

```bash
# Levantar todos los servicios
docker compose up -d

# Ver los logs
docker compose logs -f
```

---

## 📝 Diferencias Clave

### **docker-compose.yml (Producción)**
- ✅ Usa `gunicorn` (más eficiente para producción)
- ❌ Sin volúmenes montados → cambios NO se reflejan automáticamente
- ✅ Código estático compilado en la imagen

### **docker-compose.prod.yml (Desarrollo)**
- ✅ Usa `runserver` (con auto-reload automático)
- ✅ Con volúmenes montados → cambios SE REFLEJAN automáticamente
- ✅ Hot-reload en frontend (Next.js)
- ✅ Ideal para desarrollo activo

---

## 🔧 Comandos Útiles

### **Verificar Estado de los Servicios**
```bash
docker compose ps
# o
docker compose -f docker-compose.prod.yml ps
```

### **Detener los Servicios**
```bash
docker compose down
# o
docker compose -f docker-compose.prod.yml down
```

### **Reiniciar un Servicio Específico**
```bash
docker compose restart backend
# o
docker compose -f docker-compose.prod.yml restart backend
```

### **Ver Logs de un Servicio**
```bash
docker compose logs -f backend
# o
docker compose -f docker-compose.prod.yml logs -f backend
```

### **Ejecutar Comandos Django en el Contenedor**
```bash
# Crear un superusuario
docker compose exec backend python manage.py createsuperuser

# Ejecutar migraciones
docker compose exec backend python manage.py migrate

# Ejecutar un script Python
docker compose exec backend python create_test_users_with_plans.py
```

### **Acceder al Shell del Contenedor**
```bash
docker compose exec backend /bin/sh
# o
docker compose -f docker-compose.prod.yml exec backend /bin/sh
```

---

## 🎯 Flujo de Trabajo Recomendado

### **1. Desarrollo Activo (Cambiando Código Frecuentemente)**
```bash
# Usar docker-compose.prod.yml
docker compose -f docker-compose.prod.yml up -d

# Hacer cambios en el código
# Los cambios se reflejan automáticamente:
# - Backend: runserver detecta cambios y recarga
# - Frontend: Next.js hot-reload detecta cambios y recarga
```

### **2. Pruebas Finales (Antes de Subir a Producción)**
```bash
# Usar docker-compose.yml (producción)
docker compose down
docker compose build
docker compose up -d

# Verificar que todo funciona correctamente
```

---

## ⚠️ Notas Importantes

### **Volúmenes Montados en Desarrollo**
- `./backend:/app` → Todo el código del backend se monta
- `./frontend:/app` → Todo el código del frontend se monta
- Los cambios en archivos `.py`, `.tsx`, `.ts`, etc. se reflejan **inmediatamente**

### **Archivos Excluidos**
- `node_modules` → Se usa el del contenedor (más rápido)
- `.next` → Se regenera automáticamente

### **Base de Datos**
- La base de datos usa un volumen persistente (`postgres_data`)
- Los datos se mantienen aunque detengas los contenedores
- Para resetear la base de datos:
  ```bash
  docker compose down -v  # ⚠️ CUIDADO: Esto borra todos los datos
  ```

---

## 🔍 Verificar que Todo Funciona

### **1. Verificar que los Servicios Están Corriendo**
```bash
docker compose ps
```

Deberías ver:
- ✅ `db` - healthy
- ✅ `redis` - healthy
- ✅ `backend` - healthy
- ✅ `frontend` - running
- ✅ `db-backup` - healthy

### **2. Verificar que el Backend Responde**
```bash
curl http://localhost:8000/api/health/
```

O abrir en el navegador: `http://localhost:8000/api/health/`

### **3. Verificar que el Frontend Responde**
Abrir en el navegador: `http://localhost:3000`

### **4. Probar los Usuarios de Prueba**
- Email: `usuario1@test.com`
- Contraseña: `Test1234!`

---

## 🐛 Troubleshooting

### **Los Cambios No Se Reflejan**
1. Verificar que estás usando `docker-compose.prod.yml`:
   ```bash
   docker compose -f docker-compose.prod.yml ps
   ```

2. Verificar que los volúmenes están montados:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend ls -la /app
   ```

3. Reiniciar el servicio:
   ```bash
   docker compose -f docker-compose.prod.yml restart backend
   ```

### **Error de Permisos**
Si tienes problemas de permisos con los volúmenes montados:
```bash
# En Linux/Mac
sudo chown -R $USER:$USER ./backend ./frontend
```

### **El Backend No Inicia**
Ver los logs:
```bash
docker compose -f docker-compose.prod.yml logs backend
```

### **El Frontend No Inicia**
Ver los logs:
```bash
docker compose -f docker-compose.prod.yml logs frontend
```

---

## 📚 Recursos Adicionales

- [Documentación de Docker Compose](https://docs.docker.com/compose/)
- [Django Development Server](https://docs.djangoproject.com/en/stable/ref/django-admin/#runserver)
- [Next.js Development Mode](https://nextjs.org/docs/getting-started)

---

**Última actualización:** $(date)

