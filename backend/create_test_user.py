from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.create_user(
    email='usuario@test.com',
    password='Test123!',
    first_name='María',
    last_name='García López'
)
print('Usuario de prueba creado correctamente.')
