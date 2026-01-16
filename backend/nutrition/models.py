# nutrition/models.py
# Modelos de nutrición - Versión reestructurada y simplificada

import uuid
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


class TimeStampedModel(models.Model):
    """Modelo base con timestamps"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        abstract = True


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
        ('easy', 'Fácil'),
        ('medium', 'Medio'),
        ('hard', 'Difícil'),
    ]
    
    CATEGORY_CHOICES = [
        ('breakfast', 'Desayuno'),
        ('lunch', 'Almuerzo'),
        ('dinner', 'Cena'),
        ('snack', 'Snack'),
        ('dessert', 'Postre'),
        ('drink', 'Bebida'),
    ]
    
    # Información básica
    name = models.CharField(max_length=200, help_text="Nombre de la receta")
    description = models.TextField(blank=True, help_text="Descripción breve")
    category = models.CharField(
        max_length=50, 
        choices=CATEGORY_CHOICES,
        default='lunch',
        help_text="Categoría principal"
    )
    
    # Dificultad y tiempo
    difficulty = models.CharField(
        max_length=20, 
        choices=DIFFICULTY_CHOICES, 
        default='easy'
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
        """Calcula porcentajes de macros"""
        total_cals = (self.protein_grams * 4) + (self.carbs_grams * 4) + (self.fat_grams * 9)
        if total_cals == 0:
            return {'protein': 0, 'carbs': 0, 'fat': 0}
        return {
            'protein': round((self.protein_grams * 4 / total_cals) * 100, 1),
            'carbs': round((self.carbs_grams * 4 / total_cals) * 100, 1),
            'fat': round((self.fat_grams * 9 / total_cals) * 100, 1),
        }


# =============================================================================
# COMIDAS EN PLAN
# =============================================================================

class PlanMeal(TimeStampedModel):
    """
    Comida dentro de un plan de nutrición
    Define las comidas del día y sus objetivos calóricos
    """
    
    MEAL_TYPE_CHOICES = [
        ('breakfast', 'Desayuno'),
        ('morning_snack', 'Snack Mañana'),
        ('lunch', 'Almuerzo'),
        ('afternoon_snack', 'Snack Tarde'),
        ('dinner', 'Cena'),
        ('evening_snack', 'Snack Noche'),
        ('pre_workout', 'Pre-Entreno'),
        ('post_workout', 'Post-Entreno'),
    ]

    DAY_OF_WEEK_CHOICES = [
        (1, 'Lunes'),
        (2, 'Martes'),
        (3, 'Miércoles'),
        (4, 'Jueves'),
        (5, 'Viernes'),
        (6, 'Sábado'),
        (7, 'Domingo'),
    ]
    
    plan = models.ForeignKey(
        NutritionPlan, 
        on_delete=models.CASCADE, 
        related_name='meals'
    )

    # Día de la semana (opcional). Si es null, la comida aplica a cualquier día (compatibilidad).
    day_of_week = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        choices=DAY_OF_WEEK_CHOICES,
        help_text="Día de la semana (1=Lunes..7=Domingo). Null = aplica a cualquier día."
    )
    
    name = models.CharField(
        max_length=200, 
        help_text="Nombre de la comida (ej: 'Desayuno energético')"
    )
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
        ('morning_snack', 'Snack Mañana'),
        ('lunch', 'Almuerzo'),
        ('afternoon_snack', 'Snack Tarde'),
        ('dinner', 'Cena'),
        ('evening_snack', 'Snack Noche'),
        ('other', 'Otro'),
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
        if self.recipe and not self.calories:
            self.calories = int(self.recipe.calories * float(self.servings))
            self.protein = self.recipe.protein * self.servings
            self.carbs = self.recipe.carbs * self.servings
            self.fat = self.recipe.fat * self.servings
        super().save(*args, **kwargs)


# =============================================================================
# ALIMENTOS (para tracking detallado - opcional)
# =============================================================================

class Food(TimeStampedModel):
    """
    Alimento base para tracking detallado
    """
    
    name = models.CharField(max_length=200, unique=True)
    brand = models.CharField(max_length=100, blank=True)
    
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