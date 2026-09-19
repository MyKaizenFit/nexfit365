from django.core.management.base import BaseCommand

from accounts.models import CustomUser
from accounts.preference_lists import unwrap_string_list

LIST_FIELDS = ("dietary_restrictions", "allergies", "medical_conditions")


class Command(BaseCommand):
    help = (
        "Detecta dietary_restrictions/allergies/medical_conditions anidados "
        "(JSON/repr). Por defecto solo informa. Usa --apply para reescribir."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Guarda las listas normalizadas. Sin este flag no escribe.",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        affected = 0
        changed_users = 0

        for user in CustomUser.objects.all().iterator():
            updates = []
            for field in LIST_FIELDS:
                current = getattr(user, field, None)
                normalized = unwrap_string_list(current)
                already_clean = isinstance(current, list) and current == normalized
                if already_clean or (not current and not normalized):
                    continue
                updates.append(field)
                if apply_changes:
                    setattr(user, field, normalized)

            if not updates:
                continue

            changed_users += 1
            affected += len(updates)
            self.stdout.write(f"user={user.id} email={user.email} fields={','.join(updates)}")
            if apply_changes:
                user.save(update_fields=list(updates))

        mode = "APPLY" if apply_changes else "DRY-RUN"
        self.stdout.write(self.style.SUCCESS(
            f"{mode}: {changed_users} usuarios, {affected} campos. "
            "Sin --apply no se modifica la base de datos."
        ))
