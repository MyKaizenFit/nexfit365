from django.db import migrations, models


def remove_existing_expiration_dates(apps, schema_editor):
    CommunityRecipePost = apps.get_model('nutrition', 'CommunityRecipePost')
    CommunityRecipePost.objects.update(expires_at=None)


class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0030_merge_community_posts_and_equivalence_categories'),
    ]

    operations = [
        migrations.AlterField(
            model_name='communityrecipepost',
            name='expires_at',
            field=models.DateTimeField(blank=True, db_index=True, null=True),
        ),
        migrations.RunPython(remove_existing_expiration_dates, migrations.RunPython.noop),
    ]
