# Dockerfile para MyKaizenFit Backend
FROM python:3.11-slim

# Establecer variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependencias del sistema
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        postgresql-client \
        build-essential \
        libpq-dev \
        gettext \
        curl \
        libjpeg62-turbo-dev \
        zlib1g-dev \
        libpng-dev \
        libheif-dev \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar requirements y instalar dependencias de Python
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código de la aplicación
COPY . .

# Crear directorios necesarios con permisos correctos
# (Se ejecuta como root porque docker-compose.prod.yml usa user: "0:0")
RUN mkdir -p /app/staticfiles /app/media
RUN chmod -R 777 /app/staticfiles /app/media

# Exponer puerto
EXPOSE 8000

# Comando por defecto
CMD ["gunicorn", "backend.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]