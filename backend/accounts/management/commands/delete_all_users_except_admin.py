from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()


class Command(BaseCommand):
    help = 'Elimina todos los usuarios excepto los administradores'

    def add_arguments(self, parser):
        parser.add_argument(
            '--confirm',
            action='store_true',
            help='Confirmar la eliminación (requerido para ejecutar)',
        )

    def handle(self, *args, **options):
        if not options['confirm']:
            self.stdout.write(self.style.ERROR(
                '⚠️  ATENCION: Este comando eliminara TODOS los usuarios excepto administradores.'
            ))
            self.stdout.write(self.style.WARNING(
                'Para confirmar, ejecuta: python manage.py delete_all_users_except_admin --confirm'
            ))
            return

        # Obtener todos los usuarios que NO son superusuarios
        users_to_delete = User.objects.filter(is_superuser=False)
        total_users = users_to_delete.count()

        if total_users == 0:
            self.stdout.write(self.style.SUCCESS('No hay usuarios para eliminar'))
            return

        self.stdout.write(f'Se eliminaran {total_users} usuarios...')
        
        # Contar usuarios por tipo
        admins = User.objects.filter(is_superuser=True).count()
        self.stdout.write(f'Usuarios administradores que se mantendran: {admins}')

        # Eliminar usuarios
        deleted_count = 0
        for user in users_to_delete:
            try:
                email = user.email
                user.delete()
                deleted_count += 1
                self.stdout.write(self.style.SUCCESS(f'Eliminado: {email}'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error eliminando {user.email}: {str(e)}'))

        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'Proceso completado:'))
        self.stdout.write(f'   Eliminados: {deleted_count}')
        self.stdout.write(f'   Administradores mantenidos: {admins}')
        self.stdout.write(f'   Total procesado: {total_users}')

