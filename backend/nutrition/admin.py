# nutrition/admin.py
from django.contrib import admin
from django.contrib import messages
from django.shortcuts import render, redirect
from django.urls import path
from django import forms
from .models import (
    Recipe, NutritionPlan, PlanMeal, MealLog, Food, NutritionPlanHistory,
    CommunityRecipePost, CommunityRecipeComment, CommunityRecipeLike, FoodEquivalenceGroup
)
from .fatsecret_client import OpenFoodFactsClient


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'difficulty', 'calories', 'prep_time_minutes', 'is_system', 'is_featured']
    list_filter = ['category', 'difficulty', 'is_system', 'is_featured', 'is_active']
    search_fields = ['name', 'description']
    ordering = ['name']


class PlanMealInline(admin.TabularInline):
    model = PlanMeal
    extra = 0
    ordering = ['order_index']


@admin.register(NutritionPlan)
class NutritionPlanAdmin(admin.ModelAdmin):
    list_display = ['name', 'daily_calories', 'goal', 'diet_type', 'is_system', 'is_template']
    list_filter = ['goal', 'diet_type', 'is_system', 'is_template', 'is_active']
    search_fields = ['name', 'description']
    inlines = [PlanMealInline]


@admin.register(MealLog)
class MealLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'date', 'meal_type', 'calories', 'completed']
    list_filter = ['meal_type', 'completed', 'date']
    search_fields = ['user__email']
    ordering = ['-date']


class CommunityRecipeCommentInline(admin.TabularInline):
    model = CommunityRecipeComment
    extra = 0
    readonly_fields = ['author', 'text', 'created_at']
    can_delete = True


@admin.register(CommunityRecipePost)
class CommunityRecipePostAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'created_at', 'expires_at']
    list_filter = ['created_at', 'expires_at']
    search_fields = ['title', 'description', 'author__email']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [CommunityRecipeCommentInline]
    ordering = ['-created_at']


@admin.register(CommunityRecipeLike)
class CommunityRecipeLikeAdmin(admin.ModelAdmin):
    list_display = ['post', 'user', 'created_at']
    search_fields = ['post__title', 'user__email']
    ordering = ['-created_at']


class ImportFoodsForm(forms.Form):
    """Formulario para importar alimentos desde OpenFoodFacts"""
    search_term = forms.CharField(
        label='Término de búsqueda',
        max_length=100,
        help_text='Ej: pollo, arroz, pasta, leche, etc.'
    )
    max_results = forms.IntegerField(
        label='Máximo de resultados',
        initial=50,
        min_value=1,
        max_value=100,
        help_text='Número máximo de alimentos a importar (1-100)'
    )


@admin.register(FoodEquivalenceGroup)
class FoodEquivalenceGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'slug', 'is_active', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'slug', 'description']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'category', 'allergens', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'is_verified']
    list_filter = ['category', 'is_verified', 'created_at']
    search_fields = ['name', 'brand', 'category']
    ordering = ['name']
    readonly_fields = ['created_at', 'updated_at']
    filter_horizontal = ['equivalence_groups']
    list_per_page = 50
    
    fieldsets = (
        ('Información básica', {
            'fields': ('name', 'brand', 'category', 'allergens', 'is_verified', 'equivalence_category', 'equivalence_groups')
        }),
        ('Porción', {
            'fields': ('serving_size', 'serving_unit')
        }),
        ('Macronutrientes (por 100g)', {
            'fields': ('calories', 'protein', 'carbs', 'fat'),
            'description': 'Valores nutricionales por 100g del alimento'
        }),
        ('Otros nutrientes', {
            'fields': ('fiber', 'sugar', 'sodium'),
            'classes': ('collapse',)
        }),
        ('Metadatos', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_verified', 'mark_as_unverified']
    change_list_template = 'admin/nutrition/food/change_list.html'
    
    def mark_as_verified(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f'{updated} alimentos marcados como verificados.')
    mark_as_verified.short_description = "Marcar como verificados"
    
    def mark_as_unverified(self, request, queryset):
        updated = queryset.update(is_verified=False)
        self.message_user(request, f'{updated} alimentos marcados como no verificados.')
    mark_as_unverified.short_description = "Marcar como no verificados"
    
    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('import-foods/', self.admin_site.admin_view(self.import_foods_view), name='nutrition_food_import'),
        ]
        return custom_urls + urls
    
    def import_foods_view(self, request):
        """Vista para importar alimentos desde OpenFoodFacts"""
        if request.method == 'POST':
            form = ImportFoodsForm(request.POST)
            if form.is_valid():
                search_term = form.cleaned_data['search_term']
                max_results = form.cleaned_data['max_results']
                
                client = OpenFoodFactsClient()
                
                try:
                    # Buscar alimentos
                    results = client.search_foods(search_term, page_size=max_results)
                    
                    imported = 0
                    skipped = 0
                    
                    for product in results:
                        name = client.get_food_name(product)
                        if not name:
                            continue
                        
                        # Verificar si ya existe
                        if Food.objects.filter(name=name).exists():
                            skipped += 1
                            continue
                        
                        nutrients = client.parse_nutrients(product)
                        
                        # Solo importar si tiene al menos calorías
                        if nutrients['calories'] > 0:
                            Food.objects.create(
                                name=name,
                                brand=product.get('brands', '')[:100] if product.get('brands') else '',
                                calories=nutrients['calories'],
                                protein=nutrients['protein'],
                                carbs=nutrients['carbs'],
                                fat=nutrients['fat'],
                                fiber=nutrients['fiber'],
                                sugar=nutrients['sugar'],
                                sodium=nutrients['sodium'],
                                serving_size=100,
                                serving_unit='g',
                                category=search_term.capitalize(),
                                is_verified=False,
                                created_by=request.user
                            )
                            imported += 1
                    
                    messages.success(
                        request,
                        f'✅ Importación completada: {imported} alimentos importados, {skipped} omitidos (ya existían)'
                    )
                    
                except Exception as e:
                    messages.error(request, f'❌ Error durante la importación: {str(e)}')
                
                return redirect('admin:nutrition_food_changelist')
        else:
            form = ImportFoodsForm()
        
        # Estadísticas actuales
        total_foods = Food.objects.count()
        verified_foods = Food.objects.filter(is_verified=True).count()
        categories = Food.objects.values_list('category', flat=True).distinct()
        
        context = {
            **self.admin_site.each_context(request),
            'form': form,
            'title': 'Importar Alimentos desde OpenFoodFacts',
            'total_foods': total_foods,
            'verified_foods': verified_foods,
            'categories': [c for c in categories if c],
            'opts': self.model._meta,
        }
        
        return render(request, 'admin/nutrition/food/import_foods.html', context)
