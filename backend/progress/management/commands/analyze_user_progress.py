# progress/management/commands/analyze_user_progress.py
# Comando de gestión para analizar el progreso de usuarios y generar recomendaciones

from django.core.management.base import BaseCommand
from django.utils import timezone
from accounts.models import CustomUser
from progress.services import ProgressAnalysisService
from progress.notification_service import ProgressNotificationService
from nutrition.services import PlanAutoUpdateService
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Analiza el progreso de usuarios y genera recomendaciones automáticas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--weeks',
            type=int,
            default=4,
            help='Número de semanas a analizar (por defecto: 4)',
        )
        parser.add_argument(
            '--user-email',
            type=str,
            default=None,
            help='Email del usuario específico a analizar (opcional)',
        )
        parser.add_argument(
            '--notify',
            action='store_true',
            help='Enviar notificaciones a usuarios con problemas detectados',
        )
        parser.add_argument(
            '--auto-adjust',
            action='store_true',
            help='Aplicar ajustes automáticos de planes cuando se detecten problemas',
        )

    def handle(self, *args, **options):
        weeks = options['weeks']
        user_email = options.get('user_email')
        notify = options.get('notify', False)
        auto_adjust = options.get('auto_adjust', False)

        self.stdout.write(self.style.SUCCESS(f'\n🔍 Iniciando análisis de progreso (últimas {weeks} semanas)...\n'))

        # Obtener usuarios a analizar
        if user_email:
            try:
                users = [CustomUser.objects.get(email=user_email)]
                self.stdout.write(f'Analizando usuario específico: {user_email}')
            except CustomUser.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'❌ Usuario con email {user_email} no encontrado'))
                return
        else:
            # Analizar todos los usuarios activos con datos de progreso
            users = CustomUser.objects.filter(
                is_active=True,
                weight__isnull=False,
                height__isnull=False,
            ).exclude(weight=0).exclude(height=0)

            self.stdout.write(f'Analizando {users.count()} usuarios...\n')

        # Estadísticas globales
        stats = {
            'total_analyzed': 0,
            'stalled': 0,
            'slow_progress': 0,
            'too_fast': 0,
            'on_track': 0,
            'plans_adjusted': 0,
            'notifications_sent': 0,
        }

        # Analizar cada usuario
        for user in users:
            try:
                stats['total_analyzed'] += 1
                self.stdout.write(f'📊 Analizando: {user.email}...', ending=' ')

                # Crear servicio de análisis
                analysis_service = ProgressAnalysisService(user)
                analysis = analysis_service.get_comprehensive_analysis(weeks=weeks)

                # Verificar si hay problemas
                weight_status = analysis.get('weight_analysis', {}).get('status', 'unknown')
                recommendations = analysis.get('recommendations', {}).get('priority', [])

                # Determinar estado
                if weight_status == 'stalled':
                    stats['stalled'] += 1
                    self.stdout.write(self.style.WARNING('⚠️ ESTANCADO'))
                    
                    if recommendations:
                        self.stdout.write(f'   Recomendación: {recommendations[0].get("title", "N/A")}')
                    
                    # Verificar si se debe ajustar el plan
                    should_adjust, suggestion = analysis_service.should_suggest_plan_adjustment()
                    
                    if should_adjust and auto_adjust:
                        try:
                            update_service = PlanAutoUpdateService(user)
                            # Obtener peso anterior para comparación
                            from progress.models import WeightEntry
                            recent_entries = WeightEntry.objects.filter(
                                user=user
                            ).order_by('-date')[:2]
                            
                            old_weight = None
                            if recent_entries.count() >= 2:
                                old_weight = float(recent_entries[1].weight)
                            
                            updated_plan = update_service.update_plan_if_needed(
                                old_weight=old_weight,
                                reason="stalled_progress_detected"
                            )
                            
                            if updated_plan:
                                stats['plans_adjusted'] += 1
                                self.stdout.write(self.style.SUCCESS('   ✅ Plan ajustado automáticamente'))
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f'   ❌ Error ajustando plan: {str(e)}'))
                    
                    if notify and recommendations:
                        # Enviar notificación de estancamiento
                        try:
                            notification_service = ProgressNotificationService(user)
                            notification = notification_service.send_stalled_progress_notification(analysis)
                            if notification:
                                stats['notifications_sent'] += 1
                                self.stdout.write('   📧 Notificación enviada')
                        except Exception as e:
                            self.stdout.write(self.style.ERROR(f'   ❌ Error enviando notificación: {str(e)}'))
                
                elif weight_status == 'slow':
                    stats['slow_progress'] += 1
                    self.stdout.write(self.style.WARNING('🐌 PROGRESO LENTO'))
                
                elif weight_status == 'too_fast':
                    stats['too_fast'] += 1
                    self.stdout.write(self.style.WARNING('⚡ PROGRESO MUY RÁPIDO'))
                
                elif weight_status == 'on_track':
                    stats['on_track'] += 1
                    self.stdout.write(self.style.SUCCESS('✅ EN CAMINO'))
                
                else:
                    self.stdout.write('ℹ️ DATOS INSUFICIENTES')

            except Exception as e:
                self.stdout.write(self.style.ERROR(f'❌ Error: {str(e)}'))
                logger.error(f'Error analizando usuario {user.email}: {str(e)}')

        # Resumen final
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS('📈 RESUMEN DEL ANÁLISIS'))
        self.stdout.write(self.style.SUCCESS('='*60))
        self.stdout.write(f'Total analizados: {stats["total_analyzed"]}')
        self.stdout.write(self.style.SUCCESS(f'✅ En camino: {stats["on_track"]}'))
        self.stdout.write(self.style.WARNING(f'⚠️ Estancados: {stats["stalled"]}'))
        self.stdout.write(self.style.WARNING(f'🐌 Progreso lento: {stats["slow_progress"]}'))
        self.stdout.write(self.style.WARNING(f'⚡ Progreso muy rápido: {stats["too_fast"]}'))
        
        if auto_adjust:
            self.stdout.write(self.style.SUCCESS(f'🔄 Planes ajustados: {stats["plans_adjusted"]}'))
        
        if notify:
            self.stdout.write(self.style.SUCCESS(f'📧 Notificaciones enviadas: {stats["notifications_sent"]}'))
        
        self.stdout.write(self.style.SUCCESS('='*60 + '\n'))

