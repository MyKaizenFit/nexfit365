# 🔔 Configuración de Push Notifications

## Resumen

Se ha implementado un sistema completo de push notifications para NexFit365, incluyendo:

- ✅ Service Worker configurado
- ✅ Backend con pywebpush
- ✅ Frontend con suscripciones push
- ✅ Integración automática con sistema de notificaciones
- ✅ VAPID keys para autenticación

## Pasos para Configurar

### 1. Generar Claves VAPID

Ejecuta el comando de Django para generar las claves:

```bash
docker compose exec backend python manage.py generate_vapid_keys
```

Esto generará:
- **VAPID_PUBLIC_KEY**: Clave pública (base64 URL-safe)
- **VAPID_PRIVATE_KEY**: Clave privada (formato PEM)

### 2. Configurar Variables de Entorno

#### Backend (.env)

```env
VAPID_PUBLIC_KEY=tu-clave-publica-aqui
VAPID_PRIVATE_KEY=tu-clave-privada-pem-aqui
VAPID_CLAIM_EMAIL=no-reply@nex-fit.local
```

#### Frontend (.env.local)

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=tu-clave-publica-aqui
```

### 3. Instalar Dependencias

Las dependencias ya están en `requirements.txt`:
- `pywebpush>=1.14.0`
- `py-vapid>=1.11.0`

Instalar con:
```bash
docker compose exec backend pip install -r requirements.txt
```

### 4. Aplicar Migraciones

```bash
docker compose exec backend python manage.py migrate
```

## Uso

### Envío Automático

Las notificaciones push se envían automáticamente cuando se crea una `Notification` en el backend (mediante signals).

### Envío Manual desde Backend

```python
from notifications.push_service import push_service
from accounts.models import CustomUser

user = CustomUser.objects.get(email='usuario@example.com')

push_service.send_to_user(
    user=user,
    title='Nueva notificación',
    body='Tienes un nuevo mensaje',
    notification_type='general',
    url='/dashboard'
)
```

### Envío Masivo

```python
from notifications.push_service import push_service
from accounts.models import CustomUser

users = CustomUser.objects.filter(is_active=True)

result = push_service.send_bulk(
    users=users,
    title='Anuncio importante',
    body='Nueva funcionalidad disponible',
    notification_type='system',
    url='/dashboard'
)

print(f"Enviadas: {result['total_sent']}")
print(f"Fallidas: {result['total_failed']}")
```

## Frontend

### Activar Notificaciones Push

Los usuarios pueden activar las notificaciones push desde:
- **Configuración** → **Mi Perfil** → **Notificaciones Push**

El componente `PushNotificationsSetup` maneja:
- Solicitud de permisos
- Creación de suscripción
- Envío al backend
- Gestión de múltiples dispositivos

## Service Worker

El Service Worker (`/public/sw.js`) está optimizado con:

- **Cache First**: Para assets estáticos (JS, CSS, fuentes)
- **Network First**: Para páginas HTML
- **Stale-While-Revalidate**: Para imágenes
- **Limpieza automática**: Mantiene el cache bajo 50MB
- **Sincronización en segundo plano**: Para datos pendientes

## Troubleshooting

### Las notificaciones no se envían

1. Verifica que las VAPID keys estén configuradas:
   ```bash
   docker compose exec backend python manage.py shell
   >>> from django.conf import settings
   >>> print(settings.VAPID_PUBLIC_KEY)
   >>> print(settings.VAPID_PRIVATE_KEY)
   ```

2. Verifica que el usuario tenga suscripciones activas:
   ```python
   from notifications.models import PushSubscription
   PushSubscription.objects.filter(user=user, is_active=True).count()
   ```

3. Revisa los logs del backend para errores de webpush

### El Service Worker no se registra

1. Verifica que el archivo `/public/sw.js` existe
2. Verifica la consola del navegador para errores
3. Asegúrate de que la app esté servida por HTTPS (requerido para push)

### Las notificaciones no aparecen

1. Verifica los permisos del navegador
2. Verifica que el Service Worker esté activo
3. Revisa la consola del navegador para errores

## Seguridad

- Las claves VAPID deben mantenerse seguras
- La clave privada nunca debe exponerse al frontend
- Usa HTTPS en producción (requerido para push notifications)
- Valida siempre los datos antes de enviar notificaciones

## Próximos Pasos

- [ ] Implementar notificaciones programadas (Celery)
- [ ] Agregar analytics de notificaciones
- [ ] Implementar preferencias de usuario por tipo de notificación
- [ ] Agregar soporte para notificaciones silenciosas





