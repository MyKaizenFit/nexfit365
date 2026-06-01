# accounts/views.py
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import CustomUser
from .serializers import (
    UserProfileSerializer, UserProfileUpdateSerializer, 
    UserRegistrationSerializer, UserGoalsSerializer, InitialRegistrationSerializer
)
from notifications.utils import notify_admins_user_change

@api_view(['POST'])
@authentication_classes([])  # Deshabilitar autenticación para registro
@permission_classes([AllowAny])
def register(request):
    """Registro de nuevos usuarios con formulario completo"""
    serializer = UserRegistrationSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        
        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserProfileSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            }
        }, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile(request):
    """Obtener o actualizar perfil del usuario"""
    if request.method == 'GET':
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)
    
    elif request.method in ['PUT', 'PATCH']:
        from .admin_views import record_profile_audit, PROFILE_AUDIT_FIELDS
        from django.forms.models import model_to_dict
        # Campos que pueden afectar la asignación automática de planes
        fields_affecting_assignment = [
            'main_goal', 'training_location', 'activity_level', 'gender',
            'training_days_per_week', 'birth_date', 'age', 'dietary_restrictions',
            'allergies', 'disliked_foods', 'equipment_available', 'weight', 'target_weight'
        ]
        
        # Campos que solo requieren actualización del plan existente (no reasignación)
        fields_requiring_plan_update = [
            'main_goal', 'activity_level', 'weight', 'target_weight'
        ]
        
        # Guardar valores anteriores para comparación
        old_user = CustomUser.objects.get(pk=request.user.pk)
        old_weight = old_user.weight
        old_main_goal = old_user.main_goal
        old_activity_level = old_user.activity_level
        
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            old_snapshot = model_to_dict(request.user, fields=PROFILE_AUDIT_FIELDS)
            user = serializer.save()
            
            # Verificar campos actualizados
            updated_fields = set(request.data.keys())
            
            # Si se actualizó el peso, crear/actualizar entrada en historial de peso
            if 'weight' in updated_fields and user.weight is not None:
                try:
                    from progress.models import WeightEntry
                    from django.utils import timezone
                    from decimal import Decimal
                    import logging
                    logger = logging.getLogger(__name__)
                    
                    # Buscar si ya existe una entrada para hoy
                    today = timezone.now().date()
                    existing_entry = WeightEntry.objects.filter(
                        user=user,
                        date=today
                    ).first()
                    
                    if existing_entry:
                        # Actualizar entrada existente
                        existing_entry.weight = Decimal(str(user.weight))
                        existing_entry.notes = existing_entry.notes or "Peso actualizado desde perfil"
                        existing_entry.save()
                        logger.info(f"✅ Entrada de peso actualizada: {existing_entry.weight} kg")
                    else:
                        # Crear nueva entrada para hoy
                        weight_entry = WeightEntry.objects.create(
                            user=user,
                            weight=Decimal(str(user.weight)),
                            date=today,
                            notes="Peso actualizado desde perfil"
                        )
                        logger.info(f"✅ Nueva entrada de peso creada: {weight_entry.weight} kg")
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"⚠️ No se pudo crear/actualizar entrada de peso: {str(e)}")
                    # No fallar la actualización si hay error en la entrada de peso
            
            # Si se actualizaron campos que requieren actualización de plan
            if any(field in updated_fields for field in fields_requiring_plan_update):
                try:
                    from nutrition.services import PlanAutoUpdateService
                    update_service = PlanAutoUpdateService(user)
                    updated_plan = update_service.update_plan_if_needed(
                        old_weight=old_weight,
                        old_goal=old_main_goal,
                        old_activity_level=old_activity_level,
                        reason="user_profile_updated"
                    )
                    
                    if updated_plan:
                        # Agregar mensaje informativo en la respuesta
                        response_data = serializer.data
                        response_data['plan_updated'] = True
                        response_data['plan_update_message'] = f"Tu plan nutricional se ha ajustado automáticamente. Nuevas calorías: {updated_plan.daily_calories} kcal."
                        return Response(response_data)
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error actualizando plan automáticamente: {str(e)}")
                    # No fallar la actualización si hay error en la actualización del plan
            
            # Si se actualizaron otros campos que requieren reasignación completa
            elif any(field in updated_fields for field in fields_affecting_assignment):
                try:
                    from accounts.services import DefaultPlanAssignmentService
                    assignment_service = DefaultPlanAssignmentService(user)
                    assignment_service.assign()
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Error reasignando planes: {str(e)}")
                    # No fallar la actualización si hay error en la asignación
            
            # Registrar auditoría de perfil para cambios hechos por el usuario
            new_snapshot = model_to_dict(user, fields=PROFILE_AUDIT_FIELDS)
            record_profile_audit(user, request.user, old_snapshot, new_snapshot)

            changed_fields = [
                field for field in PROFILE_AUDIT_FIELDS
                if old_snapshot.get(field) != new_snapshot.get(field)
            ]
            if changed_fields:
                label_map = {
                    'main_goal': 'objetivo principal',
                    'activity_level': 'nivel de actividad',
                    'training_location': 'ubicación de entrenamiento',
                    'training_days_per_week': 'días por semana',
                    'training_days': 'días de entrenamiento',
                    'equipment_available': 'equipamiento',
                    'dietary_restrictions': 'restricciones dietéticas',
                    'allergies': 'alergias',
                    'disliked_foods': 'alimentos que no consume',
                    'medical_conditions': 'condiciones médicas',
                    'injuries_or_medical_issues': 'lesiones/problemas médicos',
                    'additional_info_for_admin': 'información adicional para admin',
                    'weight': 'peso',
                    'target_weight': 'peso objetivo',
                }
                changed_labels = [label_map.get(field, field) for field in changed_fields][:6]
                notify_admins_user_change(
                    user=user,
                    title='🔔 Usuario actualizó su perfil',
                    message=f"{user.email} actualizó: {', '.join(changed_labels)}",
                    data={
                        'category': 'profile_change',
                        'changed_fields': changed_fields,
                    },
                )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_goals(request):
    """Actualizar objetivos de fitness del usuario"""
    serializer = UserGoalsSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_summary(request):
    """Resumen del perfil para el dashboard"""
    user = request.user
    return Response({
        'name': user.get_full_name() or user.email,
        'email': user.email,
        'bmi': user.bmi,
        'age': user.age,
        'fitness_goals': user.main_goal,
        'activity_level': user.activity_level,
        'target_weight': user.target_weight,
        'dietary_restrictions': user.dietary_restrictions,
        'allergies': user.allergies,
        'equipment_available': user.equipment_available
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_initial_registration(request):
    """Completar el formulario de registro inicial y asignar planes automáticamente"""
    try:
        serializer = InitialRegistrationSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            
            # Si el usuario tenía age pero no birth_date, calcular birth_date desde age
            if not user.birth_date and hasattr(user, 'age') and user.age:
                from datetime import date, timedelta
                # Aproximar birth_date desde age (asumir cumpleaños hoy)
                user.birth_date = date.today() - timedelta(days=user.age * 365)
                user.save()
            
            # Calcular age desde birth_date si no existe
            if user.birth_date and (not hasattr(user, 'age') or not user.age):
                user.age = user.calculated_age
                if user.age:
                    user.save()
            
            # Asignar planes automáticamente usando el nuevo servicio de configuraciones
            from accounts.services import DefaultPlanAssignmentService
            assigned_nutrition_plan = None
            assigned_workout_program = None
            configuration_name = None
            plan_message = ""
            workout_message = ""
            
            try:
                assignment_service = DefaultPlanAssignmentService(user)
                result = assignment_service.assign()
                
                if result.configuration:
                    configuration_name = result.configuration.name
                    assigned_nutrition_plan = result.nutrition_plan
                    assigned_workout_program = result.workout_program
                    
                    if assigned_nutrition_plan:
                        plan_message = f"Plan nutricional '{assigned_nutrition_plan.name.split(' - ')[0]}' asignado automáticamente"
                    else:
                        plan_message = "No se asignó plan nutricional (la configuración no incluye uno)"
                    
                    if assigned_workout_program:
                        workout_message = f"Plan de entrenamiento '{assigned_workout_program.name.split(' - ')[0]}' asignado automáticamente"
                    else:
                        workout_message = "No se asignó plan de entrenamiento (la configuración no incluye uno)"
                else:
                    plan_message = "No se encontró una configuración que coincida con tu perfil"
                    workout_message = "No se encontró una configuración que coincida con tu perfil"
            except Exception as e:
                plan_message = f"Error al asignar planes: {str(e)}"
                workout_message = f"Error al asignar planes: {str(e)}"
            
            response_data = {
                'message': 'Formulario de registro inicial completado exitosamente',
                'profile': UserProfileSerializer(user).data,
                'form_version': INITIAL_REGISTRATION_FORM_VERSION,
                'configuration': {
                    'name': configuration_name,
                    'found': configuration_name is not None
                },
                'nutrition_plan': {
                    'assigned': assigned_nutrition_plan is not None,
                    'message': plan_message,
                    'plan_id': str(assigned_nutrition_plan.id) if assigned_nutrition_plan else None,
                    'plan_name': assigned_nutrition_plan.name if assigned_nutrition_plan else None
                },
                'workout_plan': {
                    'assigned': assigned_workout_program is not None,
                    'message': workout_message,
                    'plan_id': str(assigned_workout_program.id) if assigned_workout_program else None,
                    'plan_name': assigned_workout_program.name if assigned_workout_program else None
                }
            }
            
            return Response(response_data, status=status.HTTP_200_OK)
        else:
            # Si hay errores de validación, devolverlos con más detalle
            error_response = {
                'detail': 'Error de validación en el formulario',
                'errors': serializer.errors
            }
            return Response(error_response, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        # Capturar cualquier excepción inesperada
        import traceback
        error_detail = str(e)
        traceback.print_exc()
        return Response({
            'detail': f'Error al procesar el registro: {error_detail}',
            'error': error_detail
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# Versión actual del formulario de registro inicial
INITIAL_REGISTRATION_FORM_VERSION = 2  # Incrementar esto cuando se agreguen/modifiquen campos

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def initial_registration_status(request):
    """Verificar si el usuario ha completado el registro inicial"""
    user = request.user
    
    # AUTO-FIX: Si training_days está vacío pero training_days_per_week tiene valor, generar días por defecto
    if user.training_days_per_week and (not user.training_days or len(user.training_days) == 0):
        # Generar días de entrenamiento por defecto: Lun, Mié, Vie, Sáb, Dom (1,3,5,6,7)
        default_days = [1, 3, 5, 6, 7][:user.training_days_per_week]
        user.training_days = default_days
        user.save()
    
    # Campos requeridos (versión 2: birth_date en lugar de age, training_days agregado)
    required_fields = [
        'birth_date', 'gender', 'height', 'weight', 'activity_level',
        'training_days_per_week', 'training_days', 'training_location', 'main_goal'
    ]
    
    completed_fields = []
    missing_fields = []
    
    for field in required_fields:
        if hasattr(user, field):
            value = getattr(user, field)
            # Para campos JSONField, verificar que no esté vacío
            if field == 'training_days':
                if isinstance(value, list) and len(value) > 0:
                    completed_fields.append(field)
                else:
                    missing_fields.append(field)
            elif value is not None:
                completed_fields.append(field)
            else:
                missing_fields.append(field)
        else:
            missing_fields.append(field)
    
    # Verificar si está completo (sin verificación de versión para simplificar)
    is_complete = len(missing_fields) == 0
    completion_percentage = (len(completed_fields) / len(required_fields)) * 100
    
    response_data = {
        'is_complete': is_complete,
        'completion_percentage': completion_percentage,
        'completed_fields': completed_fields,
        'missing_fields': missing_fields,
        'form_version': INITIAL_REGISTRATION_FORM_VERSION,
        'user_form_version': INITIAL_REGISTRATION_FORM_VERSION,  # Siempre reportar versión actual
        'needs_update': False,  # Deshabilitado por ahora
        'profile': UserProfileSerializer(user).data
    }

    return Response(response_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gdpr_export_data(request):
    """GDPR: exportar todos los datos personales del usuario en JSON"""
    from django.http import JsonResponse
    from django.utils import timezone

    user = request.user
    data = {
        'exported_at': timezone.now().isoformat(),
        'profile': UserProfileSerializer(user).data,
    }

    try:
        from workouts.models import WorkoutLog

        logs = WorkoutLog.objects.filter(user=user).values(
            'id', 'date', 'notes', 'duration_minutes', 'created_at'
        )
        data['workout_logs'] = list(logs)
    except Exception:
        data['workout_logs'] = []

    try:
        from nutrition.models import MealLog

        meal_logs = MealLog.objects.filter(user=user).values(
            'id', 'date', 'meal_type', 'notes', 'created_at'
        )
        data['meal_logs'] = list(meal_logs)
    except Exception:
        data['meal_logs'] = []

    try:
        from progress.models import WeightEntry

        weight_entries = WeightEntry.objects.filter(user=user).values(
            'id', 'date', 'weight', 'notes', 'created_at'
        )
        data['weight_entries'] = list(weight_entries)
    except Exception:
        data['weight_entries'] = []

    try:
        from progress.models import BodyMeasurement

        measurements = BodyMeasurement.objects.filter(user=user).values(
            'id', 'date', 'created_at'
        )
        data['body_measurements'] = list(measurements)
    except Exception:
        data['body_measurements'] = []

    try:
        from notifications.models import Notification

        notifications = Notification.objects.filter(user=user).values(
            'id', 'title', 'message', 'type', 'is_read', 'created_at'
        )
        data['notifications'] = list(notifications)
    except Exception:
        data['notifications'] = []

    response = JsonResponse(data, json_dumps_params={'ensure_ascii': False, 'indent': 2})
    response['Content-Disposition'] = f'attachment; filename="nexfit365_datos_{user.id}.json"'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def gdpr_request_deletion(request):
    """GDPR: solicitar la eliminación de la cuenta y datos personales"""
    from django.conf import settings
    from django.core.mail import send_mail
    from django.utils import timezone

    user = request.user
    reason = request.data.get('reason', '')

    try:
        admin_emails = list(
            CustomUser.objects.filter(role='admin', is_active=True).values_list('email', flat=True)
        )
        if not admin_emails:
            admin_emails = [settings.DEFAULT_FROM_EMAIL]

        subject = f"[NexFit365] Solicitud de eliminación de cuenta: {user.email}"
        message = (
            f"Un usuario ha solicitado la eliminación de su cuenta y datos personales.\n\n"
            f"Usuario: {user.email}\n"
            f"ID: {user.id}\n"
            f"Fecha de solicitud: {timezone.now().isoformat()}\n"
            f"Motivo: {reason or 'No especificado'}\n\n"
            f"De acuerdo con el RGPD, debes procesar esta solicitud en un plazo máximo de 30 días.\n"
            f"Accede al panel de administración para gestionar esta solicitud."
        )
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=admin_emails,
            fail_silently=True,
        )
    except Exception as e:
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "⚠️ No se pudo enviar email RGPD al admin para usuario %s: %s", user.email, e
        )

    try:
        send_mail(
            subject="NexFit365 – Confirmación de solicitud de eliminación",
            message=(
                f"Hola {user.first_name or user.email},\n\n"
                f"Hemos recibido tu solicitud de eliminación de cuenta y datos personales.\n\n"
                f"De acuerdo con el Reglamento General de Protección de Datos (RGPD), "
                f"procesaremos tu solicitud en un plazo máximo de 30 días.\n\n"
                f"Si tienes dudas, puedes responder a este email.\n\n"
                f"Saludos,\nEl equipo de NexFit365"
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception as e:
        import logging as _logging
        _logging.getLogger(__name__).warning(
            "⚠️ No se pudo enviar confirmación RGPD al usuario %s: %s", user.email, e
        )

    return Response(
        {
            'detail': 'Solicitud de eliminación recibida. La procesaremos en un plazo máximo de 30 días.'
        },
        status=status.HTTP_200_OK,
    )