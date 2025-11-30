# Configuración de Google Drive API para Sincronización Automática

Esta guía te ayudará a configurar la API de Google Drive para sincronizar automáticamente los videos de ejercicios desde Google Drive a la base de datos.

## 📋 Requisitos Previos

1. Acceso a Google Cloud Console (https://console.cloud.google.com/)
2. Carpeta de Google Drive con los videos compartida
3. Permisos de administrador en el proyecto

---

## 🔧 Opción 1: Service Account (Recomendado para Producción)

Esta es la opción más segura y recomendada para entornos de producción.

### Paso 1: Crear un Proyecto en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Anota el ID del proyecto

### Paso 2: Habilitar Google Drive API

1. En el menú lateral, ve a **APIs & Services** > **Library**
2. Busca "Google Drive API"
3. Haz clic en "Enable"

### Paso 3: Crear Service Account

1. Ve a **APIs & Services** > **Credentials**
2. Haz clic en **Create Credentials** > **Service Account**
3. Completa el formulario:
   - **Service account name**: `nex-fit-drive-service` (o el nombre que prefieras)
   - **Service account ID**: Se genera automáticamente
   - Haz clic en **Create and Continue**
4. En "Grant this service account access to project":
   - Rol: **Editor** o **Viewer** (para solo lectura)
   - Haz clic en **Continue**
5. Haz clic en **Done**

### Paso 4: Crear y Descargar Credenciales

1. En la lista de Service Accounts, haz clic en el que acabas de crear
2. Ve a la pestaña **Keys**
3. Haz clic en **Add Key** > **Create new key**
4. Selecciona **JSON** y haz clic en **Create**
5. Se descargará un archivo JSON con las credenciales
6. **Guarda este archivo de forma segura** - no lo subas a Git

### Paso 5: Compartir Carpeta con Service Account

1. Abre el archivo JSON descargado
2. Busca el campo `client_email` (ejemplo: `nex-fit-drive-service@project-id.iam.gserviceaccount.com`)
3. Ve a Google Drive y abre la carpeta "Vídeos Nex+Fit"
4. Haz clic derecho > **Compartir**
5. Añade el email del Service Account con permisos de **Lector**
6. Guarda los cambios

### Paso 6: Configurar en el Backend

1. Copia el archivo JSON de credenciales a una ubicación segura en el servidor:
   ```bash
   # Ejemplo: en el directorio backend
   cp /ruta/al/credenciales.json /srv/mykaizenfit/pro/backend/google-drive-credentials.json
   ```

2. Asegúrate de que el archivo tenga permisos adecuados:
   ```bash
   chmod 600 /srv/mykaizenfit/pro/backend/google-drive-credentials.json
   ```

3. Agrega la ruta a las variables de entorno del backend (`dev/docker/backend.env` o `dev/backend/.env`):
   ```env
   GOOGLE_DRIVE_CREDENTIALS_PATH=/app/google-drive-credentials.json
   GOOGLE_DRIVE_FOLDER_ID=1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG
   ```

4. Si usas Docker, monta el archivo como volumen en `docker-compose.prod.yml`:
   ```yaml
   backend:
     volumes:
       - ./backend:/app
       - ./backend/google-drive-credentials.json:/app/google-drive-credentials.json:ro
   ```

### Paso 7: Instalar Dependencias

Asegúrate de que las dependencias estén instaladas en el contenedor:

```bash
# Si no están en requirements.txt, añádelas
echo "google-api-python-client" >> /srv/mykaizenfit/pro/backend/requirements.txt
echo "google-auth" >> /srv/mykaizenfit/pro/backend/requirements.txt
```

---

## 🔧 Opción 2: API Key (Más Simple, Menos Seguro)

Esta opción es más rápida de configurar pero menos segura. Solo úsala para desarrollo.

### Paso 1: Crear API Key

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Ve a **APIs & Services** > **Credentials**
3. Haz clic en **Create Credentials** > **API Key**
4. Copia la API Key generada

### Paso 2: Restringir la API Key (Recomendado)

1. Haz clic en la API Key recién creada
2. En "API restrictions", selecciona **Restrict key**
3. Selecciona **Google Drive API**
4. Guarda los cambios

### Paso 3: Configurar en el Backend

Agrega la API Key a las variables de entorno (`dev/docker/backend.env`):

```env
GOOGLE_DRIVE_API_KEY=tu-api-key-aqui
GOOGLE_DRIVE_FOLDER_ID=1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG
```

**⚠️ IMPORTANTE**: La API Key debe tener acceso de lectura a la carpeta compartida.

---

## ✅ Verificar la Configuración

### Verificar desde el Backend (Management Command)

```bash
cd /srv/mykaizenfit/pro
docker compose -f docker-compose.prod.yml exec backend python manage.py create_exercises_from_google_drive --use-api --folder-id 1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG --dry-run
```

Si funciona correctamente, verás una lista de videos que se crearían.

### Verificar desde el Panel Admin (Endpoint API)

1. Inicia sesión como administrador en el panel admin
2. Ve a la sección de ejercicios
3. Usa el endpoint de sincronización (se añadirá en el frontend)
4. O haz una petición POST manual:
   ```bash
   curl -X POST http://localhost:8001/api/admin/workouts/exercises/sync_from_google_drive/ \
     -H "Authorization: Bearer TU_TOKEN" \
     -H "Content-Type: application/json"
   ```

---

## 🔄 Sincronización Automática

### Opción A: Manual desde el Panel Admin

1. Ve al panel de administración
2. Navega a **Ejercicios** > **Sincronizar desde Google Drive**
3. Haz clic en el botón de sincronización
4. Espera a que se complete el proceso

### Opción B: Comando Manual (Terminal)

```bash
cd /srv/mykaizenfit/pro
docker compose -f docker-compose.prod.yml exec backend python manage.py create_exercises_from_google_drive --use-api
```

### Opción C: Programado con Cron (Producción)

Para sincronizar automáticamente cada día:

```bash
# Editar crontab
crontab -e

# Añadir esta línea para sincronizar cada día a las 2 AM
0 2 * * * cd /srv/mykaizenfit/pro && docker compose -f docker-compose.prod.yml exec -T backend python manage.py create_exercises_from_google_drive --use-api >> /var/log/nex-fit-sync.log 2>&1
```

---

## 🐛 Solución de Problemas

### Error: "Google Drive API no está configurada"

**Causa**: Las credenciales no están configuradas correctamente.

**Solución**:
1. Verifica que las variables de entorno estén configuradas:
   ```bash
   docker compose -f docker-compose.prod.yml exec backend env | grep GOOGLE_DRIVE
   ```
2. Verifica que el archivo de credenciales exista y tenga permisos correctos
3. Reinicia el contenedor backend

### Error: "Permission denied" o "403 Forbidden"

**Causa**: El Service Account o API Key no tiene permisos para acceder a la carpeta.

**Solución**:
1. Verifica que la carpeta esté compartida con el email del Service Account
2. Verifica que los permisos sean de "Lector" o superior
3. Si usas API Key, verifica que esté restringida a Google Drive API

### Error: "No se encontraron videos"

**Causa**: 
- El folder_id es incorrecto
- Los videos no están en la carpeta especificada
- Los archivos no son videos

**Solución**:
1. Verifica el folder_id en las variables de entorno
2. Verifica que los videos estén en la carpeta
3. Verifica que los archivos tengan extensiones de video (.mp4, .mov, etc.)

### Error: "Dependencias faltantes"

**Causa**: Las librerías de Google Drive no están instaladas.

**Solución**:
```bash
# Añadir a requirements.txt
echo "google-api-python-client" >> /srv/mykaizenfit/pro/backend/requirements.txt
echo "google-auth" >> /srv/mykaizenfit/pro/backend/requirements.txt

# Reinstalar dependencias
docker compose -f docker-compose.prod.yml build backend
```

---

## 📚 Recursos Adicionales

- [Documentación de Google Drive API](https://developers.google.com/drive/api)
- [Guía de Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Guía de API Keys](https://cloud.google.com/docs/authentication/api-keys)

---

## 🔐 Seguridad

- **Nunca** subas el archivo JSON de credenciales a Git
- **Nunca** compartas tu API Key públicamente
- Usa permisos mínimos necesarios (solo lectura para videos)
- Restringe las API Keys a solo los servicios necesarios
- Rota las credenciales periódicamente en producción

