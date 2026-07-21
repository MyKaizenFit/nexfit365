from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()

class EmailTokenObtainPairSerializer(TokenObtainPairSerializer):
    # dejamos claros los campos de entrada
    email = serializers.EmailField(write_only=True)
    password = serializers.CharField(write_only=True, style={"input_type": "password"})

    def validate(self, attrs):
        # iOS/Safari puede autocapitalizar el primer carácter del email.
        # SimpleJWT hace una búsqueda exacta, así que normalizamos antes de autenticar.
        email = attrs.get("email", "")
        attrs["email"] = email.strip().lower()
        attrs["username"] = attrs["email"]
        validated_data = super().validate(attrs)
        
        # Detectar si el usuario tiene contraseña temporal y marcarla como usada
        user = validated_data.get('user')
        if user and user.must_change_password and not user.temporary_password_used:
            # Verificar si la contraseña ingresada es la temporal
            # Si el login fue exitoso, significa que usó la contraseña temporal
            user.temporary_password_used = True
            user.save()
        
        return validated_data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["is_staff"] = user.is_staff
        token["is_superuser"] = user.is_superuser
        token["role"] = user.role
        return token

    class Meta:
        fields = ("email", "password")


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer para registro de usuarios"""
    password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"}
    )
    password_confirm = serializers.CharField(
        write_only=True,
        style={"input_type": "password"}
    )
    email = serializers.EmailField()
    role = serializers.CharField(required=False, default="basic")

    class Meta:
        model = User
        fields = (
            "email", "password", "password_confirm",
            "first_name", "last_name", "role"
        )
        extra_kwargs = {
            "first_name": {"required": False},
            "last_name": {"required": False},
            "role": {"required": False, "default": "basic"}
        }

    def validate_email(self, value):
        """Validar que el email sea único y esté normalizado"""
        email = value.lower().strip()
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError("Ya existe un usuario con este email")
        return email

    def validate_password(self, value):
        """Validar que la contraseña sea fuerte"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate_role(self, value):
        # Public registration must not accept elevated roles.
        # Only basic/member aliases are allowed; create() always forces basic.
        normalized = str(value or "").strip().lower()
        role_map = {
            "member": "basic",
            "basic": "basic",
            "": "basic",
        }
        if normalized not in role_map:
            raise serializers.ValidationError(
                "No se puede asignar este rol en el registro público"
            )
        return role_map[normalized]

    def validate(self, attrs):
        """Validar que las contraseñas coincidan"""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({
                "password_confirm": "Las contraseñas no coinciden"
            })
        return attrs

    def create(self, validated_data):
        """Crear el usuario — siempre con role basic (registro público)."""
        validated_data.pop("password_confirm")
        validated_data["email"] = validated_data["email"].lower()
        # Defense in depth: ignore any client-supplied role.
        validated_data.pop("role", None)

        user = User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            role="basic",
        )

        return user


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer para cambio de contraseña"""
    current_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"}
    )
    new_password = serializers.CharField(
        write_only=True,
        min_length=8,
        style={"input_type": "password"}
    )
    new_password_confirm = serializers.CharField(
        write_only=True,
        style={"input_type": "password"}
    )

    def validate_current_password(self, value):
        """Validar que la contraseña actual sea correcta"""
        user = self.context["user"]
        if not user.check_password(value):
            raise serializers.ValidationError("La contraseña actual es incorrecta")
        return value

    def validate_new_password(self, value):
        """Validar que la nueva contraseña sea fuerte"""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value

    def validate(self, attrs):
        """Validar que las nuevas contraseñas coincidan"""
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({
                "new_password_confirm": "Las contraseñas no coinciden"
            })
        
        # Validar que la nueva contraseña sea diferente a la actual
        user = self.context["user"]
        if user.check_password(attrs["new_password"]):
            raise serializers.ValidationError({
                "new_password": "La nueva contraseña debe ser diferente a la actual"
            })
        
        return attrs

    def save(self):
        """Actualizar la contraseña del usuario"""
        user = self.context["user"]
        user.set_password(self.validated_data["new_password"])
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer para perfil de usuario"""
    class Meta:
        model = User
        fields = (
            "id", "email", "first_name", "last_name", "role",
            "is_active", "date_joined", "last_login"
        )
        read_only_fields = ("id", "email", "date_joined", "last_login")


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para actualización de usuario"""
    class Meta:
        model = User
        fields = ("first_name", "last_name", "role")
        extra_kwargs = {
            "role": {"required": False}
        }

    def validate_role(self, value):
        """Validar que solo admins puedan cambiar roles"""
        user = self.context["user"]
        if not user.is_superuser and value != user.role:
            raise serializers.ValidationError(
                "Solo los administradores pueden cambiar roles"
            )
        return value
