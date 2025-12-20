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
        # Campos que pueden afectar la asignación automática
        fields_affecting_assignment = [
            'main_goal', 'training_location', 'activity_level', 'gender',
            'training_days_per_week', 'birth_date', 'age', 'dietary_restrictions',
            'equipment_available'
        ]
        
        # Verificar si se están actualizando campos relevantes
        old_user = request.user
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            
            # Re-evaluar configuración si se actualizaron campos relevantes
            updated_fields = set(request.data.keys())
            if any(field in updated_fields for field in fields_affecting_assignment):
                try:
                    from accounts.services import DefaultPlanAssignmentService
                    assignment_service = DefaultPlanAssignmentService(user)
                    assignment_service.assign()
                except Exception as e:
                    # No fallar la actualización si hay error en la asignación
                    pass
            
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
        'fitness_goals': user.fitness_goals,
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
        print(f'✅ Auto-generados training_days para {user.email}: {default_days}')
    
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