# nutrition/signals.py
# Signals para actualización automática de planes nutricionales

import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from accounts.models import CustomUser
from progress.models import WeightEntry
from nutrition.services import PlanAutoUpdateService
from nutrition.models import NutritionPlan, Recipe, PlanMeal, PlanMealRecipe

logger = logging.getLogger(__name__)


def _recompute_plan_daily_calories(plan_id: int) -> None:
    """Recalcula daily_calories/macros de un NutritionPlan a partir de sus PlanMeals almacenados."""
    meals = list(PlanMeal.objects.filter(plan_id=plan_id))
    day_totals = {}
    for day in range(1, 8):
        totals = {'calories': 0.0, 'protein': 0.0, 'carbs': 0.0, 'fat': 0.0}
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

    count = len(active_days)
    NutritionPlan.objects.filter(pk=plan_id).update(
        daily_calories=int(round(sum(t['calories'] for t in active_days) / count)),
        protein_grams=int(round(sum(t['protein'] for t in active_days) / count)),
        carbs_grams=int(round(sum(t['carbs'] for t in active_days) / count)),
        fat_grams=int(round(sum(t['fat'] for t in active_days) / count)),
    )


@receiver(pre_save, sender=Recipe)
def store_recipe_previous_macros(sender, instance, **kwargs):
    """Guarda los valores nutricionales previos de la receta para detectar cambios."""
    if instance.pk:
        try:
            old = Recipe.objects.get(pk=instance.pk)
            instance._old_calories = old.calories
            instance._old_protein = old.protein
            instance._old_carbs = old.carbs
            instance._old_fat = old.fat
        except Recipe.DoesNotExist:
            instance._old_calories = None
            instance._old_protein = None
            instance._old_carbs = None
            instance._old_fat = None
    else:
        instance._old_calories = None
        instance._old_protein = None
        instance._old_carbs = None
        instance._old_fat = None


@receiver(post_save, sender=Recipe)
def update_meal_macros_on_recipe_change(sender, instance, created, **kwargs):
    """
    Cuando cambian las calorías o macros de una receta, recalcula automáticamente
    los PlanMeal y NutritionPlan que la referencian (sin override personalizado).
    """
    if created:
        return

    old_calories = getattr(instance, '_old_calories', None)
    if old_calories is None:
        return

    macros_changed = (
        int(old_calories or 0) != int(instance.calories or 0)
        or float(getattr(instance, '_old_protein', 0) or 0) != float(instance.protein or 0)
        or float(getattr(instance, '_old_carbs', 0) or 0) != float(instance.carbs or 0)
        or float(getattr(instance, '_old_fat', 0) or 0) != float(instance.fat or 0)
    )
    if not macros_changed:
        return

    try:
        # IDs de comidas que usan esta receta
        affected_meal_ids = set(
            PlanMealRecipe.objects.filter(recipe=instance).values_list('meal_id', flat=True)
        )
        if not affected_meal_ids:
            return

        affected_plan_ids = set()

        for meal in PlanMeal.objects.filter(id__in=affected_meal_ids).select_related('plan'):
            options = []
            for mr in PlanMealRecipe.objects.filter(meal=meal).select_related('recipe'):
                servings = float(mr.servings or 1)
                cal = float(mr.custom_calories) if mr.custom_calories is not None else float(mr.recipe.calories or 0) * servings
                prot = float(mr.custom_protein) if mr.custom_protein is not None else float(mr.recipe.protein or 0) * servings
                carbs = float(mr.custom_carbs) if mr.custom_carbs is not None else float(mr.recipe.carbs or 0) * servings
                fat = float(mr.custom_fat) if mr.custom_fat is not None else float(mr.recipe.fat or 0) * servings
                options.append({'calories': cal, 'protein': prot, 'carbs': carbs, 'fat': fat})

            if not options:
                continue

            n = len(options)
            PlanMeal.objects.filter(pk=meal.pk).update(
                calories=int(round(sum(o['calories'] for o in options) / n)),
                protein=round(sum(o['protein'] for o in options) / n, 2),
                carbs=round(sum(o['carbs'] for o in options) / n, 2),
                fat=round(sum(o['fat'] for o in options) / n, 2),
            )

            if meal.plan_id:
                affected_plan_ids.add(meal.plan_id)

        for plan_id in affected_plan_ids:
            _recompute_plan_daily_calories(plan_id)

        logger.info(
            "✅ Receta %s actualizada: recalculadas %d comidas en %d planes",
            instance.name, len(affected_meal_ids), len(affected_plan_ids),
        )

    except Exception as exc:
        logger.error("❌ Error propagando cambios de receta %s a planes: %s", instance.name, exc)
        import traceback
        logger.error(traceback.format_exc())


@receiver(pre_save, sender=CustomUser)
def store_user_previous_values(sender, instance, **kwargs):
    """
    Almacena valores anteriores del usuario antes de guardar
    para poder comparar cambios después.
    """
    if instance.pk:
        try:
            old_instance = CustomUser.objects.get(pk=instance.pk)
            # Almacenar valores anteriores en el objeto para uso posterior
            instance._old_weight = old_instance.weight
            instance._old_main_goal = old_instance.main_goal
            instance._old_activity_level = old_instance.activity_level
            instance._old_admin_calories_override = old_instance.admin_calories_override
        except CustomUser.DoesNotExist:
            instance._old_weight = None
            instance._old_main_goal = None
            instance._old_activity_level = None
            instance._old_admin_calories_override = None
    else:
        # Nuevo usuario, no hay valores anteriores
        instance._old_weight = None
        instance._old_main_goal = None
        instance._old_activity_level = None
        instance._old_admin_calories_override = None


@receiver(post_save, sender=CustomUser)
def update_plan_on_user_change(sender, instance, created, **kwargs):
    """
    Actualiza automáticamente el plan nutricional cuando cambian
    datos relevantes del usuario (peso, objetivo, nivel de actividad).
    """
    # No actualizar para nuevos usuarios (se asignará plan en registro inicial)
    if created:
        return
    
    # Obtener valores anteriores almacenados
    old_weight = getattr(instance, '_old_weight', None)
    old_main_goal = getattr(instance, '_old_main_goal', None)
    old_activity_level = getattr(instance, '_old_activity_level', None)
    old_admin_calories_override = getattr(instance, '_old_admin_calories_override', None)
    
    # Solo actualizar si hay cambios relevantes
    weight_changed = old_weight is not None and instance.weight is not None and old_weight != instance.weight
    goal_changed = old_main_goal != instance.main_goal
    activity_changed = old_activity_level != instance.activity_level
    admin_calories_override_changed = old_admin_calories_override != instance.admin_calories_override
    
    if not (weight_changed or goal_changed or activity_changed or admin_calories_override_changed):
        return
    
    try:
        active_plan = NutritionPlan.objects.filter(user=instance, is_active=True).first()

        if admin_calories_override_changed and active_plan:
            nutrition_service = PlanAutoUpdateService(instance).nutrition_service
            if instance.admin_calories_override:
                target_calories = int(instance.admin_calories_override)
                updated_plan = nutrition_service.adjust_plan_calories(
                    active_plan,
                    target_calories - int(active_plan.daily_calories or 0),
                    reason="admin_calories_override",
                    notes=f"Override manual de administrador aplicado: {target_calories} kcal",
                )
                logger.info(
                    "✅ Override manual de kcal aplicado para %s: %s kcal",
                    instance.email,
                    updated_plan.daily_calories,
                )
                return

            updated_plan = nutrition_service.update_existing_plan(
                plan=active_plan,
                reason="admin_calories_override_removed",
                notes="Override manual de administrador eliminado; recalculado por perfil.",
                old_weight=old_weight,
            )
            logger.info(
                "✅ Override manual de kcal eliminado para %s; plan recalculado a %s kcal",
                instance.email,
                updated_plan.daily_calories,
            )
            return

        update_service = PlanAutoUpdateService(instance)
        should_update, update_reason = update_service.should_update_plan(
            old_weight=old_weight,
            old_goal=old_main_goal,
            old_activity_level=old_activity_level
        )
        
        if should_update:
            if active_plan:
                # Aplicar actualización automática con transición gradual
                nutrition_service = update_service.nutrition_service
                updated_plan = nutrition_service.update_existing_plan(
                    plan=active_plan,
                    reason="auto_updated",
                    notes=f"Actualización automática: {update_reason}",
                    old_weight=old_weight
                )
                
                # Crear notificación informativa (no requiere acción)
                try:
                    from notifications.models import Notification
                    Notification.objects.create(
                        user=instance,
                        type='nutrition',
                        title='Plan nutricional actualizado',
                        message=f'Tu plan nutricional se ha ajustado automáticamente: {update_reason}. Nuevas calorías: {updated_plan.daily_calories} kcal.',
                        data={
                            'old_calories': active_plan.daily_calories,
                            'new_calories': updated_plan.daily_calories,
                            'reason': update_reason
                        }
                    )
                except Exception as notif_error:
                    logger.warning(f"No se pudo crear notificación: {notif_error}")
                
                logger.info(f"✅ Plan actualizado automáticamente para {instance.email}: {update_reason}")
        else:
            logger.debug(f"No se requirió actualización de plan para {instance.email}")
            
    except Exception as e:
        logger.error(f"❌ Error actualizando plan para {instance.email}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        # No fallar la operación principal si hay error en la actualización


@receiver(post_save, sender=WeightEntry)
def update_plan_on_weight_entry(sender, instance, created, **kwargs):
    """
    Actualiza automáticamente el plan nutricional cuando se registra
    una nueva entrada de peso.
    """
    if not created:
        return
    
    user = instance.user
    
    # Obtener el peso anterior del usuario
    old_weight = user.weight
    
    # Actualizar peso del usuario si es diferente
    if user.weight != float(instance.weight):
        user.weight = float(instance.weight)
        user.save(update_fields=['weight'])
    
    try:
        update_service = PlanAutoUpdateService(user)
        should_update, update_reason = update_service.should_update_plan(old_weight=old_weight)
        
        if should_update:
            active_plan = NutritionPlan.objects.filter(user=user, is_active=True).first()
            if active_plan:
                # Aplicar actualización automática con transición gradual
                nutrition_service = update_service.nutrition_service
                updated_plan = nutrition_service.update_existing_plan(
                    plan=active_plan,
                    reason="weight_entry_created",
                    notes=f"Actualización automática tras registro de peso: {update_reason}",
                    old_weight=old_weight
                )
                
                # Crear notificación informativa
                try:
                    from notifications.models import Notification
                    Notification.objects.create(
                        user=user,
                        type='nutrition',
                        title='Plan nutricional actualizado',
                        message=f'Tu plan nutricional se ha ajustado automáticamente tras registrar tu peso: {update_reason}. Nuevas calorías: {updated_plan.daily_calories} kcal.',
                        data={
                            'old_calories': active_plan.daily_calories,
                            'new_calories': updated_plan.daily_calories,
                            'reason': update_reason
                        }
                    )
                except Exception as notif_error:
                    logger.warning(f"No se pudo crear notificación: {notif_error}")
                
                logger.info(f"✅ Plan actualizado automáticamente para {user.email} tras entrada de peso: {update_reason}")
            
    except Exception as e:
        logger.error(f"❌ Error actualizando plan tras entrada de peso para {user.email}: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())
        # No fallar la operación principal si hay error en la actualización

