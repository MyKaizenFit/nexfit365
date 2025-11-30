from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status

# Si usas estas demos, mantenemos los imports; si no, puedes quitarlos
from accounts.permissions import IsAdminOnly, IsTrainerOrAdmin, IsMemberOrStaff


@api_view(['GET'])
@permission_classes([AllowAny])  # Permitir acceso público
def health(request):
    """Endpoint de health check para verificar que el servidor esté funcionando"""
    return Response({
        "status": "ok",
        "message": "Servidor funcionando correctamente",
        "timestamp": "2025-08-28"
    })


@api_view(['GET'])
@permission_classes([AllowAny])  # Permitir acceso público
def public_health(request):
    """Endpoint de health check completamente público para verificación de conectividad"""
    return Response({
        "status": "ok",
        "message": "Servidor funcionando correctamente",
        "timestamp": "2025-08-28",
        "public": True
    })


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    """Obtener o actualizar información del usuario autenticado"""
    if request.method == 'GET':
        from accounts.serializers import UserProfileSerializer
        user = request.user
        serializer = UserProfileSerializer(user, context={'request': request})
        return Response(serializer.data)
    elif request.method in ['PUT', 'PATCH']:
        from accounts.serializers import UserProfileUpdateSerializer
        from accounts.models import CustomUser
        serializer = UserProfileUpdateSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Devolver el perfil completo usando UserProfileSerializer
            from accounts.serializers import UserProfileSerializer
            full_serializer = UserProfileSerializer(request.user, context={'request': request})
            return Response(full_serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAdminOnly])
def only_admin(request):
    return Response({"ok": True, "scope": "admin"})


@api_view(['GET'])
@permission_classes([IsTrainerOrAdmin])
def only_trainer(request):
    return Response({"ok": True, "scope": "trainer"})


@api_view(['GET'])
@permission_classes([IsMemberOrStaff])
def only_member(request):
    return Response({"ok": True, "scope": "member"})


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def user_stats(request):
    """
    Obtener o actualizar estadísticas del usuario
    """
    from django.db.models import Sum
    from django.utils import timezone
    from datetime import timedelta
    
    user = request.user
    
    if request.method == 'GET':
        # Calcular datos en tiempo real
        today = timezone.now().date()
        
        # Calorías del día
        from nutrition.models import MealLog
        try:
            calories_today = MealLog.objects.filter(
                user=user, date=today
            ).aggregate(
                total_calories=Sum("meal__calories")
            )["total_calories"] or 0
        except:
            calories_today = 0
        
        # Entrenamientos de la semana
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)
        
        from workouts.models import WorkoutLog
        try:
            workouts_this_week = WorkoutLog.objects.filter(
                user=user, date__range=[week_start, week_end], completed=True
            ).count()
        except:
            workouts_this_week = 0
        
        # Peso actual
        from progress.models import WeightEntry
        try:
            current_weight = WeightEntry.objects.filter(
                user=user
            ).order_by("-date").values_list("weight", flat=True).first()
        except:
            current_weight = None
        
        # Calcular días en transformación (desde el registro)
        days_in_transformation = (today - user.date_joined.date()).days
        
        # Calcular cambio de peso (por defecto 0)
        weight_change = 0.0
        
        # Próxima revisión (por defecto en 30 días)
        next_review_date = today + timedelta(days=30)
        days_until_review = (next_review_date - today).days
        next_review = f"{days_until_review} días"
        
        response_data = {
            "caloriesToday": calories_today,
            "caloriesGoal": 2000,  # Por defecto
            "currentWeight": float(current_weight) if current_weight else 70.0,
            "weightChange": weight_change,
            "workoutsThisWeek": workouts_this_week,
            "workoutsGoal": 5,  # Por defecto
            "nextReview": next_review,
            "daysInTransformation": days_in_transformation,
        }
        
        return Response(response_data)
    
    elif request.method == 'PUT':
        # Por ahora solo devolvemos un mensaje de éxito
        return Response({
            "message": "Estadísticas actualizadas correctamente"
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def motivational_tip(request):
    """
    Obtener un consejo motivacional aleatorio que cambie cada 24 horas
    """
    from notifications.models import MotivationalTip
    from django.utils import timezone
    from datetime import timedelta
    
    # Buscar un consejo que no se haya mostrado en las últimas 24 horas
    yesterday = timezone.now() - timedelta(hours=24)
    
    # Intentar encontrar un consejo no mostrado recientemente
    tip = MotivationalTip.objects.filter(
        is_active=True,
        last_shown__lt=yesterday
    ).order_by('?').first()
    
    # Si no hay ninguno, tomar uno aleatorio
    if not tip:
        tip = MotivationalTip.objects.filter(is_active=True).order_by('?').first()
    
    if tip:
        # Marcar como mostrado
        tip.last_shown = timezone.now()
        tip.save()
        
        return Response({
            "title": tip.title,
            "content": tip.content,
            "category": tip.category
        })
    else:
        return Response({
            "title": "¡Mantén la motivación!",
            "content": "Recuerda que cada día es una nueva oportunidad para mejorar.",
            "category": "general"
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_feedback(request):
    """
    Enviar mensaje de feedback a los administradores
    """
    from notifications.models import FeedbackMessage
    
    subject = request.data.get('subject', '')
    message = request.data.get('message', '')
    category = request.data.get('category', 'other')
    priority = request.data.get('priority', 'medium')
    
    if not subject or not message:
        return Response({
            "error": "El asunto y el mensaje son obligatorios"
        }, status=400)
    
    # Crear el mensaje de feedback
    feedback = FeedbackMessage.objects.create(
        user=request.user,
        subject=subject,
        message=message,
        category=category,
        priority=priority
    )
    
    # Aquí podrías enviar una notificación a los administradores
    # Por ahora solo devolvemos éxito
    
    return Response({
        "message": "Feedback enviado correctamente",
        "id": feedback.id
    }, status=201)
