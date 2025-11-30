# test_users_config.py
# Configuración de usuarios de prueba para desarrollo

# Usuario de pruebas (cliente)
TEST_USER_CONFIG = {
    'email': 'test@mykaizenfit.com',
    'password': 'TestUser123!',
    'first_name': 'Usuario',
    'last_name': 'Pruebas',
    'role': 'MEMBER',
    'is_active': True,
    'is_staff': False,
    'is_superuser': False,
}

# Admin de pruebas
TEST_ADMIN_CONFIG = {
    'email': 'admin@mykaizenfit.com',
    'password': 'AdminTest123!',
    'first_name': 'Admin',
    'last_name': 'Pruebas',
    'role': 'admin',
    'is_active': True,
    'is_staff': True,
    'is_superuser': False,
}

# Lista de todos los usuarios de prueba
TEST_USERS = [
    TEST_USER_CONFIG,
    TEST_ADMIN_CONFIG,
]

# Función para obtener credenciales por tipo
def get_test_user_credentials(user_type='client'):
    """
    Obtener credenciales de usuario de prueba
    
    Args:
        user_type (str): 'client' o 'admin'
    
    Returns:
        dict: Credenciales del usuario
    """
    if user_type == 'admin':
        return {
            'email': TEST_ADMIN_CONFIG['email'],
            'password': TEST_ADMIN_CONFIG['password']
        }
    else:
        return {
            'email': TEST_USER_CONFIG['email'],
            'password': TEST_USER_CONFIG['password']
        }

# Función para verificar si un email es de prueba
def is_test_user(email):
    """
    Verificar si un email pertenece a un usuario de prueba
    
    Args:
        email (str): Email a verificar
    
    Returns:
        bool: True si es usuario de prueba
    """
    test_emails = [user['email'] for user in TEST_USERS]
    return email in test_emails
