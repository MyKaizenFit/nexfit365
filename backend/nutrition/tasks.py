from celery import shared_task
@shared_task
def purge_expired_community_recipe_posts():
    """Compatibilidad con tareas programadas antiguas; Team SK ya no caduca."""
    return 0
