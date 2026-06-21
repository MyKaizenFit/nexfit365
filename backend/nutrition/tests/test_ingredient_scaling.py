from django.test import SimpleTestCase

from nutrition.ingredient_scaling import scale_ingredient_quantity


class IngredientScalingTests(SimpleTestCase):
    def test_main_ingredient_scales_linearly(self):
        self.assertEqual(scale_ingredient_quantity(100, 1.5, food_name="Arroz"), 150.0)

    def test_oil_keeps_proportion_at_unit_scale(self):
        self.assertEqual(
            scale_ingredient_quantity(20, 1.0, food_name="Aceite de oliva"),
            20.0,
        )

    def test_oil_uses_damped_growth_when_recipe_scales_up(self):
        scaled = scale_ingredient_quantity(10, 2.0, food_name="Aceite de oliva")
        self.assertGreater(scaled, 10)
        self.assertLess(scaled, 20)

    def test_seasoning_changes_slower_than_main_ingredients(self):
        seasoned = scale_ingredient_quantity(2, 2.0, food_name="Sal marina")
        linear = scale_ingredient_quantity(100, 2.0, food_name="Pollo")
        self.assertLess(seasoned / 2, linear / 100)
