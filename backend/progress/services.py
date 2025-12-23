# progress/services.py
# Servicio para análisis de progreso y recomendaciones automáticas

import logging
from typing import Dict, List, Optional, Tuple
from datetime import date, timedelta
from django.utils import timezone
from django.db.models import Avg, Count, Q, Max, Min
from accounts.models import CustomUser
from progress.models import WeightEntry, WorkoutLog
from nutrition.models import NutritionPlan, MealLog

logger = logging.getLogger(__name__)


class ProgressAnalysisService:
    """
    Servicio para analizar el progreso del usuario y generar recomendaciones
    automáticas basadas en resultados.
    """
    
    def __init__(self, user: CustomUser):
        self.user = user
    
    def analyze_weight_progress(self, weeks: int = 4) -> Dict:
        """
        Analiza el progreso de peso en las últimas semanas.
        
        Args:
            weeks: Número de semanas a analizar
        
        Returns:
            Dict con análisis y recomendaciones
        """
        end_date = timezone.now().date()
        start_date = end_date - timedelta(weeks=weeks)
        
        # Obtener entradas de peso en el período
        weight_entries = WeightEntry.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lte=end_date
        ).order_by('date')
        
        if weight_entries.count() < 2:
            return {
                'has_enough_data': False,
                'message': 'No hay suficientes datos de peso para analizar',
                'recommendations': []
            }
        
        # Calcular cambios
        first_weight = float(weight_entries.first().weight)
        last_weight = float(weight_entries.last().weight)
        weight_change = last_weight - first_weight
        weight_change_pct = (weight_change / first_weight * 100) if first_weight > 0 else 0
        
        # Calcular promedio semanal
        weekly_change = weight_change / weeks
        
        # Determinar objetivo del usuario
        user_goal = self.user.main_goal
        target_weight = self.user.target_weight
        
        recommendations = []
        status = 'on_track'
        
        # Análisis según objetivo
        if user_goal == 'lose_weight':
            if weight_change > 0:
                # Está ganando peso cuando debería perderlo
                status = 'stalled'
                recommendations.append({
                    'type': 'warning',
                    'title': 'Estancamiento detectado',
                    'message': f'Has ganado {abs(weight_change):.1f} kg en las últimas {weeks} semanas. Considera ajustar tu plan.',
                    'action': 'reduce_calories',
                    'suggested_calorie_adjustment': -200
                })
            elif weight_change < -1.0 * weeks:
                # Está perdiendo más de 1kg por semana (muy rápido)
                status = 'too_fast'
                recommendations.append({
                    'type': 'warning',
                    'title': 'Pérdida de peso muy rápida',
                    'message': f'Estás perdiendo {abs(weekly_change):.1f} kg por semana. Una pérdida más gradual es más sostenible.',
                    'action': 'increase_calories',
                    'suggested_calorie_adjustment': 200
                })
            elif weight_change < -0.5 * weeks:
                # Pérdida saludable (0.5-1kg por semana)
                status = 'on_track'
                recommendations.append({
                    'type': 'success',
                    'title': '¡Buen progreso!',
                    'message': f'Estás perdiendo peso a un ritmo saludable ({abs(weekly_change):.1f} kg/semana).',
                    'action': 'maintain'
                })
            else:
                # Pérdida muy lenta o estancamiento
                status = 'slow'
                recommendations.append({
                    'type': 'info',
                    'title': 'Progreso lento',
                    'message': f'Tu pérdida de peso es muy lenta ({abs(weekly_change):.1f} kg/semana). Considera ajustar tu plan.',
                    'action': 'reduce_calories',
                    'suggested_calorie_adjustment': -150
                })
        
        elif user_goal == 'gain_muscle':
            if weight_change < 0:
                # Está perdiendo peso cuando debería ganarlo
                status = 'stalled'
                recommendations.append({
                    'type': 'warning',
                    'title': 'Estancamiento detectado',
                    'message': f'Has perdido {abs(weight_change):.1f} kg en las últimas {weeks} semanas. Necesitas más calorías.',
                    'action': 'increase_calories',
                    'suggested_calorie_adjustment': 300
                })
            elif weight_change > 0.5 * weeks:
                # Ganancia saludable
                status = 'on_track'
                recommendations.append({
                    'type': 'success',
                    'title': '¡Buen progreso!',
                    'message': f'Estás ganando peso a un ritmo adecuado ({weekly_change:.1f} kg/semana).',
                    'action': 'maintain'
                })
            else:
                # Ganancia muy lenta
                status = 'slow'
                recommendations.append({
                    'type': 'info',
                    'title': 'Ganancia lenta',
                    'message': f'Tu ganancia de peso es lenta ({weekly_change:.1f} kg/semana). Considera aumentar calorías.',
                    'action': 'increase_calories',
                    'suggested_calorie_adjustment': 200
                })
        
        # Verificar si está cerca del peso objetivo
        if target_weight:
            current_weight = float(self.user.weight) if self.user.weight else last_weight
            distance_to_goal = abs(current_weight - target_weight)
            
            if distance_to_goal < 2.0:
                recommendations.append({
                    'type': 'success',
                    'title': '¡Casi lo logras!',
                    'message': f'Estás a solo {distance_to_goal:.1f} kg de tu peso objetivo.',
                    'action': 'maintain'
                })
        
        return {
            'has_enough_data': True,
            'status': status,
            'period_weeks': weeks,
            'first_weight': first_weight,
            'last_weight': last_weight,
            'weight_change': weight_change,
            'weight_change_pct': round(weight_change_pct, 2),
            'weekly_change': round(weekly_change, 2),
            'recommendations': recommendations
        }
    
    def analyze_workout_consistency(self, weeks: int = 4) -> Dict:
        """
        Analiza la consistencia de entrenamientos.
        
        Args:
            weeks: Número de semanas a analizar
        
        Returns:
            Dict con análisis de consistencia
        """
        end_date = timezone.now().date()
        start_date = end_date - timedelta(weeks=weeks)
        
        # Obtener entrenamientos completados
        completed_workouts = WorkoutLog.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lte=end_date,
            completed=True
        )
        
        total_workouts = completed_workouts.count()
        expected_workouts = (self.user.training_days_per_week or 3) * weeks
        consistency_pct = (total_workouts / expected_workouts * 100) if expected_workouts > 0 else 0
        
        recommendations = []
        
        if consistency_pct < 50:
            recommendations.append({
                'type': 'warning',
                'title': 'Baja consistencia',
                'message': f'Solo completaste el {consistency_pct:.0f}% de tus entrenamientos planificados.',
                'action': 'improve_consistency'
            })
        elif consistency_pct < 75:
            recommendations.append({
                'type': 'info',
                'title': 'Consistencia mejorable',
                'message': f'Completaste el {consistency_pct:.0f}% de tus entrenamientos. Intenta mejorar tu consistencia.',
                'action': 'improve_consistency'
            })
        else:
            recommendations.append({
                'type': 'success',
                'title': '¡Excelente consistencia!',
                'message': f'Completaste el {consistency_pct:.0f}% de tus entrenamientos. ¡Sigue así!',
                'action': 'maintain'
            })
        
        return {
            'period_weeks': weeks,
            'total_workouts': total_workouts,
            'expected_workouts': expected_workouts,
            'consistency_pct': round(consistency_pct, 1),
            'recommendations': recommendations
        }
    
    def analyze_nutrition_consistency(self, weeks: int = 4) -> Dict:
        """
        Analiza la consistencia en el seguimiento nutricional.
        
        Args:
            weeks: Número de semanas a analizar
        
        Returns:
            Dict con análisis nutricional
        """
        end_date = timezone.now().date()
        start_date = end_date - timedelta(weeks=weeks)
        
        # Obtener logs de comidas
        meal_logs = MealLog.objects.filter(
            user=self.user,
            date__gte=start_date,
            date__lte=end_date,
            completed=True
        )
        
        total_days = (end_date - start_date).days + 1
        days_with_meals = meal_logs.values('date').distinct().count()
        consistency_pct = (days_with_meals / total_days * 100) if total_days > 0 else 0
        
        recommendations = []
        
        if consistency_pct < 50:
            recommendations.append({
                'type': 'warning',
                'title': 'Bajo seguimiento nutricional',
                'message': f'Solo registraste comidas el {consistency_pct:.0f}% de los días.',
                'action': 'improve_tracking'
            })
        elif consistency_pct < 75:
            recommendations.append({
                'type': 'info',
                'title': 'Seguimiento mejorable',
                'message': f'Registraste comidas el {consistency_pct:.0f}% de los días. Intenta ser más consistente.',
                'action': 'improve_tracking'
            })
        else:
            recommendations.append({
                'type': 'success',
                'title': '¡Excelente seguimiento!',
                'message': f'Registraste comidas el {consistency_pct:.0f}% de los días. ¡Muy bien!',
                'action': 'maintain'
            })
        
        return {
            'period_weeks': weeks,
            'total_days': total_days,
            'days_with_meals': days_with_meals,
            'consistency_pct': round(consistency_pct, 1),
            'recommendations': recommendations
        }
    
    def get_comprehensive_analysis(self, weeks: int = 4) -> Dict:
        """
        Obtiene un análisis completo del progreso del usuario.
        
        Args:
            weeks: Número de semanas a analizar
        
        Returns:
            Dict con análisis completo y recomendaciones consolidadas
        """
        weight_analysis = self.analyze_weight_progress(weeks=weeks)
        workout_analysis = self.analyze_workout_consistency(weeks=weeks)
        nutrition_analysis = self.analyze_nutrition_consistency(weeks=weeks)
        
        # Consolidar recomendaciones
        all_recommendations = []
        all_recommendations.extend(weight_analysis.get('recommendations', []))
        all_recommendations.extend(workout_analysis.get('recommendations', []))
        all_recommendations.extend(nutrition_analysis.get('recommendations', []))
        
        # Priorizar recomendaciones
        priority_recommendations = [
            r for r in all_recommendations if r.get('type') == 'warning'
        ]
        info_recommendations = [
            r for r in all_recommendations if r.get('type') == 'info'
        ]
        success_recommendations = [
            r for r in all_recommendations if r.get('type') == 'success'
        ]
        
        return {
            'period_weeks': weeks,
            'analysis_date': timezone.now().date().isoformat(),
            'weight_analysis': weight_analysis,
            'workout_analysis': workout_analysis,
            'nutrition_analysis': nutrition_analysis,
            'recommendations': {
                'priority': priority_recommendations,
                'info': info_recommendations,
                'success': success_recommendations,
                'all': all_recommendations
            },
            'overall_status': weight_analysis.get('status', 'unknown')
        }
    
    def should_suggest_plan_adjustment(self) -> Tuple[bool, Optional[Dict]]:
        """
        Determina si se debe sugerir un ajuste del plan nutricional.
        
        Returns:
            Tuple (debe_ajustar: bool, sugerencia: Dict o None)
        """
        weight_analysis = self.analyze_weight_progress(weeks=3)
        
        if not weight_analysis.get('has_enough_data'):
            return False, None
        
        status = weight_analysis.get('status')
        
        # Sugerir ajuste si está estancado o progresando muy lento/rapido
        if status in ['stalled', 'slow', 'too_fast']:
            recommendations = weight_analysis.get('recommendations', [])
            if recommendations:
                main_recommendation = recommendations[0]
                return True, {
                    'reason': main_recommendation.get('title'),
                    'message': main_recommendation.get('message'),
                    'action': main_recommendation.get('action'),
                    'calorie_adjustment': main_recommendation.get('suggested_calorie_adjustment', 0)
                }
        
        return False, None

