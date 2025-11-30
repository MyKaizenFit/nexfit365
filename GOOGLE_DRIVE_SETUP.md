# Configuración de Google Drive para Videos de Ejercicios

## Información Configurada

- **Carpeta**: "Vídeos Nex+Fit" (en "Compartido conmigo")
- **Correo**: nex.fit.server@gmail.com
- **ID de la Carpeta**: `1dbDvVZKOwYJ4A13FtVslIid2JKLcN4fG` ✅

## Estado de la Configuración

### ✅ Configurado

- ID de la carpeta añadido a las variables de entorno
- Correo configurado
- Código preparado para usar Google Drive

### 2. Opción A: Mapeo Manual (Recomendado para empezar)

**No requiere credenciales**, pero necesitas mapear manualmente cada ejercicio a su video.

#### Pasos:
1. Abre cada video en Google Drive
2. Copia el ID del archivo de la URL:
   ```
   https://drive.google.com/file/d/{FILE_ID}/view
   ```
3. Normaliza el nombre del ejercicio (por ejemplo: "Press de Banca" → "press-de-banca")
4. Añade el mapeo en `dev/frontend/components/exercise-video-player.tsx`:
   ```typescript
   const EXERCISE_VIDEO_MAP: Record<string, string> = {
     'press-de-banca': 'ID_DEL_ARCHIVO_AQUI',
     'sentadillas': 'ID_DEL_ARCHIVO_AQUI',
     // ... más mapeos
   }
   ```

### 3. Opción B: API de Google Drive (Búsqueda Automática)

Si quieres que la aplicación busque automáticamente los videos por nombre, necesitas credenciales de la API.

#### Credenciales Necesarias:

**Si usas la API de Google Drive, necesitas:**

1. **API Key de Google Drive**:
   - Ve a: https://console.cloud.google.com/apis/credentials
   - Crea un proyecto (o usa uno existente)
   - Habilita "Google Drive API"
   - Crea una "API Key"
   - Añádela como: `NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY`

2. **OAuth 2.0 Client ID** (si quieres acceso completo):
   - Ve a: https://console.cloud.google.com/apis/credentials
   - Crea "OAuth 2.0 Client ID"
   - Tipo: "Aplicación web"
   - Añade URLs autorizadas
   - Variables necesarias:
     - `GOOGLE_DRIVE_CLIENT_ID`
     - `GOOGLE_DRIVE_CLIENT_SECRET`

3. **Service Account** (recomendado para backend):
   - Ve a: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Crea una cuenta de servicio
   - Descarga el JSON con las credenciales
   - Comparte la carpeta de Drive con el correo de la cuenta de servicio

## Variables de Entorno a Configurar

### Mínimas (para mapeo manual):
```env
NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID=ID_DE_LA_CARPETA
NEXT_PUBLIC_GOOGLE_DRIVE_EMAIL=nex.fit.server@gmail.com
```

### Con API (para búsqueda automática):
```env
NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID=ID_DE_LA_CARPETA
NEXT_PUBLIC_GOOGLE_DRIVE_EMAIL=nex.fit.server@gmail.com
NEXT_PUBLIC_GOOGLE_DRIVE_API_KEY=TU_API_KEY
```

### Con OAuth (acceso completo):
```env
NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_ID=ID_DE_LA_CARPETA
NEXT_PUBLIC_GOOGLE_DRIVE_EMAIL=nex.fit.server@gmail.com
GOOGLE_DRIVE_CLIENT_ID=TU_CLIENT_ID
GOOGLE_DRIVE_CLIENT_SECRET=TU_CLIENT_SECRET
```

## Recomendación

Para empezar rápidamente:
1. ✅ Usa **Opción A (Mapeo Manual)** - no requiere credenciales
2. Obtén el **ID de la carpeta** y añádelo a las variables de entorno
3. Mapea los primeros ejercicios manualmente
4. Más adelante, si tienes muchos videos, configura la API

## Próximos Pasos

1. ✅ **ID de la carpeta configurado** - Ya está en las variables de entorno
2. **Mapear videos manualmente** (recomendado para empezar):
   - Abre cada video en Google Drive
   - Copia el ID del archivo de la URL
   - Añádelo al mapeo `EXERCISE_VIDEO_MAP` en `exercise-video-player.tsx`
3. **Opcional**: Si quieres búsqueda automática, configura la API de Google Drive

## Cómo Añadir Videos al Mapeo

1. Abre el video en Google Drive
2. Copia el ID de la URL (ejemplo: `https://drive.google.com/file/d/1ABC123.../view`)
3. Normaliza el nombre del ejercicio (ejemplo: "Press de Banca" → "press-de-banca")
4. Añade al mapeo en `dev/frontend/components/exercise-video-player.tsx`:

```typescript
const EXERCISE_VIDEO_MAP: Record<string, string> = {
  'press-de-banca': 'ID_DEL_ARCHIVO_AQUI',
  'sentadillas': 'ID_DEL_ARCHIVO_AQUI',
  // ... añadir más ejercicios
}
```

## Notas Importantes

- Los videos deben estar compartidos de forma que sean accesibles (al menos "Cualquiera con el enlace")
- El sistema intentará primero usar URLs directas del ejercicio
- Si no hay URL directa, buscará en el mapeo de Google Drive
- Si no encuentra el video, mostrará un enlace para abrir la carpeta de Google Drive

