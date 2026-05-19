from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0005_notificationdeliverylog"),
    ]

    operations = [
        migrations.RenameIndex(
            model_name="notificationdeliverylog",
            new_name="notificatio_notific_930ed4_idx",
            old_name="notifications_notifica_aa4ee0_idx",
        ),
        migrations.RenameIndex(
            model_name="notificationdeliverylog",
            new_name="notificatio_status_87f39f_idx",
            old_name="notifications_status_ccebb8_idx",
        ),
        migrations.RenameIndex(
            model_name="notificationdeliverylog",
            new_name="notificatio_last_at_332394_idx",
            old_name="notifications_last_at_8f2ca6_idx",
        ),
    ]
