import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("nutrition", "0021_meallog_skip_and_recipe_exclusions"),
    ]

    operations = [
        migrations.CreateModel(
            name="MealIngredientExclusion",
            fields=[
                ("id", models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("term", models.CharField(max_length=120)),
                ("reason", models.TextField(blank=True)),
                ("is_active", models.BooleanField(default=True)),
                (
                    "user",
                    models.ForeignKey(on_delete=models.CASCADE, related_name="excluded_meal_ingredients", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "verbose_name": "Exclusión de ingrediente",
                "verbose_name_plural": "Exclusiones de ingredientes",
            },
        ),
        migrations.AddConstraint(
            model_name="mealingredientexclusion",
            constraint=models.UniqueConstraint(fields=("user", "term"), name="unique_user_ingredient_exclusion"),
        ),
        migrations.AddIndex(
            model_name="mealingredientexclusion",
            index=models.Index(fields=["user", "is_active"], name="nutrition_me_user_id_c83f0c_idx"),
        ),
        migrations.AddIndex(
            model_name="mealingredientexclusion",
            index=models.Index(fields=["term", "is_active"], name="nutrition_me_term_8cc6dd_idx"),
        ),
    ]
