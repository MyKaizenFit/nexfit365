"""
Servicio para enviar notificaciones por email
"""

import logging
from typing import Dict, Optional, List
from django.conf import settings
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from .models import Notification

logger = logging.getLogger(__name__)


class EmailNotificationService:
    """Servicio para enviar notificaciones por email"""
    
    def __init__(self):
        self.from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@nex-fit.local')
        self.enabled = self._check_email_config()
        
        if not self.enabled:
            logger.warning(
                "⚠️ Email no configurado. Las notificaciones por email no funcionarán. "
                "Configura SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD en settings."
            )
    
    def _check_email_config(self) -> bool:
        """Verificar si el email está configurado"""
        email_backend = getattr(settings, 'EMAIL_BACKEND', None)
        email_host = getattr(settings, 'EMAIL_HOST', None)
        
        # Si está usando el backend de consola o no está configurado, considerar deshabilitado
        if email_backend == 'django.core.mail.backends.console.EmailBackend':
            return False
        
        return bool(email_host)
    
    def send_notification_email(
        self,
        notification: Notification,
        template_name: str = 'notifications/email/notification.html',
        subject_prefix: str = 'NexFit365'
    ) -> bool:
        """
        Enviar una notificación por email
        
        Args:
            notification: Instancia de Notification
            template_name: Nombre del template HTML a usar
            subject_prefix: Prefijo para el asunto del email
        
        Returns:
            True si se envió con éxito, False en caso contrario
        """
        if not self.enabled:
            logger.debug(f"Email deshabilitado, omitiendo envío para notificación {notification.id}")
            return False
        
        if not notification.user or not notification.user.email:
            logger.warning(f"No se puede enviar email: usuario sin email para notificación {notification.id}")
            return False
        
        try:
            # Preparar contexto para el template
            context = {
                'notification': notification,
                'user': notification.user,
                'title': notification.title,
                'message': notification.message,
                'type': notification.type,
                'action_url': notification.action_url or '/dashboard',
                'site_name': 'NexFit365',
            }
            
            # Renderizar template HTML
            html_message = render_to_string(template_name, context)
            
            # Crear versión de texto plano
            text_message = strip_tags(html_message)
            
            # Crear email
            subject = f"{subject_prefix} - {notification.title}"
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_message,
                from_email=self.from_email,
                to=[notification.user.email]
            )
            email.attach_alternative(html_message, "text/html")
            
            # Enviar email
            email.send()
            
            logger.info(f"Email enviado a {notification.user.email} para notificación {notification.id}")
            return True
            
        except Exception as e:
            logger.error(f"Error enviando email para notificación {notification.id}: {e}")
            return False
    
    def send_bulk_notification_emails(
        self,
        notifications: List[Notification],
        template_name: str = 'notifications/email/notification.html',
        subject_prefix: str = 'NexFit365'
    ) -> int:
        """
        Enviar múltiples notificaciones por email
        
        Args:
            notifications: Lista de instancias de Notification
            template_name: Nombre del template HTML a usar
            subject_prefix: Prefijo para el asunto del email
        
        Returns:
            Número de emails enviados con éxito
        """
        if not self.enabled:
            logger.debug(f"Email deshabilitado, omitiendo envío de {len(notifications)} notificaciones")
            return 0
        
        sent_count = 0
        for notification in notifications:
            if self.send_notification_email(notification, template_name, subject_prefix):
                sent_count += 1
        
        logger.info(f"Enviados {sent_count}/{len(notifications)} emails de notificaciones")
        return sent_count
    
    def send_custom_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Enviar un email personalizado
        
        Args:
            to_email: Email del destinatario
            subject: Asunto del email
            html_content: Contenido HTML del email
            text_content: Contenido de texto plano (opcional, se genera automáticamente si no se proporciona)
        
        Returns:
            True si se envió con éxito, False en caso contrario
        """
        if not self.enabled:
            logger.debug(f"Email deshabilitado, omitiendo envío a {to_email}")
            return False
        
        try:
            if not text_content:
                text_content = strip_tags(html_content)
            
            email = EmailMultiAlternatives(
                subject=subject,
                body=text_content,
                from_email=self.from_email,
                to=[to_email]
            )
            email.attach_alternative(html_content, "text/html")
            
            email.send()
            
            logger.info(f"Email personalizado enviado a {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error enviando email personalizado a {to_email}: {e}")
            return False


# Instancia global del servicio
email_service = EmailNotificationService()






