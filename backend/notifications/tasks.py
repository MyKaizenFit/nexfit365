"""
Tareas Celery para el envío asíncrono de notificaciones (push + email).

Sustituyen al threading manual en signals.py, ofreciendo:
  - Reintentos automáticos con backoff exponencial
  - Monitoreo a través de Flower / django-celery-results
  - Desacoplamiento de la petición HTTP principal
"""

import logging
import smtplib
import socket
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
        from .delivery_tracking import update_delivery_log
        from .models import Notification, NotificationDeliveryLog
        from .push_service import push_service
        from .delivery_options import should_send_push

        notification = Notification.objects.get(id=notification_id)
        attempt = int(getattr(self.request, "retries", 0)) + 1
        update_delivery_log(
            notification_id=notification.id,
            channel=NotificationDeliveryLog.CHANNEL_PUSH,
            status=NotificationDeliveryLog.STATUS_PENDING,
            attempts=attempt,
            task_id=getattr(self.request, "id", "") or "",
        )

        if not should_send_push(notification):
            update_delivery_log(
                notification_id=notification.id,
                channel=NotificationDeliveryLog.CHANNEL_PUSH,
                status=NotificationDeliveryLog.STATUS_SKIPPED,
                attempts=attempt,
                metadata={"reason": "channel_disabled"},
            )
            return

        if not notification.user or not notification.user.push_subscriptions.exists():
            update_delivery_log(
                notification_id=notification.id,
                channel=NotificationDeliveryLog.CHANNEL_PUSH,
                status=NotificationDeliveryLog.STATUS_SKIPPED,
                attempts=attempt,
                metadata={"reason": "no_active_push_subscriptions"},
            )
            return

        if notification.is_expired:
            update_delivery_log(
                notification_id=notification.id,
                channel=NotificationDeliveryLog.CHANNEL_PUSH,
                status=NotificationDeliveryLog.STATUS_SKIPPED,
                attempts=attempt,
                metadata={"reason": "notification_expired"},
            )
            return

        logger.info(
            "Enviando push notification %s a %s",
            notification.id,
            notification.user.email,
        )
        sent_count = push_service.send_to_user(
            user=notification.user,
            title=notification.title,
            body=notification.message,
            notification_type=notification.type,
            url=notification.action_url or "/dashboard",
            data=notification.data or {},
            create_notification=False,
        )
        if sent_count > 0:
            update_delivery_log(
                notification_id=notification.id,
                channel=NotificationDeliveryLog.CHANNEL_PUSH,
                status=NotificationDeliveryLog.STATUS_SENT,
                attempts=attempt,
                metadata={"sent_subscriptions": sent_count},
                mark_delivered=True,
            )
        else:
            update_delivery_log(
                notification_id=notification.id,
                channel=NotificationDeliveryLog.CHANNEL_PUSH,
                status=NotificationDeliveryLog.STATUS_SKIPPED,
                attempts=attempt,
                metadata={"reason": "send_returned_zero"},
            )
    except Exception as exc:
        from .delivery_tracking import update_delivery_log
        from .models import NotificationDeliveryLog

        attempt = int(getattr(self.request, "retries", 0)) + 1
        update_delivery_log(
            notification_id=notification_id,
            channel=NotificationDeliveryLog.CHANNEL_PUSH,
            status=NotificationDeliveryLog.STATUS_FAILED,
            attempts=attempt,
            task_id=getattr(self.request, "id", "") or "",
            error_message=str(exc),
        )
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
    Los errores SMTP/red activan reintento; otros errores marcan como fallido.
    """
    from .delivery_tracking import update_delivery_log
    from .models import Notification, NotificationDeliveryLog
    from .email_service import email_service
    from .delivery_options import should_send_email

    attempt = int(getattr(self.request, "retries", 0)) + 1

    try:
        notification = Notification.objects.get(id=notification_id)
        update_delivery_log(
            notification_id=notification.id,
            channel=NotificationDeliveryLog.CHANNEL_EMAIL,
            status=NotificationDeliveryLog.STATUS_PENDING,
            attempts=attempt,
            task_id=getattr(self.request, "id", "") or "",
        )

        if not should_send_email(notification):
            update_delivery_log(
                notification_id=notification.id,
                channel=NotificationDeliveryLog.CHANNEL_EMAIL,
                status=NotificationDeliveryLog.STATUS_SKIPPED,
                attempts=attempt,
                metadata={"reason": "channel_disabled"},
            )
            return

        if not notification.user or not notification.user.email:
            update_delivery_log(
                notification_id=notification.id,
                channel=NotificationDeliveryLog.CHANNEL_EMAIL,
                status=NotificationDeliveryLog.STATUS_SKIPPED,
                attempts=attempt,
                metadata={"reason": "user_without_email"},
            )
            return

        if notification.is_expired:
            update_delivery_log(
                notification_id=notification.id,
                channel=NotificationDeliveryLog.CHANNEL_EMAIL,
                status=NotificationDeliveryLog.STATUS_SKIPPED,
                attempts=attempt,
                metadata={"reason": "notification_expired"},
            )
            return

        logger.info(
            "📧 Enviando email notification %s a %s (intento %s/%s)",
            notification.id,
            notification.user.email,
            attempt,
            self.max_retries + 1,
        )
        sent = email_service.send_notification_email(notification)
        if sent:
            update_delivery_log(
                notification_id=notification.id,
                channel=NotificationDeliveryLog.CHANNEL_EMAIL,
                status=NotificationDeliveryLog.STATUS_SENT,
                attempts=attempt,
                mark_delivered=True,
            )
        else:
            # send_notification_email devolvió False sin excepción (ej: template error)
            update_delivery_log(
                notification_id=notification.id,
                channel=NotificationDeliveryLog.CHANNEL_EMAIL,
                status=NotificationDeliveryLog.STATUS_FAILED,
                attempts=attempt,
                metadata={"reason": "email_service_rejected"},
            )

    except (smtplib.SMTPException, socket.gaierror, OSError) as exc:
        # Error de red o SMTP: registrar y reintentar
        update_delivery_log(
            notification_id=notification_id,
            channel=NotificationDeliveryLog.CHANNEL_EMAIL,
            status=NotificationDeliveryLog.STATUS_FAILED,
            attempts=attempt,
            task_id=getattr(self.request, "id", "") or "",
            error_message=str(exc),
            metadata={"error_type": type(exc).__name__, "will_retry": self.request.retries < self.max_retries},
        )
        logger.error(
            "❌ Error SMTP/red en send_email_notification_task(%s) intento %s/%s: %s",
            notification_id,
            attempt,
            self.max_retries + 1,
            exc,
        )
        raise self.retry(exc=exc, countdown=60 * (self.request.retries + 1))
    except Exception as exc:
        # Error inesperado: registrar como fallido, no reintentar
        update_delivery_log(
            notification_id=notification_id,
            channel=NotificationDeliveryLog.CHANNEL_EMAIL,
            status=NotificationDeliveryLog.STATUS_FAILED,
            attempts=attempt,
            task_id=getattr(self.request, "id", "") or "",
            error_message=str(exc),
            metadata={"error_type": type(exc).__name__, "will_retry": False},
        )
        logger.error(
            "❌ Error inesperado en send_email_notification_task(%s): %s",
            notification_id,
            exc,
        )


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
        send_push_notification_task.delay(str(notification_id))
        send_email_notification_task.delay(str(notification_id))
        logger.info("Despachadas tareas push+email para notificación %s", notification_id)
    except Exception as exc:
        logger.error("Error al despachar tareas de notificación %s: %s", notification_id, exc)
        raise self.retry(exc=exc, countdown=15)


@shared_task(
    bind=True,
    name="notifications.dispatch_bulk_notifications",
    max_retries=2,
    default_retry_delay=15,
    ignore_result=True,
)
def dispatch_bulk_notifications_task(self, notification_ids: list[str]):
    """
    Despacha un lote de notificaciones desde el worker para que la petición
    HTTP de envío masivo no bloquee abriendo una tarea por destinatario.
    """
    try:
        for notification_id in notification_ids:
            dispatch_notification_task.delay(str(notification_id))
        logger.info("Despachado lote de %s notificaciones", len(notification_ids))
    except Exception as exc:
        logger.error("Error al despachar lote de notificaciones: %s", exc)
        raise self.retry(exc=exc, countdown=15)
