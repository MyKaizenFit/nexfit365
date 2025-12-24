from django.db import migrations, models
from django.conf import settings
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProfileAuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('changes', models.JSONField(default=dict)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('changed_by', models.ForeignKey(blank=True, null=True, on_delete=models.SET_NULL, related_name='profile_changes_made', to=settings.AUTH_USER_MODEL)),
                ('user', models.ForeignKey(on_delete=models.CASCADE, related_name='profile_audit_logs', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Cambio de perfil',
                'verbose_name_plural': 'Cambios de perfil',
                'ordering': ['-created_at'],
            },
        ),
    ]



