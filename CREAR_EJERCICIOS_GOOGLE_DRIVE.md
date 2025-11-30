# Crear Ejercicios desde Videos de Google Drive

Este documento explica cómo crear ejercicios en la base de datos a partir de los videos almacenados en Google Drive.

## Preparación

### 1. Crear la migración del campo `google_drive_file_id`

Primero, necesitas crear y aplicar la migración para agregar el campo `google_drive_file_id` al modelo `Exercise`:

```bash
cd /srv/mykaizenfit/pro/backend
python manage.py makemigrations workouts
python manage.py migrate
```

### 2. Obtener los IDs de los archivos de Google Drive

Para cada video en la carpeta "Vídeos Nex+Fit", necesitas obtener su ID:

1. Abre el video en Google Drive
2. Copia el ID de la URL. La URL se ve así:
   ```
   https://drive.google.com/file/d/{FILE_ID}/view
   ```
3. El `FILE_ID` es la parte que necesitas

**Ejemplo:**
- URL: `https://drive.google.com/file/d/1ABC123def456GHI789jkl012MNO345/view`
- FILE_ID: `1ABC123def456GHI789jkl012MNO345`

## Opción 1: Crear desde archivo JSON (Recomendado)

### Paso 1: Crear el archivo JSON

Crea un archivo JSON con la lista de videos. Puedes usar `google_drive_videos_example.json` como plantilla.

**Formato:**
```json
[
  {
    "name": "Curl de Biceps",
    "file_id": "1ABC123def456GHI789jkl012MNO345",
    "category": "strength",
    "muscle_groups": ["biceps"]
  },
  {
    "name": "Press de Banca",
    "file_id": "1XYZ789abc123DEF456ghi789JKL012",
    "category": "strength",
    "muscle_groups": ["pectorales", "triceps"]
  }
]
```

**Campos:**
- `name` (requerido): Nombre del ejercicio tal como quieres que aparezca en la aplicación
- `file_id` (requerido): ID del archivo de Google Drive
- `category` (opcional): Categoría del ejercicio (ej: "strength", "cardio")
- `muscle_groups` (opcional): Array de grupos musculares (ej: ["biceps", "triceps"])
- `instructions` (opcional): Instrucciones del ejercicio

### Paso 2: Ejecutar el script

```bash
cd /srv/mykaizenfit/pro/backend
python manage.py create_exercises_from_google_drive --file google_drive_videos.json
```

**O con ruta absoluta:**
```bash
python manage.py create_exercises_from_google_drive --file /ruta/completa/al/archivo.json
```

### Paso 3: Verificar (dry-run)

Antes de crear los ejercicios, puedes hacer una prueba para ver qué se crearía:

```bash
python manage.py create_exercises_from_google_drive --file google_drive_videos.json --dry-run
```

## Opción 2: Listar automáticamente desde Google Drive (Avanzado)

Esta opción requiere configurar las credenciales de la API de Google Drive.

### Configurar credenciales

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o usa uno existente
3. Habilita "Google Drive API"
4. Crea credenciales (Service Account o API Key)

**Para Service Account (recomendado):**
1. Crea una Service Account
2. Descarga el JSON de credenciales
3. Comparte la carpeta de Google Drive con el email de la Service Account
4. Configura en `settings.py`:
   ```python
   GOOGLE_DRIVE_CREDENTIALS_PATH = '/ruta/al/credenciales.json'
   ```

**Para API Key (simple pero menos seguro):**
1. Crea una API Key
2. Configura en `settings.py`:
   ```python
   GOOGLE_DRIVE_API_KEY = 'tu-api-key'
   ```

### Ejecutar con API

```bash
python manage.py create_exercises_from_google_drive \
  --use-api \
  --folder-id 1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG
```

## Notas Importantes

1. **Nombres de ejercicios**: Los nombres deben ser únicos. Si un ejercicio ya existe, se actualizará con el nuevo `google_drive_file_id`.

2. **Permisos de Google Drive**: 
   - Los videos deben estar en la carpeta compartida "Vídeos Nex+Fit"
   - La carpeta debe ser accesible (compartida con el correo nex.fit.server@gmail.com)

3. **Visualización en el frontend**: Una vez creados los ejercicios con `google_drive_file_id`, el componente `ExerciseVideoPlayer` automáticamente usará estos videos desde Google Drive.

## Ejemplo Completo

```bash
# 1. Crear y aplicar migración
cd /srv/mykaizenfit/pro/backend
python manage.py makemigrations workouts
python manage.py migrate

# 2. Crear archivo JSON con los videos
# (edita google_drive_videos.json con tus videos)

# 3. Verificar qué se crearía (dry-run)
python manage.py create_exercises_from_google_drive \
  --file google_drive_videos.json \
  --dry-run

# 4. Crear los ejercicios
python manage.py create_exercises_from_google_drive \
  --file google_drive_videos.json

# 5. Verificar en el admin que los ejercicios se crearon correctamente
```

## Solución de Problemas

### Error: "El archivo no existe"
- Verifica que la ruta al archivo JSON sea correcta
- Usa ruta absoluta si es necesario

### Error: "No se encontraron videos" (con --use-api)
- Verifica que las credenciales estén configuradas
- Verifica que la carpeta esté compartida con la Service Account
- Verifica que el `folder_id` sea correcto

### Los videos no se muestran en el frontend
- Verifica que el campo `google_drive_file_id` esté en la respuesta de la API
- Verifica que la carpeta de Google Drive tenga permisos públicos o compartidos

