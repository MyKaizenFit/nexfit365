"""
Servicio para enviar push notifications usando pywebpush
"""

import json
import logging
from typing import Dict, Optional, List
from django.conf import settings
from django.utils import timezone
from .models import PushSubscription, Notification

# Importar pywebpush de forma opcional
try:
    from pywebpush import webpush, WebPushException
    WEBPUSH_AVAILABLE = True
except ImportError:
    WEBPUSH_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("pywebpush no está instalado. Las push notifications no funcionarán.")

logger = logging.getLogger(__name__)


class PushNotificationService:
    """Servicio para enviar notificaciones push"""
    
    def __init__(self):
        # El PEM puede tener los saltos de línea escapados como \n literales (cuando viene de .env)
        raw_private = settings.VAPID_PRIVATE_KEY or ""
        self.vapid_private_key = raw_private.replace('\\n', '\n')
        self.vapid_public_key = settings.VAPID_PUBLIC_KEY
        self.vapid_claim_email = settings.VAPID_CLAIM_EMAIL
        
        if not WEBPUSH_AVAILABLE:
            logger.warning(
                "⚠️ pywebpush no está instalado. Instala con: pip install pywebpush py-vapid"
            )
        elif not self.vapid_private_key or not self.vapid_public_key:
            logger.warning(
                "⚠️ VAPID keys no configuradas. Las push notifications no funcionarán. "
                "Ejecuta: python manage.py generate_vapid_keys"
            )
    
    def send_push_notification(
        self,
        subscription: PushSubscription,
        title: str,
        body: str,
        data: Optional[Dict] = None,
        url: Optional[str] = None,
        icon: Optional[str] = None,
        badge: Optional[str] = None,
        tag: Optional[str] = None,
        require_interaction: bool = False,
        silent: bool = False
    ) -> bool:
        """
        Enviar una notificación push a una suscripción específica
        
        Args:
            subscription: Instancia de PushSubscription
            title: Título de la notificación
            body: Cuerpo del mensaje
            data: Datos adicionales (opcional)
            url: URL para abrir al hacer clic (opcional)
            icon: URL del icono (opcional)
            badge: URL del badge (opcional)
            tag: Tag para agrupar notificaciones (opcional)
            require_interaction: Si requiere interacción del usuario
            silent: Si la notificación es silenciosa
            
        Returns:
            True si se envió exitosamente, False en caso contrario
        """
        if not WEBPUSH_AVAILABLE:
            logger.error("pywebpush no está instalado")
            return False
        
        if not self.vapid_private_key or not self.vapid_public_key:
            logger.error("VAPID keys no configuradas")
            return False
        
        if not subscription.is_active:
            logger.warning(f"Suscripción {subscription.id} no está activa")
            return False
        
        try:
            # Preparar payload de la notificación
            payload = {
                "title": title,
                "body": body,
                "icon": icon or "/icono.png",
                "badge": badge or "/icono.png",
                "tag": tag or "nexfit-notification",
                "requireInteraction": require_interaction,
                "silent": silent,
                "data": data or {}
            }
            
            if url:
                payload["data"]["url"] = url
            
            # Obtener datos de suscripción
            subscription_data = subscription.get_subscription_dict()
            
            # Enviar notificación
            webpush(
                subscription_info=subscription_data,
                data=json.dumps(payload),
                vapid_private_key=self.vapid_private_key,
                vapid_claims={
                    "sub": f"mailto:{self.vapid_claim_email}",
                    "exp": int(timezone.now().timestamp()) + 86400  # Expira en 24 horas
                }
            )
            
            logger.info(f"✅ Push notification enviada a {subscription.user.email}")
            return True
            
        except WebPushException as e:
            # Manejar errores específicos de webpush
            if e.response and e.response.status_code == 410:
                # Suscripción expirada o inválida
                logger.warning(f"Suscripción {subscription.id} expirada o inválida. Desactivando...")
                subscription.is_active = False
                subscription.save()
            else:
                logger.error(f"Error enviando push notification: {str(e)}")
            return False
            
        except Exception as e:
            logger.error(f"Error inesperado enviando push notification: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    def send_to_user(
        self,
        user,
        title: str,
        body: str,
        notification_type: str = "general",
        data: Optional[Dict] = None,
        url: Optional[str] = None,
        create_notification: bool = True
    ) -> int:
        """
        Enviar notificación push a todas las suscripciones activas de un usuario
        
        Args:
            user: Usuario al que enviar la notificación
            title: Título de la notificación
            body: Cuerpo del mensaje
            notification_type: Tipo de notificación
            data: Datos adicionales
            url: URL para abrir al hacer clic
            create_notification: Si crear registro en Notification model
            
        Returns:
            Número de notificaciones enviadas exitosamente
        """
        # Obtener suscripciones activas del usuario
        subscriptions = PushSubscription.objects.filter(
            user=user,
            is_active=True
        )
        
        if not subscriptions.exists():
            logger.debug(f"Usuario {user.email} no tiene suscripciones push activas")
            return 0
        
        # Crear registro de notificación si se solicita
        notification = None
        if create_notification:
            notification = Notification.objects.create(
                user=user,
                type=notification_type,
                title=title,
                message=body,
                data=data or {},
                action_url=url or ""
            )
        
        # Preparar datos para la notificación
        push_data = {
            "notification_id": str(notification.id) if notification else None,
            "type": notification_type,
            "url": url or "/dashboard"
        }
        if data:
            push_data.update(data)
        
        # Enviar a todas las suscripciones
        sent_count = 0
        for subscription in subscriptions:
            if self.send_push_notification(
                subscription=subscription,
                title=title,
                body=body,
                data=push_data,
                url=url,
                tag=f"notification-{notification_type}"
            ):
                sent_count += 1
        
        logger.info(
            f"📤 Enviadas {sent_count}/{subscriptions.count()} push notifications "
            f"a {user.email}"
        )
        
        return sent_count
    
    def send_bulk(
        self,
        users: List,
        title: str,
        body: str,
        notification_type: str = "general",
        data: Optional[Dict] = None,
        url: Optional[str] = None
    ) -> Dict:
        """
        Enviar notificación push a múltiples usuarios
        
        Args:
            users: Lista de usuarios
            title: Título de la notificación
            body: Cuerpo del mensaje
            notification_type: Tipo de notificación
            data: Datos adicionales
            url: URL para abrir al hacer clic
            
        Returns:
            Diccionario con estadísticas del envío
        """
        total_sent = 0
        total_failed = 0
        results = []
        
        for user in users:
            try:
                sent = self.send_to_user(
                    user=user,
                    title=title,
                    body=body,
                    notification_type=notification_type,
                    data=data,
                    url=url,
                    create_notification=True
                )
                total_sent += sent
                results.append({
                    "user": user.email,
                    "sent": sent,
                    "success": True
                })
            except Exception as e:
                total_failed += 1
                logger.error(f"Error enviando push a {user.email}: {str(e)}")
                results.append({
                    "user": user.email,
                    "sent": 0,
                    "success": False,
                    "error": str(e)
                })
        
        return {
            "total_users": len(users),
            "total_sent": total_sent,
            "total_failed": total_failed,
            "results": results
        }


# Instancia global del servicio
push_service = PushNotificationService()

