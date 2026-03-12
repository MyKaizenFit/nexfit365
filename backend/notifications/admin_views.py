# notifications/admin_views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import DatabaseError
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from .models import Notification
from .serializers import NotificationSerializer, CreateNotificationSerializer
from accounts.permissions import IsAdminOrStaff

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
        queryset = Notification.objects.select_related('user')
        
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

    def list(self, request, *args, **kwargs):
        try:
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
        
        # Crear notificaciones para cada usuario
        notifications = []
        for user_id in user_ids:
            notification = Notification.objects.create(
                user_id=user_id,
                title=data['title'],
                message=data['message'],
                type=data.get('type', 'info'),
                priority=data.get('priority', 'medium')
            )
            notifications.append(notification)
        
        return Response({
            'message': f'{len(notifications)} notificaciones enviadas correctamente',
            'notifications_created': len(notifications)
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
        
        # Crear notificaciones para cada usuario activo
        notifications = []
        for user in active_users:
            notification = Notification.objects.create(
                user=user,
                title=data['title'],
                message=data['message'],
                type=data.get('type', 'info'),
                priority=data.get('priority', 'medium')
            )
            notifications.append(notification)
        
        return Response({
            'message': f'Notificación enviada a {len(notifications)} usuarios activos',
            'notifications_created': len(notifications)
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas de notificaciones"""
        try:
            total_notifications = Notification.objects.count()
            read_notifications = Notification.objects.filter(read_at__isnull=False).count()
            unread_notifications = Notification.objects.filter(read_at__isnull=True).count()
            
            # Notificaciones por tipo
            type_stats = Notification.objects.values('type').annotate(count=Count('type'))
            
            # Notificaciones de los últimos 30 días
            thirty_days_ago = timezone.now() - timedelta(days=30)
            recent_notifications = Notification.objects.filter(
                created_at__gte=thirty_days_ago
            ).count()
        except DatabaseError:
            total_notifications = 0
            read_notifications = 0
            unread_notifications = 0
            type_stats = []
            recent_notifications = 0
        
        return Response({
            'total_notifications': total_notifications,
            'read_notifications': read_notifications,
            'unread_notifications': unread_notifications,
            'recent_notifications_30_days': recent_notifications,
            'type_distribution': list(type_stats),
        })
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Marcar notificación como leída"""
        notification = self.get_object()
        notification.is_read = True
        notification.read_at = timezone.now()
        notification.save()
        
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
                user_id=user_id, is_read=False
            ).update(is_read=True, read_at=timezone.now())
            message = f'{updated} notificaciones marcadas como leídas para el usuario'
        else:
            updated = Notification.objects.filter(
                is_read=False
            ).update(is_read=True, read_at=timezone.now())
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
