from django.contrib.auth import get_user_model
from django.db.models import Q
from django.db.models.signals import post_save
from django.dispatch import receiver

from notifications.models import Notification

from .models import CoachingInquiry


@receiver(post_save, sender=CoachingInquiry)
def notify_team_on_new_coaching_inquiry(sender, instance, created, **kwargs):
    """Crear alertas internas para el equipo cuando entra un lead 1:1."""
    if not created:
        return

    User = get_user_model()
    admins = User.objects.filter(
        Q(is_staff=True) | Q(is_superuser=True) | Q(role__in=["admin", "pro"]),
        is_active=True,
    )

    if instance.user_id:
        admins = admins.exclude(id=instance.user_id)

    if not admins.exists():
        return

    plan_name = instance.plan.name if instance.plan else "servicio personalizado 1:1"
    requester = instance.full_name or instance.email or "Un usuario"
    goal = (instance.goal or "").strip()
    short_goal = f" Objetivo: {goal[:137]}..." if len(goal) > 140 else (f" Objetivo: {goal}" if goal else "")

    for admin in admins.iterator():
        Notification.objects.create(
            user=admin,
            type="system",
            title="🔥 Nueva solicitud 1:1",
            message=f"{requester} ha solicitado valoración para {plan_name}.{short_goal}",
            data={
                "category": "coaching_lead",
                "source": "coaching_inquiry",
                "inquiry_id": str(instance.id),
                "plan_slug": instance.plan.slug if instance.plan else "",
                "preferred_contact": instance.preferred_contact,
                "availability": instance.availability,
            },
        )
