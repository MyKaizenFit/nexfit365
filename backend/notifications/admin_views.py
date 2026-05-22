# notifications/admin_views.py
import logging

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from django.contrib.auth import get_user_model
from django.db import DatabaseError
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from drf_spectacular.utils import extend_schema, OpenApiExample, inline_serializer
from rest_framework import serializers

from .models import Notification, NotificationDeliveryLog
from .serializers import NotificationSerializer, CreateNotificationSerializer, NotificationDeliveryLogSerializer
from .models import AdminMessage
from accounts.permissions import IsAdminOrStaff
from progress.models import WeightEntry, ProgressPhoto

try:
    from dashboard.models import CoachingInquiry
except Exception:  # pragma: no cover - fallback defensivo para contextos parciales
    CoachingInquiry = None


logger = logging.getLogger(__name__)


IMPORTANT_NOTIFICATION_TYPES = {value for value, _ in Notification.NOTIFICATION_TYPES}
AUTOMATION_RULES = {
    'review': {
        'name': 'Recordatorio de revisión',
        'description': 'Empuja a usuarios con menor actividad reciente a revisar su progreso.',
        'title': 'Toca revisar tu progreso esta semana',
        'message': 'Reserva unos minutos para revisar tu progreso, actualizar medidas y mantener el foco en tus objetivos.',
        'type': 'system',
        'priority': 'medium',
        'action_url': '',
        'segment_key': 'review_candidates',
    },
    'reactivation': {
        'name': 'Reactivación de usuarios',
        'description': 'Reactiva usuarios que llevan días sin entrar en la app.',
        'title': 'Volvamos a ponernos en marcha',
        'message': 'Si estos días te has desconectado, vuelve hoy con una sesión corta o registra tu comida para retomar el ritmo.',
        'type': 'general',
        'priority': 'high',
        'action_url': '',
        'segment_key': 'reactivation_candidates',
    },
    'progress': {
        'name': 'Check-in de progreso',
        'description': 'Solicita peso, fotos o sensaciones cuando faltan registros recientes.',
        'title': 'Sube tu check-in de progreso',
        'message': 'Actualiza tu peso, fotos o sensaciones para que la app refleje mejor tu evolución y podamos ajustar contigo.',
        'type': 'progress',
        'priority': 'medium',
        'action_url': '',
        'segment_key': 'progress_candidates',
    },
    'weekly-report': {
        'name': 'Reporte semanal interno',
        'description': 'Resume el estado operativo para admins y trainers.',
        'title': 'Resumen semanal NexFit365',
        'message': '',
        'type': 'system',
        'priority': 'medium',
        'action_url': '',
        'segment_key': 'weekly_report_recipients',
    },
}


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


def _member_queryset():
    User = get_user_model()
    return User.objects.filter(is_active=True).exclude(
        Q(is_superuser=True) |
        Q(is_staff=True) |
        Q(role__iexact='admin') |
        Q(role__iexact='trainer')
    )


def _admin_queryset():
    User = get_user_model()
    return User.objects.filter(is_active=True).filter(
        Q(is_superuser=True) |
        Q(is_staff=True) |
        Q(role__iexact='admin') |
        Q(role__iexact='trainer')
    )


def _collect_automation_snapshot():
    now = timezone.now()
    members = _member_queryset()
    admins = _admin_queryset()
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)
    progress_cutoff = now - timedelta(days=10)

    review_qs = members.filter(Q(last_login__isnull=True) | Q(last_login__lt=seven_days_ago))
    reactivation_qs = members.filter(Q(last_login__isnull=True) | Q(last_login__lt=fourteen_days_ago))

    try:
        recent_progress_user_ids = set(
            WeightEntry.objects.filter(date__gte=progress_cutoff.date()).values_list('user_id', flat=True)
        ) | set(
            ProgressPhoto.objects.filter(created_at__gte=progress_cutoff).values_list('user_id', flat=True)
        )
    except DatabaseError:
        recent_progress_user_ids = set()
    progress_qs = members.exclude(id__in=recent_progress_user_ids)

    pending_coaching = 0
    if CoachingInquiry is not None:
        try:
            pending_coaching = CoachingInquiry.objects.filter(status__in=['new', 'contacted', 'qualified']).count()
        except DatabaseError:
            pending_coaching = 0

    try:
        unread_notifications = Notification.objects.filter(
            type__in=IMPORTANT_NOTIFICATION_TYPES,
            read_at__isnull=True,
        ).count()
    except DatabaseError:
        unread_notifications = 0

    segments = {
        'review_candidates': review_qs.count(),
        'reactivation_candidates': reactivation_qs.count(),
        'progress_candidates': progress_qs.count(),
        'weekly_report_recipients': admins.count(),
        'pending_coaching_leads': pending_coaching,
        'active_members': members.count(),
        'active_last_7_days': members.filter(last_login__gte=seven_days_ago).count(),
        'unread_notifications': unread_notifications,
    }

    return {
        'generated_at': now,
        'segments': segments,
        'querysets': {
            'review': review_qs,
            'reactivation': reactivation_qs,
            'progress': progress_qs,
            'weekly-report': admins,
        },
    }


def _build_weekly_brief(snapshot):
    segments = snapshot['segments']
    active_members = max(segments['active_members'], 1)
    active_rate = round((segments['active_last_7_days'] / active_members) * 100)

    lines = [
        'Resumen semanal NexFit365',
        f"• Activación reciente: {active_rate}% de miembros activos en los últimos 7 días.",
        f"• Usuarios para revisión: {segments['review_candidates']}.",
        f"• Usuarios para reactivar: {segments['reactivation_candidates']}.",
        f"• Check-ins de progreso pendientes: {segments['progress_candidates']}.",
        f"• Leads 1 a 1 pendientes de seguimiento: {segments['pending_coaching_leads']}.",
        f"• Notificaciones aún sin leer: {segments['unread_notifications']}.",
    ]

    if segments['reactivation_candidates'] > 0:
        lines.append('• Siguiente foco: lanzar reactivación segmentada a usuarios fríos.')
    elif segments['progress_candidates'] > 0:
        lines.append('• Siguiente foco: pedir check-ins para reforzar el reporting de resultados.')
    else:
        lines.append('• Siguiente foco: mantener cadencia y seguir afinando automatizaciones programadas.')

    return "\n".join(lines)


def _get_last_automation_runs():
    last_runs = {}
    recent_items = Notification.objects.filter(
        data__created_by_automation=True,
        data__automation_summary=True,
    ).order_by('-created_at')[:25]

    for item in recent_items:
        automation_key = item.data.get('automation_key')
        if automation_key and automation_key not in last_runs:
            last_runs[automation_key] = {
                'last_run_at': item.created_at.isoformat(),
                'targeted_users': item.data.get('targeted_users', 0),
            }

    return last_runs


def _run_automation_for_key(automation_key, actor):
    config = AUTOMATION_RULES.get(automation_key)
    if not config:
        raise ValueError('Automatización no soportada')

    snapshot = _collect_automation_snapshot()
    target_qs = snapshot['querysets'][automation_key]
    target_ids = list(target_qs.values_list('id', flat=True))
    normalized_type = _normalize_notification_type(config['type'])
    expires_at = _default_expiration_for_type(normalized_type)
    message = _build_weekly_brief(snapshot) if automation_key == 'weekly-report' else config['message']

    created = 0
    for user_id in target_ids:
        Notification.objects.create(
            user_id=user_id,
            type=normalized_type,
            title=config['title'],
            message=message,
            data={
                'priority': config['priority'],
                'created_by_admin': True,
                'created_by_admin_id': str(actor.id),
                'created_by_automation': True,
                'automation_key': automation_key,
                'automation_generated_at': snapshot['generated_at'].isoformat(),
            },
            action_url=config.get('action_url', ''),
            expires_at=expires_at,
        )
        created += 1

    Notification.objects.create(
        user=actor,
        type='system',
        title=f"Automatización ejecutada: {config['name']}",
        message=f"Se ha lanzado la automatización '{config['name']}' para {created} usuarios.",
        data={
            'priority': 'medium',
            'created_by_automation': True,
            'automation_summary': True,
            'automation_key': automation_key,
            'targeted_users': created,
            'segments': snapshot['segments'],
        },
        action_url='',
        expires_at=timezone.now() + timedelta(days=30),
    )

    return {
        'message': f"Automatización '{config['name']}' ejecutada para {created} usuarios.",
        'automation_key': automation_key,
        'notifications_created': created,
        'targeted_users': created,
        'weekly_brief': _build_weekly_brief(snapshot),
        'segments': snapshot['segments'],
        'generated_at': snapshot['generated_at'].isoformat(),
    }

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
        queryset = Notification.objects.select_related('user').prefetch_related('delivery_logs').filter(
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
        if self.action in ['send_single', 'send_bulk', 'send_to_all', 'run_automation']:
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
    def send_single(self, request):
        """Enviar una notificación a un único usuario."""
        serializer = CreateNotificationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        user_id = request.data.get('user_id')
        user_ids = data.get('user_ids') or []

        if user_id is None and len(user_ids) == 1:
            user_id = user_ids[0]

        if user_id is None:
            return Response(
                {'error': 'Se requiere user_id para enviar una notificación individual'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized_type = _normalize_notification_type(data.get('type'))
        expires_at = data.get('expires_at') or _default_expiration_for_type(normalized_type)

        notification = Notification.objects.create(
            user_id=user_id,
            type=normalized_type,
            title=data['title'],
            message=data['message'],
            data={
                'priority': data.get('priority', 'medium'),
                'created_by_admin': True,
                'created_by_admin_id': str(request.user.id),
                'delivery_scope': 'single',
            },
            action_url=data.get('action_url', ''),
            expires_at=expires_at,
        )

        logger.info(
            'admin_notification_send_single',
            extra={
                'admin_user_id': str(request.user.id),
                'admin_email': getattr(request.user, 'email', ''),
                'target_user_id': str(user_id),
                'message_type': normalized_type,
            }
        )

        return Response({
            'message': 'Notificación individual enviada correctamente',
            'notifications_created': 1,
            'notification_id': str(notification.id),
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    @extend_schema(
        tags=["Notifications"],
        summary="Enviar notificación masiva",
        examples=[
            OpenApiExample(
                "Bulk notification request",
                value={
                    "user_ids": [12, 27, 31],
                    "title": "Recordatorio semanal",
                    "message": "No olvides registrar tu progreso.",
                    "type": "progress",
                    "priority": "high",
                    "send_email": True,
                },
                request_only=True,
            ),
            OpenApiExample(
                "Bulk notification response",
                value={
                    "message": "3 notificaciones enviadas correctamente",
                    "notifications_created": 3,
                },
                response_only=True,
            ),
        ],
    )
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
        
        normalized_type = _normalize_notification_type(data.get('type'))
        expires_at = data.get('expires_at') or _default_expiration_for_type(normalized_type)

        notifications = []
        for user_id in user_ids:
            notification = Notification.objects.create(
                user_id=user_id,
                type=normalized_type,
                title=data['title'],
                message=data['message'],
                data={
                    'priority': data.get('priority', 'medium'),
                    'created_by_admin': True,
                    'created_by_admin_id': str(request.user.id),
                },
                action_url=data.get('action_url', ''),
                expires_at=expires_at,
            )
            notifications.append(notification)

        logger.info(
            'admin_notification_send_bulk',
            extra={
                'admin_user_id': str(request.user.id),
                'admin_email': getattr(request.user, 'email', ''),
                'target_user_count': len(user_ids),
                 'message_type': normalized_type,
            }
        )
        
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
        
        normalized_type = _normalize_notification_type(data.get('type'))
        expires_at = data.get('expires_at') or _default_expiration_for_type(normalized_type)

        notifications = []
        for user in active_users:
            notification = Notification.objects.create(
                user=user,
                type=normalized_type,
                title=data['title'],
                message=data['message'],
                data={
                    'priority': data.get('priority', 'medium'),
                    'created_by_admin': True,
                    'created_by_admin_id': str(request.user.id),
                },
                action_url=data.get('action_url', ''),
                expires_at=expires_at,
            )
            notifications.append(notification)

        logger.info(
            'admin_notification_send_to_all',
            extra={
                'admin_user_id': str(request.user.id),
                'admin_email': getattr(request.user, 'email', ''),
                 'target_user_count': len(notifications),
                 'message_type': normalized_type,
            }
        )

        return Response({
            'message': f'Notificación enviada a {len(notifications)} usuarios activos',
            'notifications_created': len(notifications)
        }, status=status.HTTP_201_CREATED)
    
    @extend_schema(
        tags=["Notifications"],
        summary="Estadísticas de notificaciones admin",
        responses=inline_serializer(
            name='AdminNotificationStatsResponse',
            fields={
                'total_notifications': serializers.IntegerField(),
                'read_notifications': serializers.IntegerField(),
                'unread_notifications': serializers.IntegerField(),
                'clicked_notifications': serializers.IntegerField(),
                'recent_notifications_30_days': serializers.IntegerField(),
                'type_distribution': inline_serializer(
                    name='NotificationTypeDistribution',
                    many=True,
                    fields={
                        'type': serializers.CharField(),
                        'count': serializers.IntegerField(),
                    },
                ),
                'delivery_breakdown': inline_serializer(
                    name='NotificationDeliveryBreakdown',
                    many=True,
                    fields={
                        'channel': serializers.CharField(),
                        'status': serializers.CharField(),
                        'count': serializers.IntegerField(),
                    },
                ),
            },
        ),
        examples=[
            OpenApiExample(
                "Stats response",
                value={
                    "total_notifications": 120,
                    "read_notifications": 80,
                    "unread_notifications": 40,
                    "clicked_notifications": 21,
                    "recent_notifications_30_days": 54,
                    "type_distribution": [
                        {"type": "system", "count": 20},
                        {"type": "progress", "count": 14},
                    ],
                    "delivery_breakdown": [
                        {"channel": "push", "status": "sent", "count": 45},
                        {"channel": "email", "status": "failed", "count": 3},
                    ],
                },
                response_only=True,
            )
        ],
    )
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

            delivery_breakdown = NotificationDeliveryLog.objects.values('channel', 'status').annotate(count=Count('id'))
        except DatabaseError:
            total_notifications = 0
            read_notifications = 0
            unread_notifications = 0
            clicked_notifications = 0
            type_stats = []
            recent_notifications = 0
            delivery_breakdown = []
        
        return Response({
            'total_notifications': total_notifications,
            'read_notifications': read_notifications,
            'unread_notifications': unread_notifications,
            'clicked_notifications': clicked_notifications,
            'recent_notifications_30_days': recent_notifications,
            'type_distribution': list(type_stats),
            'delivery_breakdown': list(delivery_breakdown),
        })

    @extend_schema(
        tags=["Notifications"],
        summary="Trazabilidad de entrega por notificación",
        responses=inline_serializer(
            name='NotificationDeliveryLogsResponse',
            fields={
                'notification_id': serializers.CharField(),
                'logs': NotificationDeliveryLogSerializer(many=True),
            },
        ),
        examples=[
            OpenApiExample(
                "Delivery logs response",
                value={
                    "notification_id": "24ea89b0-2f13-4e3f-8f9c-3bde9e7c4c6b",
                    "logs": [
                        {
                            "channel": "push",
                            "status": "sent",
                            "attempts": 1,
                            "last_error": "",
                            "metadata": {"sent_subscriptions": 2},
                        },
                        {
                            "channel": "email",
                            "status": "failed",
                            "attempts": 2,
                            "last_error": "SMTP timeout",
                            "metadata": {},
                        },
                    ],
                },
                response_only=True,
            )
        ],
    )
    @action(detail=True, methods=['get'], url_path='delivery-logs')
    def delivery_logs(self, request, pk=None):
        """Devuelve trazas de entrega push/email para una notificación."""
        notification = self.get_object()
        logs = notification.delivery_logs.all().order_by('channel')
        serializer = NotificationDeliveryLogSerializer(logs, many=True)
        return Response({
            'notification_id': str(notification.id),
            'logs': serializer.data,
        })
    
    @action(detail=False, methods=['get'], url_path='automation-summary')
    def automation_summary(self, request):
        snapshot = _collect_automation_snapshot()
        last_runs = _get_last_automation_runs()
        rules = []

        for key, config in AUTOMATION_RULES.items():
            segment_key = config['segment_key']
            rules.append({
                'key': key,
                'name': config['name'],
                'description': config['description'],
                'recommended': snapshot['segments'].get(segment_key, 0) > 0,
                'audience_size': snapshot['segments'].get(segment_key, 0),
                'last_run_at': last_runs.get(key, {}).get('last_run_at'),
                'last_targeted_users': last_runs.get(key, {}).get('targeted_users', 0),
            })

        return Response({
            'generated_at': snapshot['generated_at'].isoformat(),
            'weekly_brief': _build_weekly_brief(snapshot),
            'segments': snapshot['segments'],
            'automation_rules': rules,
        })

    @action(detail=False, methods=['post'], url_path='run-automation')
    def run_automation(self, request):
        automation_key = request.data.get('automation_key')

        if not automation_key:
            return Response({'error': 'Se requiere automation_key'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            payload = _run_automation_for_key(str(automation_key), request.user)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(payload, status=status.HTTP_200_OK)

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
