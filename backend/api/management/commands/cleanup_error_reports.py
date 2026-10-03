from django.core.management.base import BaseCommand

from api.error_reporting import cleanup_error_reports


class Command(BaseCommand):
    help = "Elimina informes de error de formato antiguo o fuera de retención. No imprime su contenido."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--execute", action="store_true")

    def handle(self, *args, **options):
        if options["dry_run"] == options["execute"]:
            self.stderr.write("Indica --dry-run o --execute.")
            return
        counts = cleanup_error_reports(execute=options["execute"])
        self.stdout.write(
            "dry_run={dry} old_format={old_format} expired={expired} kept={kept} "
            "rejected={rejected} deleted={deleted} missing={missing} errors={errors} "
            "id_hash={id_hash}".format(dry=int(not options["execute"]), **counts)
        )
