"""
Signals para notificaciones push y email automáticas.
Usa Celery si está disponible, con fallback a threading en entornos sin broker.
"""

import logging
import threading
from django.db import connection, transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Notification
from .push_service import push_service
from .email_service import email_service

logger = logging.getLogger(__name__)


def _has_celery_broker() -> bool:
    """Comprobar si hay un broker Celery operativo."""
    try:
        from celery import current_app
        conn = current_app.connection_for_read()
        conn.ensure_connection(max_retries=1)
        conn.release()
        return True
    except Exception:
        return False


def _dispatch_notification_send(notification_id):
    """
    Despacha el envío de notificaciones.
    Usa Celery si está disponible; en otro caso usa threading (fallback para dev/SQLite).
    """
    # Evitar threading en SQLite (tests), siempre síncrono
    if connection.vendor == "sqlite":
        send_notifications_sync(notification_id)
        logger.info("Envío síncrono (SQLite) para notificación %s", notification_id)
        return

    # Intentar Celery
    try:
        from .tasks import dispatch_notification_task
        dispatch_notification_task.delay(notification_id)
        logger.info("Notificación %s encolada en Celery", notification_id)
        return
    except Exception as exc:
        logger.warning(
            "Celery no disponible (%s). Usando threading como fallback para notificación %s.",
            exc,
            notification_id,
        )

    # Fallback: threading
    thread = threading.Thread(
        target=send_notifications_sync,
        args=(notification_id,),
        daemon=True,
    )
    thread.start()
    logger.info("Iniciado envío via threading (fallback) para notificación %s", notification_id)


def send_notifications_sync(notification_id: int):
    """
    Envía push + email de forma síncrona (usado en SQLite/tests o como fallback).
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        
        if not notification.user:
            return
        
        # Solo enviar si la notificación no está expirada
        if notification.is_expired:
            return
        
        # Enviar push notification
        try:
            if notification.user.push_subscriptions.exists():
                logger.info(f"Enviando push para notificación {notification.id} a {notification.user.email}")
                push_service.send_to_user(
                    user=notification.user,
                    title=notification.title,
                    body=notification.message,
                    notification_type=notification.type,
                    url=notification.action_url or "/dashboard",
                    data=notification.data or {},
                    create_notification=False  # Ya existe la notificación
                )
        except Exception as e:
            logger.error(f"Error enviando push notification {notification.id}: {e}")
        
        # Enviar email notification
        try:
            if notification.user.email:
                logger.info(f"Enviando email para notificación {notification.id} a {notification.user.email}")
                email_service.send_notification_email(notification)
        except Exception as e:
            logger.error(f"Error enviando email notification {notification.id}: {e}")
            
    except Notification.DoesNotExist:
        logger.warning(f"Notificación {notification_id} no encontrada para envío asíncrono")
    except Exception as e:
        logger.error(f"Error enviando notificaciones asíncronas para {notification_id}: {e}")


@receiver(post_save, sender=Notification)
def send_notifications_on_created(sender, instance, created, **kwargs):
    """
    Enviar push y email notifications automáticamente cuando se crea una notificación.
    Usa threading para enviar de forma asíncrona y no bloquear la respuesta HTTP.
    """
    if not created:
        return
    
    if not instance.user:
        return
    
    # Solo enviar si la notificación no está expirada
    if instance.is_expired:
        return
    
    transaction.on_commit(lambda: _dispatch_notification_send(instance.id))

