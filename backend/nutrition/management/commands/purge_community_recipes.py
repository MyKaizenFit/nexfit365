from django.core.management.base import BaseCommand
class Command(BaseCommand):
    help = "Comando legado: las publicaciones de Team SK ya no caducan."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Team SK no tiene publicaciones caducadas. No se ha eliminado nada."))
