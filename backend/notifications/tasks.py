"""
Tareas Celery para el envío asíncrono de notificaciones (push + email).

Sustituyen al threading manual en signals.py, ofreciendo:
  - Reintentos automáticos con backoff exponencial
  - Monitoreo a través de Flower / django-celery-results
  - Desacoplamiento de la petición HTTP principal
"""

import logging
from celery import shared_task
from django.db import connection

logger = logging.getLogger(__name__)


@shared_task(
    bind=True,
    name="notifications.send_push_notification",
    max_retries=3,
    default_retry_delay=30,
    ignore_result=True,
)
def send_push_notification_task(self, notification_id: int):
    """
    Envía push notification para la notificación indicada.
    Reintenta hasta 3 veces con 30s de espera entre intentos.
    """
    try:
        from .models import Notification
        from .push_service import push_service

        notification = Notification.objects.get(id=notification_id)

        if not notification.user or not notification.user.push_subscriptions.exists():
            return

        if notification.is_expired:
            return

        logger.info(
            "Enviando push notification %s a %s",
            notification.id,
            notification.user.email,
        )
        push_service.send_to_user(
            user=notification.user,
            title=notification.title,
            body=notification.message,
            notification_type=notification.type,
            url=notification.action_url or "/dashboard",
            data=notification.data or {},
            create_notification=False,
        )
    except Exception as exc:
        logger.error("Error en send_push_notification_task(%s): %s", notification_id, exc)
        raise self.retry(exc=exc, countdown=30 * (self.request.retries + 1))


@shared_task(
    bind=True,
    name="notifications.send_email_notification",
    max_retries=3,
    default_retry_delay=60,
    ignore_result=True,
)
def send_email_notification_task(self, notification_id: int):
    """
    Envía email notification para la notificación indicada.
    Reintenta hasta 3 veces con 60s de espera entre intentos.
    """
    try:
        from .models import Notification
        from .email_service import email_service

        notification = Notification.objects.get(id=notification_id)

        if not notification.user or not notification.user.email:
            return

        if notification.is_expired:
            return

        logger.info(
            "Enviando email notification %s a %s",
            notification.id,
            notification.user.email,
        )
        email_service.send_notification_email(notification)
    except Exception as exc:
        logger.error("Error en send_email_notification_task(%s): %s", notification_id, exc)
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))


@shared_task(
    bind=True,
    name="notifications.send_all_notifications",
    max_retries=2,
    default_retry_delay=15,
    ignore_result=True,
)
def dispatch_notification_task(self, notification_id: int):
    """
    Tarea principal: despacha push + email para una notificación.
    Llama a las dos sub-tareas de forma independiente para que un
    fallo en push no bloquee el email y viceversa.
    """
    try:
        send_push_notification_task.delay(notification_id)
        send_email_notification_task.delay(notification_id)
        logger.info("Despachadas tareas push+email para notificación %s", notification_id)
    except Exception as exc:
        logger.error("Error al despachar tareas de notificación %s: %s", notification_id, exc)
        raise self.retry(exc=exc, countdown=15)
