#!/usr/bin/env python
"""
Script para ejecutar tests con configuración correcta de Django
"""
import os
import sys
import django
from django.conf import settings
from django.test.utils import get_runner

def setup_django():
    """Configurar Django para testing"""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'test_settings')
    django.setup()

def run_tests():
    """Ejecutar tests"""
    setup_django()
    
    TestRunner = get_runner(settings)
    test_runner = TestRunner()
    
    # Ejecutar tests específicos
    test_modules = [
        'workouts.tests.test_models',
        'workouts.tests.test_views',
        'workouts.tests.test_serializers',
        'accounts.tests.test_models',
    ]
    
    failures = test_runner.run_tests(test_modules)
    
    if failures:
        sys.exit(1)
    else:

if __name__ == '__main__':
    run_tests()























