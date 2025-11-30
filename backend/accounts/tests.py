from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()


class CustomUserModelTest(TestCase):
    """Tests para el modelo CustomUser"""
    
    def test_create_user(self):
        """Test crear un usuario normal"""
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="Juan",
            last_name="Pérez"
        )
        
        self.assertEqual(user.email, "test@example.com")
        self.assertEqual(user.first_name, "Juan")
        self.assertEqual(user.last_name, "Pérez")
        self.assertTrue(user.is_active)
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertTrue(user.check_password("testpass123"))
    
    def test_create_superuser(self):
        """Test crear un superusuario"""
        user = User.objects.create_superuser(
            email="admin@example.com",
            password="adminpass123"
        )
        
        self.assertEqual(user.email, "admin@example.com")
        self.assertTrue(user.is_active)
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
    
    def test_user_str_representation(self):
        """Test representación string del usuario"""
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="Juan",
            last_name="Pérez"
        )
        
        self.assertEqual(str(user), "test@example.com")
    
    def test_user_email_unique(self):
        """Test que el email sea único"""
        User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        
        with self.assertRaises(Exception):  # IntegrityError
            User.objects.create_user(
                email="test@example.com",
                password="testpass123"
            )
    
    def test_user_email_required(self):
        """Test que el email sea requerido"""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                email="",
                password="testpass123"
            )
    
    def test_user_get_full_name(self):
        """Test obtener nombre completo"""
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="Juan",
            last_name="Pérez"
        )
        
        self.assertEqual(user.get_full_name(), "Juan Pérez")
    
    def test_user_get_short_name(self):
        """Test obtener nombre corto"""
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123",
            first_name="Juan",
            last_name="Pérez"
        )
        
        self.assertEqual(user.get_short_name(), "Juan")
    
    def test_user_has_perm(self):
        """Test verificar permisos"""
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        
        # Usuario normal no tiene permisos especiales
        self.assertFalse(user.has_perm('some_permission'))
        
        # Superusuario tiene todos los permisos
        superuser = User.objects.create_superuser(
            email="admin@example.com",
            password="adminpass123"
        )
        self.assertTrue(superuser.has_perm('some_permission'))
    
    def test_user_has_module_perms(self):
        """Test verificar permisos de módulo"""
        user = User.objects.create_user(
            email="test@example.com",
            password="testpass123"
        )
        
        # Usuario normal no tiene permisos de módulo
        self.assertFalse(user.has_module_perms('some_module'))
        
        # Superusuario tiene permisos de módulo
        superuser = User.objects.create_superuser(
            email="admin@example.com",
            password="adminpass123"
        )
        self.assertTrue(superuser.has_module_perms('some_module'))
    
    def test_user_manager_create_user_no_email(self):
        """Test crear usuario sin email"""
        with self.assertRaises(ValueError):
            User.objects.create_user(
                email=None,
                password="testpass123"
            )
    
    def test_user_manager_create_superuser_no_staff(self):
        """Test crear superusuario sin is_staff=True"""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="admin@example.com",
                password="adminpass123",
                is_staff=False
            )
    
    def test_user_manager_create_superuser_no_superuser(self):
        """Test crear superusuario sin is_superuser=True"""
        with self.assertRaises(ValueError):
            User.objects.create_superuser(
                email="admin@example.com",
                password="adminpass123",
                is_superuser=False
            )