# nutrition/signals.py
# Signals para actualización automática de planes nutricionales

import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from accounts.models import CustomUser
from progress.models import WeightEntry
from nutrition.services import PlanAutoUpdateService
from nutrition.models import NutritionPlan

logger = logging.getLogger(__name__)


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
        except CustomUser.DoesNotExist:
            instance._old_weight = None
            instance._old_main_goal = None
            instance._old_activity_level = None
    else:
        # Nuevo usuario, no hay valores anteriores
        instance._old_weight = None
        instance._old_main_goal = None
        instance._old_activity_level = None


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
    
    # Solo actualizar si hay cambios relevantes
    weight_changed = old_weight is not None and instance.weight is not None and old_weight != instance.weight
    goal_changed = old_main_goal != instance.main_goal
    activity_changed = old_activity_level != instance.activity_level
    
    if not (weight_changed or goal_changed or activity_changed):
        return
    
    try:
        update_service = PlanAutoUpdateService(instance)
        should_update, update_reason = update_service.should_update_plan(
            old_weight=old_weight,
            old_goal=old_main_goal,
            old_activity_level=old_activity_level
        )
        
        if should_update:
            active_plan = NutritionPlan.objects.filter(user=instance, is_active=True).first()
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


