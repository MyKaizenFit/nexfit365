from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand
from django.db import transaction

from nutrition.models import Recipe, RecipeIngredient
from nutrition.views import is_liquid_equivalence_food


WEIGHT_TO_ML_FACTORS = {
    "g": Decimal("1"),
    "gr": Decimal("1"),
    "gramo": Decimal("1"),
    "gramos": Decimal("1"),
    "kg": Decimal("1000"),
    "kilo": Decimal("1000"),
    "kilos": Decimal("1000"),
    "kilogramo": Decimal("1000"),
    "kilogramos": Decimal("1000"),
}


class Command(BaseCommand):
    help = "Convierte a ml los ingredientes liquidos de recetas que aun estan en gramos."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Guarda los cambios. Sin este flag solo muestra un dry-run.",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Limita el numero de ingredientes a procesar.",
        )
        parser.add_argument(
            "--recipe-id",
            action="append",
            default=[],
            help="Procesa solo una receta concreta. Puede repetirse.",
        )
        parser.add_argument(
            "--skip-recalculate",
            action="store_true",
            help="No recalcula macros de las recetas afectadas al aplicar.",
        )

    def handle(self, *args, **options):
        apply_changes = options["apply"]
        limit = options["limit"]
        recipe_ids = [str(value) for value in options["recipe_id"]]
        skip_recalculate = options["skip_recalculate"]

        ingredients = RecipeIngredient.objects.select_related("food", "recipe").order_by("recipe_id", "order", "id")
        if recipe_ids:
            ingredients = ingredients.filter(recipe_id__in=recipe_ids)

        changes = []
        for ingredient in ingredients.iterator():
            normalized_unit = RecipeIngredient._normalize_unit(ingredient.unit)
            if normalized_unit not in WEIGHT_TO_ML_FACTORS:
                continue
            if not is_liquid_equivalence_food(ingredient.food):
                continue

            try:
                current_quantity = Decimal(str(ingredient.quantity or 0))
            except (InvalidOperation, TypeError):
                continue

            new_quantity = current_quantity * WEIGHT_TO_ML_FACTORS[normalized_unit]
            changes.append((ingredient, new_quantity.quantize(Decimal("0.01"))))
            if limit and len(changes) >= limit:
                break

        if not changes:
            self.stdout.write(self.style.SUCCESS("No hay ingredientes liquidos pendientes de convertir a ml."))
            return

        self.stdout.write(
            f"{'Aplicando' if apply_changes else 'Dry-run'}: {len(changes)} ingredientes liquidos se convertiran a ml"
        )
        for ingredient, new_quantity in changes[:50]:
            self.stdout.write(
                f"- Receta #{ingredient.recipe_id} {ingredient.recipe.name}: "
                f"{ingredient.food.name} {ingredient.quantity}{ingredient.unit} -> {new_quantity}ml"
            )
        if len(changes) > 50:
            self.stdout.write(f"... y {len(changes) - 50} mas")

        if not apply_changes:
            self.stdout.write(self.style.WARNING("Dry-run completado. Usa --apply para guardar cambios."))
            return

        affected_recipe_ids = {ingredient.recipe_id for ingredient, _ in changes}
        with transaction.atomic():
            for ingredient, new_quantity in changes:
                ingredient.quantity = new_quantity
                ingredient.unit = "ml"
                ingredient.save(update_fields=["quantity", "unit", "updated_at"])

            if not skip_recalculate:
                for recipe in Recipe.objects.filter(id__in=affected_recipe_ids):
                    recipe.calculate_macros_from_ingredients(save=True)
                    recipe.refresh_allergen_flags()

        self.stdout.write(
            self.style.SUCCESS(
                f"Convertidos {len(changes)} ingredientes a ml en {len(affected_recipe_ids)} recetas."
            )
        )
