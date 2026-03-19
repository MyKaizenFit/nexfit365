# notifications/admin_views.py
import logging

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from django.db import DatabaseError
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import Notification
from .serializers import NotificationSerializer, CreateNotificationSerializer
from .models import AdminMessage
from accounts.permissions import IsAdminOrStaff


logger = logging.getLogger(__name__)


IMPORTANT_NOTIFICATION_TYPES = {"progress", "nutrition", "workout", "system"}


def _normalize_notification_type(raw_type: str) -> str:
    type_map = {
        'info': 'system',
        'warning': 'system',
        'success': 'achievement',
        'error': 'system',
        'meal': 'meal_reminder',
        'nutrition': 'nutrition',
        'workout': 'workout',
        'workout_reminder': 'workout_reminder',
        'achievement': 'achievement',
        'progress': 'progress',
        'reminder': 'system',
        'motivation': 'general',
        'admin': 'system',
        'marketing': 'general',
        'general': 'general',
        'system': 'system',
    }
    return type_map.get((raw_type or '').lower(), 'general')


def _default_expiration_for_type(notification_type: str):
    now = timezone.now()
    expiration_by_type = {
        'workout_reminder': now + timedelta(days=2),
        'meal_reminder': now + timedelta(days=1),
        'system': now + timedelta(days=14),
        'achievement': now + timedelta(days=30),
        'progress': now + timedelta(days=14),
        'nutrition': now + timedelta(days=7),
        'workout': now + timedelta(days=7),
        'general': now + timedelta(days=10),
    }
    return expiration_by_type.get(notification_type, now + timedelta(days=10))

class AdminNotificationSendThrottle(UserRateThrottle):
    scope = 'admin_notifications_send'


class AdminNotificationViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de notificaciones por administradores"""
    queryset = Notification.objects.all()
    permission_classes = [IsAdminOrStaff]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateNotificationSerializer
        return NotificationSerializer
    
    def get_queryset(self):
        """Filtrar notificaciones según parámetros"""
        queryset = Notification.objects.select_related('user').filter(
            type__in=IMPORTANT_NOTIFICATION_TYPES
        )
        
        search = self.request.query_params.get('search', None)
        notification_type = self.request.query_params.get('type', None)
        status = self.request.query_params.get('status', None)
        user_id = self.request.query_params.get('user_id', None)
        
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(message__icontains=search) |
                Q(user__email__icontains=search)
            )
        
        if notification_type:
            queryset = queryset.filter(type=notification_type)
        
        if status == 'read':
            queryset = queryset.filter(read_at__isnull=False)
        elif status == 'unread':
            queryset = queryset.filter(read_at__isnull=True)
        
        if user_id:
            queryset = queryset.filter(user_id=user_id)
        
        return queryset.order_by('-created_at')

    def get_throttles(self):
        if self.action in ['send_bulk', 'send_to_all']:
            return [AdminNotificationSendThrottle()]
        return super().get_throttles()

    def list(self, request, *args, **kwargs):
        try:
            user_id = request.query_params.get('user_id')
            auto_read = str(request.query_params.get('auto_read', 'true')).strip().lower()
            if user_id and auto_read in {'1', 'true', 'yes'}:
                self.get_queryset().filter(read_at__isnull=True).update(read_at=timezone.now())
            return super().list(request, *args, **kwargs)
        except DatabaseError:
            return Response({
                'count': 0,
                'next': None,
                'previous': None,
                'results': [],
                'warning': 'No se pudieron cargar notificaciones por incidencia temporal en base de datos'
            }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def send_bulk(self, request):
        """Enviar notificación masiva a múltiples usuarios"""
        serializer = CreateNotificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        user_ids = data.get('user_ids', [])
        
        if not user_ids:
            return Response(
                {'error': 'Se requieren user_ids'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Crear mensajes directos del admin (no notificaciones)
        admin_messages = []
        for user_id in user_ids:
            message = AdminMessage.objects.create(
                user_id=user_id,
                sent_by=request.user,
                title=data['title'],
                message=data['message'],
                action_url=data.get('action_url', ''),
                expires_at=data.get('expires_at') or (timezone.now() + timedelta(days=30)),
            )
            admin_messages.append(message)

        logger.info(
            'admin_notification_send_bulk',
            extra={
                'admin_user_id': str(request.user.id),
                'admin_email': getattr(request.user, 'email', ''),
                'target_user_count': len(user_ids),
                 'message_type': 'admin_message',
            }
        )
        
        return Response({
            'message': f'{len(admin_messages)} mensajes enviados correctamente',
            'messages_created': len(admin_messages)
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def send_to_all(self, request):
        """Enviar notificación a todos los usuarios activos"""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        serializer = CreateNotificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        data = serializer.validated_data
        
        # Obtener todos los usuarios activos
        active_users = User.objects.filter(is_active=True)
        
        # Crear mensajes directos del admin (no notificaciones)
        admin_messages = []
        for user in active_users:
            message = AdminMessage.objects.create(
                user=user,
                sent_by=request.user,
                title=data['title'],
                message=data['message'],
                action_url=data.get('action_url', ''),
                expires_at=data.get('expires_at') or (timezone.now() + timedelta(days=30)),
            )
            admin_messages.append(message)

        logger.info(
            'admin_notification_send_to_all',
            extra={
                'admin_user_id': str(request.user.id),
                'admin_email': getattr(request.user, 'email', ''),
                 'target_user_count': len(admin_messages),
                 'message_type': 'admin_message',
            }
        )

        return Response({
            'message': f'Mensaje enviado a {len(admin_messages)} usuarios activos',
            'messages_created': len(admin_messages)
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas de notificaciones"""
        try:
            base_qs = Notification.objects.filter(type__in=IMPORTANT_NOTIFICATION_TYPES)
            total_notifications = base_qs.count()
            read_notifications = base_qs.filter(read_at__isnull=False).count()
            unread_notifications = base_qs.filter(read_at__isnull=True).count()
            clicked_notifications = base_qs.filter(data__clicked_at__isnull=False).count()
            
            # Notificaciones por tipo
            type_stats = base_qs.values('type').annotate(count=Count('type'))
            
            # Notificaciones de los últimos 30 días
            thirty_days_ago = timezone.now() - timedelta(days=30)
            recent_notifications = base_qs.filter(
                created_at__gte=thirty_days_ago
            ).count()
        except DatabaseError:
            total_notifications = 0
            read_notifications = 0
            unread_notifications = 0
            clicked_notifications = 0
            type_stats = []
            recent_notifications = 0
        
        return Response({
            'total_notifications': total_notifications,
            'read_notifications': read_notifications,
            'unread_notifications': unread_notifications,
            'clicked_notifications': clicked_notifications,
            'recent_notifications_30_days': recent_notifications,
            'type_distribution': list(type_stats),
        })
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Marcar notificación como leída"""
        notification = self.get_object()
        notification.mark_as_read()
        
        return Response({
            'message': 'Notificación marcada como leída',
            'is_read': notification.is_read
        })
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Marcar todas las notificaciones como leídas"""
        user_id = request.data.get('user_id')
        
        if user_id:
            updated = Notification.objects.filter(
                user_id=user_id, read_at__isnull=True
            ).update(read_at=timezone.now())
            message = f'{updated} notificaciones marcadas como leídas para el usuario'
        else:
            updated = Notification.objects.filter(
                read_at__isnull=True
            ).update(read_at=timezone.now())
            message = f'{updated} notificaciones marcadas como leídas'
        
        return Response({'message': message})
    
    @action(detail=False, methods=['delete'])
    def bulk_delete(self, request):
        """Eliminar múltiples notificaciones"""
        notification_ids = request.data.get('notification_ids', [])
        
        if not notification_ids:
            return Response(
                {'error': 'Se requieren notification_ids'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        deleted_count = Notification.objects.filter(
            id__in=notification_ids
        ).delete()[0]
        
        return Response({
            'message': f'{deleted_count} notificaciones eliminadas correctamente'
        })
