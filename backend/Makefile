.PHONY: help install install-dev test test-cov test-verbose test-models test-views test-serializers test-permissions lint format clean migrate seed run docker-up docker-down docker-logs docker-shell

# Variables
PYTHON = python
PIP = pip
MANAGE = $(PYTHON) manage.py
PYTEST = pytest
COVERAGE = coverage

# Colores para output
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

help: ## Mostrar esta ayuda
	@echo "$(GREEN)MyKaizenFit - Comandos disponibles:$(NC)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

install: ## Instalar dependencias básicas
	@echo "$(GREEN)Instalando dependencias...$(NC)"
	$(PIP) install -r requirements.txt

install-dev: ## Instalar dependencias de desarrollo
	@echo "$(GREEN)Instalando dependencias de desarrollo...$(NC)"
	$(PIP) install -r requirements.txt
	$(PIP) install pre-commit
	pre-commit install

# Testing
test: ## Ejecutar todos los tests
	@echo "$(GREEN)Ejecutando tests...$(NC)"
	$(PYTEST)

test-cov: ## Ejecutar tests con cobertura
	@echo "$(GREEN)Ejecutando tests con cobertura...$(NC)"
	$(PYTEST) --cov=. --cov-report=html --cov-report=term-missing

test-verbose: ## Ejecutar tests con logging detallado
	@echo "$(GREEN)Ejecutando tests con logging detallado...$(NC)"
	$(PYTEST) -v --log-cli-level=DEBUG

test-models: ## Ejecutar tests de modelos
	@echo "$(GREEN)Ejecutando tests de modelos...$(NC)"
	$(PYTEST) -m "models"

test-views: ## Ejecutar tests de vistas
	@echo "$(GREEN)Ejecutando tests de vistas...$(NC)"
	$(PYTEST) -m "views"

test-serializers: ## Ejecutar tests de serializers
	@echo "$(GREEN)Ejecutando tests de serializers...$(NC)"
	$(PYTEST) -m "serializers"

test-permissions: ## Ejecutar tests de permisos
	@echo "$(GREEN)Ejecutando tests de permisos...$(NC)"
	$(PYTEST) -m "permissions"

test-specific: ## Ejecutar tests específicos (uso: make test-specific APP=accounts)
	@echo "$(GREEN)Ejecutando tests de $(APP)...$(NC)"
	$(PYTEST) $(APP)/tests/

# Linting y formateo
lint: ## Ejecutar linting
	@echo "$(GREEN)Ejecutando linting...$(NC)"
	flake8 .
	bandit -r . --exclude tests/
	mypy . --ignore-missing-imports

format: ## Formatear código
	@echo "$(GREEN)Formateando código...$(NC)"
	black .
	isort .

format-check: ## Verificar formato sin cambiar
	@echo "$(GREEN)Verificando formato...$(NC)"
	black --check .
	isort --check-only .

# Base de datos
migrate: ## Ejecutar migraciones
	@echo "$(GREEN)Ejecutando migraciones...$(NC)"
	$(MANAGE) makemigrations
	$(MANAGE) migrate

migrate-reset: ## Resetear migraciones (¡CUIDADO!)
	@echo "$(RED)Reseteando migraciones...$(NC)"
	@read -p "¿Estás seguro? Esto eliminará todas las migraciones. [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	rm -rf */migrations/0*.py
	$(MANAGE) makemigrations
	$(MANAGE) migrate

seed: ## Crear datos demo
	@echo "$(GREEN)Creando datos demo...$(NC)"
	$(MANAGE) seed_demo

seed-clear: ## Crear datos demo limpiando existentes
	@echo "$(GREEN)Creando datos demo limpiando existentes...$(NC)"
	$(MANAGE) seed_demo --clear

# Servidor
run: ## Ejecutar servidor de desarrollo
	@echo "$(GREEN)Ejecutando servidor...$(NC)"
	$(MANAGE) runserver

run-port: ## Ejecutar servidor en puerto específico (uso: make run-port PORT=8001)
	@echo "$(GREEN)Ejecutando servidor en puerto $(PORT)...$(NC)"
	$(MANAGE) runserver $(PORT)

# Docker
docker-up: ## Levantar servicios con Docker
	@echo "$(GREEN)Levantando servicios Docker...$(NC)"
	docker-compose up -d --build

docker-down: ## Parar servicios Docker
	@echo "$(GREEN)Parando servicios Docker...$(NC)"
	docker-compose down

docker-logs: ## Ver logs de Docker
	@echo "$(GREEN)Mostrando logs Docker...$(NC)"
	docker-compose logs -f

docker-shell: ## Acceder al shell del contenedor web
	@echo "$(GREEN)Accediendo al shell del contenedor...$(NC)"
	docker-compose exec web bash

# Limpieza
clean: ## Limpiar archivos temporales
	@echo "$(GREEN)Limpiando archivos temporales...$(NC)"
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -delete
	rm -rf .pytest_cache/
	rm -rf htmlcov/
	rm -f .coverage
	rm -f test.log
	rm -rf test_media/

clean-db: ## Limpiar base de datos (¡CUIDADO!)
	@echo "$(RED)Limpiando base de datos...$(NC)"
	@read -p "¿Estás seguro? Esto eliminará todos los datos. [y/N]: " confirm && [ "$$confirm" = "y" ] || exit 1
	$(MANAGE) flush --no-input

# Utilidades
shell: ## Abrir shell de Django
	@echo "$(GREEN)Abriendo shell de Django...$(NC)"
	$(MANAGE) shell

check: ## Verificar configuración
	@echo "$(GREEN)Verificando configuración...$(NC)"
	$(MANAGE) check --deploy

collectstatic: ## Recolectar archivos estáticos
	@echo "$(GREEN)Recolectando archivos estáticos...$(NC)"
	$(MANAGE) collectstatic --noinput

# Logs
logs: ## Ver logs de tests
	@echo "$(GREEN)Mostrando logs de tests...$(NC)"
	tail -f test.log

logs-errors: ## Ver solo errores en logs
	@echo "$(GREEN)Mostrando errores en logs...$(NC)"
	grep "ERROR" test.log

logs-app: ## Ver logs de una app específica (uso: make logs-app APP=accounts)
	@echo "$(GREEN)Mostrando logs de $(APP)...$(NC)"
	grep "$(APP)" test.log

# CI/CD
ci: ## Ejecutar pipeline de CI localmente
	@echo "$(GREEN)Ejecutando pipeline de CI...$(NC)"
	make format-check
	make lint
	make test-cov

# Desarrollo
dev-setup: ## Configurar entorno de desarrollo completo
	@echo "$(GREEN)Configurando entorno de desarrollo...$(NC)"
	make install-dev
	make migrate
	make seed
	@echo "$(GREEN)¡Entorno configurado! Ejecuta 'make run' para iniciar$(NC)"

# Producción
prod-check: ## Verificar configuración para producción
	@echo "$(GREEN)Verificando configuración de producción...$(NC)"
	$(MANAGE) check --deploy
	$(MANAGE) check --database default
	@echo "$(GREEN)Configuración de producción verificada$(NC)" 