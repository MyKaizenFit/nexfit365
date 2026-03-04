# nutrition/admin_views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes as perm_classes, parser_classes as parser_decorator
from rest_framework.response import Response
from rest_framework.permissions import IsAdminUser
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db import transaction
from django.db.models import Count, Avg, Sum, Min, Max, Q
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from datetime import datetime, timedelta
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters

from .models import Recipe, NutritionPlan, PlanMeal, Food, MealLog, NutritionPlanHistory, PlanMealRecipe, NutritionPlanAssignment
from .admin_serializers import (
    AdminRecipeSerializer, AdminNutritionPlanSerializer,
    AdminPlanMealSerializer, AdminFoodSerializer, PlanMealRecipeSerializer,
    AdminNutritionPlanMinimalSerializer
)
from .serializers import MealLogSerializer, NutritionPlanHistorySerializer

User = get_user_model()


class AdminRecipeViewSet(viewsets.ModelViewSet):
    queryset = Recipe.objects.all()
    serializer_class = AdminRecipeSerializer
    permission_classes = [IsAdminUser]
    parser_classes = [JSONParser, MultiPartParser, FormParser]  # Agregado JSONParser para crear recetas con JSON

    def list(self, request, *args, **kwargs):
        """Override list to add cache prevention headers"""
        response = super().list(request, *args, **kwargs)
        response['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response['Pragma'] = 'no-cache'
        response['Expires'] = '0'
        return response

    @action(detail=True, methods=['post'], url_path='upload-image')
    def upload_image(self, request, pk=None):
        recipe = self.get_object()
        image = request.FILES.get('image')

        if not image:
            return Response({'detail': 'image es requerido'}, status=status.HTTP_400_BAD_REQUEST)

        allowed_types = {'image/jpeg', 'image/png', 'image/webp'}
        if image.content_type not in allowed_types:
            return Response({'detail': 'Formato no soportado'}, status=status.HTTP_400_BAD_REQUEST)

        max_size_bytes = 5 * 1024 * 1024
        if image.size and image.size > max_size_bytes:
            return Response({'detail': 'La imagen excede 5MB'}, status=status.HTTP_400_BAD_REQUEST)

        recipe.image = image
        recipe.save(update_fields=['image'])

        serializer = self.get_serializer(recipe)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Estadísticas de recetas"""
        total_recipes = Recipe.objects.count()
        
        # Estadísticas por categoría
        by_category = Recipe.objects.values('category').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Promedios nutricionales
        avg_nutrition = Recipe.objects.aggregate(
            avg_calories=Avg('calories'),
            avg_protein=Avg('protein'),
            avg_carbs=Avg('carbs'),
            avg_fat=Avg('fat'),
        )
        
        # Recetas más usadas (en planes)
        popular_recipes = Recipe.objects.annotate(
            usage_count=Count('suggested_in_meals')
        ).order_by('-usage_count')[:10]
        
        # Conteo por dificultad
        by_difficulty = Recipe.objects.values('difficulty').annotate(
            count=Count('id')
        ).order_by('-count')
        
        return Response({
            'total_recipes': total_recipes,
            'by_category': list(by_category),
            'by_difficulty': list(by_difficulty),
            'average_nutrition': {
                'calories': round(avg_nutrition['avg_calories'] or 0, 1),
                'protein': round(avg_nutrition['avg_protein'] or 0, 1),
                'carbs': round(avg_nutrition['avg_carbs'] or 0, 1),
                'fat': round(avg_nutrition['avg_fat'] or 0, 1),
            },
            'popular_recipes': [
                {
                    'id': str(r.id),
                    'name': r.name,
                    'usage_count': r.usage_count
                } for r in popular_recipes
            ]
        })

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """Exporta todas las recetas en formato CSV con ingredientes estructurados.
        Formato ingredientes: 'Nombre|cantidad|unidad|notas; Nombre2|cantidad|unidad|notas'
        Las macros se muestran como referencia pero se recalculan automáticamente al importar.
        """
        import csv
        from django.http import HttpResponse
        recipes = self.get_queryset().prefetch_related('recipe_ingredients__food')
        response = HttpResponse(content_type='text/csv; charset=utf-8')
        response['Content-Disposition'] = 'attachment; filename="recipes_export.csv"'
        fieldnames = [
            'name', 'description', 'category', 'difficulty', 'servings', 'prep_time_minutes',
            'ingredients', 'instructions',
            'calories_ref', 'protein_ref', 'carbs_ref', 'fat_ref'
        ]
        writer = csv.DictWriter(response, fieldnames=fieldnames)
        writer.writeheader()
        
        for recipe in recipes:
            # Formato de ingredientes estructurado: Nombre|cantidad|unidad|notas; ....
            recipe_ingredients = recipe.recipe_ingredients.all()
            ingredients_str = ''
            if recipe_ingredients:
                ingredient_parts = []
                for ing in recipe_ingredients:
                    # Formato: NombreAlimento|cantidad|unidad|notas
                    part = f"{ing.food.name}|{ing.quantity}|{ing.unit}|{ing.notes or ''}"
                    ingredient_parts.append(part)
                ingredients_str = '; '.join(ingredient_parts)
            
            writer.writerow({
                'name': recipe.name,
                'description': recipe.description or '',
                'category': recipe.category or '',
                'difficulty': recipe.difficulty or '',
                'servings': recipe.servings or 1,
                'prep_time_minutes': recipe.prep_time_minutes or 0,
                'ingredients': ingredients_str,
                'instructions': recipe.instructions or '',
                'calories_ref': recipe.calories or 0,
                'protein_ref': recipe.protein or 0,
                'carbs_ref': recipe.carbs or 0,
                'fat_ref': recipe.fat or 0,
            })
        return response

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        """Exporta recetas en Excel con dos hojas:
        1. Recetas: Todas las recetas con ingredientes estructurados
        2. Ingredientes disponibles: Listado de todos los ingredientes con códigos para validación
        """
        import io
        import xlsxwriter
        from django.http import HttpResponse
        from collections import defaultdict
        
        recipes = self.get_queryset().prefetch_related('recipe_ingredients__food')
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        
        # ========== HOJA 1: RECETAS ==========
        worksheet = workbook.add_worksheet('Recetas')
        
        headers = [
            'name', 'description', 'category', 'difficulty', 'servings', 'prep_time_minutes',
            'ingredients', 'instructions',
            'calories_ref', 'protein_ref', 'carbs_ref', 'fat_ref'
        ]
        
        # Escribir headers con formato
        header_format = workbook.add_format({'bold': True, 'bg_color': '#D3D3D3'})
        for col, header in enumerate(headers):
            worksheet.write(0, col, header, header_format)
        
        # Recopilar ingredientes únicos mientras escribimos las recetas
        all_ingredients = defaultdict(set)
        
        for row_idx, recipe in enumerate(recipes, start=1):
            recipe_ingredients = recipe.recipe_ingredients.all()
            ingredients_str = ''
            if recipe_ingredients:
                ingredient_parts = []
                for ing in recipe_ingredients:
                    # Recopilar ingredientes
                    all_ingredients[ing.food.name].add((ing.unit, ing.food.id))
                    # Formato: NombreAlimento|cantidad|unidad|notas
                    part = f"{ing.food.name}|{ing.quantity}|{ing.unit}|{ing.notes or ''}"
                    ingredient_parts.append(part)
                ingredients_str = '; '.join(ingredient_parts)
            
            worksheet.write(row_idx, 0, recipe.name)
            worksheet.write(row_idx, 1, recipe.description or '')
            worksheet.write(row_idx, 2, recipe.category or '')
            worksheet.write(row_idx, 3, recipe.difficulty or '')
            worksheet.write(row_idx, 4, recipe.servings or 1)
            worksheet.write(row_idx, 5, recipe.prep_time_minutes or 0)
            worksheet.write(row_idx, 6, ingredients_str)
            worksheet.write(row_idx, 7, recipe.instructions or '')
            worksheet.write(row_idx, 8, recipe.calories or 0)
            worksheet.write(row_idx, 9, float(recipe.protein or 0))
            worksheet.write(row_idx, 10, float(recipe.carbs or 0))
            worksheet.write(row_idx, 11, float(recipe.fat or 0))
        
        # ========== HOJA 2: INGREDIENTES DISPONIBLES ==========
        ing_worksheet = workbook.add_worksheet('Ingredientes_Disponibles')
        
        # Headers para ingredientes
        ing_headers = ['Nombre Alimento', 'Unidad Recomendada', 'Calorías/100g', 'Proteína/100g', 'Carbos/100g', 'Grasa/100g', 'ID_BD']
        for col, header in enumerate(ing_headers):
            ing_worksheet.write(0, col, header, header_format)
        
        # Escribir todos los ingredientes disponibles ordenados alfabéticamente
        all_foods = Food.objects.all().order_by('name')
        for row_idx, food in enumerate(all_foods, start=1):
            ing_worksheet.write(row_idx, 0, food.name)
            ing_worksheet.write(row_idx, 1, 'g')  # Unidad recomendada
            ing_worksheet.write(row_idx, 2, food.calories or 0)
            ing_worksheet.write(row_idx, 3, float(food.protein or 0))
            ing_worksheet.write(row_idx, 4, float(food.carbs or 0))
            ing_worksheet.write(row_idx, 5, float(food.fat or 0))
            ing_worksheet.write(row_idx, 6, str(food.id))
        
        # Ajustar ancho de columnas
        ing_worksheet.set_column('A:A', 30)
        ing_worksheet.set_column('B:B', 15)
        
        workbook.close()
        output.seek(0)
        response = HttpResponse(output.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="recipes_export.xlsx"'
        return response

    @action(detail=False, methods=['post'], url_path='import-csv')
    @parser_decorator([MultiPartParser, FormParser])
    def import_csv(self, request):
        """Importa recetas desde CSV con ingredientes estructurados.
        
        Formato ingredientes: 'NombreAlimento|cantidad|unidad|notas; NombreAlimento2|...'
        Las macros se calculan AUTOMÁTICAMENTE basándose en los ingredientes.
        Las columnas *_ref se ignoran (son solo de referencia).
        
        - Busca recetas existentes por nombre
        - Actualiza si hay cambios
        - Crea nuevas recetas si no existen  
        - Recalcula macros automáticamente
        - Nunca borra
        """
        import csv
        import io
        from django.http import JsonResponse
        from .models import RecipeIngredient
        
        try:
            file = request.FILES.get('file')
            if not file:
                return JsonResponse({'error': 'No file provided'}, status=400)
            
            text_file = io.TextIOWrapper(file.file, encoding='utf-8')
            reader = csv.DictReader(text_file)
            
            created_count = 0
            updated_count = 0
            skipped_count = 0
            errors = []
            
            for row_num, row in enumerate(reader, start=2):
                try:
                    name = row.get('name', '').strip()
                    if not name:
                        errors.append(f"Row {row_num}: name is required")
                        continue
                    
                    # Buscar receta existente por nombre
                    existing_recipe = Recipe.objects.filter(name=name).first()
                    
                    # Preparar datos básicos (SIN MACROS - se calculan después)
                    recipe_data = {
                        'name': name,
                        'description': row.get('description', '') or '',
                        'category': row.get('category', '') or '',
                        'difficulty': row.get('difficulty', '') or '',
                        'servings': int(row.get('servings', 1) or 1),
                        'prep_time_minutes': int(row.get('prep_time_minutes', 0) or 0),
                        'instructions': row.get('instructions', '') or '',
                    }
                    
                    # Parsear ingredientes (formato: Nombre|cantidad|unidad|notas; ...)
                    ingredients_str = row.get('ingredients', '') or ''
                    parsed_ingredients = []
                    
                    if ingredients_str:
                        ingredient_parts = [p.strip() for p in ingredients_str.split(';') if p.strip()]
                        for part in ingredient_parts:
                            try:
                                fields = [f.strip() for f in part.split('|')]
                                if len(fields) >= 3:
                                    food_name = fields[0]
                                    quantity = float(fields[1])
                                    unit = fields[2]
                                    notes = fields[3] if len(fields) > 3 else ''
                                    
                                    # Buscar alimento en la BD
                                    food = Food.objects.filter(name__iexact=food_name).first()
                                    if not food:
                                        errors.append(f"Row {row_num}: Food '{food_name}' not found")
                                        continue
                                    
                                    parsed_ingredients.append({
                                        'food': food,
                                        'quantity': quantity,
                                        'unit': unit,
                                        'notes': notes
                                    })
                            except (ValueError, IndexError) as e:
                                errors.append(f"Row {row_num}: Invalid ingredient format '{part}': {str(e)}")
                                continue
                    
                    # Crear o actualizar receta
                    if existing_recipe:
                        # Actualizar campos básicos
                        has_changes = False
                        for field, value in recipe_data.items():
                            if getattr(existing_recipe, field) != value:
                                setattr(existing_recipe, field, value)
                                has_changes = True
                        
                        # Limpiar ingredientes anteriores y crear nuevos
                        existing_recipe.recipe_ingredients.all().delete()
                        for idx, ing_data in enumerate(parsed_ingredients):
                            RecipeIngredient.objects.create(
                                recipe=existing_recipe,
                                food=ing_data['food'],
                                quantity=ing_data['quantity'],
                                unit=ing_data['unit'],
                                notes=ing_data['notes'],
                                order=idx
                            )
                        
                        # Recalcular macros automáticamente
                        if parsed_ingredients:
                            existing_recipe.calculate_macros_from_ingredients()
                        
                        if has_changes or parsed_ingredients:
                            updated_count += 1
                        else:
                            skipped_count += 1
                    else:
                        # Crear nueva receta
                        new_recipe = Recipe.objects.create(**recipe_data)
                        
                        # Crear ingredientes
                        for idx, ing_data in enumerate(parsed_ingredients):
                            RecipeIngredient.objects.create(
                                recipe=new_recipe,
                                food=ing_data['food'],
                                quantity=ing_data['quantity'],
                                unit=ing_data['unit'],
                                notes=ing_data['notes'],
                                order=idx
                            )
                        
                        # Recalcular macros automáticamente
                        if parsed_ingredients:
                            new_recipe.calculate_macros_from_ingredients()
                        
                        created_count += 1
                        
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")
                    continue
            
            message = f"Import completed: {created_count} created, {updated_count} updated, {skipped_count} skipped"
            if errors:
                message += f". {len(errors)} error(s) found."
            
            return JsonResponse({
                'success': True,
                'created': created_count,
                'updated': updated_count,
                'skipped': skipped_count,
                'message': message,
                'errors': errors[:10]
            })
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=400)

    @action(detail=False, methods=['post'], url_path='import-excel')
    @parser_decorator([MultiPartParser, FormParser])
    def import_excel(self, request):
        """Importa recetas desde Excel con validación inteligente de ingredientes.
        
        Formato ingredientes: 'NombreAlimento|cantidad|unidad|notas; NombreAlimento2|...'
        
        VALIDACIÓN: 
        - Valida TODOS los ingredientes ANTES de procesar
        - Si hay ingredientes inválidos/inexistentes, NO procesa esa receta
        - Continúa procesando las demás recetas válidas
        - Notifica cuáles recetas fueron rechazadas y por qué
        
        Las macros se calculan AUTOMÁTICAMENTE basándose en los ingredientes.
        Las columnas *_ref se ignoran (son solo de referencia).
        """
        from openpyxl import load_workbook
        from django.http import JsonResponse
        from .models import RecipeIngredient
        import io
        
        try:
            file = request.FILES.get('file')
            if not file:
                return JsonResponse({'error': 'No file provided'}, status=400)
            
            # Leer archivo Excel
            workbook = load_workbook(io.BytesIO(file.read()))
            worksheet = workbook.active
            
            # Obtener headers desde la primera fila
            headers = []
            for cell in worksheet[1]:
                if cell.value:
                    headers.append(cell.value)
            
            created_count = 0
            updated_count = 0
            skipped_count = 0
            failed_count = 0
            errors = []
            rejections = []  # Recetas rechazadas por ingredientes inválidos
            
            # Procesar filas de datos
            for row_num, row in enumerate(worksheet.iter_rows(min_row=2, values_only=True), start=2):
                try:
                    # Crear diccionario con headers y valores
                    row_data = {}
                    for idx, header in enumerate(headers):
                        if idx < len(row):
                            row_data[header] = row[idx]
                    
                    name = (row_data.get('name') or '').strip()
                    if not name:
                        errors.append(f"Row {row_num}: name is required")
                        continue
                    
                    # ========== VALIDACIÓN DE INGREDIENTES PRIMERO ==========
                    ingredients_str = row_data.get('ingredients', '') or ''
                    parsed_ingredients = []
                    invalid_ingredients = []  # Registrar cuáles ingredientes son inválidos
                    
                    if ingredients_str:
                        ingredient_parts = [p.strip() for p in str(ingredients_str).split(';') if p.strip()]
                        for part in ingredient_parts:
                            try:
                                fields = [f.strip() for f in part.split('|')]
                                if len(fields) >= 3:
                                    food_name = fields[0]
                                    quantity_str = fields[1]
                                    unit = fields[2]
                                    notes = fields[3] if len(fields) > 3 else ''
                                    
                                    # Validar cantidad
                                    try:
                                        quantity = float(quantity_str)
                                    except ValueError:
                                        invalid_ingredients.append(f"'{food_name}': invalid quantity '{quantity_str}'")
                                        continue
                                    
                                    # Buscar alimento en la BD
                                    food = Food.objects.filter(name__iexact=food_name).first()
                                    if not food:
                                        invalid_ingredients.append(f"'{food_name}': food not found in database")
                                        continue
                                    
                                    parsed_ingredients.append({
                                        'food': food,
                                        'quantity': quantity,
                                        'unit': unit,
                                        'notes': notes
                                    })
                            except (ValueError, IndexError) as e:
                                invalid_ingredients.append(f"'{part}': {str(e)}")
                                continue
                    
                    # Si hay ingredientes INVÁLIDOS, RECHAZAR la receta completamente
                    if invalid_ingredients:
                        rejection_msg = f"Row {row_num} ('{name}'): Rejected - Invalid ingredients: {', '.join(invalid_ingredients)}"
                        rejections.append(rejection_msg)
                        failed_count += 1
                        continue
                    
                    # ========== PROCESAMIENTO SOLO SI TODO ES VÁLIDO ==========
                    recipe_data = {
                        'name': name,
                        'description': (row_data.get('description') or '') or '',
                        'category': (row_data.get('category') or '') or '',
                        'difficulty': (row_data.get('difficulty') or '') or '',
                        'servings': int(row_data.get('servings') or 1),
                        'prep_time_minutes': int(row_data.get('prep_time_minutes') or 0),
                        'instructions': (row_data.get('instructions') or '') or '',
                    }
                    
                    # Buscar receta existente por nombre
                    existing_recipe = Recipe.objects.filter(name=name).first()
                    
                    if existing_recipe:
                        # Actualizar campos básicos
                        has_changes = False
                        for field, value in recipe_data.items():
                            if getattr(existing_recipe, field) != value:
                                setattr(existing_recipe, field, value)
                                has_changes = True
                        
                        # Limpiar ingredientes anteriores y crear nuevos
                        existing_recipe.recipe_ingredients.all().delete()
                        for idx, ing_data in enumerate(parsed_ingredients):
                            RecipeIngredient.objects.create(
                                recipe=existing_recipe,
                                food=ing_data['food'],
                                quantity=ing_data['quantity'],
                                unit=ing_data['unit'],
                                notes=ing_data['notes'],
                                order=idx
                            )
                        
                        # Recalcular macros automáticamente
                        if parsed_ingredients:
                            existing_recipe.calculate_macros_from_ingredients()
                        
                        if has_changes or parsed_ingredients:
                            updated_count += 1
                        else:
                            skipped_count += 1
                    else:
                        # Crear nueva receta
                        new_recipe = Recipe.objects.create(**recipe_data)
                        
                        # Crear ingredientes
                        for idx, ing_data in enumerate(parsed_ingredients):
                            RecipeIngredient.objects.create(
                                recipe=new_recipe,
                                food=ing_data['food'],
                                quantity=ing_data['quantity'],
                                unit=ing_data['unit'],
                                notes=ing_data['notes'],
                                order=idx
                            )
                        
                        # Recalcular macros automáticamente
                        if parsed_ingredients:
                            new_recipe.calculate_macros_from_ingredients()
                        
                        created_count += 1
                        
                except Exception as e:
                    errors.append(f"Row {row_num}: Unexpected error - {str(e)}")
                    continue
            
            message = f"Import completed: {created_count} created, {updated_count} updated, {skipped_count} skipped, {failed_count} REJECTED (invalid ingredients)"
            
            result = {
                'success': True,
                'created': created_count,
                'updated': updated_count,
                'skipped': skipped_count,
                'rejected': failed_count,
                'message': message,
            }
            
            # Incluir detalles sobre recetas rechazadas
            if rejections:
                result['rejections'] = rejections[:20]  # Primeras 20 rechazos
                result['rejection_count'] = len(rejections)
            
            # Incluir otros errores si existen
            if errors:
                result['errors'] = errors[:10]
                result['error_count'] = len(errors)
            
            return JsonResponse(result)
        except Exception as e:
            return JsonResponse({'error': f'File processing error: {str(e)}'}, status=400)


class AdminNutritionPlanViewSet(viewsets.ModelViewSet):
    queryset = NutritionPlan.objects.all().prefetch_related(
        'meals',
        'meals__suggested_recipes',
        'meals__meal_recipes',
        'meals__meal_recipes__recipe',
    )
    serializer_class = AdminNutritionPlanSerializer
    permission_classes = [IsAdminUser]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['is_template', 'is_system', 'is_active', 'user']
    search_fields = ['name', 'description', 'user__email', 'assignments__user__email']
    ordering_fields = ['created_at', 'updated_at', 'name', 'daily_calories', 'user__email', 'is_template', 'is_system', 'is_active']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if getattr(self, 'action', None) == 'list':
            return AdminNutritionPlanMinimalSerializer
        return AdminNutritionPlanSerializer

    def get_queryset(self):
        qs = NutritionPlan.objects.all()
        user_param = self.request.query_params.get('user')
        user_isnull = self.request.query_params.get('user__isnull')

        if user_param:
            qs = qs.filter(Q(user_id=user_param) | Q(assignments__user_id=user_param))

        if user_isnull == 'true':
            qs = qs.filter(Q(user__isnull=True) & Q(assignments__isnull=True))
        elif user_isnull == 'false':
            qs = qs.filter(Q(user__isnull=False) | Q(assignments__isnull=False))

        qs = qs.distinct()
        # Listado: evita cargar todo el árbol de comidas por defecto
        if getattr(self, 'action', None) == 'list':
            return qs.prefetch_related('meals', 'assignments__user').select_related('user')
        return qs.prefetch_related(
            'meals',
            'meals__suggested_recipes',
            'meals__meal_recipes',
            'meals__meal_recipes__recipe',
            'assignments__user',
        ).select_related('user')

    def _extract_assigned_user_ids(self, data):
        has_assigned = 'assigned_user_ids' in data or 'user_ids' in data or 'user_id' in data
        raw_ids = data.get('assigned_user_ids') or data.get('user_ids')
        if raw_ids is None and data.get('user_id') is not None:
            raw_ids = [data.get('user_id')]
        if raw_ids is None and not has_assigned:
            return None
        if raw_ids is None:
            return []
        if not isinstance(raw_ids, list):
            raw_ids = [raw_ids]
        normalized = []
        for uid in raw_ids:
            if uid is None or uid == 'none':
                continue
            try:
                normalized.append(int(uid))
            except (TypeError, ValueError):
                continue
        return list(dict.fromkeys(normalized))

    def _sync_assignments(self, plan: NutritionPlan, user_ids):
        user_ids = list(dict.fromkeys(user_ids))
        existing_ids = set(plan.assignments.values_list('user_id', flat=True))
        incoming_ids = set(user_ids)

        remove_ids = existing_ids - incoming_ids
        if remove_ids:
            plan.assignments.filter(user_id__in=remove_ids).delete()

        add_ids = incoming_ids - existing_ids
        for uid in add_ids:
            NutritionPlanAssignment.objects.create(
                plan=plan,
                user_id=uid,
                is_active=plan.is_active,
            )

        if incoming_ids:
            plan.assignments.filter(user_id__in=incoming_ids).update(is_active=plan.is_active)

        if len(user_ids) == 1:
            if plan.user_id != user_ids[0]:
                plan.user_id = user_ids[0]
                plan.save(update_fields=['user'])
        else:
            if plan.user_id is not None:
                plan.user = None
                plan.save(update_fields=['user'])

    def _build_recipe_map(self, meals_payload):
        recipe_ids = set()
        for meal_data in meals_payload or []:
            if not isinstance(meal_data, dict):
                continue
            for mr in meal_data.get('meal_recipes') or []:
                if not isinstance(mr, dict):
                    continue
                recipe_id = mr.get('recipe_id') or (mr.get('recipe') or {}).get('id')
                if recipe_id:
                    recipe_ids.add(str(recipe_id))
        recipes = Recipe.objects.filter(id__in=list(recipe_ids))
        return {str(r.id): r for r in recipes}

    def _compute_meal_macros(self, meal_recipes, recipe_map):
        if not meal_recipes:
            return {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}

        options = []
        for mr in meal_recipes:
            if not isinstance(mr, dict):
                continue
            recipe_id = mr.get('recipe_id') or (mr.get('recipe') or {}).get('id')
            recipe = recipe_map.get(str(recipe_id)) if recipe_id else None
            if not recipe:
                continue

            servings = float(mr.get('servings') or 1)
            calories = mr.get('custom_calories')
            protein = mr.get('custom_protein')
            carbs = mr.get('custom_carbs')
            fat = mr.get('custom_fat')

            options.append({
                'calories': float(calories) if calories is not None else float(recipe.calories or 0) * servings,
                'protein': float(protein) if protein is not None else float(recipe.protein or 0) * servings,
                'carbs': float(carbs) if carbs is not None else float(recipe.carbs or 0) * servings,
                'fat': float(fat) if fat is not None else float(recipe.fat or 0) * servings,
            })

        if not options:
            return {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}

        total = {
            'calories': sum(o['calories'] for o in options),
            'protein': sum(o['protein'] for o in options),
            'carbs': sum(o['carbs'] for o in options),
            'fat': sum(o['fat'] for o in options),
        }
        count = len(options)
        return {
            'calories': total['calories'] / count,
            'protein': total['protein'] / count,
            'carbs': total['carbs'] / count,
            'fat': total['fat'] / count,
        }

    def _recompute_plan_macros(self, plan: NutritionPlan):
        day_totals = {}
        meals = list(plan.meals.all())

        for day in range(1, 8):
            totals = {'calories': 0, 'protein': 0, 'carbs': 0, 'fat': 0}
            for meal in meals:
                if meal.day_of_week and meal.day_of_week != day:
                    continue
                totals['calories'] += float(meal.calories or 0)
                totals['protein'] += float(meal.protein or 0)
                totals['carbs'] += float(meal.carbs or 0)
                totals['fat'] += float(meal.fat or 0)
            day_totals[day] = totals

        active_days = [t for t in day_totals.values() if sum(t.values()) > 0]
        if not active_days:
            return

        avg = {
            'calories': sum(t['calories'] for t in active_days) / len(active_days),
            'protein': sum(t['protein'] for t in active_days) / len(active_days),
            'carbs': sum(t['carbs'] for t in active_days) / len(active_days),
            'fat': sum(t['fat'] for t in active_days) / len(active_days),
        }

        plan.daily_calories = int(round(avg['calories']))
        plan.protein_grams = int(round(avg['protein']))
        plan.carbs_grams = int(round(avg['carbs']))
        plan.fat_grams = int(round(avg['fat']))
        plan.save(update_fields=['daily_calories', 'protein_grams', 'carbs_grams', 'fat_grams'])

    def _replace_plan_meals(self, plan: NutritionPlan, meals_payload):
        """
        Reemplaza TODAS las comidas del plan por las proporcionadas (enfoque robusto).
        Espera una lista de objetos con campos de PlanMeal y opcionalmente:
          - suggested_recipes_ids: [recipe_id,...]
          - meal_recipes: [{recipe_id, servings, custom_*, display_order}, ...]
        """
        if meals_payload is None:
            return
        if not isinstance(meals_payload, list):
            return

        recipe_map = self._build_recipe_map(meals_payload)

        # Eliminar comidas anteriores (cascade elimina PlanMealRecipe)
        plan.meals.all().delete()

        for idx, meal_data in enumerate(meals_payload):
            if not isinstance(meal_data, dict):
                continue

            suggested_ids = meal_data.get('suggested_recipes_ids')
            meal_recipes = meal_data.get('meal_recipes')

            meal = PlanMeal.objects.create(
                plan=plan,
                day_of_week=meal_data.get('day_of_week') or None,
                name=meal_data.get('name') or f'Comida {idx + 1}',
                meal_type=meal_data.get('meal_type') or 'lunch',
                time=meal_data.get('time') or None,
                calories=0,
                protein=0,
                carbs=0,
                fat=0,
                description=meal_data.get('description') or '',
                order_index=meal_data.get('order_index') or (idx + 1),
            )

            # ManyToMany simple
            if isinstance(suggested_ids, list) and suggested_ids:
                meal.suggested_recipes.set(Recipe.objects.filter(id__in=suggested_ids))

            effective_meal_recipes = []

            # Cantidades personalizadas por receta
            if isinstance(meal_recipes, list) and meal_recipes:
                for mr in meal_recipes:
                    if not isinstance(mr, dict):
                        continue
                    recipe_id = mr.get('recipe_id') or (mr.get('recipe') or {}).get('id')
                    if not recipe_id:
                        continue
                    try:
                        recipe = Recipe.objects.get(id=recipe_id)
                    except Recipe.DoesNotExist:
                        continue

                    payload = {
                        'meal': meal,
                        'recipe': recipe,
                        'servings': mr.get('servings') or 1.0,
                        'display_order': mr.get('display_order') or 0,
                        'custom_calories': mr.get('custom_calories', None),
                        'custom_protein': mr.get('custom_protein', None),
                        'custom_carbs': mr.get('custom_carbs', None),
                        'custom_fat': mr.get('custom_fat', None),
                    }
                    PlanMealRecipe.objects.create(**payload)
                    effective_meal_recipes.append(mr)

            # Compatibilidad: si no hay meal_recipes, crear desde suggested_ids
            if not effective_meal_recipes and isinstance(suggested_ids, list) and suggested_ids:
                for idx_s, recipe_id in enumerate(suggested_ids):
                    try:
                        recipe = Recipe.objects.get(id=recipe_id)
                    except Recipe.DoesNotExist:
                        continue
                    PlanMealRecipe.objects.create(
                        meal=meal,
                        recipe=recipe,
                        servings=1.0,
                        display_order=idx_s,
                    )
                    effective_meal_recipes.append({'recipe_id': recipe_id, 'servings': 1.0, 'display_order': idx_s})

            computed = self._compute_meal_macros(effective_meal_recipes, recipe_map)
            PlanMeal.objects.filter(pk=meal.pk).update(
                calories=int(round(computed['calories'])),
                protein=round(computed['protein'], 2),
                carbs=round(computed['carbs'], 2),
                fat=round(computed['fat'], 2),
            )

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        meals_payload = request.data.get('meals')
        assigned_user_ids = self._extract_assigned_user_ids(request.data)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        plan = serializer.save()

        if assigned_user_ids is not None:
            self._sync_assignments(plan, assigned_user_ids)

        # Normalizar flags según si es plan de usuario o plantilla
        has_assignees = plan.assignments.exists()
        if (plan.user_id or has_assignees) and not plan.is_system:
            if plan.is_template:
                plan.is_template = False
                plan.save(update_fields=['is_template'])
        if not plan.user_id and not has_assignees and not plan.is_system and not plan.is_template:
            # Por defecto, un admin creando sin usuario asignado es plantilla
            plan.is_template = True
            plan.save(update_fields=['is_template'])

        self._replace_plan_meals(plan, meals_payload)
        self._recompute_plan_macros(plan)

        plan.refresh_from_db()
        plan = NutritionPlan.objects.prefetch_related(
            'meals',
            'meals__suggested_recipes',
            'meals__meal_recipes',
            'meals__meal_recipes__recipe',
            'assignments__user',
        ).get(pk=plan.pk)
        return Response(self.get_serializer(plan).data, status=status.HTTP_201_CREATED)

    @transaction.atomic
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        meals_payload = request.data.get('meals')
        assigned_user_ids = self._extract_assigned_user_ids(request.data)
        prev_is_active = instance.is_active

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        plan = serializer.save()

        if plan.is_active != prev_is_active:
            plan.assignments.all().update(is_active=plan.is_active)

        if assigned_user_ids is not None:
            self._sync_assignments(plan, assigned_user_ids)

        # Normalizar flags si cambió asignación de usuario
        has_assignees = plan.assignments.exists()
        if (plan.user_id or has_assignees) and not plan.is_system:
            if plan.is_template:
                plan.is_template = False
                plan.save(update_fields=['is_template'])
        if not plan.user_id and not has_assignees and not plan.is_system and not plan.is_template:
            plan.is_template = True
            plan.save(update_fields=['is_template'])

        self._replace_plan_meals(plan, meals_payload)
        self._recompute_plan_macros(plan)

        plan.refresh_from_db()
        plan = NutritionPlan.objects.prefetch_related(
            'meals',
            'meals__suggested_recipes',
            'meals__meal_recipes',
            'meals__meal_recipes__recipe',
            'assignments__user',
        ).get(pk=plan.pk)
        return Response(self.get_serializer(plan).data, status=status.HTTP_200_OK)


class AdminPlanMealViewSet(viewsets.ModelViewSet):
    queryset = PlanMeal.objects.all()
    serializer_class = AdminPlanMealSerializer
    permission_classes = [IsAdminUser]


class AdminFoodViewSet(viewsets.ModelViewSet):
    queryset = Food.objects.all()
    serializer_class = AdminFoodSerializer
    permission_classes = [IsAdminUser]

    @action(detail=False, methods=['get'], url_path='list-for-recipes')
    def list_for_recipes(self, request):
        """Devuelve lista simplificada de alimentos para seleccionar en recetas"""
        from .serializers import FoodMinimalSerializer
        foods = self.get_queryset().order_by('name')
        serializer = FoodMinimalSerializer(foods, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """Exporta todos los alimentos en formato CSV"""
        import csv
        from django.http import HttpResponse
        foods = self.get_queryset()
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="foods_export.csv"'
        fieldnames = [
            'id', 'name', 'brand', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium',
            'serving_size', 'serving_unit', 'category', 'store', 'is_verified'
        ]
        writer = csv.DictWriter(response, fieldnames=fieldnames)
        writer.writeheader()
        for food in foods:
            writer.writerow({
                'id': str(food.id),
                'name': food.name,
                'brand': food.brand or '',
                'calories': food.calories or 0,
                'protein': food.protein or 0,
                'carbs': food.carbs or 0,
                'fat': food.fat or 0,
                'fiber': food.fiber or 0,
                'sugar': food.sugar or 0,
                'sodium': food.sodium or 0,
                'serving_size': food.serving_size or 0,
                'serving_unit': food.serving_unit or '',
                'category': food.category or '',
                'store': food.store or '',
                'is_verified': food.is_verified,
            })
        return response

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        """Exporta todos los alimentos en formato Excel (XLSX)"""
        import io
        import xlsxwriter
        from django.http import HttpResponse
        foods = self.get_queryset()
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet('Alimentos')
        headers = [
            'id', 'name', 'brand', 'calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium',
            'serving_size', 'serving_unit', 'category', 'store', 'is_verified'
        ]
        for col, header in enumerate(headers):
            worksheet.write(0, col, header)
        for row_idx, food in enumerate(foods, start=1):
            worksheet.write(row_idx, 0, str(food.id))
            worksheet.write(row_idx, 1, food.name)
            worksheet.write(row_idx, 2, food.brand or '')
            worksheet.write(row_idx, 3, food.calories or 0)
            worksheet.write(row_idx, 4, food.protein or 0)
            worksheet.write(row_idx, 5, food.carbs or 0)
            worksheet.write(row_idx, 6, food.fat or 0)
            worksheet.write(row_idx, 7, food.fiber or 0)
            worksheet.write(row_idx, 8, food.sugar or 0)
            worksheet.write(row_idx, 9, food.sodium or 0)
            worksheet.write(row_idx, 10, food.serving_size or 0)
            worksheet.write(row_idx, 11, food.serving_unit or '')
            worksheet.write(row_idx, 12, food.category or '')
            worksheet.write(row_idx, 13, food.store or '')
            worksheet.write(row_idx, 14, food.is_verified)
        workbook.close()
        output.seek(0)
        response = HttpResponse(output.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="foods_export.xlsx"'
        return response

    @action(detail=False, methods=['post'], url_path='import-csv')
    def import_csv(self, request):
        """Importa alimentos desde un archivo CSV. Añade o modifica, nunca elimina."""
        import csv
        from django.core.files.uploadedfile import UploadedFile
        file = request.FILES.get('file')
        if not file or not isinstance(file, UploadedFile):
            return Response({'error': 'Archivo CSV no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)
        decoded = file.read().decode('utf-8')
        reader = csv.DictReader(decoded.splitlines())
        updated, created, skipped = 0, 0, 0
        for row in reader:
            name = row.get('name')
            if not name:
                skipped += 1
                continue
            food = Food.objects.filter(name=name).first()
            fields = {
                'brand': row.get('brand', ''),
                'calories': float(row.get('calories', 0)),
                'protein': float(row.get('protein', 0)),
                'carbs': float(row.get('carbs', 0)),
                'fat': float(row.get('fat', 0)),
                'fiber': float(row.get('fiber', 0)),
                'sugar': float(row.get('sugar', 0)),
                'sodium': float(row.get('sodium', 0)),
                'serving_size': float(row.get('serving_size', 0)),
                'serving_unit': row.get('serving_unit', ''),
                'category': row.get('category', ''),
                'store': row.get('store', ''),
                'is_verified': row.get('is_verified', '').lower() == 'true',
            }
            if food:
                for k, v in fields.items():
                    setattr(food, k, v)
                food.save()
                updated += 1
            else:
                Food.objects.create(name=name, **fields)
                created += 1
        return Response({
            'created': created,
            'updated': updated,
            'skipped': skipped,
            'message': f"Se subió el archivo correctamente. {created} alimentos añadidos, {updated} modificados. Los alimentos no presentes en el archivo no se eliminaron."
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='import-excel')
    def import_excel(self, request):
        """Importa alimentos desde un archivo Excel. Añade o modifica, nunca elimina."""
        import openpyxl
        from django.core.files.uploadedfile import UploadedFile
        file = request.FILES.get('file')
        if not file or not isinstance(file, UploadedFile):
            return Response({'error': 'Archivo Excel no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)
        wb = openpyxl.load_workbook(file)
        ws = wb.active
        headers = [cell.value for cell in ws[1]]
        updated, created, skipped = 0, 0, 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            row_dict = dict(zip(headers, row))
            name = row_dict.get('name')
            if not name:
                skipped += 1
                continue
            food = Food.objects.filter(name=name).first()
            fields = {
                'brand': row_dict.get('brand', ''),
                'calories': float(row_dict.get('calories', 0)),
                'protein': float(row_dict.get('protein', 0)),
                'carbs': float(row_dict.get('carbs', 0)),
                'fat': float(row_dict.get('fat', 0)),
                'fiber': float(row_dict.get('fiber', 0)),
                'sugar': float(row_dict.get('sugar', 0)),
                'sodium': float(row_dict.get('sodium', 0)),
                'serving_size': float(row_dict.get('serving_size', 0)),
                'serving_unit': row_dict.get('serving_unit', ''),
                'category': row_dict.get('category', ''),
                'store': row_dict.get('store', ''),
                'is_verified': str(row_dict.get('is_verified', '')).lower() == 'true',
            }
            if food:
                for k, v in fields.items():
                    setattr(food, k, v)
                food.save()
                updated += 1
            else:
                Food.objects.create(name=name, **fields)
                created += 1
        return Response({
            'created': created,
            'updated': updated,
            'skipped': skipped,
            'message': f"Se subió el archivo correctamente. {created} alimentos añadidos, {updated} modificados. Los alimentos no presentes en el archivo no se eliminaron."
        }, status=status.HTTP_200_OK)
    @action(detail=False, methods=['get'], url_path='export-csv')
    def export_csv(self, request):
        """Exporta todas las recetas en formato CSV"""
        import csv
        from django.http import HttpResponse
        recipes = self.get_queryset()
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="recipes_export.csv"'
        fieldnames = [
            'id', 'name', 'description', 'category', 'calories', 'protein', 'carbs', 'fat', 'difficulty', 'image_url', 'ingredients', 'instructions'
        ]
        writer = csv.DictWriter(response, fieldnames=fieldnames)
        writer.writeheader()
        for recipe in recipes:
            writer.writerow({
                'id': str(recipe.id),
                'name': recipe.name,
                'description': recipe.description or '',
                'category': recipe.category or '',
                'calories': recipe.calories or 0,
                'protein': recipe.protein or 0,
                'carbs': recipe.carbs or 0,
                'fat': recipe.fat or 0,
                'difficulty': recipe.difficulty or '',
                'image_url': recipe.image.url if recipe.image else '',
                'ingredients': ', '.join([i.name for i in getattr(recipe, 'ingredients', [])]) if hasattr(recipe, 'ingredients') else '',
                'instructions': recipe.instructions or '',
            })
        return response

    @action(detail=False, methods=['get'], url_path='export-excel')
    def export_excel(self, request):
        """Exporta todas las recetas en formato Excel (XLSX)"""
        import io
        import xlsxwriter
        from django.http import HttpResponse
        recipes = self.get_queryset()
        output = io.BytesIO()
        workbook = xlsxwriter.Workbook(output, {'in_memory': True})
        worksheet = workbook.add_worksheet('Recetas')
        headers = [
            'id', 'name', 'description', 'category', 'calories', 'protein', 'carbs', 'fat', 'difficulty', 'image_url', 'ingredients', 'instructions'
        ]
        for col, header in enumerate(headers):
            worksheet.write(0, col, header)
        for row_idx, recipe in enumerate(recipes, start=1):
            # Manejo de ingredientes que pueden ser listas de dicts o de objetos
            ingredients = getattr(recipe, 'ingredients', []) or []
            ingredients_str = ''
            if ingredients:
                try:
                    ingredients_str = ', '.join([
                        i['name'] if isinstance(i, dict) else i.name 
                        for i in ingredients
                    ])
                except (KeyError, AttributeError, TypeError):
                    ingredients_str = ''
            
            worksheet.write(row_idx, 0, str(recipe.id))
            worksheet.write(row_idx, 1, recipe.name)
            worksheet.write(row_idx, 2, recipe.description or '')
            worksheet.write(row_idx, 3, recipe.category or '')
            worksheet.write(row_idx, 4, recipe.calories or 0)
            worksheet.write(row_idx, 5, recipe.protein or 0)
            worksheet.write(row_idx, 6, recipe.carbs or 0)
            worksheet.write(row_idx, 7, recipe.fat or 0)
            worksheet.write(row_idx, 8, recipe.difficulty or '')
            worksheet.write(row_idx, 9, recipe.image.url if recipe.image else '')
            worksheet.write(row_idx, 10, ingredients_str)
            worksheet.write(row_idx, 11, recipe.instructions or '')
        workbook.close()
        output.seek(0)
        response = HttpResponse(output.read(), content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="recipes_export.xlsx"'
        return response

    @action(detail=False, methods=['post'], url_path='import-csv')
    def import_csv(self, request):
        """Importa recetas desde un archivo CSV. Añade o modifica, nunca elimina."""
        import csv
        from django.core.files.uploadedfile import UploadedFile
        file = request.FILES.get('file')
        if not file or not isinstance(file, UploadedFile):
            return Response({'error': 'Archivo CSV no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)
        decoded = file.read().decode('utf-8')
        reader = csv.DictReader(decoded.splitlines())
        updated, created, skipped = 0, 0, 0
        for row in reader:
            name = row.get('name')
            if not name:
                skipped += 1
                continue
            recipe = Recipe.objects.filter(name=name).first()
            fields = {
                'description': row.get('description', ''),
                'category': row.get('category', ''),
                'calories': float(row.get('calories', 0)),
                'protein': float(row.get('protein', 0)),
                'carbs': float(row.get('carbs', 0)),
                'fat': float(row.get('fat', 0)),
                'difficulty': row.get('difficulty', ''),
                'instructions': row.get('instructions', ''),
            }
            if recipe:
                for k, v in fields.items():
                    setattr(recipe, k, v)
                recipe.save()
                updated += 1
            else:
                Recipe.objects.create(name=name, **fields)
                created += 1
        return Response({
            'created': created,
            'updated': updated,
            'skipped': skipped,
            'message': f"Se subió el archivo correctamente. {created} recetas añadidas, {updated} modificadas. Las recetas no presentes en el archivo no se eliminaron."
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='import-excel')
    def import_excel(self, request):
        """Importa recetas desde un archivo Excel. Añade o modifica, nunca elimina."""
        import openpyxl
        from django.core.files.uploadedfile import UploadedFile
        file = request.FILES.get('file')
        if not file or not isinstance(file, UploadedFile):
            return Response({'error': 'Archivo Excel no proporcionado'}, status=status.HTTP_400_BAD_REQUEST)
        wb = openpyxl.load_workbook(file)
        ws = wb.active
        headers = [cell.value for cell in ws[1]]
        updated, created, skipped = 0, 0, 0
        for row in ws.iter_rows(min_row=2, values_only=True):
            row_dict = dict(zip(headers, row))
            name = row_dict.get('name')
            if not name:
                skipped += 1
                continue
            recipe = Recipe.objects.filter(name=name).first()
            fields = {
                'description': row_dict.get('description', ''),
                'category': row_dict.get('category', ''),
                'calories': float(row_dict.get('calories', 0)),
                'protein': float(row_dict.get('protein', 0)),
                'carbs': float(row_dict.get('carbs', 0)),
                'fat': float(row_dict.get('fat', 0)),
                'difficulty': row_dict.get('difficulty', ''),
                'instructions': row_dict.get('instructions', ''),
            }
            if recipe:
                for k, v in fields.items():
                    setattr(recipe, k, v)
                recipe.save()
                updated += 1
            else:
                Recipe.objects.create(name=name, **fields)
                created += 1
        return Response({
            'created': created,
            'updated': updated,
            'skipped': skipped,
            'message': f"Se subió el archivo correctamente. {created} recetas añadidas, {updated} modificadas. Las recetas no presentes en el archivo no se eliminaron."
        }, status=status.HTTP_200_OK)


class AdminPlanMealRecipeViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar recetas sugeridas con cantidades personalizadas"""
    queryset = PlanMealRecipe.objects.all().select_related('meal', 'recipe')
    serializer_class = PlanMealRecipeSerializer
    permission_classes = [IsAdminUser]
    
    def get_queryset(self):
        """Filtrar por meal_id si se proporciona"""
        queryset = super().get_queryset()
        meal_id = self.request.query_params.get('meal_id')
        if meal_id:
            queryset = queryset.filter(meal_id=meal_id)
        return queryset


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_default_plans(request):
    """
    Lista de planes de nutrición predeterminados/plantillas
    """
    # Planes que son plantillas del sistema (sin usuario asignado o marcados como template)
    plans = NutritionPlan.objects.filter(
        user__isnull=True
    ).prefetch_related('meals__suggested_recipes') | NutritionPlan.objects.filter(
        is_template=True
    ).prefetch_related('meals__suggested_recipes')
    
    plans = plans.distinct()
    
    # Paginación
    page = int(request.query_params.get('page', 1))
    page_size = int(request.query_params.get('page_size', 50))
    
    total = plans.count()
    start = (page - 1) * page_size
    end = start + page_size
    
    plans_list = plans[start:end]
    
    results = []
    for plan in plans_list:
        # Calcular porcentajes de macros
        protein_pct = 30  # valor por defecto
        carbs_pct = 40
        fat_pct = 30
        
        if plan.daily_calories and plan.protein_grams:
            protein_pct = round((plan.protein_grams * 4) / plan.daily_calories * 100, 1)
        if plan.daily_calories and plan.carbs_grams:
            carbs_pct = round((plan.carbs_grams * 4) / plan.daily_calories * 100, 1)
        if plan.daily_calories and plan.fat_grams:
            fat_pct = round((plan.fat_grams * 9) / plan.daily_calories * 100, 1)
        
        results.append({
            'id': str(plan.id),
            'name': plan.name,
            'description': plan.description,
            'goal': plan.goal,
            'diet_type': plan.diet_type,
            'daily_calories': plan.daily_calories,
            'protein_grams': float(plan.protein_grams) if plan.protein_grams else 0,
            'carbs_grams': float(plan.carbs_grams) if plan.carbs_grams else 0,
            'fat_grams': float(plan.fat_grams) if plan.fat_grams else 0,
            'protein_percentage': protein_pct,
            'carbs_percentage': carbs_pct,
            'fat_percentage': fat_pct,
            'meals_per_day': plan.meals_per_day,
            'duration_weeks': plan.duration_weeks,
            'is_active': plan.is_active,
            'is_template': plan.is_template,
            'is_system': plan.is_system,
            'is_default': getattr(plan, 'is_default', False),
            'meals_count': plan.meals.count(),
            'created_at': plan.created_at.isoformat() if plan.created_at else None,
            'updated_at': plan.updated_at.isoformat() if plan.updated_at else None,
        })
    
    return Response({
        'results': results,
        'count': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size if total > 0 else 0,
    })


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_user_plan(request, user_id: int):
    """
    Resumen del plan activo del usuario y consumo reciente de macros.
    Query params opcionales:
      - days: ventana en días para sumar macros (por defecto 7)
      - end_date: fecha fin YYYY-MM-DD (por defecto hoy)
    """
    user = get_object_or_404(User, pk=user_id)

    plan = NutritionPlan.objects.filter(user=user).prefetch_related('meals__suggested_recipes').order_by('-is_active', '-created_at').first()
    plan_data = AdminNutritionPlanSerializer(plan).data if plan else None

    days = max(int(request.query_params.get('days', 7)), 1)
    end_date_param = request.query_params.get('end_date')
    if end_date_param:
        try:
            end_date = datetime.strptime(end_date_param, '%Y-%m-%d').date()
        except ValueError:
            end_date = timezone.localdate()
    else:
        end_date = timezone.localdate()
    start_date = end_date - timedelta(days=days - 1)

    meal_logs = MealLog.objects.filter(user=user, date__range=(start_date, end_date))

    aggregates = meal_logs.aggregate(
        calories=Sum('calories'),
        protein=Sum('protein'),
        carbs=Sum('carbs'),
        fat=Sum('fat'),
    )

    per_day = list(
        meal_logs.values('date').annotate(
            calories=Sum('calories'),
            protein=Sum('protein'),
            carbs=Sum('carbs'),
            fat=Sum('fat'),
        ).order_by('-date')
    )

    target_calories = None
    if plan and plan.daily_calories:
        target_calories = plan.daily_calories
    elif hasattr(user, 'daily_calories_target'):
        target_calories = user.daily_calories_target

    macros_target = {
        'calories': target_calories,
        'protein': float(plan.protein_grams) if plan and plan.protein_grams else None,
        'carbs': float(plan.carbs_grams) if plan and plan.carbs_grams else None,
        'fat': float(plan.fat_grams) if plan and plan.fat_grams else None,
    }

    return Response({
        'plan': plan_data,
        'user_id': user.id,
        'period': {
            'start_date': start_date,
            'end_date': end_date,
            'days': days,
        },
        'macros_target': macros_target,
        'macro_intake': {
            'totals': {k: (float(v) if v is not None else 0) for k, v in aggregates.items()},
            'per_day': per_day,
        },
        'logs_count': meal_logs.count(),
    })


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_user_plan_history(request, user_id: int):
    """
    Historial de cambios de planes nutricionales de un usuario (hasta 100 registros más recientes).
    """
    user = get_object_or_404(User, pk=user_id)
    history_qs = user.nutrition_plan_history.select_related('changed_by').order_by('-created_at')[:100]
    serializer = NutritionPlanHistorySerializer(history_qs, many=True)
    return Response({
        'user_id': user.id,
        'count': len(serializer.data),
        'history': serializer.data,
    })


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_user_meal_logs(request, user_id: int):
    """
    Logs de comidas de un usuario para revisión/admin.
    Query params:
      - start_date / end_date (YYYY-MM-DD) para filtrar rango
      - limit (por defecto 50, máx 200)
    """
    user = get_object_or_404(User, pk=user_id)

    start_param = request.query_params.get('start_date')
    end_param = request.query_params.get('end_date')

    start_date = None
    end_date = None
    if start_param:
        try:
            start_date = datetime.strptime(start_param, '%Y-%m-%d').date()
        except ValueError:
            start_date = None
    if end_param:
        try:
            end_date = datetime.strptime(end_param, '%Y-%m-%d').date()
        except ValueError:
            end_date = None

    logs_qs = MealLog.objects.filter(user=user)
    if start_date:
        logs_qs = logs_qs.filter(date__gte=start_date)
    if end_date:
        logs_qs = logs_qs.filter(date__lte=end_date)

    logs_qs = logs_qs.order_by('-date', '-created_at')
    limit = min(int(request.query_params.get('limit', 50)), 200)
    logs_qs = logs_qs[:limit]

    serializer = MealLogSerializer(logs_qs, many=True)

    aggregates = logs_qs.aggregate(
        calories=Sum('calories'),
        protein=Sum('protein'),
        carbs=Sum('carbs'),
        fat=Sum('fat'),
    )

    return Response({
        'user_id': user.id,
        'count': len(serializer.data),
        'totals': {k: (float(v) if v is not None else 0) for k, v in aggregates.items()},
        'logs': serializer.data,
    })


@api_view(['PATCH', 'DELETE'])
@perm_classes([IsAdminUser])
def admin_user_meal_log_detail(request, user_id: int, log_id):
    """
    Editar o eliminar un log de comida del usuario (uso admin/staff).
    """
    user = get_object_or_404(User, pk=user_id)
    log = get_object_or_404(MealLog, pk=log_id, user=user)

    if request.method == 'DELETE':
        log.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = MealLogSerializer(log, data=request.data, partial=True, context={'request': request})
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_user_plans_stats(request):
    """
    Estadísticas generales de planes nutricionales de usuarios
    """
    # Estadísticas básicas
    total_user_plans = NutritionPlan.objects.filter(user__isnull=False).count()
    active_user_plans = NutritionPlan.objects.filter(user__isnull=False, is_active=True).count()
    inactive_user_plans = NutritionPlan.objects.filter(user__isnull=False, is_active=False).count()
    
    # Usuarios con planes activos
    users_with_active_plans = User.objects.filter(
        nutrition_plans__is_active=True
    ).distinct().count()
    
    # Planes recientes
    now = timezone.now()
    recent_plans_7_days = NutritionPlan.objects.filter(
        user__isnull=False,
        created_at__gte=now - timedelta(days=7)
    ).count()
    recent_plans_30_days = NutritionPlan.objects.filter(
        user__isnull=False,
        created_at__gte=now - timedelta(days=30)
    ).count()
    
    # Estadísticas de calorías
    calories_stats = NutritionPlan.objects.filter(
        user__isnull=False,
        daily_calories__isnull=False
    ).aggregate(
        average=Avg('daily_calories'),
        min=Count('daily_calories', filter=Q(daily_calories__isnull=False)),
        max=Count('daily_calories', filter=Q(daily_calories__isnull=False))
    )
    
    # Obtener min y max reales
    plans_with_calories = NutritionPlan.objects.filter(
        user__isnull=False,
        daily_calories__isnull=False
    )
    if plans_with_calories.exists():
        calories_stats['min'] = plans_with_calories.aggregate(Min('daily_calories'))['daily_calories__min']
        calories_stats['max'] = plans_with_calories.aggregate(Max('daily_calories'))['daily_calories__max']
    else:
        calories_stats['min'] = None
        calories_stats['max'] = None
    
    # Planes más populares (por nombre de plan)
    popular_plans = NutritionPlan.objects.filter(
        user__isnull=False
    ).values('name').annotate(
        count=Count('id')
    ).order_by('-count')[:10]
    
    most_popular_plans = [
        {'name': item['name'], 'count': item['count']}
        for item in popular_plans
    ]
    
    # Timeline de creación
    creation_timeline = {
        'last_24_hours': NutritionPlan.objects.filter(
            user__isnull=False,
            created_at__gte=now - timedelta(hours=24)
        ).count(),
        'last_7_days': recent_plans_7_days,
        'last_30_days': recent_plans_30_days,
        'last_90_days': NutritionPlan.objects.filter(
            user__isnull=False,
            created_at__gte=now - timedelta(days=90)
        ).count(),
    }
    
    # Top usuarios por número de planes
    top_users = User.objects.filter(
        nutrition_plans__isnull=False
    ).annotate(
        plan_count=Count('nutrition_plans')
    ).order_by('-plan_count')[:10]
    
    top_users_by_plans = [
        {
            'email': user.email,
            'name': f"{user.first_name} {user.last_name}".strip() or user.email,
            'plan_count': user.plan_count
        }
        for user in top_users
    ]
    
    # Estadísticas de cambios de planes
    total_changes = NutritionPlanHistory.objects.count()
    changes_by_admins = NutritionPlanHistory.objects.filter(
        changed_by__is_staff=True
    ).count()
    changes_by_users = NutritionPlanHistory.objects.filter(
        Q(changed_by__is_staff=False) | Q(changed_by__isnull=True)
    ).count()
    changes_last_30_days = NutritionPlanHistory.objects.filter(
        created_at__gte=now - timedelta(days=30)
    ).count()
    
    # Planes más cambiados
    most_changed_plans = NutritionPlanHistory.objects.filter(
        new_plan__isnull=False
    ).values('new_plan__name').annotate(
        change_count=Count('id')
    ).order_by('-change_count')[:10]
    
    most_changed_plans_list = [
        {
            'plan_name': item['new_plan__name'] or 'Plan eliminado',
            'change_count': item['change_count']
        }
        for item in most_changed_plans
    ]
    
    # Razones de cambio
    change_reasons = NutritionPlanHistory.objects.values('reason').annotate(
        count=Count('id')
    )
    
    reason_display_map = {
        'user_request': 'Solicitud del usuario',
        'admin_change': 'Cambio por administrador',
        'auto_assigned': 'Asignación automática',
        'goal_change': 'Cambio de objetivo',
        'upgrade': 'Actualización de plan',
        'other': 'Otro',
    }
    
    change_reasons_list = [
        {
            'reason': item['reason'],
            'reason_display': reason_display_map.get(item['reason'], item['reason']),
            'count': item['count']
        }
        for item in change_reasons
    ]
    
    # Distribución de calorías
    calorie_distribution = {
        'low': NutritionPlan.objects.filter(
            user__isnull=False,
            daily_calories__lt=1500
        ).count(),
        'moderate': NutritionPlan.objects.filter(
            user__isnull=False,
            daily_calories__gte=1500,
            daily_calories__lt=2000
        ).count(),
        'high': NutritionPlan.objects.filter(
            user__isnull=False,
            daily_calories__gte=2000,
            daily_calories__lt=2500
        ).count(),
        'very_high': NutritionPlan.objects.filter(
            user__isnull=False,
            daily_calories__gte=2500
        ).count(),
    }
    
    return Response({
        'total_user_plans': total_user_plans,
        'active_user_plans': active_user_plans,
        'inactive_user_plans': inactive_user_plans,
        'users_with_active_plans': users_with_active_plans,
        'recent_plans_7_days': recent_plans_7_days,
        'recent_plans_30_days': recent_plans_30_days,
        'calories_stats': {
            'average': round(calories_stats['average'] or 0, 1),
            'min': calories_stats['min'],
            'max': calories_stats['max'],
        },
        'most_popular_plans': most_popular_plans,
        'creation_timeline': creation_timeline,
        'top_users_by_plans': top_users_by_plans,
        'plan_changes': {
            'total_changes': total_changes,
            'changes_by_admins': changes_by_admins,
            'changes_by_users': changes_by_users,
            'changes_last_30_days': changes_last_30_days,
            'most_changed_plans': most_changed_plans_list,
            'change_reasons': change_reasons_list,
        },
        'calorie_distribution': calorie_distribution,
    })


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_user_plans_usage_stats(request):
    """
    Estadísticas de uso de planes por defecto
    """
    # Planes por defecto (sin usuario asignado o marcados como template)
    default_plans = NutritionPlan.objects.filter(
        Q(user__isnull=True) | Q(is_template=True)
    ).distinct()
    
    total_default_plans = default_plans.count()
    active_default_plans = default_plans.filter(is_active=True).count()
    
    # Uso de cada plan por defecto
    plan_usage = []
    for plan in default_plans:
        users_count = NutritionPlan.objects.filter(
            name=plan.name,
            user__isnull=False
        ).values('user').distinct().count()
        
        plan_usage.append({
            'plan_id': str(plan.id),
            'plan_name': plan.name,
            'daily_calories': plan.daily_calories or 0,
            'target_audience': getattr(plan, 'target_audience', None),
            'min_role_required': getattr(plan, 'min_role_required', None),
            'users_count': users_count,
            'is_default': getattr(plan, 'is_default', False),
        })
    
    # Ordenar por número de usuarios
    plan_usage.sort(key=lambda x: x['users_count'], reverse=True)
    
    return Response({
        'total_default_plans': total_default_plans,
        'active_default_plans': active_default_plans,
        'plan_usage': plan_usage,
    })


@api_view(['GET'])
@perm_classes([IsAdminUser])
def admin_user_plans_history(request):
    """
    Historial general de cambios de planes nutricionales
    """
    limit = min(int(request.query_params.get('limit', 100)), 500)
    user_id = request.query_params.get('user_id')
    
    history_qs = NutritionPlanHistory.objects.select_related(
        'user', 'old_plan', 'new_plan', 'changed_by'
    ).order_by('-created_at')
    
    if user_id and user_id != 'all':
        history_qs = history_qs.filter(user_id=user_id)
    
    history_qs = history_qs[:limit]
    
    serializer = NutritionPlanHistorySerializer(history_qs, many=True)
    
    return Response({
        'count': len(serializer.data),
        'history': serializer.data,
    })
