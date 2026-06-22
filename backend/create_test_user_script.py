from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='member@example.invalid').exists():
    User.objects.create_user(
        email='member@example.invalid',
        password='Test123!',
        first_name='María',
        last_name='García López',
        role='basic'
    )
    print('Usuario de prueba creado')
else:
    print('El usuario de prueba ya existe')
