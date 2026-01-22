# api/auth_views.py
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.renderers import JSONRenderer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
import json

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from drf_spectacular.utils import extend_schema, OpenApiExample

from .auth_serializers import EmailTokenObtainPairSerializer, UserRegistrationSerializer, PasswordChangeSerializer

User = get_user_model()


@extend_schema(
    tags=["Auth"],
    summary="Login (email + password) → JWT",
    description="Devuelve tokens `access` y `refresh` usando email + password.",
    examples=[
        OpenApiExample(
            "Ejemplo de request",
            value={"email": "usuario@dominio.com", "password": "TuPassword123"},
            request_only=True,
        ),
        OpenApiExample(
            "Ejemplo de response",
            value={
                "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            },
            response_only=True,
        ),
    ],
)
class LoginView(TokenObtainPairView):
    """
    Login por email/password.
    - Sin autenticación previa (AllowAny).
    - Con throttling específico (scope='login') si lo configuraste en DRF.
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()
    serializer_class = EmailTokenObtainPairSerializer
    # Asegurar que acepte JSON explícitamente
    renderer_classes = [JSONRenderer]

    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "login"

    # (usamos el post del padre; el decorador documenta la ruta)
    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        
        # Si el login fue exitoso, agregar información del usuario
        if response.status_code == 200:
            user = None
            try:
                # Obtener el usuario del serializer
                serializer = self.get_serializer(data=request.data)
                if serializer.is_valid():
                    user = serializer.user
                    
                    # Verificar si el usuario usó contraseña temporal
                    if user.temporary_password_used and not user.must_change_password:
                        # Marcar que debe cambiar contraseña
                        user.must_change_password = True
                        user.save()
            except Exception as e:
                # Si hay error obteniendo el usuario del serializer, intentar del token
                import traceback
                traceback.print_exc()
            
            # Si no se obtuvo el usuario del serializer, intentar del token
            if not user and hasattr(response, 'data') and 'access' in response.data:
                try:
                    from rest_framework_simplejwt.tokens import UntypedToken
                    from rest_framework_simplejwt.exceptions import InvalidToken
                    token = response.data['access']
                    decoded_token = UntypedToken(token)
                    user_id = decoded_token.get('user_id')
                    if user_id:
                        user = User.objects.get(id=user_id)
                except (InvalidToken, User.DoesNotExist, Exception) as token_error:
                    import traceback
                    traceback.print_exc()
            
            # Agregar información del usuario a la respuesta si se obtuvo
            if user:
                try:
                    response.data['user'] = {
                        'id': str(user.id),
                        'email': user.email,
                        'first_name': user.first_name or '',
                        'last_name': user.last_name or '',
                        'role': getattr(user, 'role', 'basic'),
                        'is_staff': user.is_staff,
                        'is_superuser': user.is_superuser,
                        'is_active': user.is_active,
                        'is_verified': getattr(user, 'is_verified', False),
                        'date_joined': user.date_joined.isoformat() if user.date_joined else None,
                        'last_login': user.last_login.isoformat() if user.last_login else None,
                        'phone': getattr(user, 'phone', None),
                        'date_of_birth': user.date_of_birth.isoformat() if hasattr(user, 'date_of_birth') and user.date_of_birth else None,
                        'gender': getattr(user, 'gender', None),
                        'height': getattr(user, 'height', None),
                        'weight': getattr(user, 'weight', None),
                        'activity_level': getattr(user, 'activity_level', None),
                        'fitness_goal': getattr(user, 'fitness_goal', None),
                        'medical_conditions': getattr(user, 'medical_conditions', None),
                        'emergency_contact_name': getattr(user, 'emergency_contact_name', None),
                        'emergency_contact_phone': getattr(user, 'emergency_contact_phone', None),
                        'must_change_password': getattr(user, 'must_change_password', False),
                    }
                    
                    # Si el usuario debe cambiar contraseña, agregar flag en la respuesta
                    if getattr(user, 'must_change_password', False):
                        response.data['must_change_password'] = True
                except Exception as user_error:
                    import traceback
                    traceback.print_exc()
            else:
        
        return response


@extend_schema(
    tags=["Auth"],
    summary="Refresh → nuevo access",
    description="Recibe `refresh` y devuelve un nuevo `access`.",
    examples=[
        OpenApiExample(
            "Ejemplo de request",
            value={"refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
            request_only=True,
        ),
        OpenApiExample(
            "Ejemplo de response",
            value={"access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
            response_only=True,
        ),
    ],
)
class RefreshView(TokenRefreshView):
    permission_classes = (AllowAny,)
    authentication_classes = ()


@extend_schema(
    tags=["Auth"],
    summary="Logout (blacklist refresh)",
    description="Invalidar (blacklistear) el token `refresh` para cerrar sesión en el dispositivo actual.",
    examples=[
        OpenApiExample(
            "Ejemplo de request",
            value={"refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."},
            request_only=True,
        ),
        OpenApiExample(
            "Ejemplo de response (sin contenido)",
            value={},
            response_only=True,
        ),
    ],
)
class LogoutView(APIView):
    """
    Logout: recibe 'refresh' y lo envía a la blacklist.
    Requiere tener instalada y en INSTALLED_APPS:
        'rest_framework_simplejwt.token_blacklist'
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response({"detail": "refresh token requerido"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except Exception:
            return Response({"detail": "token inválido"}, status=status.HTTP_400_BAD_REQUEST)
        # 205 Reset Content: indica al cliente que restablezca el estado de la vista
        return Response(status=status.HTTP_205_RESET_CONTENT)


@extend_schema(
    tags=["Auth"],
    summary="Registro de usuario",
    description="Crea un nuevo usuario con email y password.",
    examples=[
        OpenApiExample(
            "Ejemplo de request",
            value={
                "email": "nuevo@usuario.com",
                "password": "Password123!",
                "password_confirm": "Password123!",
                "first_name": "Juan",
                "last_name": "Pérez",
                "role": "MEMBER"
            },
            request_only=True,
        ),
        OpenApiExample(
            "Ejemplo de response",
            value={
                "id": "uuid-del-usuario",
                "email": "nuevo@usuario.com",
                "first_name": "Juan",
                "last_name": "Pérez",
                "role": "MEMBER",
                "is_active": True,
                "created_at": "2025-01-01T00:00:00Z"
            },
            response_only=True,
        ),
    ],
)
class RegisterView(APIView):
    """
    Registro de nuevos usuarios.
    - Sin autenticación previa (AllowAny).
    - Con throttling específico (scope='register').
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "register"

    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                user = serializer.save()
                
                # Generar tokens JWT para login automático
                from rest_framework_simplejwt.tokens import RefreshToken
                refresh = RefreshToken.for_user(user)
                
                return Response({
                    "detail": "Usuario registrado exitosamente",
                    "user": {
                        "id": str(user.id),
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "role": user.role,
                        "is_staff": user.is_staff,
                        "is_superuser": user.is_superuser,
                        "is_active": user.is_active,
                        "is_verified": user.is_verified,
                        "date_joined": user.date_joined.isoformat(),
                        "last_login": user.last_login.isoformat() if user.last_login else None,
                        "phone": user.phone_number,
                        "birth_date": user.birth_date.isoformat() if user.birth_date else None,
                        "gender": user.gender,
                        "height": user.height,
                        "weight": user.weight,
                        "activity_level": user.activity_level,
                        "fitness_goals": user.fitness_goals,
                    },
                    "access": str(refresh.access_token),
                    "refresh": str(refresh)
                }, status=status.HTTP_201_CREATED)
            except Exception as e:
                import traceback
                error_trace = traceback.format_exc()
                return Response({
                    "detail": "Error al crear usuario",
                    "error": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=["Auth"],
    summary="Solicitar reset de contraseña",
    description="Envía email con link para resetear contraseña.",
    examples=[
        OpenApiExample(
            "Ejemplo de request",
            value={"email": "usuario@dominio.com"},
            request_only=True,
        ),
        OpenApiExample(
            "Ejemplo de response",
            value={"detail": "Si el email existe, se ha enviado un link de reset"},
            response_only=True,
        ),
    ],
)
class ForgotPasswordView(APIView):
    """
    Solicitar reset de contraseña.
    - Sin autenticación previa (AllowAny).
    - Con throttling específico (scope='forgot_password').
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "forgot_password"

    def post(self, request):
        email = request.data.get("email")
        if not email:
            return Response({"detail": "email requerido"}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Buscar usuario
            try:
                user = User.objects.get(email=email.lower())
            except User.DoesNotExist:
                # Por seguridad, no revelamos si el email existe o no
                return Response({
                    "detail": "Si el email existe, se ha enviado un link de reset"
                }, status=status.HTTP_200_OK)
            
            # Generar contraseña temporal (12 caracteres: mayúsculas, minúsculas, números)
            import string
            import secrets
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
            subject = "Contraseña Temporal - Nex-Fit"
            message = f"""
Hola {user.first_name or user.email},

Has solicitado resetear tu contraseña.

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
                # Log del error pero no fallar la request
            
            return Response({
                "detail": "Si el email existe, se ha enviado un link de reset"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "detail": "Error procesando la solicitud",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=["Auth"],
    summary="Reset de contraseña",
    description="Resetea la contraseña usando el token enviado por email.",
    examples=[
        OpenApiExample(
            "Ejemplo de request",
            value={
                "token": "token-del-email",
                "new_password": "NuevaPassword123!",
                "new_password_confirm": "NuevaPassword123!"
            },
            request_only=True,
        ),
        OpenApiExample(
            "Ejemplo de response",
            value={"detail": "Contraseña actualizada exitosamente"},
            response_only=True,
        ),
    ],
)
class ResetPasswordView(APIView):
    """
    Reset de contraseña usando token.
    - Sin autenticación previa (AllowAny).
    - Con throttling específico (scope='reset_password').
    """
    permission_classes = (AllowAny,)
    authentication_classes = ()
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "reset_password"

    def post(self, request):
        token = request.data.get("token")
        new_password = request.data.get("new_password")
        new_password_confirm = request.data.get("new_password_confirm")
        
        if not all([token, new_password, new_password_confirm]):
            return Response({
                "detail": "token, new_password y new_password_confirm son requeridos"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if new_password != new_password_confirm:
            return Response({
                "detail": "Las contraseñas no coinciden"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Buscar usuario por token
            try:
                user = User.objects.get(
                    password_reset_token=token,
                    password_reset_expires__gt=timezone.now()
                )
            except User.DoesNotExist:
                return Response({
                    "detail": "Token inválido o expirado"
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Validar nueva contraseña
            try:
                validate_password(new_password, user)
            except ValidationError as e:
                return Response({
                    "detail": "Contraseña no válida",
                    "errors": list(e.messages)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Actualizar contraseña
            user.set_password(new_password)
            user.password_reset_token = None
            user.password_reset_expires = None
            user.save()
            
            # Invalidar todos los tokens JWT del usuario
            try:
                from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
                OutstandingToken.objects.filter(user=user).delete()
            except:
                pass  # Si no está disponible el blacklist
            
            return Response({
                "detail": "Contraseña actualizada exitosamente"
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "detail": "Error procesando el reset",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@extend_schema(
    tags=["Auth"],
    summary="Cambiar contraseña",
    description="Cambia la contraseña del usuario autenticado.",
    examples=[
        OpenApiExample(
            "Ejemplo de request",
            value={
                "current_password": "PasswordActual123!",
                "new_password": "NuevaPassword123!",
                "new_password_confirm": "NuevaPassword123!"
            },
            request_only=True,
        ),
        OpenApiExample(
            "Ejemplo de response",
            value={"detail": "Contraseña actualizada exitosamente"},
            response_only=True,
        ),
    ],
)
class ChangePasswordView(APIView):
    """
    Cambiar contraseña del usuario autenticado.
    - Requiere autenticación.
    - Con throttling específico (scope='change_password').
    """
    permission_classes = (IsAuthenticated,)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "change_password"

    def post(self, request):
        serializer = PasswordChangeSerializer(data=request.data, context={'user': request.user})
        if serializer.is_valid():
            try:
                serializer.save()
                # Limpiar flags de contraseña temporal
                user = request.user
                user.must_change_password = False
                user.temporary_password_used = False
                user.save()
                return Response({
                    "detail": "Contraseña actualizada exitosamente"
                }, status=status.HTTP_200_OK)
            except Exception as e:
                return Response({
                    "detail": "Error al actualizar contraseña",
                    "error": str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@extend_schema(
    tags=["Auth"],
    summary="Cambiar contraseña después de usar temporal",
    description="Cambia la contraseña después de haber usado una contraseña temporal. Requiere autenticación y que el usuario tenga must_change_password=True.",
    examples=[
        OpenApiExample(
            "Ejemplo de request",
            value={
                "new_password": "NuevaPassword123!",
                "new_password_confirm": "NuevaPassword123!"
            },
            request_only=True,
        ),
        OpenApiExample(
            "Ejemplo de response",
            value={"detail": "Contraseña actualizada exitosamente"},
            response_only=True,
        ),
    ],
)
class ChangePasswordAfterTemporaryView(APIView):
    """
    Cambiar contraseña después de usar contraseña temporal.
    - Requiere autenticación.
    - Solo funciona si el usuario tiene must_change_password=True.
    """
    permission_classes = (IsAuthenticated,)
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "change_password"

    def post(self, request):
        user = request.user
        
        # Verificar que el usuario debe cambiar contraseña
        if not user.must_change_password:
            return Response({
                "detail": "No se requiere cambio de contraseña"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        new_password = request.data.get("new_password")
        new_password_confirm = request.data.get("new_password_confirm")
        
        if not all([new_password, new_password_confirm]):
            return Response({
                "detail": "new_password y new_password_confirm son requeridos"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if new_password != new_password_confirm:
            return Response({
                "detail": "Las contraseñas no coinciden"
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            # Validar nueva contraseña
            try:
                validate_password(new_password, user)
            except ValidationError as e:
                return Response({
                    "detail": "Contraseña no válida",
                    "errors": list(e.messages)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Actualizar contraseña
            user.set_password(new_password)
            user.must_change_password = False
            user.temporary_password_used = False
            user.save()
            
            # Invalidar todos los tokens JWT del usuario para forzar nuevo login
            try:
                from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
                OutstandingToken.objects.filter(user=user).delete()
            except:
                pass  # Si no está disponible el blacklist
            
            return Response({
                "detail": "Contraseña actualizada exitosamente. Por favor, inicia sesión nuevamente."
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({
                "detail": "Error procesando el cambio de contraseña",
                "error": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
