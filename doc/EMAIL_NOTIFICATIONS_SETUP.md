# 📧 Sistema de Notificaciones por Email - NexFit365

## ✅ Implementación Completada

Se ha implementado completamente el sistema de notificaciones por email para NexFit365.

### Componentes Implementados

1. **Servicio de Email** (`backend/notifications/email_service.py`)
   - ✅ Clase `EmailNotificationService` para gestionar envío de emails
   - ✅ Detección automática de configuración SMTP
   - ✅ Envío de notificaciones individuales y masivas
   - ✅ Soporte para emails personalizados

2. **Templates HTML** (`backend/templates/notifications/email/notification.html`)
   - ✅ Template responsive y profesional
   - ✅ Soporte para diferentes tipos de notificaciones
   - ✅ Diseño consistente con la marca NexFit365

3. **Integración con Signals** (`backend/notifications/signals.py`)
   - ✅ Envío automático de emails cuando se crea una notificación
   - ✅ Envío asíncrono usando threading (no bloquea respuestas HTTP)
   - ✅ Integración con push notifications

4. **Configuración SMTP** (`backend/backend/settings.py`)
   - ✅ Configuración flexible para desarrollo y producción
   - ✅ Backend de consola en desarrollo si no hay SMTP configurado
   - ✅ Soporte para Gmail, Outlook y otros proveedores SMTP

## 🔧 Configuración

### Variables de Entorno Requeridas

Agrega estas variables a tu archivo `.env` o `docker-compose.dev.yml`:

```bash
# Configuración SMTP
SMTP_HOST=smtp.gmail.com          # Servidor SMTP
SMTP_PORT=587                      # Puerto SMTP (587 para TLS, 465 para SSL)
SMTP_USER=tu_email@gmail.com       # Usuario SMTP
SMTP_PASSWORD=tu_app_password      # Contraseña de aplicación
SMTP_USE_TLS=True                  # Usar TLS (True para puerto 587)
DEFAULT_FROM_EMAIL="NexFit365 <no-reply@nex-fit.local>"  # Email remitente
```

### Configuración para Gmail

1. **Habilitar autenticación de 2 factores** en tu cuenta de Google
2. **Generar una contraseña de aplicación**:
   - Ve a [Google Account Security](https://myaccount.google.com/security)
   - Activa la verificación en 2 pasos
   - Ve a "Contraseñas de aplicaciones"
   - Genera una nueva contraseña para "Correo"
   - Usa esa contraseña en `SMTP_PASSWORD`

### Configuración para Otros Proveedores

#### Outlook/Office365
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USE_TLS=True
```

#### SendGrid
```bash
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=tu_api_key_de_sendgrid
SMTP_USE_TLS=True
```

#### Mailgun
```bash
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=tu_usuario_mailgun
SMTP_PASSWORD=tu_password_mailgun
SMTP_USE_TLS=True
```

## 📝 Uso

### Envío Automático

Las notificaciones por email se envían automáticamente cuando se crea una `Notification` en el backend:

```python
from notifications.models import Notification
from accounts.models import CustomUser

user = CustomUser.objects.get(email='usuario@example.com')

# Crear notificación (se enviará email automáticamente)
Notification.objects.create(
    user=user,
    type='nutrition',
    title='Plan nutricional actualizado',
    message='Tu plan nutricional ha sido ajustado automáticamente.',
    action_url='/dashboard/nutrition'
)
```

### Envío Manual

```python
from notifications.email_service import email_service
from notifications.models import Notification

notification = Notification.objects.get(id=1)

# Enviar email para una notificación específica
email_service.send_notification_email(notification)
```

### Email Personalizado

```python
from notifications.email_service import email_service

email_service.send_custom_email(
    to_email='usuario@example.com',
    subject='Bienvenido a NexFit365',
    html_content='<h1>¡Bienvenido!</h1><p>Gracias por unirte a NexFit365.</p>'
)
```

## 🎨 Personalización de Templates

Los templates de email están en `backend/templates/notifications/email/`.

### Crear un Template Personalizado

1. Crea un nuevo archivo en `backend/templates/notifications/email/`:
```html
<!-- mi_template.html -->
<!DOCTYPE html>
<html>
<head>
    <title>{{ title }}</title>
</head>
<body>
    <h1>{{ notification.title }}</h1>
    <p>{{ notification.message }}</p>
</body>
</html>
```

2. Úsalo al enviar:
```python
email_service.send_notification_email(
    notification,
    template_name='notifications/email/mi_template.html'
)
```

## 🔍 Troubleshooting

### Los emails no se envían

1. **Verifica la configuración SMTP**:
   ```python
   from django.conf import settings
   print(settings.EMAIL_HOST)
   print(settings.EMAIL_PORT)
   print(settings.EMAIL_HOST_USER)
   ```

2. **Verifica los logs**:
   ```bash
   docker compose -f docker-compose.dev.yml logs backend | grep -i email
   ```

3. **Prueba el envío manualmente**:
   ```python
   from django.core.mail import send_mail
   send_mail('Test', 'Mensaje de prueba', 'from@example.com', ['to@example.com'])
   ```

### Emails en consola (desarrollo)

En desarrollo, si no hay configuración SMTP, los emails se muestran en la consola. Esto es normal y útil para desarrollo.

Para activar el envío real, configura las variables SMTP en tu `.env`.

### Errores de autenticación

- **Gmail**: Asegúrate de usar una contraseña de aplicación, no tu contraseña normal
- **Outlook**: Verifica que la autenticación de 2 factores esté activada
- **Otros**: Verifica que las credenciales sean correctas

## 📊 Métricas y Monitoreo

El servicio registra automáticamente:
- Emails enviados exitosamente
- Errores de envío
- Emails omitidos (usuario sin email, email deshabilitado)

Revisa los logs para monitorear el funcionamiento:
```bash
docker compose -f docker-compose.dev.yml logs backend | grep -i "email\|notification"
```

## ✨ Características

- ✅ Envío automático cuando se crean notificaciones
- ✅ Envío asíncrono (no bloquea respuestas HTTP)
- ✅ Templates HTML profesionales y responsive
- ✅ Soporte para múltiples proveedores SMTP
- ✅ Manejo robusto de errores
- ✅ Logging detallado
- ✅ Configuración flexible para desarrollo/producción

¡El sistema está listo para usar! 🚀


