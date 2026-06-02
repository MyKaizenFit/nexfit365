from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes, authentication_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Count, Sum

from .models import Achievement, UserAchievement
from .serializers import (
    AchievementSerializer, UserAchievementSerializer, 
    UserAchievementCreateSerializer, AchievementProgressSerializer,
    AchievementSummarySerializer
)
from .permissions import AchievementPermission, UserAchievementPermission
from .services import calculate_streak_progress, complete_user_day
from accounts.models import CustomUser


class AchievementViewSet(viewsets.ModelViewSet):
    """
    ViewSet para logros disponibles
    """
    queryset = Achievement.objects.all()
    serializer_class = AchievementSerializer
    permission_classes = [AchievementPermission]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter]
    filterset_fields = ["category", "is_active"]
    ordering_fields = ["name", "category", "points", "created_at"]
    ordering = ["category", "name"]
    search_fields = ["name", "description"]
    
    def get_queryset(self):
        return Achievement.objects.filter(is_active=True)
    
    @action(detail=False, methods=["get"])
    def categories(self, request):
        """Obtener categorías de logros disponibles"""
        categories = Achievement.objects.values_list("category", flat=True).distinct()
        return Response({"categories": list(categories)})
    
    @action(detail=False, methods=["get"])
    def by_category(self, request):
        """Obtener logros por categoría"""
        category = request.query_params.get("category")
        if not category:
            return Response(
                {"error": "El parámetro 'category' es requerido"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        queryset = self.get_queryset().filter(category=category)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


class UserAchievementViewSet(viewsets.ModelViewSet):
    """
    ViewSet para logros del usuario
    """
    queryset = UserAchievement.objects.all()
    serializer_class = UserAchievementSerializer
    permission_classes = [UserAchievementPermission]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ["achievement__category"]
    ordering_fields = ["unlocked_at", "achievement__name", "achievement__points"]
    ordering = ["-unlocked_at"]
    
    def get_queryset(self):
        user_id = self.kwargs.get("user_id")
        if user_id:
            return UserAchievement.objects.filter(user_id=user_id).select_related("achievement")
        return UserAchievement.objects.filter(user=self.request.user).select_related("achievement")
    
    def get_serializer_class(self):
        if self.action == "create":
            return UserAchievementCreateSerializer
        return UserAchievementSerializer
    
    def perform_create(self, serializer):
        user_id = self.kwargs.get("user_id")
        if user_id:
            serializer.save(user_id=user_id)
        else:
            serializer.save(user=self.request.user)
    
    @action(detail=False, methods=["get"])
    def summary(self, request, user_id=None):
        """Obtener resumen de logros del usuario"""
        user_id = user_id or request.user.id
        queryset = self.get_queryset()
        
        # Estadísticas básicas
        total_achievements = Achievement.objects.filter(is_active=True).count()
        unlocked_achievements = queryset.count()
        total_points = queryset.aggregate(
            total_points=Sum("achievement__points")
        )["total_points"] or 0
        
        # Logros por categoría
        achievements_by_category = queryset.values(
            "achievement__category"
        ).annotate(
            count=Count("id"),
            points=Sum("achievement__points")
        ).order_by("-points")
        
        # Logros recientes (últimos 5)
        recent_achievements = queryset[:5]
        
        data = {
            "total_achievements": total_achievements,
            "unlocked_achievements": unlocked_achievements,
            "total_points": total_points,
            "achievements_by_category": {
                item["achievement__category"]: {
                    "count": item["count"],
                    "points": item["points"]
                } for item in achievements_by_category
            },
            "recent_achievements": UserAchievementSerializer(recent_achievements, many=True).data,
        }
        
        serializer = AchievementSummarySerializer(data)
        return Response(serializer.data)
    
    @action(detail=False, methods=["get"])
    def progress(self, request, user_id=None):
        """Obtener progreso hacia logros disponibles"""
        user_id = user_id or request.user.id
        
        # Obtener todos los logros activos
        all_achievements = Achievement.objects.filter(is_active=True)
        
        # Obtener logros del usuario
        user_achievements = UserAchievement.objects.filter(user_id=user_id)
        unlocked_achievement_ids = user_achievements.values_list("achievement_id", flat=True)
        
        progress_data = []
        
        for achievement in all_achievements:
            is_unlocked = achievement.id in unlocked_achievement_ids
            user_achievement = user_achievements.filter(achievement=achievement).first()
            
            current_value = 0
            target_value = 1
            
            if is_unlocked:
                current_value = target_value
                progress_percentage = 100.0
            elif achievement.category == "streak":
                user = CustomUser.objects.filter(id=user_id).first()
                if user:
                    current_value, target_value, progress_percentage = calculate_streak_progress(user, achievement)
                else:
                    progress_percentage = 0.0
            else:
                progress_percentage = min((current_value / target_value) * 100, 99.9)
            
            progress_data.append({
                "achievement": AchievementSerializer(achievement).data,
                "progress_percentage": progress_percentage,
                "current_value": current_value,
                "target_value": target_value,
                "is_unlocked": is_unlocked,
                "unlocked_at": user_achievement.unlocked_at if user_achievement else None,
            })
        
        serializer = AchievementProgressSerializer(progress_data, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=["get"])
    def recent(self, request, user_id=None):
        """Obtener logros recientes (últimos 10)"""
        user_id = user_id or request.user.id
        queryset = self.get_queryset()[:10]
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=["get"])
    def by_category(self, request, user_id=None):
        """Obtener logros del usuario por categoría"""
        category = request.query_params.get("category")
        if not category:
            return Response(
                {"error": "El parámetro 'category' es requerido"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = user_id or request.user.id
        queryset = self.get_queryset().filter(achievement__category=category)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)


# Endpoint para completar un día - debe estar fuera de las clases
@api_view(['POST'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def complete_day(request):
    """
    Marca un día como completo y actualiza la racha del usuario.
    Un día completo requiere:
    - Entrenamiento completado
    - Todas las comidas del día completadas (lo que automáticamente implica macros completos)
    """
    # Verificar autenticación
    if not request.user.is_authenticated:
        return Response(
            {"error": "Usuario no autenticado"},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    user = request.user
    
    if not isinstance(user, CustomUser):
        return Response(
            {"error": "Usuario inválido"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    try:
        result = complete_user_day(user)
    except ValueError as exc:
        return Response({"error": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

    response_status = status.HTTP_200_OK if result.get("completed") else status.HTTP_409_CONFLICT
    return Response(result, status=response_status)
