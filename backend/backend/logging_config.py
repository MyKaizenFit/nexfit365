"""
Configuración de logging para Django
"""

import os
from pathlib import Path

# Directorio base
BASE_DIR = Path(__file__).resolve().parent.parent

# Configuración de logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
        'detailed': {
            'format': '[{asctime}] {levelname} {name} {funcName}:{lineno} - {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'detailed',
            'level': 'DEBUG',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'django.log',
            'formatter': 'detailed',
            'level': 'INFO',
        },
        'progress_file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'progress.log',
            'formatter': 'detailed',
            'level': 'DEBUG',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'progress': {
            'handlers': ['console', 'progress_file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'progress.views': {
            'handlers': ['console', 'progress_file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'progress.serializers': {
            'handlers': ['console', 'progress_file'],
            'level': 'DEBUG',
            'propagate': False,
        },
        'progress.models': {
            'handlers': ['console', 'progress_file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'WARNING',
    },
}

# Crear directorio de logs si no existe
logs_dir = BASE_DIR / 'logs'
logs_dir.mkdir(exist_ok=True)
