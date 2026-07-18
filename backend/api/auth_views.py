# api/auth_views.py
import logging
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.renderers import JSONRenderer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.crypto import get_random_string
from django.utils import timezone
from django.conf import settings
from datetime import timedelta
from urllib.parse import urlencode
import json

from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework_simplejwt.tokens import RefreshToken

from drf_spectacular.utils import extend_schema, OpenApiExample

from .auth_serializers import EmailTokenObtainPairSerializer, UserRegistrationSerializer, PasswordChangeSerializer
from .jwt_cookies import (
    REFRESH_COOKIE,
    clear_jwt_cookies,
    set_jwt_cookies,
)

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
        from .jwt_blacklist_recovery import call_with_jwt_blacklist_recovery

        def execute_login():
            return super(LoginView, self).post(request, *args, **kwargs)

        response = call_with_jwt_blacklist_recovery(execute_login)
        
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
                pass

            # HttpOnly cookies for browser clients (tokens also remain in JSON for scripts).
            access = response.data.get("access")
            refresh = response.data.get("refresh")
            if access and refresh:
                remember = bool(request.data.get("remember_me", True))
                csrf = set_jwt_cookies(
                    response,
                    access=access,
                    refresh=refresh,
                    remember=remember,
                )
                response.data["csrf"] = csrf

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

    def post(self, request, *args, **kwargs):
        from .jwt_blacklist_recovery import call_with_jwt_blacklist_recovery

        payload = {}
        try:
            payload = dict(request.data)
        except Exception:
            payload = {}
        refresh = payload.get("refresh") or request.COOKIES.get(REFRESH_COOKIE)
        if not refresh:
            return Response(
                {"detail": "No refresh token provided.", "code": "token_not_provided"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request._full_data = {**payload, "refresh": refresh}

        def execute_refresh():
            return super(RefreshView, self).post(request, *args, **kwargs)

        response = call_with_jwt_blacklist_recovery(execute_refresh)
        if getattr(response, "status_code", None) == 200 and hasattr(response, "data"):
            access = response.data.get("access")
            new_refresh = response.data.get("refresh") or refresh
            if access and new_refresh:
                csrf = set_jwt_cookies(
                    response,
                    access=access,
                    refresh=new_refresh,
                    remember=True,
                )
                response.data["csrf"] = csrf
        return response


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
        refresh = request.data.get("refresh") or request.COOKIES.get(REFRESH_COOKIE)
        if not refresh:
            response = Response(
                {"detail": "refresh token requerido"},
                status=status.HTTP_400_BAD_REQUEST,
            )
            clear_jwt_cookies(response)
            return response
        try:
            token = RefreshToken(refresh)
            token.blacklist()
        except Exception:
            response = Response(
                {"detail": "token inválido"},
                status=status.HTTP_400_BAD_REQUEST,
            )
            clear_jwt_cookies(response)
            return response
        # 205 Reset Content: indica al cliente que restablezca el estado de la vista
        response = Response(status=status.HTTP_205_RESET_CONTENT)
        clear_jwt_cookies(response)
        return response


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

                try:
                    send_mail(
                        subject="¡Bienvenido/a a NexFit365!",
                        message=(
                            f"Hola {user.first_name or user.email},\n\n"
                            f"Tu cuenta en NexFit365 ha sido creada con éxito.\n\n"
                            f"Ya puedes iniciar sesión y empezar a gestionar tu entrenamiento y nutrición.\n\n"
                            f"Si necesitas ayuda, no dudes en contactarnos.\n\n"
                            f"¡Mucho ánimo!\nEl equipo de NexFit365"
                        ),
                        from_email=settings.DEFAULT_FROM_EMAIL,
                        recipient_list=[user.email],
                        fail_silently=True,
                    )
                    logger.info("✅ Email de bienvenida enviado a %s", user.email)
                except Exception as e:
                    logger.warning(
                        "⚠️ No se pudo enviar email de bienvenida a %s: %s",
                        user.email,
                        e,
                    )

                
                requested_role = str(request.data.get("role", "")).lower()
                response_role = "member" if requested_role == "member" else user.role

                access = str(refresh.access_token)
                refresh_str = str(refresh)
                response = Response({
                    "detail": "Usuario registrado exitosamente",
                    "user": {
                        "id": str(user.id),
                        "email": user.email,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "role": response_role,
                        "is_active": user.is_active,
                    },
                    "access": access,
                    "refresh": refresh_str,
                }, status=status.HTTP_201_CREATED)
                csrf = set_jwt_cookies(
                    response,
                    access=access,
                    refresh=refresh_str,
                    remember=True,
                )
                response.data["csrf"] = csrf
                return response
            except Exception:
                logger.exception("Error al crear usuario en registro público")
                return Response({
                    "detail": "Error al crear usuario",
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
            
            token = user.generate_password_reset_token()
            reset_url = f"{settings.FRONTEND_URL}/auth/reset-password?{urlencode({'token': token})}"

            subject = "Recupera tu contraseña - NexFit365"
            message = f"""
Hola {user.first_name or user.email},

Hemos recibido una solicitud para recuperar tu contraseña.

Para crear una nueva contraseña, abre este enlace:

{reset_url}

El enlace caduca en 24 horas.

Si no solicitaste este reset, contacta con soporte inmediatamente.

Saludos,
Equipo NexFit365
            """
            
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                logger.info("✅ Email de reset de contraseña enviado a %s", user.email)
            except Exception as e:
                # Log del error pero no fallar la request (el usuario no debe saber si el email existe)
                logger.error(
                    "❌ Error enviando email de reset a %s: %s — host=%s port=%s",
                    user.email,
                    e,
                    getattr(settings, 'EMAIL_HOST', ''),
                    getattr(settings, 'EMAIL_PORT', ''),
                )
            
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
