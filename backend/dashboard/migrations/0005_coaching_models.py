from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ("dashboard", "0004_defaultplanconfiguration"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="CoachingPlan",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("slug", models.SlugField(max_length=80, unique=True)),
                ("name", models.CharField(max_length=150)),
                ("duration_label", models.CharField(help_text="Duración visible del plan", max_length=80)),
                (
                    "tier",
                    models.CharField(
                        choices=[("basic", "Basic"), ("vip", "VIP")],
                        default="basic",
                        max_length=20,
                    ),
                ),
                ("summary", models.CharField(blank=True, max_length=255)),
                ("benefits", models.JSONField(blank=True, default=list)),
                ("cta_text", models.CharField(default="Quiero que evaluéis mi caso", max_length=120)),
                ("is_active", models.BooleanField(default=True)),
                ("sort_order", models.PositiveIntegerField(default=0)),
            ],
            options={
                "verbose_name": "Plan 1 a 1",
                "verbose_name_plural": "Planes 1 a 1",
                "ordering": ["sort_order", "created_at"],
            },
        ),
        migrations.CreateModel(
            name="CoachingInquiry",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("full_name", models.CharField(blank=True, max_length=200)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("phone_number", models.CharField(blank=True, max_length=50)),
                ("goal", models.TextField(help_text="Objetivo principal del usuario")),
                ("current_challenge", models.TextField(blank=True, help_text="Principal bloqueo actual")),
                ("availability", models.CharField(blank=True, help_text="Disponibilidad para llamada", max_length=255)),
                (
                    "preferred_contact",
                    models.CharField(
                        choices=[("whatsapp", "WhatsApp"), ("email", "Email"), ("both", "Ambos")],
                        default="whatsapp",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[("pending", "Pendiente"), ("contacted", "Contactado"), ("qualified", "Cualificado"), ("closed", "Cerrado")],
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("notes", models.TextField(blank=True, help_text="Notas internas del equipo")),
                (
                    "plan",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="inquiries", to="dashboard.coachingplan"),
                ),
                (
                    "user",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="coaching_inquiries", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={
                "verbose_name": "Solicitud coaching",
                "verbose_name_plural": "Solicitudes coaching",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(fields=["status", "created_at"], name="dashboard_c_status_2aeebf_idx"),
                    models.Index(fields=["user", "created_at"], name="dashboard_c_user_id_5d67d4_idx"),
                ],
            },
        ),
    ]
