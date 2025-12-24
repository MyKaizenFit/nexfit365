"""
Comando para asignar un nuevo plan a un usuario y limpiar usuarios no deseados
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from nutrition.services import PersonalizedNutritionService
from nutrition.models import NutritionPlan

CustomUser = get_user_model()


class Command(BaseCommand):
    help = 'Asigna un nuevo plan a un usuario y elimina usuarios no deseados'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user-email',
            type=str,
            help='Email del usuario al que asignar el nuevo plan (por defecto: usuario@test.com)'
        )
        parser.add_argument(
            '--keep-users',
            nargs='+',
            default=['admin@mykaizenfit.com', 'usuario@test.com'],
            help='Lista de emails de usuarios a mantener (por defecto: admin@mykaizenfit.com usuario@test.com)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Solo mostrar qué se haría sin ejecutar cambios'
        )

    def handle(self, *args, **options):
        keep_emails = options['keep_users']
        user_email = options.get('user_email') or 'usuario@test.com'
        dry_run = options['dry_run']
        
        self.stdout.write("=" * 70)
        self.stdout.write(self.style.SUCCESS("🔄 ASIGNANDO NUEVO PLAN Y LIMPIANDO USUARIOS"))
        self.stdout.write("=" * 70 + "\n")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("⚠️  MODO DRY-RUN: No se realizarán cambios\n"))
        
        # 1. Obtener usuario al que asignar el plan
        try:
            target_user = CustomUser.objects.get(email=user_email)
            self.stdout.write(f"✅ Usuario encontrado: {target_user.email} ({target_user.get_full_name()})")
        except CustomUser.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"❌ Usuario no encontrado: {user_email}"))
            return
        
        # 2. Asignar nuevo plan
        self.stdout.write(f"\n📋 Asignando nuevo plan a {target_user.email}...")
        
        if not dry_run:
            service = PersonalizedNutritionService(target_user)
            new_plan = service.assign_best_plan()
            
            if new_plan:
                self.stdout.write(self.style.SUCCESS(f"✅ Nuevo plan asignado: {new_plan.name}"))
                self.stdout.write(f"   - Calorías: {new_plan.daily_calories} kcal")
                self.stdout.write(f"   - Comidas: {new_plan.meals.count()}")
                recipes_count = sum(meal.suggested_recipes.count() for meal in new_plan.meals.all())
                self.stdout.write(f"   - Recetas sugeridas: {recipes_count}")
            else:
                self.stdout.write(self.style.ERROR("❌ No se pudo asignar un plan"))
        else:
            self.stdout.write(f"   [DRY-RUN] Se asignaría un nuevo plan a {target_user.email}")
        
        # 3. Listar todos los usuarios
        self.stdout.write(f"\n👥 Usuarios en el sistema:")
        all_users = CustomUser.objects.all().order_by('email')
        
        users_to_delete = []
        users_to_keep = []
        
        for user in all_users:
            if user.email in keep_emails:
                users_to_keep.append(user)
                self.stdout.write(self.style.SUCCESS(f"   ✅ MANTENER: {user.email} ({user.get_full_name()})"))
            else:
                users_to_delete.append(user)
                self.stdout.write(self.style.WARNING(f"   🗑️  ELIMINAR: {user.email} ({user.get_full_name()})"))
        
        # 4. Eliminar usuarios no deseados
        if users_to_delete:
            self.stdout.write(f"\n🗑️  Eliminando {len(users_to_delete)} usuario(s)...")
            
            for user in users_to_delete:
                if not dry_run:
                    # Desactivar planes activos del usuario
                    active_plans = NutritionPlan.objects.filter(user=user, is_active=True)
                    for plan in active_plans:
                        plan.is_active = False
                        plan.save()
                    
                    # Eliminar usuario (esto eliminará en cascada sus planes, logs, etc.)
                    user_email_to_delete = user.email
                    user.delete()
                    self.stdout.write(self.style.SUCCESS(f"   ✅ Eliminado: {user_email_to_delete}"))
                else:
                    self.stdout.write(f"   [DRY-RUN] Se eliminaría: {user.email}")
        else:
            self.stdout.write(self.style.SUCCESS("\n✅ No hay usuarios para eliminar"))
        
        # 5. Resumen
        self.stdout.write("\n" + "=" * 70)
        self.stdout.write(self.style.SUCCESS("✅ Proceso completado"))
        if not dry_run:
            self.stdout.write(f"   Usuarios mantenidos: {len(users_to_keep)}")
            self.stdout.write(f"   Usuarios eliminados: {len(users_to_delete)}")
        else:
            self.stdout.write(self.style.WARNING("   [DRY-RUN] Ejecuta sin --dry-run para aplicar cambios"))
        self.stdout.write("=" * 70)


