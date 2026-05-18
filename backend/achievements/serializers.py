from rest_framework import serializers
from .models import Achievement, UserAchievement


class AchievementSerializer(serializers.ModelSerializer):
    """Serializer para logros disponibles"""
    
    class Meta:
        model = Achievement
        fields = [
            "id", "key", "name", "description", "category", "icon", 
            "criteria", "points", "is_active", "created_at"
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class UserAchievementSerializer(serializers.ModelSerializer):
    """Serializer para logros del usuario"""
    achievement = AchievementSerializer(read_only=True)
    user = serializers.ReadOnlyField(source="user.email")
    days_since_unlocked = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = UserAchievement
        fields = [
            "id", "user", "achievement", "unlocked_at", "progress", 
            "days_since_unlocked", "created_at"
        ]
        read_only_fields = ["id", "user", "achievement", "unlocked_at", "created_at"]


class UserAchievementCreateSerializer(serializers.ModelSerializer):
    """Serializer para asignar logros manualmente (admin/staff)"""
    
    class Meta:
        model = UserAchievement
        fields = ["user", "achievement", "progress"]
    
    def validate(self, data):
        # Verificar que el logro esté activo
        if not data["achievement"].is_active:
            raise serializers.ValidationError(
                "No se puede asignar un logro inactivo"
            )
        
        # Verificar que no exista ya
        if UserAchievement.objects.filter(
            user=data["user"], 
            achievement=data["achievement"]
        ).exists():
            raise serializers.ValidationError(
                "Este usuario ya tiene este logro"
            )
        
        return data


class AchievementProgressSerializer(serializers.Serializer):
    """Serializer para mostrar progreso hacia logros"""
    achievement = AchievementSerializer()
    progress_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    current_value = serializers.IntegerField()
    target_value = serializers.IntegerField()
    is_unlocked = serializers.BooleanField()
    unlocked_at = serializers.DateTimeField(allow_null=True)


class AchievementSummarySerializer(serializers.Serializer):
    """Serializer para resumen de logros del usuario"""
    total_achievements = serializers.IntegerField()
    unlocked_achievements = serializers.IntegerField()
    total_points = serializers.IntegerField()
    achievements_by_category = serializers.DictField()
    recent_achievements = serializers.ListField(child=UserAchievementSerializer()) 
