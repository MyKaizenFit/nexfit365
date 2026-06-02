from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from achievements.models import Achievement, UserAchievement
from achievements.services import get_streak_target, unlock_streak_achievements


class Command(BaseCommand):
    help = "Valida rachas y logros de racha existentes sin reducir progreso."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Aplica correcciones seguras. Sin este flag solo muestra el resumen.",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        User = get_user_model()
        streak_achievements = list(Achievement.objects.filter(is_active=True, category="streak"))

        users = User.objects.filter(daily_streak__gt=0)
        checked = 0
        longest_repairs = 0
        unlocked_total = 0

        for user in users.iterator():
            checked += 1

            if (user.longest_streak or 0) < (user.daily_streak or 0):
                longest_repairs += 1
                if apply_changes:
                    user.longest_streak = user.daily_streak
                    user.save(update_fields=["longest_streak"])

            if apply_changes:
                before_ids = set(user.user_achievements.values_list("achievement_id", flat=True))
                unlocked = unlock_streak_achievements(user, user.daily_streak or 0)
                after_ids = {item.achievement_id for item in unlocked}
                unlocked_total += len(after_ids - before_ids)
            else:
                existing_ids = set(
                    UserAchievement.objects.filter(user=user).values_list("achievement_id", flat=True)
                )
                for achievement in streak_achievements:
                    target = get_streak_target(achievement)
                    if target and (user.daily_streak or 0) >= target and achievement.id not in existing_ids:
                        unlocked_total += 1

        mode = "APLICADO" if apply_changes else "DRY-RUN"
        self.stdout.write(
            self.style.SUCCESS(
                f"{mode}: usuarios revisados={checked}, "
                f"longest_streak_a_reparar={longest_repairs}, "
                f"logros_racha_desbloqueados={unlocked_total}"
            )
        )
