#!/bin/bash
# Script para verificar usuarios en la base de datos
# Ejecutar como root o con sudo: sudo bash verificar_usuarios.sh

set -e

COMPOSE_PROJECT_NAME=reposseparadosparaelhost
COMPOSE_FILE=docker-compose.prod.yml

echo "=========================================="
echo "  VERIFICANDO USUARIOS EN LA BASE DE DATOS"
echo "=========================================="
echo ""

# Verificar usuarios usando Django shell
echo "1. Consultando usuarios desde Django..."
docker compose -f $COMPOSE_FILE exec -T backend python manage.py shell << 'PYTHON_EOF'
from accounts.models import CustomUser
print('=' * 60)
print('USUARIOS EN LA BASE DE DATOS')
print('=' * 60)
users = CustomUser.objects.all()
print(f'Total de usuarios: {users.count()}')
print()
if users.exists():
    for user in users:
        print(f'Email: {user.email}')
        print(f'Nombre: {user.first_name} {user.last_name}')
        print(f'is_superuser: {user.is_superuser}')
        print(f'is_staff: {user.is_staff}')
        print(f'is_active: {user.is_active}')
        role = getattr(user, 'role', 'N/A')
        print(f'role: {role}')
        print('-' * 60)
else:
    print('No hay usuarios en la base de datos')
PYTHON_EOF

echo ""
echo "2. Consultando usuarios directamente desde PostgreSQL..."
docker compose -f $COMPOSE_FILE exec -T db psql -U postgres -d mykaizenfit << 'SQL_EOF'
SELECT 
    email, 
    first_name, 
    last_name, 
    is_superuser, 
    is_staff, 
    is_active,
    role
FROM accounts_customuser 
ORDER BY is_superuser DESC, email;
SQL_EOF

echo ""
echo "=========================================="
echo "  RESUMEN"
echo "=========================================="
echo ""
echo "Para crear un usuario administrador, ejecuta:"
echo "  docker compose -f $COMPOSE_FILE exec backend python create_admin_user.py"
echo ""

