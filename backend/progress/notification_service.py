# progress/notification_service.py
# Servicio para enviar notificaciones automáticas relacionadas con el progreso

import logging
from typing import Dict, Optional
from django.utils import timezone
from datetime import timedelta
from accounts.models import CustomUser
from notifications.models import Notification
from progress.services import ProgressAnalysisService

logger = logging.getLogger(__name__)


class ProgressNotificationService:
    """
    Servicio para crear y enviar notificaciones automáticas relacionadas
    con el progreso del usuario (estancamiento, recomendaciones, etc.)
    """
    
    def __init__(self, user: CustomUser):
        self.user = user
        self.analysis_service = ProgressAnalysisService(user)
    
    def send_stalled_progress_notification(self, analysis: Dict) -> Optional[Notification]:
        """
        Envía una notificación cuando se detecta estancamiento en el progreso.
        
        Args:
            analysis: Resultado del análisis de progreso
            
        Returns:
            Notification creada o None si no se pudo crear
        """
        try:
            weight_analysis = analysis.get('weight_analysis', {})
            recommendations = analysis.get('recommendations', {}).get('priority', [])
            
            if not recommendations:
                return None
            
            main_recommendation = recommendations[0]
            title = main_recommendation.get('title', 'Estancamiento detectado')
            message = main_recommendation.get('message', 'Tu progreso se ha estancado. Considera ajustar tu plan.')
            
            # Verificar si ya existe una notificación similar reciente (últimas 24 horas)
            recent_notification = Notification.objects.filter(
                user=self.user,
                type='progress',
                title__icontains='Estancamiento',
                created_at__gte=timezone.now() - timedelta(hours=24)
            ).first()
            
            if recent_notification:
                logger.info(f'Notificación de estancamiento ya enviada recientemente para {self.user.email}')
                return recent_notification
            
            # Crear notificación
            notification = Notification.objects.create(
                user=self.user,
                type='progress',
                title=title,
                message=message,
                data={
                    'analysis': {
                        'status': weight_analysis.get('status'),
                        'weight_change': weight_analysis.get('weight_change'),
                        'weekly_change': weight_analysis.get('weekly_change'),
                    },
                    'recommendation': {
                        'action': main_recommendation.get('action'),
                        'calorie_adjustment': main_recommendation.get('suggested_calorie_adjustment', 0),
                    },
                    'auto_generated': True,
                },
                action_url='/dashboard/progress',  # URL para ver el progreso
                expires_at=timezone.now() + timedelta(days=7),  # Expira en 7 días
            )
            
            logger.info(f'✅ Notificación de estancamiento enviada a {self.user.email}')
            return notification
            
        except Exception as e:
            logger.error(f'❌ Error enviando notificación de estancamiento a {self.user.email}: {str(e)}')
            return None
    
    def send_slow_progress_notification(self, analysis: Dict) -> Optional[Notification]:
        """
        Envía una notificación cuando el progreso es muy lento.
        """
        try:
            weight_analysis = analysis.get('weight_analysis', {})
            recommendations = analysis.get('recommendations', {}).get('info', [])
            
            if not recommendations:
                return None
            
            main_recommendation = recommendations[0]
            
            # Verificar si ya existe una notificación similar reciente
            recent_notification = Notification.objects.filter(
                user=self.user,
                type='progress',
                title__icontains='Progreso lento',
                created_at__gte=timezone.now() - timedelta(hours=48)
            ).first()
            
            if recent_notification:
                return recent_notification
            
            notification = Notification.objects.create(
                user=self.user,
                type='progress',
                title=main_recommendation.get('title', 'Progreso lento'),
                message=main_recommendation.get('message', 'Tu progreso es más lento de lo esperado.'),
                data={
                    'analysis': {
                        'status': weight_analysis.get('status'),
                        'weekly_change': weight_analysis.get('weekly_change'),
                    },
                    'recommendation': main_recommendation,
                    'auto_generated': True,
                },
                action_url='/dashboard/progress',
                expires_at=timezone.now() + timedelta(days=5),
            )
            
            logger.info(f'✅ Notificación de progreso lento enviada a {self.user.email}')
            return notification
            
        except Exception as e:
            logger.error(f'❌ Error enviando notificación de progreso lento: {str(e)}')
            return None
    
    def send_plan_adjustment_notification(self, adjustment_data: Dict) -> Optional[Notification]:
        """
        Envía una notificación cuando se ajusta automáticamente el plan nutricional.
        
        Args:
            adjustment_data: Datos del ajuste realizado
        """
        try:
            notification = Notification.objects.create(
                user=self.user,
                type='nutrition',
                title='Plan nutricional actualizado',
                message=f"Tu plan nutricional ha sido actualizado automáticamente: {adjustment_data.get('reason', 'Ajuste automático')}",
                data={
                    'adjustment': adjustment_data,
                    'auto_generated': True,
                },
                action_url='/dashboard/nutrition',
                expires_at=timezone.now() + timedelta(days=3),
            )
            
            logger.info(f'✅ Notificación de ajuste de plan enviada a {self.user.email}')
            return notification
            
        except Exception as e:
            logger.error(f'❌ Error enviando notificación de ajuste de plan: {str(e)}')
            return None
    
    def send_achievement_notification(self, achievement_data: Dict) -> Optional[Notification]:
        """
        Envía una notificación cuando el usuario alcanza un logro relacionado con el progreso.
        """
        try:
            notification = Notification.objects.create(
                user=self.user,
                type='achievement',
                title=achievement_data.get('title', '¡Logro alcanzado!'),
                message=achievement_data.get('message', 'Has alcanzado un nuevo logro en tu progreso.'),
                data={
                    'achievement': achievement_data,
                    'auto_generated': True,
                },
                action_url='/dashboard/achievements',
                expires_at=timezone.now() + timedelta(days=14),
            )
            
            logger.info(f'✅ Notificación de logro enviada a {self.user.email}')
            return notification
            
        except Exception as e:
            logger.error(f'❌ Error enviando notificación de logro: {str(e)}')
            return None
    
    def check_and_send_notifications(self, weeks: int = 4) -> Dict[str, int]:
        """
        Verifica el progreso del usuario y envía notificaciones apropiadas.
        
        Returns:
            Dict con estadísticas de notificaciones enviadas
        """
        stats = {
            'stalled': 0,
            'slow': 0,
            'plan_adjustment': 0,
            'total': 0,
        }
        
        try:
            # Realizar análisis
            analysis = self.analysis_service.get_comprehensive_analysis(weeks=weeks)
            weight_status = analysis.get('weight_analysis', {}).get('status', 'unknown')
            
            # Enviar notificaciones según el estado
            if weight_status == 'stalled':
                notification = self.send_stalled_progress_notification(analysis)
                if notification:
                    stats['stalled'] = 1
                    stats['total'] += 1
            
            elif weight_status == 'slow':
                notification = self.send_slow_progress_notification(analysis)
                if notification:
                    stats['slow'] = 1
                    stats['total'] += 1
            
            # Verificar si se debe sugerir ajuste de plan
            should_adjust, suggestion = self.analysis_service.should_suggest_plan_adjustment()
            if should_adjust and suggestion:
                notification = self.send_plan_adjustment_notification(suggestion)
                if notification:
                    stats['plan_adjustment'] = 1
                    stats['total'] += 1
            
        except Exception as e:
            logger.error(f'❌ Error verificando notificaciones para {self.user.email}: {str(e)}')
        
        return stats





