"""
Signals para notificaciones push y email automáticas
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


def _dispatch_notification_send(notification_id):
    """
    Envía notificaciones evitando threading en SQLite para prevenir bloqueos
    durante tests/desarrollo local.
    """
    if connection.vendor == "sqlite":
        send_notifications_async(notification_id)
        logger.info(f"Envío síncrono de notificaciones para {notification_id} (SQLite)")
        return

    thread = threading.Thread(
        target=send_notifications_async,
        args=(notification_id,),
        daemon=True,
    )
    thread.start()
    logger.info(f"Iniciado envío asíncrono de notificaciones (push + email) para {notification_id}")


def send_notifications_async(notification_id: int):
    """
    Función auxiliar para enviar notificaciones de forma asíncrona
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

