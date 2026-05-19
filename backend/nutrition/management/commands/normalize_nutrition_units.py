from django.core.management.base import BaseCommand

from nutrition.models import Food, Recipe, RecipeIngredient


class Command(BaseCommand):
    help = (
        "Normaliza unidades en datos de nutricion existentes. "
        "Corrige Food.serving_unit, RecipeIngredient.unit y Recipe.ingredients[*].unit."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Aplica cambios. Sin esta bandera solo muestra un preview (dry-run).",
        )

    def handle(self, *args, **options):
        apply_changes = bool(options.get("apply"))

        food_updates = []
        ingredient_updates = []
        recipe_updates = []

        # 1) Alimentos
        for food in Food.objects.all().only("id", "name", "serving_unit"):
            old_unit = food.serving_unit or ""
            new_unit = RecipeIngredient._normalize_unit(old_unit) or "g"
            if old_unit != new_unit:
                food_updates.append((food.id, food.name, old_unit, new_unit))
                if apply_changes:
                    food.serving_unit = new_unit
                    food.save(update_fields=["serving_unit", "updated_at"])

        # 2) Ingredientes estructurados
        for ingredient in RecipeIngredient.objects.select_related("food").all().only(
            "id", "unit", "food__serving_unit", "food__name"
        ):
            old_unit = ingredient.unit or ""
            fallback_unit = getattr(ingredient.food, "serving_unit", "g") if ingredient.food_id else "g"
            new_unit = RecipeIngredient._normalize_unit(old_unit) or RecipeIngredient._normalize_unit(fallback_unit) or "g"
            if old_unit != new_unit:
                ingredient_updates.append((str(ingredient.id), old_unit, new_unit, getattr(ingredient.food, "name", "")))
                if apply_changes:
                    ingredient.unit = new_unit
                    ingredient.save(update_fields=["unit", "updated_at"])

        # 3) Ingredientes JSON legado
        for recipe in Recipe.objects.all().only("id", "name", "ingredients"):
            ingredients = recipe.ingredients
            if not isinstance(ingredients, list):
                continue

            changed = False
            normalized_items = []
            for item in ingredients:
                if not isinstance(item, dict):
                    normalized_items.append(item)
                    continue

                updated = dict(item)
                old_unit = str(item.get("unit") or "").strip()
                new_unit = RecipeIngredient._normalize_unit(old_unit) or "g"
                if old_unit != new_unit:
                    changed = True
                    updated["unit"] = new_unit
                normalized_items.append(updated)

            if changed:
                recipe_updates.append((str(recipe.id), recipe.name))
                if apply_changes:
                    Recipe.objects.filter(id=recipe.id).update(ingredients=normalized_items)

        self.stdout.write(self.style.WARNING("\nResumen de normalizacion de unidades"))
        self.stdout.write(f"- Food actualizables: {len(food_updates)}")
        self.stdout.write(f"- RecipeIngredient actualizables: {len(ingredient_updates)}")
        self.stdout.write(f"- Recipe JSON actualizables: {len(recipe_updates)}")

        if food_updates:
            self.stdout.write("\nEjemplos Food:")
            for _, name, old_unit, new_unit in food_updates[:10]:
                self.stdout.write(f"  - {name}: '{old_unit}' -> '{new_unit}'")

        if ingredient_updates:
            self.stdout.write("\nEjemplos RecipeIngredient:")
            for ingredient_id, old_unit, new_unit, food_name in ingredient_updates[:10]:
                self.stdout.write(f"  - {ingredient_id} ({food_name}): '{old_unit}' -> '{new_unit}'")

        if recipe_updates:
            self.stdout.write("\nEjemplos Recipe JSON:")
            for recipe_id, recipe_name in recipe_updates[:10]:
                self.stdout.write(f"  - {recipe_name} ({recipe_id})")

        if apply_changes:
            self.stdout.write(self.style.SUCCESS("\nCambios aplicados correctamente."))
        else:
            self.stdout.write(self.style.WARNING("\nDry-run completado. Usa --apply para persistir cambios."))
