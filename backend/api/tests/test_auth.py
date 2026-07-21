"""
Tests para endpoints de autenticación
"""
import pytest
from django.core import mail
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user_data():
    return {
        "email": "test@example.com",
        "password": "TestPass123!",
        "password_confirm": "TestPass123!",
        "first_name": "Test",
        "last_name": "User",
        "role": "member"
    }


@pytest.fixture
def admin_user():
    user = User.objects.create_user(
        email="admin@example.com",
        password="AdminPass123!",
        role="ADMIN",
        is_staff=True
    )
    return user


@pytest.fixture
def regular_user():
    user = User.objects.create_user(
        email="user@example.com",
        password="UserPass123!",
        role="MEMBER"
    )
    return user


@pytest.mark.django_db
class TestUserRegistration:
    """Tests para el endpoint de registro de usuarios"""

    def test_register_user_success(self, api_client, user_data):
        """Test de registro exitoso de usuario"""
        url = reverse("auth-register")
        response = api_client.post(url, user_data)
        
        assert response.status_code == status.HTTP_201_CREATED
        assert "user" in response.data
        assert response.data["user"]["email"] == user_data["email"]
        assert response.data["user"]["first_name"] == user_data["first_name"]
        # RegisterView may echo "member" when requested; DB role is always basic.
        assert response.data["user"]["role"] in ("member", "basic")
        
        # Verificar que el usuario se creó en la base de datos
        user = User.objects.get(email=user_data["email"])
        assert user.check_password(user_data["password"])
        assert user.is_active is True
        assert user.role == "basic"

    def test_register_cannot_self_assign_admin(self, api_client, user_data):
        """Public registration must reject self-assigned admin role."""
        user_data = {**user_data, "email": "evil-admin@example.com", "role": "admin"}
        url = reverse("auth-register")
        response = api_client.post(url, user_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "role" in response.data
        assert not User.objects.filter(email=user_data["email"]).exists()

    def test_register_cannot_self_assign_premium(self, api_client, user_data):
        """Public registration must reject self-assigned premium role."""
        user_data = {**user_data, "email": "evil-premium@example.com", "role": "premium"}
        url = reverse("auth-register")
        response = api_client.post(url, user_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "role" in response.data
        assert not User.objects.filter(email=user_data["email"]).exists()

    def test_register_cannot_self_assign_pro(self, api_client, user_data):
        """Public registration must reject self-assigned pro role."""
        user_data = {**user_data, "email": "evil-pro@example.com", "role": "pro"}
        url = reverse("auth-register")
        response = api_client.post(url, user_data)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "role" in response.data
        assert not User.objects.filter(email=user_data["email"]).exists()

    def test_register_user_duplicate_email(self, api_client, user_data):
        """Test de registro con email duplicado"""
        # Crear usuario primero
        User.objects.create_user(
            email=user_data["email"],
            password="otherpass",
            role="MEMBER"
        )
        
        url = reverse("auth-register")
        response = api_client.post(url, user_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data

    def test_register_user_password_mismatch(self, api_client, user_data):
        """Test de registro con contraseñas que no coinciden"""
        user_data["password_confirm"] = "DifferentPass123!"
        
        url = reverse("auth-register")
        response = api_client.post(url, user_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password_confirm" in response.data

    def test_register_user_weak_password(self, api_client, user_data):
        """Test de registro con contraseña débil"""
        user_data["password"] = "123"
        user_data["password_confirm"] = "123"
        
        url = reverse("auth-register")
        response = api_client.post(url, user_data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "password" in response.data

    def test_register_user_missing_fields(self, api_client):
        """Test de registro con campos faltantes"""
        url = reverse("auth-register")
        response = api_client.post(url, {})
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "email" in response.data
        assert "password" in response.data

    def test_register_create_failure_does_not_leak_exception(self, api_client, user_data, monkeypatch):
        """500 on create must not echo internal exception text to the client."""
        from api import auth_serializers

        def boom(*args, **kwargs):
            raise RuntimeError("SENSITIVE_INTERNAL_DETAIL_xyz")

        monkeypatch.setattr(
            auth_serializers.UserRegistrationSerializer,
            "save",
            boom,
        )
        url = reverse("auth-register")
        response = api_client.post(url, user_data)
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
        assert response.data.get("detail") == "Error al crear usuario"
        assert "error" not in response.data
        assert "SENSITIVE_INTERNAL_DETAIL_xyz" not in str(response.data)


@pytest.mark.django_db
class TestUserLogin:
    """Tests para el endpoint de login de usuarios"""

    def test_login_user_success(self, api_client, regular_user):
        """Test de login exitoso"""
        url = reverse("auth-login")
        data = {
            "email": "user@example.com",
            "password": "UserPass123!"
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_login_sets_httponly_cookies(self, api_client, regular_user):
        url = reverse("auth-login")
        response = api_client.post(
            url,
            {"email": "user@example.com", "password": "UserPass123!"},
            HTTP_X_AUTH_MODE="cookie",
        )
        assert response.status_code == status.HTTP_200_OK
        assert "csrf" in response.data
        assert "access" not in response.data
        assert "refresh" not in response.data
        assert "accessToken" in response.cookies
        assert response.cookies["accessToken"]["httponly"] is True
        assert "refreshToken" in response.cookies
        assert response.cookies["refreshToken"]["httponly"] is True
        assert "csrfToken" in response.cookies

    def test_login_without_cookie_mode_keeps_tokens_in_body(self, api_client, regular_user):
        url = reverse("auth-login")
        response = api_client.post(
            url,
            {"email": "user@example.com", "password": "UserPass123!"},
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data
        assert "accessToken" in response.cookies

    def test_cookie_auth_authenticated_me(self, api_client, regular_user):
        login = api_client.post(
            reverse("auth-login"),
            {"email": "user@example.com", "password": "UserPass123!"},
        )
        assert login.status_code == status.HTTP_200_OK
        api_client.credentials()  # clear any forced auth
        api_client.cookies = login.cookies
        me = api_client.get(reverse("me"))
        assert me.status_code == status.HTTP_200_OK

    def test_refresh_from_cookie_without_body(self, api_client, regular_user):
        login = api_client.post(
            reverse("auth-login"),
            {"email": "user@example.com", "password": "UserPass123!"},
        )
        api_client.cookies = login.cookies
        csrf = login.data.get("csrf") or login.cookies.get("csrfToken").value
        response = api_client.post(
            reverse("auth-refresh"),
            {},
            format="json",
            HTTP_X_CSRFTOKEN=csrf,
        )
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_logout_clears_cookies(self, api_client, regular_user):
        login = api_client.post(
            reverse("auth-login"),
            {"email": "user@example.com", "password": "UserPass123!"},
        )
        api_client.cookies = login.cookies
        csrf = login.data.get("csrf") or login.cookies.get("csrfToken").value
        response = api_client.post(
            reverse("auth-logout"),
            {},
            format="json",
            HTTP_X_CSRFTOKEN=csrf,
        )
        assert response.status_code == status.HTTP_205_RESET_CONTENT
        # Cleared cookies are typically max-age=0 / empty
        assert "accessToken" in response.cookies

    def test_login_normalizes_email_case_and_spaces(self, api_client, regular_user):
        """Test de login tolerante a mayúsculas/autocapitalización móvil"""
        url = reverse("auth-login")
        data = {
            "email": " User@Example.com ",
            "password": "UserPass123!"
        }
        response = api_client.post(url, data)

        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data
        assert "refresh" in response.data

    def test_login_user_invalid_credentials(self, api_client):
        """Test de login con credenciales inválidas"""
        url = reverse("auth-login")
        data = {
            "email": "nonexistent@example.com",
            "password": "wrongpass"
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_user_inactive(self, api_client):
        """Test de login con usuario inactivo"""
        user = User.objects.create_user(
            email="inactive@example.com",
            password="Pass123!",
            is_active=False
        )
        
        url = reverse("auth-login")
        data = {
            "email": "inactive@example.com",
            "password": "Pass123!"
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestTokenRefresh:
    """Tests para el endpoint de refresh de tokens"""

    def test_refresh_token_success(self, api_client, regular_user):
        """Test de refresh exitoso de token"""
        # Obtener token inicial
        refresh = RefreshToken.for_user(regular_user)
        
        url = reverse("auth-refresh")
        data = {"refresh": str(refresh)}
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert "access" in response.data

    def test_refresh_token_invalid(self, api_client):
        """Test de refresh con token inválido"""
        url = reverse("auth-refresh")
        data = {"refresh": "invalid_token"}
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestUserLogout:
    """Tests para el endpoint de logout de usuarios"""

    def test_logout_success(self, api_client, regular_user):
        """Test de logout exitoso"""
        refresh = RefreshToken.for_user(regular_user)
        
        url = reverse("auth-logout")
        data = {"refresh": str(refresh)}
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_205_RESET_CONTENT

    def test_logout_missing_token(self, api_client):
        """Test de logout sin token"""
        url = reverse("auth-logout")
        response = api_client.post(url, {})
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestForgotPassword:
    """Tests para el endpoint de solicitar reset de contraseña"""

    def test_forgot_password_success(self, api_client, regular_user):
        """Test de solicitud exitosa de reset"""
        url = reverse("auth-forgot-password")
        data = {"email": "user@example.com"}
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert "detail" in response.data
        
        # Verificar que se generó el token
        regular_user.refresh_from_db()
        assert regular_user.password_reset_token is not None
        assert regular_user.password_reset_expires is not None

    @override_settings(
        FRONTEND_URL="https://nexfit365.dpdns.org",
        EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    )
    def test_forgot_password_email_uses_frontend_url(self, api_client, regular_user):
        url = reverse("auth-forgot-password")

        response = api_client.post(url, {"email": "user@example.com"})

        assert response.status_code == status.HTTP_200_OK
        assert len(mail.outbox) == 1
        regular_user.refresh_from_db()
        expected_url = f"https://nexfit365.dpdns.org/auth/reset-password?token={regular_user.password_reset_token}"
        assert expected_url in mail.outbox[0].body

    def test_forgot_password_nonexistent_email(self, api_client):
        """Test de solicitud con email inexistente"""
        url = reverse("auth-forgot-password")
        data = {"email": "nonexistent@example.com"}
        response = api_client.post(url, data)
        
        # Por seguridad, debe devolver el mismo mensaje
        assert response.status_code == status.HTTP_200_OK
        assert "detail" in response.data

    def test_forgot_password_missing_email(self, api_client):
        """Test de solicitud sin email"""
        url = reverse("auth-forgot-password")
        response = api_client.post(url, {})
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestResetPassword:
    """Tests para el endpoint de reset de contraseña"""

    def test_reset_password_success(self, api_client, regular_user):
        """Test de reset exitoso de contraseña"""
        # Generar token de reset
        token = regular_user.generate_password_reset_token()
        
        url = reverse("auth-reset-password")
        data = {
            "token": token,
            "new_password": "NewPass123!",
            "new_password_confirm": "NewPass123!"
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert "detail" in response.data
        
        # Verificar que la contraseña se cambió
        regular_user.refresh_from_db()
        assert regular_user.check_password("NewPass123!")
        assert regular_user.password_reset_token is None

    def test_reset_password_invalid_token(self, api_client):
        """Test de reset con token inválido"""
        url = reverse("auth-reset-password")
        data = {
            "token": "invalid_token",
            "new_password": "NewPass123!",
            "new_password_confirm": "NewPass123!"
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reset_password_expired_token(self, api_client, regular_user):
        """Test de reset con token expirado"""
        # Generar token y hacerlo expirar
        token = regular_user.generate_password_reset_token()
        regular_user.password_reset_expires = regular_user.password_reset_expires.replace(year=2020)
        regular_user.save()
        
        url = reverse("auth-reset-password")
        data = {
            "token": token,
            "new_password": "NewPass123!",
            "new_password_confirm": "NewPass123!"
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_reset_password_password_mismatch(self, api_client, regular_user):
        """Test de reset con contraseñas que no coinciden"""
        token = regular_user.generate_password_reset_token()
        
        url = reverse("auth-reset-password")
        data = {
            "token": token,
            "new_password": "NewPass123!",
            "new_password_confirm": "DifferentPass123!"
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestChangePassword:
    """Tests para el endpoint de cambio de contraseña"""

    def test_change_password_success(self, api_client, regular_user):
        """Test de cambio exitoso de contraseña"""
        # Autenticar usuario
        refresh = RefreshToken.for_user(regular_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        url = reverse("auth-change-password")
        data = {
            "current_password": "UserPass123!",
            "new_password": "NewPass123!",
            "new_password_confirm": "NewPass123!"
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_200_OK
        assert "detail" in response.data
        
        # Verificar que la contraseña se cambió
        regular_user.refresh_from_db()
        assert regular_user.check_password("NewPass123!")

    def test_change_password_wrong_current_password(self, api_client, regular_user):
        """Test de cambio con contraseña actual incorrecta"""
        refresh = RefreshToken.for_user(regular_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        url = reverse("auth-change-password")
        data = {
            "current_password": "WrongPass123!",
            "new_password": "NewPass123!",
            "new_password_confirm": "NewPass123!"
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "current_password" in response.data

    def test_change_password_password_mismatch(self, api_client, regular_user):
        """Test de cambio con contraseñas que no coinciden"""
        refresh = RefreshToken.for_user(regular_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        url = reverse("auth-change-password")
        data = {
            "current_password": "UserPass123!",
            "new_password": "NewPass123!",
            "new_password_confirm": "DifferentPass123!"
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_change_password_same_password(self, api_client, regular_user):
        """Test de cambio con la misma contraseña"""
        refresh = RefreshToken.for_user(regular_user)
        api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh.access_token}")
        
        url = reverse("auth-change-password")
        data = {
            "current_password": "UserPass123!",
            "new_password": "UserPass123!",
            "new_password_confirm": "UserPass123!"
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "new_password" in response.data

    def test_change_password_unauthenticated(self, api_client):
        """Test de cambio sin autenticación"""
        url = reverse("auth-change-password")
        data = {
            "current_password": "OldPass123!",
            "new_password": "NewPass123!",
            "new_password_confirm": "NewPass123!"
        }
        response = api_client.post(url, data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
class TestThrottling:
    """Tests para verificar el throttling de endpoints"""

    def test_register_throttling(self, api_client, user_data):
        """Test de throttling en registro"""
        url = reverse("auth-register")
        
        # Intentar registrar más de 3 veces por minuto
        for i in range(4):
            user_data["email"] = f"user{i}@example.com"
            response = api_client.post(url, user_data)
            
            if i < 3:
                assert response.status_code in [status.HTTP_201_CREATED, status.HTTP_400_BAD_REQUEST]
            else:
                # La cuarta vez debe ser throttled
                assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS

    def test_login_throttling(self, api_client):
        """Test de throttling en login"""
        url = reverse("auth-login")
        data = {"email": "test@example.com", "password": "wrongpass"}
        
        # Intentar login más de 5 veces por minuto
        for i in range(6):
            response = api_client.post(url, data)
            
            if i < 5:
                assert response.status_code == status.HTTP_401_UNAUTHORIZED
            else:
                # La sexta vez debe ser throttled
                assert response.status_code == status.HTTP_429_TOO_MANY_REQUESTS
