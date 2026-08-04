"""
Auditoría de MealLogs potencialmente marcados como completed por el bug
select=complete del dashboard diario (introducido 2026-05-14, corregido 2026-08-04).

IMPORTANTE: no existe un criterio seguro para distinguir "seleccionada y
consumida de verdad" de "seleccionada con completed=true por el bug": ambos
guardaban macros y completed=True. Este comando SOLO informa por defecto
(--dry-run). No modifica datos salvo --apply --confirm-unsafe.
"""

from __future__ import annotations

from datetime import date

from django.core.management.base import BaseCommand
from django.db.models import Count, Q

from nutrition.models import MealLog

# Primer día del comportamiento incorrecto en frontend (commit 57276e1).
BUG_INTRODUCED_ON = date(2026, 5, 14)
# Día en que la rama de corrección se escribió localmente (bb2d154).
BUG_FIXED_ON = date(2026, 8, 4)


class Command(BaseCommand):
    help = (
        'Audita MealLogs completed=true posiblemente creados por el bug '
        'select=complete. Dry-run por defecto; no altera datos sin confirmación.'
    )

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            default=True,
            help='Solo informa (por defecto).',
        )
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Permite modificar registros (requiere también --confirm-unsafe).',
        )
        parser.add_argument(
            '--confirm-unsafe',
            action='store_true',
            help=(
                'Confirmación explícita de que se entiende que NO hay criterio '
                'seguro y que --apply puede marcar como no consumidas comidas '
                'realmente ingeridas.'
            ),
        )
        parser.add_argument(
            '--since',
            type=str,
            default=BUG_INTRODUCED_ON.isoformat(),
            help=f'Fecha mínima inclusive (default {BUG_INTRODUCED_ON.isoformat()}).',
        )
        parser.add_argument(
            '--until',
            type=str,
            default=BUG_FIXED_ON.isoformat(),
            help=f'Fecha máxima inclusive (default {BUG_FIXED_ON.isoformat()}).',
        )

    def handle(self, *args, **options):
        since = date.fromisoformat(options['since'])
        until = date.fromisoformat(options['until'])
        apply = bool(options['apply'])
        confirm = bool(options['confirm_unsafe'])

        base = MealLog.objects.filter(
            completed=True,
            is_skipped=False,
            date__gte=since,
            date__lte=until,
        )

        total = base.count()
        with_photo = base.exclude(Q(photo='') | Q(photo__isnull=True)).count()
        with_rating = base.filter(rating__isnull=False).count()
        with_notes = base.exclude(notes='').count()
        ambiguous = base.filter(
            Q(photo='') | Q(photo__isnull=True),
            rating__isnull=True,
        ).filter(Q(notes='') | Q(notes__isnull=True)).count()

        by_user = (
            base.values('user__email')
            .annotate(n=Count('id'))
            .order_by('-n')[:15]
        )

        self.stdout.write(self.style.NOTICE('=== Auditoría MealLog completed (bug select=complete) ==='))
        self.stdout.write(f'Criterio temporal: date ∈ [{since} .. {until}]')
        self.stdout.write(
            'Origen del bug: frontend/hooks/use-daily-meals.ts commit 57276e1 '
            '(2026-05-14) forzó completed=true al seleccionar. Corregido en bb2d154 '
            '(2026-08-04). Semanal/mensual ya guardaban completed=false.'
        )
        self.stdout.write('')
        self.stdout.write(f'Total completed=true no omitidos en rango: {total}')
        self.stdout.write(f'  Con foto:   {with_photo}  (señal débil de consumo real)')
        self.stdout.write(f'  Con rating:  {with_rating}')
        self.stdout.write(f'  Con notes:   {with_notes}')
        self.stdout.write(f'  Ambiguos (sin foto/rating/notes): {ambiguous}')
        self.stdout.write('')
        self.stdout.write('Top usuarios afectados (por email):')
        for row in by_user:
            self.stdout.write(f"  {row['user__email'] or '(sin email)'}: {row['n']}")

        self.stdout.write('')
        self.stdout.write(self.style.WARNING(
            'LIMITACIÓN: no hay criterio seguro. El bug guardaba macros + completed=true '
            'igual que un marcado explícito de consumida. Auto-corregir podría borrar '
            'consumo real del tracker. Estrategia conservadora: no migrar en masa; '
            'dejar que el usuario re-marque; opcionalmente --apply --confirm-unsafe '
            'solo sobre el subconjunto ambiguo (sin foto/rating/notes).'
        ))

        if not apply:
            self.stdout.write(self.style.SUCCESS('Dry-run: 0 registros modificados.'))
            return

        if not confirm:
            self.stdout.write(self.style.ERROR(
                'Abortado: --apply requiere --confirm-unsafe. Ningún dato modificado.'
            ))
            return

        # Solo el subconjunto más ambiguo; sigue siendo inseguro.
        targets = base.filter(
            Q(photo='') | Q(photo__isnull=True),
            rating__isnull=True,
        ).filter(Q(notes='') | Q(notes__isnull=True))
        updated = targets.update(
            completed=False,
            calories=0,
            protein=0,
            carbs=0,
            fat=0,
        )
        self.stdout.write(self.style.WARNING(
            f'APLICADO (inseguro): {updated} registros → completed=false y macros 0.'
        ))
