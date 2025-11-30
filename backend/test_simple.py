"""
Test simple para verificar que Django funciona
"""
import pytest
from django.test import TestCase
from django.contrib.auth import get_user_model

User = get_user_model()


class SimpleTest(TestCase):
    """Test simple para verificar que Django funciona"""
    
    def test_basic_example(self):
        """Test básico de ejemplo"""
        self.assertEqual(1 + 1, 2)
    
    def test_django_working(self):
        """Test para verificar que Django está funcionando"""
        self.assertTrue(True)
    
    def test_user_model_exists(self):
        """Test para verificar que el modelo User existe"""
        self.assertIsNotNone(User)
        self.assertTrue(hasattr(User, 'objects')) 