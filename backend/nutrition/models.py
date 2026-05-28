# nutrition/models.py
# Modelos de nutrición - Versión reestructurada y simplificada

import re
import uuid
import unicodedata
from datetime import timedelta
from django.conf import settings
from django.db import models, transaction
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class TimeStampedModel(models.Model):
    """Modelo base con timestamps"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


def community_recipe_image_path(instance, filename):
    return f"community-recipes/{instance.author_id}/{uuid.uuid4()}-{filename}"


# =============================================================================
# RECETAS
# =============================================================================

class Recipe(TimeStampedModel):
    """
    Receta de cocina
    
    Uso:
    - is_system=True: Recetas predefinidas del sistema
    - is_system=False: Recetas creadas por usuarios/admins
    """
    
    DIFFICULTY_CHOICES = [
        ('Fácil', 'Fácil'),
        ('Medio', 'Medio'),
        ('Difícil', 'Difícil'),
    ]
    
    CATEGORY_CHOICES = [
        ('Desayuno', 'Desayuno'),
        ('Almuerzo', 'Almuerzo'),
        ('Cena', 'Cena'),
        ('Snack', 'Snack'),
        ('Postre', 'Postre'),
        ('Bebida', 'Bebida'),
    ]

    GOAL_CATEGORY_CHOICES = [
        ('', 'Sin objetivo'),
        ('lose_weight', 'Perder peso'),
        ('gain_muscle', 'Ganar músculo'),
        ('maintain', 'Mantener peso'),
        ('body_recomposition', 'Recomposición corporal'),
        ('performance', 'Rendimiento deportivo'),
    ]
    
    # Información básica
    name = models.CharField(max_length=200, help_text="Nombre de la receta")
    description = models.TextField(blank=True, help_text="Descripción breve")
    category = models.CharField(
        max_length=50, 
        choices=CATEGORY_CHOICES,
        default='Almuerzo',
        help_text="Categoría principal"
    )
    
    # Dificultad y tiempo
    difficulty = models.CharField(
        max_length=20, 
        choices=DIFFICULTY_CHOICES, 
        default='Fácil'
    )
    prep_time_minutes = models.PositiveIntegerField(
        default=15,
        help_text="Tiempo de preparación en minutos"
    )
    cook_time_minutes = models.PositiveIntegerField(
        default=0,
        help_text="Tiempo de cocción en minutos"
    )
    servings = models.PositiveIntegerField(
        default=1, 
        help_text="Número de porciones"
    )
    
    # Información nutricional (por porción)
    calories = models.PositiveIntegerField(
        default=0,
        help_text="Calorías por porción"
    )
    protein = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        default=0,
        help_text="Proteínas en gramos"
    )
    carbs = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        default=0,
        help_text="Carbohidratos en gramos"
    )
    fat = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        default=0,
        help_text="Grasas en gramos"
    )
    fiber = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        default=0,
        help_text="Fibra en gramos"
    )
    sugar = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        default=0,
        help_text="Azúcar en gramos"
    )
    sodium = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        default=0,
        help_text="Sodio en mg"
    )
    
    # Contenido
    ingredients = models.JSONField(
        default=list,
        help_text="Lista de ingredientes: [{'name': 'Pollo', 'amount': '200', 'unit': 'g'}]"
    )
    instructions = models.TextField(
        blank=True,
        help_text="Instrucciones de preparación"
    )
    
    # Clasificación
    diet_types = models.JSONField(
        default=list, 
        blank=True,
        help_text="Tipos de dieta: ['vegetarian', 'vegan', 'gluten-free', 'keto', 'paleo']"
    )
    goal_category = models.CharField(
        max_length=30,
        choices=GOAL_CATEGORY_CHOICES,
        default='',
        blank=True,
        help_text="Objetivo principal para filtrar recetas"
    )
    meal_types = models.JSONField(
        default=list, 
        blank=True,
        help_text="Tipos de comida: ['breakfast', 'lunch', 'dinner', 'snack', 'pre-workout', 'post-workout']"
    )
    allergens = models.JSONField(
        default=list, 
        blank=True,
        help_text="Alérgenos: ['gluten', 'dairy', 'eggs', 'nuts', 'soy', 'shellfish']"
    )
    tags = models.JSONField(
        default=list, 
        blank=True,
        help_text="Etiquetas adicionales"
    )
    
    # Media
    image = models.ImageField(
        upload_to='recipes/images/',
        blank=True,
        null=True
    )
    image_url = models.URLField(blank=True, help_text="URL de imagen")
    video_url = models.URLField(blank=True, help_text="URL de video de preparación")
    
    # Flags de control
    is_system = models.BooleanField(
        default=False, 
        help_text="True = receta del sistema"
    )
    is_active = models.BooleanField(
        default=True, 
        help_text="False = receta desactivada"
    )
    is_featured = models.BooleanField(
        default=False,
        help_text="True = receta destacada"
    )
    
    # Propiedad
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='recipes_created'
    )
    
    class Meta:
        ordering = ['name']
        verbose_name = "Receta"
        verbose_name_plural = "Recetas"

    AUTO_FREE_FROM_DIET_TYPES = {
        'gluten-free': 'gluten',
        'dairy-free': 'dairy',
        'egg-free': 'eggs',
        'nut-free': 'nuts',
        'soy-free': 'soy',
        'fish-free': 'fish',
        'shellfish-free': 'shellfish',
        'sesame-free': 'sesame',
    }

    ALLERGEN_KEYWORDS = {
        'gluten': [
            'gluten', 'trigo', 'wheat', 'harina', 'bread', 'pan', 'pasta', 'couscous',
            'cebada', 'barley', 'centeno', 'rye', 'avena', 'oats', 'malta', 'malt',
            'galleta', 'cookie', 'bizcocho', 'empanado', 'rebozado', 'semola', 'semolina',
            'panko', 'masa', 'pizza', 'tarta', 'noodle', 'fideos'
        ],
        'dairy': [
            'leche', 'milk', 'queso', 'cheese', 'yogur', 'yogurt', 'mantequilla', 'butter',
            'crema', 'cream', 'nata', 'whey', 'casein', 'caseina', 'lactose', 'lactosa',
            'buttermilk', 'ricotta', 'mozzarella', 'parmesan', 'parmesano'
        ],
        'eggs': [
            'huevo', 'huevos', 'egg', 'eggs', 'mayonesa', 'mayo', 'merengue', 'albumen', 'albumina'
        ],
        'nuts': [
            'almendra', 'almendras', 'almond', 'walnut', 'walnuts', 'nuez', 'nueces',
            'avellana', 'avellanas', 'hazelnut', 'hazelnuts', 'pistacho', 'pistachios',
            'cacahuate', 'cacahuete', 'cacahuetes', 'peanut', 'peanuts', 'mani', 'anacardo', 'cashew',
            'cashews', 'macadamia', 'pecan', 'pecanas', 'pine nut', 'piñon', 'pinon'
        ],
        'soy': [
            'soja', 'soy', 'soya', 'tofu', 'tempeh', 'edamame', 'miso', 'salsa de soja', 'lecitina de soja'
        ],
        'fish': [
            'pescado', 'fish', 'salmon', 'salmon', 'atun', 'tuna', 'sardina', 'anchov', 'bacalao',
            'trucha', 'merluza', 'caballa'
        ],
        'shellfish': [
            'marisco', 'shellfish', 'gamba', 'gambas', 'langostino', 'langostinos', 'camaron', 'camarones',
            'crab', 'cangrejo', 'lobster', 'langosta', 'mejillon', 'mejillones', 'almeja', 'almejas',
            'ostras', 'ostra', 'scallop'
        ],
        'sesame': [
            'sesamo', 'sésamo', 'sesame', 'ajonjoli', 'ajonjolí', 'tahini'
        ],
    }

    ALLERGEN_ALIASES = {
        'dairy-free': 'dairy',
        'dairy': 'dairy',
        'lactose': 'dairy',
        'lactosa': 'dairy',
        'milk': 'dairy',
        'eggs': 'eggs',
        'egg': 'eggs',
        'nuts': 'nuts',
        'nut': 'nuts',
        'tree-nuts': 'nuts',
        'soy': 'soy',
        'soya': 'soy',
        'soja': 'soy',
        'fish': 'fish',
        'shellfish': 'shellfish',
        'sesame': 'sesame',
        'sesamo': 'sesame',
        'gluten': 'gluten',
    }

    def _normalize_allergen_text(self, value):
        text = unicodedata.normalize('NFKD', str(value or '')).encode('ascii', 'ignore').decode('ascii').lower()
        text = text.replace('-', ' ')
        text = ' '.join(text.split())
        return text

    def _iter_allergen_source_texts(self):
        texts = []

        if isinstance(self.ingredients, list):
            for ingredient in self.ingredients:
                if isinstance(ingredient, dict):
                    texts.append(ingredient.get('name', ''))
                    texts.append(ingredient.get('notes', ''))
                elif isinstance(ingredient, str):
                    texts.append(ingredient)

        linked_ingredients = getattr(self, 'recipe_ingredients', None)
        if linked_ingredients is not None:
            try:
                for ingredient in linked_ingredients.select_related('food').all():
                    texts.append(getattr(ingredient.food, 'name', ''))
                    texts.append(getattr(ingredient.food, 'brand', ''))
                    texts.append(ingredient.notes or '')
            except Exception:
                pass

        for text in texts:
            normalized = self._normalize_allergen_text(text)
            if normalized:
                yield normalized

    def _normalize_allergen_key(self, value):
        key = self._normalize_allergen_text(value).replace(' ', '-').replace('_', '-')
        if not key:
            return ''

        return self.ALLERGEN_ALIASES.get(key, key)

    def _iter_explicit_food_allergens(self):
        linked_ingredients = getattr(self, 'recipe_ingredients', None)
        if linked_ingredients is None:
            return

        try:
            for ingredient in linked_ingredients.select_related('food').all():
                food_allergens = getattr(ingredient.food, 'allergens', []) if ingredient.food else []
                if not isinstance(food_allergens, list):
                    continue
                for allergen in food_allergens:
                    normalized = self._normalize_allergen_key(allergen)
                    if normalized:
                        yield normalized
        except Exception:
            return

    def _detect_common_allergens(self):
        detected = []
        seen = set()
        explicit_allergens = set(self._iter_explicit_food_allergens())
        source_texts = list(self._iter_allergen_source_texts())

        for allergen, keywords in self.ALLERGEN_KEYWORDS.items():
            has_explicit = allergen in explicit_allergens
            has_keyword_match = any(any(keyword in source_text for keyword in keywords) for source_text in source_texts)
            if has_explicit or has_keyword_match:
                if allergen not in seen:
                    seen.add(allergen)
                    detected.append(allergen)

        for allergen in explicit_allergens:
            if allergen not in seen:
                seen.add(allergen)
                detected.append(allergen)

        return detected

    def refresh_allergen_flags(self, save=True):
        """
        Calcula alérgenos detectados y etiquetas sin alérgenos a partir de los ingredientes.
        Las etiquetas free-from solo permanecen si no se detecta el alérgeno correspondiente.
        """
        source_texts = list(self._iter_allergen_source_texts())
        explicit_allergens = set(self._iter_explicit_food_allergens())
        if not source_texts and not explicit_allergens:
            return False

        detected_allergens = []
        seen_allergens = set()
        for allergen, keywords in self.ALLERGEN_KEYWORDS.items():
            has_explicit = allergen in explicit_allergens
            has_keyword_match = any(any(keyword in source_text for keyword in keywords) for source_text in source_texts)
            if has_explicit or has_keyword_match:
                if allergen not in seen_allergens:
                    seen_allergens.add(allergen)
                    detected_allergens.append(allergen)

        for allergen in explicit_allergens:
            if allergen not in seen_allergens:
                seen_allergens.add(allergen)
                detected_allergens.append(allergen)

        current_diet_types = []
        if isinstance(self.diet_types, list):
            for item in self.diet_types:
                normalized = self._normalize_allergen_text(item).replace(' ', '-')
                if normalized and normalized not in current_diet_types:
                    current_diet_types.append(normalized)

        preserved_diet_types = [
            diet_type
            for diet_type in current_diet_types
            if diet_type not in self.AUTO_FREE_FROM_DIET_TYPES
        ]

        computed_free_from = []
        for diet_type, allergen in self.AUTO_FREE_FROM_DIET_TYPES.items():
            if allergen not in detected_allergens:
                computed_free_from.append(diet_type)

        merged_diet_types = preserved_diet_types + computed_free_from
        if isinstance(self.allergens, list):
            current_allergens = [self._normalize_allergen_text(item) for item in self.allergens if self._normalize_allergen_text(item)]
        else:
            current_allergens = []

        needs_update = current_allergens != detected_allergens or current_diet_types != merged_diet_types
        if not needs_update:
            return False

        self.allergens = detected_allergens
        self.diet_types = merged_diet_types

        if save and self.pk:
            Recipe.objects.filter(pk=self.pk).update(
                allergens=detected_allergens,
                diet_types=merged_diet_types,
            )

        return True
    
    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"
    
    @property
    def total_time_minutes(self):
        """Tiempo total de preparación + cocción"""
        return self.prep_time_minutes + self.cook_time_minutes
    
    @property
    def macros_summary(self):
        """Resumen de macros"""
        return {
            'calories': self.calories,
            'protein': float(self.protein),
            'carbs': float(self.carbs),
            'fat': float(self.fat),
        }
    
    def calculate_macros_from_ingredients(self, save=True):
        """
        Calcula los macros totales basándose en los ingredientes vinculados.
        Los valores se calculan por porción (dividido entre servings).
        """
        ingredients = self.recipe_ingredients.all()
        
        if not ingredients.exists():
            return False
        
        total_calories = 0
        total_protein = 0
        total_carbs = 0
        total_fat = 0
        total_fiber = 0
        total_sugar = 0
        total_sodium = 0
        
        for ingredient in ingredients:
            # Calcular proporción teniendo en cuenta unidades por pieza (ud, unidad, lata, etc.)
            ratio = ingredient.get_nutrition_ratio()
            
            total_calories += ingredient.food.calories * ratio
            total_protein += float(ingredient.food.protein) * ratio
            total_carbs += float(ingredient.food.carbs) * ratio
            total_fat += float(ingredient.food.fat) * ratio
            total_fiber += float(ingredient.food.fiber) * ratio
            total_sugar += float(ingredient.food.sugar) * ratio
            total_sodium += float(ingredient.food.sodium) * ratio
        
        # Dividir por porciones
        servings = self.servings if self.servings > 0 else 1
        
        self.calories = int(total_calories / servings)
        self.protein = round(total_protein / servings, 2)
        self.carbs = round(total_carbs / servings, 2)
        self.fat = round(total_fat / servings, 2)
        self.fiber = round(total_fiber / servings, 2)
        self.sugar = round(total_sugar / servings, 2)
        self.sodium = round(total_sodium / servings, 2)
        
        if save:
            self.save()
        
        return True

    def calculate_macros_from_ingredient_names(self, save=True):
        """
        Calcula macros desde el campo JSON de ingredientes cuando no hay ingredientes vinculados.
        Intenta resolver alimentos por nombre y cantidades en gramos.
        """
        if not isinstance(self.ingredients, list) or not self.ingredients:
            return False

        total_calories = 0
        total_protein = 0
        total_carbs = 0
        total_fat = 0
        total_fiber = 0
        total_sugar = 0
        total_sodium = 0

        def parse_line(line: str):
            # Busca patrones como "200g pollo" o "200 g pollo".
            match = re.search(r"(\d+(?:\.\d+)?)\s*(g|ml)", line.lower())
            if match:
                qty = float(match.group(1))
                unit = match.group(2)
                name = re.sub(r"\d+(?:\.\d+)?\s*(g|ml)", "", line, flags=re.IGNORECASE).strip()
                return name, qty, unit
            return line.strip(), 100.0, "g"

        for ingredient in self.ingredients:
            if isinstance(ingredient, dict):
                name = (ingredient.get('name') or '').strip()
                quantity = float(ingredient.get('amount') or ingredient.get('quantity') or 100)
                unit = (ingredient.get('unit') or 'g').lower()
            elif isinstance(ingredient, str):
                name, quantity, unit = parse_line(ingredient)
            else:
                continue

            if not name:
                continue

            food = Food.objects.filter(name__iexact=name).first()
            if not food:
                food = Food.objects.filter(name__icontains=name).first()
            if not food:
                continue

            ratio = RecipeIngredient.compute_nutrition_ratio(
                quantity=quantity,
                unit=unit,
                food=food,
            )
            total_calories += food.calories * ratio
            total_protein += float(food.protein) * ratio
            total_carbs += float(food.carbs) * ratio
            total_fat += float(food.fat) * ratio
            total_fiber += float(food.fiber) * ratio
            total_sugar += float(food.sugar) * ratio
            total_sodium += float(food.sodium) * ratio

        if total_calories == 0:
            return False

        servings = self.servings if self.servings > 0 else 1

        self.calories = int(total_calories / servings)
        self.protein = round(total_protein / servings, 2)
        self.carbs = round(total_carbs / servings, 2)
        self.fat = round(total_fat / servings, 2)
        self.fiber = round(total_fiber / servings, 2)
        self.sugar = round(total_sugar / servings, 2)
        self.sodium = round(total_sodium / servings, 2)

        if save:
            self.save()

        return True

    def calculate_macros_from_ingredients_source(self) -> bool:
        """
        Calcula macros con la mejor fuente disponible.
        Prioriza ingredientes vinculados, luego el JSON de ingredientes.
        """
        if self.recipe_ingredients.exists():
            return self.calculate_macros_from_ingredients(save=False)
        return self.calculate_macros_from_ingredient_names(save=False)

    def save(self, *args, **kwargs):
        skip_recalc = kwargs.pop('_skip_macro_recalc', False)
        super().save(*args, **kwargs)
        if skip_recalc:
            return

        if self.calculate_macros_from_ingredients_source():
            Recipe.objects.filter(pk=self.pk).update(
                calories=self.calories,
                protein=self.protein,
                carbs=self.carbs,
                fat=self.fat,
                fiber=self.fiber,
                sugar=self.sugar,
                sodium=self.sodium,
            )

        self.refresh_allergen_flags()
    
    def get_adjusted_macros(self, multiplier=1.0):
        """
        Devuelve los macros ajustados según un multiplicador.
        Útil para planes de pérdida de peso (0.85) o ganancia muscular (1.15).
        """
        mult = float(multiplier)
        return {
            'calories': int(self.calories * mult),
            'protein': round(float(self.protein) * mult, 1),
            'carbs': round(float(self.carbs) * mult, 1),
            'fat': round(float(self.fat) * mult, 1),
            'fiber': round(float(self.fiber) * mult, 1),
            'sugar': round(float(self.sugar) * mult, 1),
            'sodium': round(float(self.sodium) * mult, 1),
            'multiplier': mult,
        }


class RecipeIngredient(TimeStampedModel):
    """
    Ingrediente de una receta vinculado a un alimento de la BD.
    Permite calcular macros automáticamente.
    """
    
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name='recipe_ingredients'
    )
    food = models.ForeignKey(
        'Food',
        on_delete=models.CASCADE,
        related_name='used_in_recipes'
    )
    
    # Cantidad en gramos (o unidad según el alimento)
    quantity = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=100,
        help_text="Cantidad en gramos"
    )
    unit = models.CharField(
        max_length=30,
        default="g",
        help_text="Unidad de medida"
    )
    
    # Notas opcionales (ej: "picado", "cocido")
    notes = models.CharField(max_length=100, blank=True)
    
    # Orden en la lista de ingredientes
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['order', 'created_at']
        verbose_name = "Ingrediente de receta"
        verbose_name_plural = "Ingredientes de receta"

    WEIGHT_UNITS = {
        'g', 'gr', 'gramo', 'gramos',
        'kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos',
    }
    VOLUME_UNITS = {
        'ml', 'mililitro', 'mililitros',
        'l', 'lt', 'litro', 'litros',
    }
    UNIT_BASED_UNITS = {
        'ud', 'uds', 'u', 'unit', 'units',
        'unidad', 'unidades', 'pieza', 'piezas',
        'lata', 'latas',
    }

    @classmethod
    def _normalize_unit(cls, value):
        normalized = unicodedata.normalize('NFKD', str(value or '')).encode('ascii', 'ignore').decode('ascii').lower().strip()
        normalized = normalized.replace('.', '')
        normalized = normalized.replace('-', ' ')
        normalized = ' '.join(normalized.split())

        aliases = {
            'gram': 'g',
            'grams': 'g',
            'kilogram': 'kg',
            'kilograms': 'kg',
            'milliliter': 'ml',
            'milliliters': 'ml',
            'liter': 'l',
            'liters': 'l',
            'unidades': 'unidades',
            'uni': 'ud',
        }
        return aliases.get(normalized, normalized)

    @classmethod
    def _to_base_weight_or_volume(cls, quantity, normalized_unit):
        if normalized_unit in {'g', 'gr', 'gramo', 'gramos'}:
            return quantity
        if normalized_unit in {'kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'}:
            return quantity * 1000
        if normalized_unit in {'ml', 'mililitro', 'mililitros'}:
            return quantity
        if normalized_unit in {'l', 'lt', 'litro', 'litros'}:
            return quantity * 1000
        return None

    @classmethod
    def compute_nutrition_ratio(cls, quantity, unit, food):
        """
        Retorna el ratio a aplicar sobre macros del alimento.

        Convenciones soportadas:
        - Alimentos base en gramos/ml (por 100): ratio = cantidad_equivalente / 100
        - Alimentos por pieza/unidad (ud, unidad, lata...):
          - Si serving_size <= 10, se asume macros por unidad base (normalmente 1 ud)
          - Si serving_size > 10, se asume gramos/ml por unidad y se convierte a base 100
        """
        qty = float(quantity or 0)
        if qty <= 0 or not food:
            return 0.0

        ingredient_unit = cls._normalize_unit(unit) or 'g'
        food_unit = cls._normalize_unit(getattr(food, 'serving_unit', 'g')) or 'g'

        try:
            serving_size = float(getattr(food, 'serving_size', 0) or 0)
        except (TypeError, ValueError):
            serving_size = 0

        food_is_unit_based = food_unit in cls.UNIT_BASED_UNITS
        ingredient_is_unit_based = ingredient_unit in cls.UNIT_BASED_UNITS

        if food_is_unit_based:
            base_amount = serving_size if serving_size > 0 else 1.0

            # Heurística para cubrir dos modos frecuentes en datos reales:
            # - serving_size pequeño (1-2): macros introducidos por unidad
            # - serving_size grande (ej: 55): gramos/ml por unidad
            if base_amount <= 10:
                if ingredient_is_unit_based or ingredient_unit == food_unit:
                    return qty / base_amount

                converted = cls._to_base_weight_or_volume(qty, ingredient_unit)
                if converted is not None:
                    # No conocemos el peso real de una unidad cuando el alimento
                    # esta definido como "1 ud"; evita interpretar 55 g como 55 uds.
                    return converted / 100.0

                return qty / base_amount

            converted = cls._to_base_weight_or_volume(qty, ingredient_unit)
            if converted is not None:
                return converted / 100.0

            if ingredient_is_unit_based or ingredient_unit == food_unit:
                return (qty * base_amount) / 100.0

            return qty / 100.0

        converted = cls._to_base_weight_or_volume(qty, ingredient_unit)
        if converted is not None:
            return converted / 100.0

        if ingredient_is_unit_based and serving_size > 0:
            return (qty * serving_size) / 100.0

        return qty / 100.0

    def get_nutrition_ratio(self):
        return self.compute_nutrition_ratio(
            quantity=self.quantity,
            unit=self.unit,
            food=self.food,
        )
    
    def __str__(self):
        return f"{self.quantity}{self.unit} {self.food.name}"
    
    @property
    def calculated_macros(self):
        """Macros calculados para esta cantidad de ingrediente"""
        ratio = self.get_nutrition_ratio()
        return {
            'calories': int(self.food.calories * ratio),
            'protein': round(float(self.food.protein) * ratio, 2),
            'carbs': round(float(self.food.carbs) * ratio, 2),
            'fat': round(float(self.food.fat) * ratio, 2),
            'fiber': round(float(self.food.fiber) * ratio, 2),
            'sugar': round(float(self.food.sugar) * ratio, 2),
            'sodium': round(float(self.food.sodium) * ratio, 2),
        }
    
    def save(self, *args, **kwargs):
        normalized_unit = self._normalize_unit(self.unit)
        if not normalized_unit and self.food_id:
            normalized_unit = self._normalize_unit(getattr(self.food, 'serving_unit', 'g'))
        self.unit = normalized_unit or 'g'

        super().save(*args, **kwargs)
        # Recalcular macros de la receta al guardar ingrediente
        self.recipe.calculate_macros_from_ingredients()
        self.recipe.refresh_allergen_flags()
    
    def delete(self, *args, **kwargs):
        recipe = self.recipe
        super().delete(*args, **kwargs)
        # Recalcular macros después de eliminar
        recipe.calculate_macros_from_ingredients()
        recipe.refresh_allergen_flags()


# =============================================================================
# PLANES DE NUTRICIÓN
# =============================================================================

class NutritionPlan(TimeStampedModel):
    """
    Plan de nutrición - unifica planes del sistema y de usuarios
    
    Uso:
    - is_system=True: Plan del sistema (plantilla)
    - is_system=False, user=None: Plantilla creada por admin
    - is_system=False, user=User: Plan activo de un usuario
    """
    
    GOAL_CHOICES = [
        ('lose_weight', 'Perder peso'),
        ('gain_muscle', 'Ganar músculo'),
        ('maintain', 'Mantener peso'),
        ('body_recomposition', 'Recomposición corporal'),
        ('performance', 'Rendimiento deportivo'),
    ]
    
    DIET_TYPE_CHOICES = [
        ('normal', 'Normal'),
        ('vegetarian', 'Vegetariano'),
        ('vegan', 'Vegano'),
        ('keto', 'Keto'),
        ('paleo', 'Paleo'),
        ('mediterranean', 'Mediterránea'),
        ('low_carb', 'Bajo en carbohidratos'),
        ('high_protein', 'Alto en proteínas'),
    ]
    
    # Información básica
    name = models.CharField(max_length=200, help_text="Nombre del plan")
    description = models.TextField(blank=True, help_text="Descripción del plan")
    
    # Objetivos nutricionales diarios
    daily_calories = models.PositiveIntegerField(
        default=2000,
        help_text="Calorías diarias objetivo"
    )
    protein_grams = models.PositiveIntegerField(
        default=150,
        help_text="Proteínas diarias en gramos"
    )
    carbs_grams = models.PositiveIntegerField(
        default=200,
        help_text="Carbohidratos diarios en gramos"
    )
    fat_grams = models.PositiveIntegerField(
        default=65,
        help_text="Grasas diarias en gramos"
    )
    fiber_grams = models.PositiveIntegerField(
        default=25,
        help_text="Fibra diaria en gramos"
    )
    
    # Porcentajes de macros (opcionales - si se definen, tienen prioridad)
    protein_percentage = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="% de calorías de proteína (opcional)"
    )
    carbs_percentage = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="% de calorías de carbohidratos (opcional)"
    )
    fat_percentage = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="% de calorías de grasa (opcional)"
    )
    
    # Configuración
    goal = models.CharField(
        max_length=50, 
        choices=GOAL_CHOICES, 
        default='maintain'
    )
    diet_type = models.CharField(
        max_length=50, 
        choices=DIET_TYPE_CHOICES, 
        default='normal'
    )
    meals_per_day = models.PositiveIntegerField(
        default=5,
        validators=[MinValueValidator(1), MaxValueValidator(8)],
        help_text="Comidas por día (típico: 5 = Desayuno, Snack, Almuerzo, Snack, Cena)"
    )
    duration_weeks = models.PositiveIntegerField(
        default=4, 
        help_text="Duración en semanas"
    )
    
    # Multiplicador de porciones según objetivo
    # Permite ajustar las porciones de las recetas automáticamente
    portion_multiplier = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=1.0,
        help_text="Multiplicador de porciones (0.8 = 80%, 1.0 = 100%, 1.2 = 120%)"
    )
    
    # Flags
    is_template = models.BooleanField(
        default=False, 
        help_text="True = plantilla reutilizable"
    )
    is_system = models.BooleanField(
        default=False, 
        help_text="True = plan del sistema"
    )
    is_active = models.BooleanField(
        default=True, 
        help_text="False = plan inactivo"
    )
    
    # Propiedad
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, 
        blank=True, 
        on_delete=models.CASCADE,
        related_name='nutrition_plans',
        help_text="Usuario (null = plantilla/sistema)"
    )
    assigned_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='NutritionPlanAssignment',
        related_name='assigned_nutrition_plans',
        blank=True,
        help_text="Usuarios asignados al plan (multiusuario)"
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='nutrition_plans_created'
    )
    
    # Fechas
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    # Metadata
    tags = models.JSONField(default=list, blank=True)
    image_url = models.URLField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Plan de Nutrición"
        verbose_name_plural = "Planes de Nutrición"
    
    def __str__(self):
        if self.user:
            return f"{self.name} ({self.user.email})"
        return f"{self.name} (Sistema/Plantilla)"
    
    @property
    def macro_percentages(self):
        """Calcula porcentajes de macros - usa los definidos o calcula desde gramos"""
        # Si hay porcentajes definidos, usarlos
        if self.protein_percentage is not None and self.carbs_percentage is not None and self.fat_percentage is not None:
            return {
                'protein': self.protein_percentage,
                'carbs': self.carbs_percentage,
                'fat': self.fat_percentage,
            }
        
        # Calcular desde gramos
        total_cals = (self.protein_grams * 4) + (self.carbs_grams * 4) + (self.fat_grams * 9)
        if total_cals == 0:
            return {'protein': 0, 'carbs': 0, 'fat': 0}
        return {
            'protein': round((self.protein_grams * 4 / total_cals) * 100, 1),
            'carbs': round((self.carbs_grams * 4 / total_cals) * 100, 1),
            'fat': round((self.fat_grams * 9 / total_cals) * 100, 1),
        }
    
    def set_macros_from_percentages(self, protein_pct: int, carbs_pct: int, fat_pct: int, save: bool = True):
        """
        Establece los gramos de macros basándose en porcentajes y calorías diarias.
        Proteína y carbos = 4 cal/g, Grasa = 9 cal/g
        """
        self.protein_percentage = protein_pct
        self.carbs_percentage = carbs_pct
        self.fat_percentage = fat_pct
        
        # Calcular gramos
        self.protein_grams = int((self.daily_calories * protein_pct / 100) / 4)
        self.carbs_grams = int((self.daily_calories * carbs_pct / 100) / 4)
        self.fat_grams = int((self.daily_calories * fat_pct / 100) / 9)
        
        if save:
            self.save()
    
    def set_macros_from_grams(self, protein_g: int, carbs_g: int, fat_g: int, save: bool = True):
        """
        Establece los gramos de macros y calcula los porcentajes automáticamente.
        """
        self.protein_grams = protein_g
        self.carbs_grams = carbs_g
        self.fat_grams = fat_g
        
        # Calcular porcentajes
        total_cals = (protein_g * 4) + (carbs_g * 4) + (fat_g * 9)
        if total_cals > 0:
            self.protein_percentage = round((protein_g * 4 / total_cals) * 100)
            self.carbs_percentage = round((carbs_g * 4 / total_cals) * 100)
            self.fat_percentage = round((fat_g * 9 / total_cals) * 100)
        
        if save:
            self.save()
    
    def get_adjusted_recipe_macros(self, recipe):
        """
        Retorna los macros de una receta ajustados según el multiplicador del plan.
        
        Args:
            recipe: Objeto Recipe
        
        Returns:
            dict con macros ajustados
        """
        multiplier = float(self.portion_multiplier) if self.portion_multiplier else 1.0
        
        return {
            'calories': int(recipe.calories * multiplier),
            'protein': round(float(recipe.protein) * multiplier, 2),
            'carbs': round(float(recipe.carbs) * multiplier, 2),
            'fat': round(float(recipe.fat) * multiplier, 2),
            'fiber': round(float(recipe.fiber) * multiplier, 2),
            'portion_multiplier': multiplier,
            'original_calories': recipe.calories,
        }
    
    def get_portion_multiplier_for_goal(self):
        """
        Retorna el multiplicador recomendado según el objetivo.
        """
        multipliers = {
            'lose_weight': 0.85,       # 85% de la porción normal
            'maintain': 1.0,           # 100% porción normal
            'gain_muscle': 1.15,       # 115% de la porción normal
            'body_recomposition': 1.0, # 100% porción normal
            'performance': 1.2,        # 120% de la porción normal
        }
        return multipliers.get(self.goal, 1.0)
    
    def apply_goal_multiplier(self, save=True):
        """
        Aplica el multiplicador recomendado según el objetivo.
        """
        self.portion_multiplier = self.get_portion_multiplier_for_goal()
        if save:
            self.save()

    def save(self, *args, **kwargs):
        """Garantiza que un usuario tenga como maximo un plan activo propio."""
        with transaction.atomic():
            super().save(*args, **kwargs)
            if self.user_id and self.is_active:
                NutritionPlan.objects.filter(
                    user_id=self.user_id,
                    is_active=True,
                ).exclude(pk=self.pk).update(is_active=False)


class NutritionPlanAssignment(TimeStampedModel):
    """
    Asignación de plan a usuario (permite multiusuario).
    is_active es por usuario, no global.
    """

    plan = models.ForeignKey(
        NutritionPlan,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='nutrition_plan_assignments'
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Plan activo para este usuario"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['plan', 'user']
        ordering = ['-assigned_at']
        verbose_name = "Asignacion de Plan"
        verbose_name_plural = "Asignaciones de Plan"

    def __str__(self):
        return f"{self.plan.name} -> {self.user.email}"

    def save(self, *args, **kwargs):
        """Garantiza una sola asignacion activa por usuario."""
        with transaction.atomic():
            super().save(*args, **kwargs)
            if self.is_active:
                NutritionPlanAssignment.objects.filter(
                    user_id=self.user_id,
                    is_active=True,
                ).exclude(pk=self.pk).update(is_active=False)


# =============================================================================
# COMIDAS EN PLAN
# =============================================================================

class PlanMeal(TimeStampedModel):
    """
    Comida dentro de un plan de nutrición
    Define las comidas del día y sus objetivos calóricos
    """

    day_of_week = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        choices=[
            (1, 'Lunes'),
            (2, 'Martes'),
            (3, 'Miércoles'),
            (4, 'Jueves'),
            (5, 'Viernes'),
            (6, 'Sábado'),
            (7, 'Domingo'),
        ],
        help_text="Día de la semana (1=Lunes..7=Domingo). Null = aplica a cualquier día."
    )

    name = models.CharField(
        max_length=200,
        help_text="Nombre de la comida (ej: 'Desayuno energético')"
    )

    plan = models.ForeignKey(
        NutritionPlan,
        on_delete=models.CASCADE,
        related_name='meals'
    )
    
    MEAL_TYPE_CHOICES = [
        ('breakfast', 'Desayuno'),
        ('lunch', 'Comida'),
        ('snack', 'Merienda'),
        ('dinner', 'Cena'),
    ]

    meal_type = models.CharField(
        max_length=50, 
        choices=MEAL_TYPE_CHOICES,
        default='lunch'
    )
    time = models.TimeField(
        null=True, 
        blank=True,
        help_text="Hora sugerida"
    )
    
    # Objetivos nutricionales para esta comida
    calories = models.PositiveIntegerField(
        default=400,
        help_text="Calorías objetivo"
    )
    protein = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        default=30,
        help_text="Proteínas en gramos"
    )
    carbs = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        default=40,
        help_text="Carbohidratos en gramos"
    )
    fat = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        default=15,
        help_text="Grasas en gramos"
    )
    
    # Opciones de recetas sugeridas (relación simple)
    suggested_recipes = models.ManyToManyField(
        Recipe, 
        blank=True, 
        related_name='suggested_in_meals',
        help_text="Recetas sugeridas para esta comida"
    )
    
    # Nota: Las cantidades personalizadas se almacenan en PlanMealRecipe
    
    description = models.TextField(
        blank=True, 
        help_text="Descripción o sugerencias"
    )
    order_index = models.PositiveIntegerField(
        default=1, 
        help_text="Orden en el día"
    )
    
    class Meta:
        ordering = ['day_of_week', 'order_index']
        verbose_name = "Comida en Plan"
        verbose_name_plural = "Comidas en Plan"
    
    def __str__(self):
        return f"{self.plan.name} - {self.get_meal_type_display()}"


# =============================================================================
# RECETAS SUGERIDAS EN COMIDAS (con cantidades personalizadas)
# =============================================================================

class PlanMealRecipe(TimeStampedModel):
    """
    Modelo intermedio para almacenar recetas sugeridas en comidas con cantidades personalizadas
    Permite editar las cantidades y macros que se muestran al usuario final
    """
    meal = models.ForeignKey(
        PlanMeal,
        on_delete=models.CASCADE,
        related_name='meal_recipes'
    )
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name='meal_suggestions'
    )
    
    # Cantidades personalizadas (por defecto usa los valores de la receta)
    servings = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=1.0,
        help_text="Número de porciones personalizado (por defecto 1.0 = valores originales de la receta)"
    )
    
    # Macros personalizados (opcionales, si están null usa los de la receta escalados)
    custom_calories = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Calorías personalizadas (null = calcular desde receta * servings)"
    )
    custom_protein = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Proteínas personalizadas en gramos (null = calcular desde receta * servings)"
    )
    custom_carbs = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Carbohidratos personalizados en gramos (null = calcular desde receta * servings)"
    )
    custom_fat = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Grasas personalizadas en gramos (null = calcular desde receta * servings)"
    )
    
    # Orden de visualización
    display_order = models.PositiveIntegerField(
        default=0,
        help_text="Orden de visualización (menor = primero)"
    )
    
    class Meta:
        ordering = ['display_order', 'created_at']
        unique_together = ['meal', 'recipe']
        verbose_name = "Receta Sugerida en Comida"
        verbose_name_plural = "Recetas Sugeridas en Comidas"
    
    def __str__(self):
        return f"{self.meal.name} - {self.recipe.name}"
    
    def get_display_calories(self):
        """Obtiene las calorías a mostrar (personalizadas o calculadas)"""
        if self.custom_calories is not None:
            return self.custom_calories
        if self.recipe.calories:
            return int(float(self.recipe.calories) * float(self.servings))
        return 0
    
    def get_display_protein(self):
        """Obtiene las proteínas a mostrar (personalizadas o calculadas)"""
        if self.custom_protein is not None:
            return float(self.custom_protein)
        if self.recipe.protein:
            return float(self.recipe.protein) * float(self.servings)
        return 0.0
    
    def get_display_carbs(self):
        """Obtiene los carbohidratos a mostrar (personalizados o calculados)"""
        if self.custom_carbs is not None:
            return float(self.custom_carbs)
        if self.recipe.carbs:
            return float(self.recipe.carbs) * float(self.servings)
        return 0.0
    
    def get_display_fat(self):
        """Obtiene las grasas a mostrar (personalizadas o calculadas)"""
        if self.custom_fat is not None:
            return float(self.custom_fat)
        if self.recipe.fat:
            return float(self.recipe.fat) * float(self.servings)
        return 0.0


# =============================================================================
# LOG DE COMIDAS
# =============================================================================

class MealLog(TimeStampedModel):
    """
    Registro de una comida realizada por un usuario
    """
    
    MEAL_TYPE_CHOICES = [
        ('breakfast', 'Desayuno'),
        ('lunch', 'Comida'),
        ('snack', 'Merienda'),
        ('dinner', 'Cena'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='meal_logs'
    )
    
    date = models.DateField(help_text="Fecha de la comida")
    meal_type = models.CharField(
        max_length=50, 
        choices=MEAL_TYPE_CHOICES,
        default='other'
    )
    time = models.TimeField(
        null=True, 
        blank=True,
        help_text="Hora de la comida"
    )

    # Referencia al slot del plan (permite múltiples comidas del mismo tipo en un día)
    plan_meal = models.ForeignKey(
        'PlanMeal',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='logs',
        help_text="Comida del plan (slot). Si existe, identifica la selección de forma única."
    )
    
    # Qué comió
    recipe = models.ForeignKey(
        Recipe, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL,
        related_name='logs',
        help_text="Receta usada (si aplica)"
    )
    custom_description = models.TextField(
        blank=True, 
        help_text="Descripción si no usó receta"
    )
    substitution_details = models.JSONField(
        default=list,
        blank=True,
        help_text="Sustituciones aplicadas en la receta: ingrediente original, alimento equivalente y gramos calculados"
    )
    
    # Nutrición real consumida
    calories = models.PositiveIntegerField(
        null=True, 
        blank=True,
        help_text="Calorías consumidas"
    )
    protein = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    carbs = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    fat = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    
    # Detalles adicionales
    servings = models.DecimalField(
        max_digits=4, 
        decimal_places=2, 
        default=1,
        help_text="Número de porciones consumidas"
    )
    
    completed = models.BooleanField(
        default=True, 
        help_text="Si terminó la comida"
    )
    is_skipped = models.BooleanField(
        default=False,
        help_text="Si el usuario marcó esta comida como 'no como'"
    )
    skip_reason = models.TextField(
        blank=True,
        help_text="Motivo opcional por el que se saltó la comida"
    )
    rating = models.PositiveSmallIntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="Valoración (1-5)"
    )
    notes = models.TextField(blank=True)
    
    # Foto de la comida (opcional)
    photo = models.ImageField(
        upload_to='meal_logs/%Y/%m/%d/', 
        null=True, 
        blank=True
    )
    
    class Meta:
        ordering = ['-date', '-time']
        verbose_name = "Log de Comida"
        verbose_name_plural = "Logs de Comidas"
    
    def __str__(self):
        return f"{self.user.email} - {self.get_meal_type_display()} - {self.date}"
    
    def save(self, *args, **kwargs):
        # Auto-rellenar nutrición desde receta si existe
        if self.recipe and not self.calories and not self.is_skipped:
            self.calories = int(self.recipe.calories * float(self.servings))
            self.protein = self.recipe.protein * self.servings
            self.carbs = self.recipe.carbs * self.servings
            self.fat = self.recipe.fat * self.servings

        if self.is_skipped:
            self.completed = False
            self.calories = 0
            self.protein = 0
            self.carbs = 0
            self.fat = 0

        super().save(*args, **kwargs)


class MealRecipeExclusion(TimeStampedModel):
    """Recetas que el usuario marcó para no volver a recibir en sugerencias."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='excluded_meal_recipes'
    )
    recipe = models.ForeignKey(
        Recipe,
        on_delete=models.CASCADE,
        related_name='user_exclusions'
    )
    reason = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Exclusión de receta"
        verbose_name_plural = "Exclusiones de recetas"
        constraints = [
            models.UniqueConstraint(fields=['user', 'recipe'], name='unique_user_recipe_exclusion')
        ]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['recipe', 'is_active']),
        ]

    def __str__(self):
        return f"{self.user.email} excluyó {self.recipe.name}"


class MealIngredientExclusion(TimeStampedModel):
    """Ingredientes que el usuario marcó para no recibir en sugerencias."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='excluded_meal_ingredients'
    )
    term = models.CharField(max_length=120)
    reason = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = "Exclusión de ingrediente"
        verbose_name_plural = "Exclusiones de ingredientes"
        constraints = [
            models.UniqueConstraint(fields=['user', 'term'], name='unique_user_ingredient_exclusion')
        ]
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['term', 'is_active']),
        ]

    def save(self, *args, **kwargs):
        self.term = (self.term or '').strip().lower()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.user.email} excluyó ingrediente: {self.term}"


# =============================================================================
# ALIMENTOS (para tracking detallado - opcional)
# =============================================================================

# =============================================================================
# CATEGORÍAS DE EQUIVALENCIA PERSONALIZABLES
# =============================================================================

class EquivalenceCategory(TimeStampedModel):
    """
    Categoría de equivalencia personalizable para intercambio de alimentos.
    Las categorías del sistema (is_system=True) no pueden eliminarse.
    """
    slug = models.SlugField(
        max_length=60, unique=True,
        help_text="Identificador único (ej: 'arroz_cereales')"
    )
    name = models.CharField(max_length=100, help_text="Nombre legible (ej: 'Arroz / cereales / pasta')")
    description = models.TextField(blank=True)
    color = models.CharField(
        max_length=20, blank=True, default="",
        help_text="Color hex o nombre CSS (ej: '#4CAF50', 'emerald')"
    )
    icon = models.CharField(max_length=10, blank=True, default="", help_text="Emoji o código de icono")
    is_system = models.BooleanField(
        default=False,
        help_text="True = categoría del sistema, no se puede eliminar"
    )
    order = models.PositiveSmallIntegerField(default=0, help_text="Orden de aparición en listas")
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True, on_delete=models.SET_NULL,
        related_name='equivalence_categories_created'
    )

    class Meta:
        ordering = ['order', 'name']
        verbose_name = "Categoría de equivalencia"
        verbose_name_plural = "Categorías de equivalencia"

    def __str__(self):
        return self.name


class Food(TimeStampedModel):
    """
    Alimento base para tracking detallado
    """
    
    STORE_CHOICES = [
        ('mercadona', 'Mercadona'),
        ('carrefour', 'Carrefour'),
        ('lidl', 'Lidl'),
        ('aldi', 'Aldi'),
        ('dia', 'Día'),
        ('alcampo', 'Alcampo'),
        ('eroski', 'Eroski'),
        ('consum', 'Consum'),
        ('hipercor', 'Hipercor'),
        ('otro', 'Otro'),
    ]
    
    name = models.CharField(max_length=200, unique=True)
    brand = models.CharField(max_length=100, blank=True)
    store = models.CharField(
        max_length=50, 
        choices=STORE_CHOICES,
        blank=True,
        help_text="Supermercado donde se puede encontrar"
    )
    
    # Por 100g o por unidad
    serving_size = models.DecimalField(
        max_digits=8, 
        decimal_places=2, 
        default=100
    )
    serving_unit = models.CharField(
        max_length=30, 
        default="g",
        help_text="g, ml, unidad, etc."
    )
    
    # Nutrición
    calories = models.PositiveIntegerField(default=0)
    protein = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    carbs = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fat = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    fiber = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    sugar = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    sodium = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    
    # Clasificación
    category = models.CharField(max_length=100, blank=True)
    equivalence_category = models.CharField(
        max_length=50,
        blank=True,
        db_index=True,
        help_text="Grupo principal de equivalencia (legacy, se mantiene para compatibilidad)"
    )
    equivalence_categories = models.JSONField(
        default=list,
        blank=True,
        help_text="Grupos de equivalencia múltiples: ['arroz_cereales', 'panes']. Si está vacío se usa equivalence_category."
    )
    allergens = models.JSONField(
        default=list,
        blank=True,
        help_text="Alérgenos estructurados del alimento: ['gluten', 'dairy', 'eggs', 'nuts', 'soy', 'fish', 'shellfish', 'sesame']"
    )
    is_verified = models.BooleanField(default=False)
    
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, 
        blank=True, 
        on_delete=models.SET_NULL
    )
    
    class Meta:
        ordering = ['name']
        verbose_name = "Alimento"
        verbose_name_plural = "Alimentos"
    
    def __str__(self):
        if self.brand:
            return f"{self.name} ({self.brand})"
        return self.name

    def get_equivalence_categories(self):
        """Devuelve la lista de categorías de equivalencia activas para este alimento."""
        cats = self.equivalence_categories if isinstance(self.equivalence_categories, list) else []
        if not cats and self.equivalence_category:
            return [self.equivalence_category]
        return cats

    def save(self, *args, **kwargs):
        self.serving_unit = RecipeIngredient._normalize_unit(self.serving_unit) or 'g'
        super().save(*args, **kwargs)


# =============================================================================
# HISTORIAL DE PLANES (para auditoría)
# =============================================================================

class NutritionPlanHistory(TimeStampedModel):
    """
    Historial de cambios de planes nutricionales
    """
    
    CHANGE_REASONS = [
        ('user_request', 'Solicitud del usuario'),
        ('admin_change', 'Cambio por administrador'),
        ('auto_assigned', 'Asignación automática'),
        ('goal_change', 'Cambio de objetivo'),
        ('upgrade', 'Actualización de plan'),
        ('other', 'Otro'),
    ]
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='nutrition_plan_history'
    )
    old_plan = models.ForeignKey(
        NutritionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='history_as_old'
    )
    new_plan = models.ForeignKey(
        NutritionPlan,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='history_as_new'
    )
    
    # Nombres (por si se eliminan los planes)
    old_plan_name = models.CharField(max_length=200, blank=True)
    new_plan_name = models.CharField(max_length=200, blank=True)
    
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='nutrition_changes_made'
    )
    reason = models.CharField(
        max_length=30,
        choices=CHANGE_REASONS,
        default='other'
    )
    notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Historial de Plan Nutricional"
        verbose_name_plural = "Historial de Planes Nutricionales"
    
    def __str__(self):
        return f"{self.user.email} - {self.old_plan_name} → {self.new_plan_name}"


# =============================================================================
# COMUNIDAD DE RECETAS
# =============================================================================

class CommunityRecipePost(TimeStampedModel):
    """Publicación temporal de receta subida por una usuaria del Team."""

    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='community_recipe_posts',
    )
    title = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    ingredients = models.TextField(blank=True)
    instructions = models.TextField(blank=True)
    photo = models.ImageField(upload_to=community_recipe_image_path)
    expires_at = models.DateTimeField(db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['expires_at', 'created_at']),
            models.Index(fields=['author', 'created_at']),
        ]
        verbose_name = "Publicación de receta de comunidad"
        verbose_name_plural = "Publicaciones de recetas de comunidad"

    def __str__(self):
        return f"{self.title} - {self.author.email}"

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=7)
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        photo = self.photo
        super().delete(*args, **kwargs)
        if photo:
            photo.delete(save=False)

    @property
    def is_expired(self):
        return timezone.now() >= self.expires_at


class CommunityRecipeComment(TimeStampedModel):
    post = models.ForeignKey(
        CommunityRecipePost,
        on_delete=models.CASCADE,
        related_name='comments',
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='community_recipe_comments',
    )
    text = models.TextField(max_length=1000)

    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['post', 'created_at']),
        ]
        verbose_name = "Comentario de receta de comunidad"
        verbose_name_plural = "Comentarios de recetas de comunidad"

    def __str__(self):
        return f"Comentario de {self.author.email} en {self.post_id}"


class CommunityRecipeLike(TimeStampedModel):
    post = models.ForeignKey(
        CommunityRecipePost,
        on_delete=models.CASCADE,
        related_name='likes',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='community_recipe_likes',
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['post', 'user'], name='unique_community_recipe_like'),
        ]
        indexes = [
            models.Index(fields=['post', 'user']),
        ]
        verbose_name = "Like de receta de comunidad"
        verbose_name_plural = "Likes de recetas de comunidad"

    def __str__(self):
        return f"Like de {self.user.email} en {self.post_id}"
