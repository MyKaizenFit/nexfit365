from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count
from django.utils import timezone

from .models import Notification, PushSubscription
from .serializers import (
    NotificationSerializer, NotificationCreateSerializer, 
    NotificationUpdateSerializer, NotificationSummarySerializer,
    PushSubscriptionSerializer
)
from .permissions import (
    NotificationPermission, NotificationCreatePermission, NotificationBulkPermission
)


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet para notificaciones
    """
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [NotificationPermission]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ["type", "read_at"]
    ordering_fields = ["created_at", "read_at", "type"]
    ordering = ["-created_at"]
    search_fields = ["title", "message"]

    class NotificationPagination(PageNumberPagination):
        page_size = 20
        page_size_query_param = "page_size"
        max_page_size = 100

    pagination_class = NotificationPagination
    
    def get_queryset(self):
        user_id = self.kwargs.get("user_id")
        queryset = Notification.objects.select_related('user')

        role = str(getattr(self.request.user, "role", "") or "").lower()
        is_admin = self.request.user.is_staff or self.request.user.is_superuser or role == "admin"
        can_view_members = is_admin or role in {"trainer", "pro"}

        if user_id:
            scoped = queryset.filter(user_id=user_id)
        elif can_view_members:
            scoped = queryset
        else:
            scoped = queryset.filter(user=self.request.user)

        read_param = self.request.query_params.get("read")
        if read_param is not None:
            normalized = str(read_param).strip().lower()
            if normalized in {"true", "1", "yes"}:
                scoped = scoped.filter(read_at__isnull=False)
            elif normalized in {"false", "0", "no"}:
                scoped = scoped.filter(read_at__isnull=True)

        date_from = self.request.query_params.get("date_from")
        if date_from:
            scoped = scoped.filter(created_at__date__gte=date_from)

        date_to = self.request.query_params.get("date_to")
        if date_to:
            scoped = scoped.filter(created_at__date__lte=date_to)

        return scoped
    
    def get_serializer_class(self):
        if self.action == "create":
            return NotificationCreateSerializer
        elif self.action in ["update", "partial_update"]:
            return NotificationUpdateSerializer
        return NotificationSerializer
    
    def get_permissions(self):
        if self.action == "create":
            return [NotificationCreatePermission()]
        elif self.action in ["mark_all_read", "delete_multiple"]:
            return [NotificationBulkPermission()]
        return [NotificationPermission()]
    
    def perform_create(self, serializer):
        user_id = self.kwargs.get("user_id")
        if user_id:
            serializer.save(user_id=user_id)
        else:
            serializer.save(user=self.request.user)
    
    @action(detail=True, methods=["patch"])
    def read(self, request, user_id=None, pk=None):
        """Marcar notificación como leída"""
        notification = self.get_object()
        notification.mark_as_read()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)
    
    @action(detail=True, methods=["patch"])
    def unread(self, request, user_id=None, pk=None):
        """Marcar notificación como no leída"""
        notification = self.get_object()
        notification.mark_as_unread()
        serializer = self.get_serializer(notification)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def track_click(self, request, user_id=None, pk=None):
        """Registrar clic en acción de notificación"""
        notification = self.get_object()
        metadata = notification.data or {}
        metadata["clicked_at"] = timezone.now().isoformat()
        metadata["clicked"] = True
        metadata["click_count"] = int(metadata.get("click_count", 0)) + 1
        notification.data = metadata
        notification.save(update_fields=["data", "updated_at"])

        return Response({
            "message": "Clic registrado",
            "click_count": metadata["click_count"],
        })
    
    @action(detail=False, methods=["patch"])
    def mark_all_read(self, request, user_id=None):
        """Marcar todas las notificaciones como leídas"""
        user_id = user_id or request.user.id
        queryset = self.get_queryset()
        
        # Marcar como leídas
        updated_count = queryset.filter(read_at__isnull=True).update(
            read_at=timezone.now()
        )
        
        return Response({
            "message": f"{updated_count} notificaciones marcadas como leídas",
            "updated_count": updated_count
        })
    
    @action(detail=False, methods=["get"])
    def unread_count(self, request, user_id=None):
        """Obtener contador de notificaciones no leídas"""
        user_id = user_id or request.user.id
        queryset = self.get_queryset()
        
        unread_count = queryset.filter(read_at__isnull=True).count()
        
        return Response({"unread_count": unread_count})
    
    @action(detail=False, methods=["get"])
    def summary(self, request, user_id=None):
        """Obtener resumen de notificaciones"""
        user_id = user_id or request.user.id
        queryset = self.get_queryset()
        
        # Estadísticas básicas
        total_notifications = queryset.count()
        unread_count = queryset.filter(read_at__isnull=True).count()
        
        # Notificaciones por tipo
        notifications_by_type = queryset.values("type").annotate(
            count=Count("id")
        ).order_by("-count")
        
        # Última notificación
        latest_notification = queryset.first().created_at if queryset.exists() else None
        
        data = {
            "total_notifications": total_notifications,
            "unread_count": unread_count,
            "notifications_by_type": {item["type"]: item["count"] for item in notifications_by_type},
            "latest_notification": latest_notification,
        }
        
        serializer = NotificationSummarySerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=["get"])
    def recent(self, request, user_id=None):
        """Obtener notificaciones recientes (últimas 10)"""
        user_id = user_id or request.user.id
        queryset = self.get_queryset()[:10]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=["get"])
    def by_type(self, request, user_id=None):
        """Obtener notificaciones por tipo"""
        notification_type = request.query_params.get("type")
        if not notification_type:
            return Response(
                {"error": "El parámetro 'type' es requerido"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = user_id or request.user.id
        queryset = self.get_queryset().filter(type=notification_type)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class PushSubscriptionViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar suscripciones push
    """
    queryset = PushSubscription.objects.all()
    serializer_class = PushSubscriptionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Solo suscripciones del usuario autenticado"""
        return PushSubscription.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        """Asociar suscripción al usuario autenticado"""
        serializer.save(user=self.request.user)
    
    def perform_destroy(self, instance):
        """Marcar como inactiva en lugar de eliminar"""
        instance.is_active = False
        instance.save() 