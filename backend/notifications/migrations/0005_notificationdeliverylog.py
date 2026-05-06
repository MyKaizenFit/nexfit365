import uuid
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("notifications", "0004_rename_notificatio_user_id_0a7e5d_idx_notificatio_user_id_7cceb8_idx_and_more"),
    ]

    operations = [
        migrations.CreateModel(
            name="NotificationDeliveryLog",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("channel", models.CharField(choices=[("push", "Push"), ("email", "Email")], max_length=20)),
                ("status", models.CharField(choices=[("pending", "Pendiente"), ("sent", "Enviado"), ("failed", "Fallido"), ("skipped", "Omitido")], default="pending", max_length=20)),
                ("attempts", models.PositiveIntegerField(default=0)),
                ("last_error", models.TextField(blank=True, default="")),
                ("task_id", models.CharField(blank=True, default="", max_length=255)),
                ("last_attempt_at", models.DateTimeField(blank=True, null=True)),
                ("delivered_at", models.DateTimeField(blank=True, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "notification",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="delivery_logs", to="notifications.notification"),
                ),
            ],
            options={
                "verbose_name": "Log de entrega de notificación",
                "verbose_name_plural": "Logs de entrega de notificaciones",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="notificationdeliverylog",
            constraint=models.UniqueConstraint(fields=("notification", "channel"), name="unique_notification_delivery_channel"),
        ),
        migrations.AddIndex(
            model_name="notificationdeliverylog",
            index=models.Index(fields=["notification", "channel"], name="notifications_notifica_aa4ee0_idx"),
        ),
        migrations.AddIndex(
            model_name="notificationdeliverylog",
            index=models.Index(fields=["status", "channel"], name="notifications_status_ccebb8_idx"),
        ),
        migrations.AddIndex(
            model_name="notificationdeliverylog",
            index=models.Index(fields=["last_attempt_at"], name="notifications_last_at_8f2ca6_idx"),
        ),
    ]
