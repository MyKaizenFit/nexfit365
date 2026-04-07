"""
Configuración de Celery para MyKaizenFit.
"""
import os
from celery import Celery

# Establecer el módulo de settings de Django por defecto
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

app = Celery('mykaizenfit')

# Usar settings de Django con prefijo CELERY_
app.config_from_object('django.conf:settings', namespace='CELERY')

# Autodescubrir tareas en todas las apps de INSTALLED_APPS
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
