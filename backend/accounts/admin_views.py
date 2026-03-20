# accounts/admin_views.py
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.db.models import Q, Count
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from django.forms.models import model_to_dict

from .serializers import UserProfileSerializer, UserRegistrationSerializer, AdminUserSerializer
from .permissions import IsAdminOrStaff
from .models import CustomUser, ProfileAuditLog
from django.db import models

User = get_user_model()

PROFILE_AUDIT_FIELDS = [
    'first_name', 'last_name', 'phone_number', 'birth_date', 'gender',
    'height', 'weight', 'target_weight',
    'main_goal', 'activity_level', 'training_location', 'training_days_per_week', 'training_days',
    'dietary_restrictions', 'allergies', 'medical_conditions', 'equipment_available',
    'disliked_foods', 'injuries_or_medical_issues', 'additional_info_for_admin',
]


def record_profile_audit(user: CustomUser, changed_by: CustomUser | None, old_data: dict, new_data: dict):
    """Registra cambios en campos relevantes del perfil."""
    diffs = {}
    for field in PROFILE_AUDIT_FIELDS:
        old_val = old_data.get(field)
        new_val = new_data.get(field)
        if old_val != new_val:
            diffs[field] = {'old': old_val, 'new': new_val}
    if diffs:
        ProfileAuditLog.objects.create(
            user=user,
            changed_by=changed_by,
            changes=diffs,
        )

class AdminUserViewSet(viewsets.ModelViewSet):
    """ViewSet para gestión de usuarios por administradores"""
    queryset = User.objects.all()
    permission_classes = [IsAdminOrStaff]
    serializer_class = UserProfileSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        return AdminUserSerializer
    
    def create(self, request, *args, **kwargs):
        """Sobrescribir create para establecer role='basic' por defecto cuando se crea desde admin"""
        # Si no viene role en los datos, establecer 'basic' por defecto (no 'premium')
        if 'role' not in request.data or not request.data.get('role'):
            request.data['role'] = 'basic'
        
        # Pasar el request al contexto del serializer para que pueda verificar si es admin
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # El serializer ya maneja el mapeo de roles y la creación del usuario
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
    
    def update(self, request, *args, **kwargs):
        """Sobrescribir update para manejar el mapeo de roles"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        old_snapshot = model_to_dict(instance, fields=PROFILE_AUDIT_FIELDS)
        
        # El modelo ahora acepta directamente basic, pro, premium, admin
        # Mapear valores antiguos y variantes para compatibilidad
        if 'role' in request.data:
            role_mapping = {
                'MEMBER': 'basic',
                'member': 'basic',
                'TRAINER': 'pro',
                'trainer': 'pro',
                'ADMIN': 'admin',
            }
            frontend_role = request.data.get('role')
            frontend_role_lower = frontend_role.lower() if frontend_role else ''
            if frontend_role_lower in role_mapping:
                request.data['role'] = role_mapping[frontend_role_lower]
            elif frontend_role in role_mapping:
                request.data['role'] = role_mapping[frontend_role]
            # Si no está en el mapeo pero es un valor válido, dejarlo como está
        
        serializer = self.get_serializer(instance, data=request.data, partial=partial, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        # Registrar cambios de perfil
        updated_snapshot = model_to_dict(self.get_object(), fields=PROFILE_AUDIT_FIELDS)
        record_profile_audit(self.get_object(), request.user, old_snapshot, updated_snapshot)
        
        return Response(serializer.data)
    
    def get_queryset(self):
        """Filtrar usuarios según parámetros de búsqueda"""
        queryset = User.objects.all()
        
        # Filtros
        search = self.request.query_params.get('search', None)
        role = self.request.query_params.get('role', None)
        status = self.request.query_params.get('status', None)
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        
        if search:
            queryset = queryset.filter(
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )
        
        if role:
            queryset = queryset.filter(role=role)
        
        if status == 'active':
            queryset = queryset.filter(is_active=True)
        elif status == 'inactive':
            queryset = queryset.filter(is_active=False)
        
        if date_from:
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__gte=date_from_obj)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                queryset = queryset.filter(created_at__date__lte=date_to_obj)
            except ValueError:
                pass
        
        return queryset.order_by('-created_at')
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas generales de usuarios"""
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        inactive_users = User.objects.filter(is_active=False).count()
        
        # Usuarios por rol
        role_stats = User.objects.values('role').annotate(count=Count('role'))
        
        # Usuarios nuevos en los últimos 30 días
        thirty_days_ago = timezone.now() - timedelta(days=30)
        new_users = User.objects.filter(created_at__gte=thirty_days_ago).count()
        
        # Usuarios activos en los últimos 7 días (que han hecho login)
        seven_days_ago = timezone.now() - timedelta(days=7)
        recently_active = User.objects.filter(last_login__gte=seven_days_ago).count()
        
        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'staff_users': User.objects.filter(is_staff=True).count(),
            'superusers': User.objects.filter(is_superuser=True).count(),
            'new_users_last_7_days': User.objects.filter(created_at__gte=seven_days_ago).count(),
            'new_users_30_days': new_users,
            'recently_active_7_days': recently_active,
            'role_distribution': list(role_stats),
        })
    
    @action(detail=True, methods=['post'])
    def toggle_status(self, request, pk=None):
        """Activar/desactivar usuario"""
        user = self.get_object()
        user.is_active = not user.is_active
        user.save()
        
        status_text = 'activado' if user.is_active else 'desactivado'
        return Response({
            'message': f'Usuario {status_text} correctamente',
            'is_active': user.is_active
        })
    
    @action(detail=True, methods=['post'])
    def change_role(self, request, pk=None):
        """Cambiar rol del usuario"""
        user = self.get_object()
        new_role = request.data.get('role')
        
        # El modelo ahora acepta directamente basic, pro, premium, admin
        # Mapear valores antiguos y variantes para compatibilidad
        role_mapping = {
            'MEMBER': 'basic',
            'member': 'basic',
            'TRAINER': 'pro',
            'trainer': 'pro',
            'ADMIN': 'admin',
        }
        
        # Normalizar el rol
        new_role_lower = new_role.lower() if new_role else ''
        valid_roles = ['basic', 'pro', 'premium', 'admin']
        
        if new_role_lower not in valid_roles and new_role not in role_mapping:
            return Response(
                {'error': 'Rol inválido. Debe ser: basic, pro, premium o admin'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Mapear el rol (solo si es un valor antiguo o variante)
        backend_role = role_mapping.get(new_role_lower) or role_mapping.get(new_role) or new_role
        user.role = backend_role
        user.save()
        
        return Response({
            'message': f'Rol cambiado a {new_role} correctamente',
            'role': user.role,
            'role_display': user.get_role_display()
        })
    
    @action(detail=False, methods=['post'])
    def bulk_action(self, request):
        """Acciones masivas sobre usuarios seleccionados"""
        user_ids = request.data.get('user_ids', [])
        action_type = request.data.get('action')
        
        if not user_ids or not action_type:
            return Response(
                {'error': 'Se requieren user_ids y action'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(id__in=user_ids)
        
        if action_type == 'activate':
            users.update(is_active=True)
            message = f'{users.count()} usuarios activados'
        elif action_type == 'deactivate':
            users.update(is_active=False)
            message = f'{users.count()} usuarios desactivados'
        elif action_type == 'delete':
            count = users.count()
            users.delete()
            message = f'{count} usuarios eliminados'
        else:
            return Response(
                {'error': 'Acción no válida'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({'message': message})
    
    @action(detail=True, methods=['get'])
    def user_stats(self, request, pk=None):
        """Estadísticas específicas de un usuario"""
        user = self.get_object()
        
        # Aquí podrías agregar estadísticas de nutrición, entrenamientos, etc.
        # Por ahora, información básica
        stats = {
            'user_id': user.id,
            'email': user.email,
            'created_at': user.created_at,
            'last_login': user.last_login,
            'is_active': user.is_active,
            'role': user.role,
            # Agregar más estadísticas según sea necesario
        }
        
        return Response(stats)


@api_view(['GET'])
@permission_classes([IsAdminOrStaff])
def admin_user_profile_history(request, user_id: int):
    """
    Historial de cambios relevantes del perfil del usuario (campos críticos).
    Retorna los últimos 100 cambios con diffs simples.
    """
    try:
        user = get_object_or_404(User, pk=user_id)
        logs = ProfileAuditLog.objects.filter(user=user).select_related('changed_by').order_by('-created_at')[:100]
        history = []
        for log in logs:
            try:
                history.append({
                    "id": str(log.id),
                    "user_id": user.id,
                    "changed_by_email": log.changed_by.email if log.changed_by else None,
                    "created_at": log.created_at.isoformat() if hasattr(log.created_at, 'isoformat') else str(log.created_at),
                    "changes": log.changes if log.changes else {},
                })
            except Exception as e:
                # Si hay un error con un log específico, continuar con el siguiente
                continue

        return Response({
            "count": len(history),
            "history": history
        })
    except Exception as e:
        return Response({
            "error": str(e),
            "count": 0,
            "history": []
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['post'])
    def toggle_verification(self, request, pk=None):
        """Activar/desactivar verificación del usuario"""
        user = self.get_object()
        user.is_verified = not user.is_verified
        user.save()
        
        status_text = 'verificado' if user.is_verified else 'no verificado'
        return Response({
            'message': f'Usuario {status_text} correctamente',
            'is_verified': user.is_verified
        })
    
    @action(detail=True, methods=['post'])
    def change_status(self, request, pk=None):
        """Cambiar estado del usuario (activo/inactivo)"""
        user = self.get_object()
        new_status = request.data.get('is_active')
        
        if new_status is None:
            return Response(
                {'error': 'Se requiere el campo is_active'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.is_active = bool(new_status)
        user.save()
        
        status_text = 'activado' if user.is_active else 'desactivado'
        return Response({
            'message': f'Usuario {status_text} correctamente',
            'is_active': user.is_active
        })
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Resetear contraseña del usuario enviando contraseña temporal por email"""
        from django.core.mail import send_mail
        from django.conf import settings
        import string
        import secrets
        
        user = self.get_object()
        
        # Generar contraseña temporal (12 caracteres: mayúsculas, minúsculas, números)
        alphabet = string.ascii_letters + string.digits
        # Asegurar al menos una mayúscula, una minúscula y un número
        temp_password = ''.join(secrets.choice(string.ascii_uppercase) for _ in range(1))
        temp_password += ''.join(secrets.choice(string.ascii_lowercase) for _ in range(1))
        temp_password += ''.join(secrets.choice(string.digits) for _ in range(1))
        temp_password += ''.join(secrets.choice(alphabet) for _ in range(9))  # 9 más para total de 12
        # Mezclar los caracteres
        temp_password_list = list(temp_password)
        secrets.SystemRandom().shuffle(temp_password_list)
        temp_password = ''.join(temp_password_list)
        
        # Establecer la contraseña temporal
        user.set_password(temp_password)
        user.must_change_password = True
        user.temporary_password_used = False
        user.password_reset_token = None
        user.password_reset_expires = None
        user.save()
        
        # Enviar email con contraseña temporal
        subject = "Contraseña Temporal - Nex-Fit (Administrador)"
        message = f"""
Hola {user.first_name or user.email},

Un administrador ha reseteado tu contraseña.

Tu contraseña temporal es: {temp_password}

IMPORTANTE:
- Esta contraseña solo puede usarse UNA VEZ
- Después de iniciar sesión, deberás establecer una nueva contraseña
- Esta contraseña expira en 24 horas

Si no solicitaste este reset, contacta con soporte inmediatamente.

Saludos,
Equipo Nex-Fit
        """
        
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception as e:
            return Response(
                {'error': f'Error enviando email: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
        return Response({
            'message': f'Contraseña temporal enviada por email a {user.email}'
        })
    
    @action(detail=False, methods=['post'])
    def bulk_change_role(self, request):
        """Cambiar rol de múltiples usuarios"""
        user_ids = request.data.get('user_ids', [])
        new_role = request.data.get('role')
        
        if not user_ids:
            return Response(
                {'error': 'Se requieren user_ids'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if new_role not in ['basic', 'pro', 'premium', 'admin']:
            return Response(
                {'error': 'Rol inválido. Debe ser: basic, pro, premium o admin'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_count = User.objects.filter(id__in=user_ids).update(role=new_role)
        
        return Response({
            'message': f'{updated_count} usuarios actualizados con rol {new_role}',
            'updated_count': updated_count
        })
    
    @action(detail=False, methods=['post'])
    def bulk_toggle_verification(self, request):
        """Activar/desactivar verificación de múltiples usuarios"""
        user_ids = request.data.get('user_ids', [])
        is_verified = request.data.get('is_verified')
        
        if not user_ids:
            return Response(
                {'error': 'Se requieren user_ids'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if is_verified is None:
            return Response(
                {'error': 'Se requiere el campo is_verified'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        updated_count = User.objects.filter(id__in=user_ids).update(is_verified=bool(is_verified))
        
        status_text = 'verificados' if is_verified else 'no verificados'
        return Response({
            'message': f'{updated_count} usuarios {status_text}',
            'updated_count': updated_count
        })
