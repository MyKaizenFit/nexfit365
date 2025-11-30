import django_filters
from django.db.models import Q
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta

User = get_user_model()


class UserFilter(django_filters.FilterSet):
    """Filtros avanzados para usuarios"""
    
    # Filtros básicos
    email = django_filters.CharFilter(lookup_expr='icontains')
    first_name = django_filters.CharFilter(lookup_expr='icontains')
    last_name = django_filters.CharFilter(lookup_expr='icontains')
    role = django_filters.ChoiceFilter(choices=User.ROLE_CHOICES)
    is_active = django_filters.BooleanFilter()
    is_verified = django_filters.BooleanFilter()
    
    # Filtros de fecha
    date_joined_from = django_filters.DateFilter(
        field_name='date_joined',
        lookup_expr='gte',
        label='Fecha de registro desde'
    )
    date_joined_to = django_filters.DateFilter(
        field_name='date_joined',
        lookup_expr='lte',
        label='Fecha de registro hasta'
    )
    last_login_from = django_filters.DateFilter(
        field_name='last_login',
        lookup_expr='gte',
        label='Último login desde'
    )
    last_login_to = django_filters.DateFilter(
        field_name='last_login',
        lookup_expr='lte',
        label='Último login hasta'
    )
    
    # Filtros de búsqueda avanzada
    search = django_filters.CharFilter(method='search_filter')
    
    # Filtros de estado
    has_avatar = django_filters.BooleanFilter(
        method='has_avatar_filter',
        label='Tiene avatar'
    )
    
    # Filtros de actividad
    is_recently_active = django_filters.BooleanFilter(
        method='recently_active_filter',
        label='Activo recientemente (últimos 30 días)'
    )
    
    # Filtros de verificación
    verification_status = django_filters.ChoiceFilter(
        choices=[
            ('verified', 'Verificado'),
            ('unverified', 'No verificado'),
            ('pending', 'Pendiente de verificación')
        ],
        method='verification_status_filter'
    )
    
    class Meta:
        model = User
        fields = {
            'email': ['exact', 'icontains', 'startswith'],
            'first_name': ['exact', 'icontains', 'startswith'],
            'last_name': ['exact', 'icontains', 'startswith'],
            'role': ['exact'],
            'is_active': ['exact'],
            'is_verified': ['exact'],
            'is_staff': ['exact'],
            'is_superuser': ['exact'],
        }
    
    def search_filter(self, queryset, name, value):
        """Filtro de búsqueda en múltiples campos"""
        if value:
            return queryset.filter(
                Q(email__icontains=value) |
                Q(first_name__icontains=value) |
                Q(last_name__icontains=value) |
                Q(first_name__icontains=value.split()[0]) |
                Q(last_name__icontains=value.split()[-1] if len(value.split()) > 1 else value)
            )
        return queryset
    
    def has_avatar_filter(self, queryset, name, value):
        """Filtro para usuarios con/sin avatar"""
        if value is True:
            return queryset.filter(avatar__isnull=False).exclude(avatar='')
        elif value is False:
            return queryset.filter(Q(avatar__isnull=True) | Q(avatar=''))
        return queryset
    
    def recently_active_filter(self, queryset, name, value):
        """Filtro para usuarios activos recientemente"""
        if value is True:
            thirty_days_ago = timezone.now() - timedelta(days=30)
            return queryset.filter(last_login__gte=thirty_days_ago)
        elif value is False:
            thirty_days_ago = timezone.now() - timedelta(days=30)
            return queryset.filter(
                Q(last_login__lt=thirty_days_ago) | Q(last_login__isnull=True)
            )
        return queryset
    
    def verification_status_filter(self, queryset, name, value):
        """Filtro para estado de verificación"""
        if value == 'verified':
            return queryset.filter(is_verified=True)
        elif value == 'unverified':
            return queryset.filter(is_verified=False)
        elif value == 'pending':
            # Usuarios que se registraron pero no han verificado
            return queryset.filter(
                is_verified=False,
                date_joined__gte=timezone.now() - timedelta(days=7)
            )
        return queryset
    
    @property
    def qs(self):
        """Queryset base con optimizaciones"""
        return super().qs.select_related().prefetch_related(
            'groups', 'user_permissions'
        ) 