"""
Rate Limiting para prevenir abuso de API
"""
from django.core.cache import cache
from django.http import JsonResponse
from functools import wraps

def rate_limit(requests_per_minute=60):
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            client_ip = get_client_ip(request)
            cache_key = f'rl:{client_ip}:{request.path}'
            request_count = cache.get(cache_key, 0)
            
            if request_count >= requests_per_minute:
                return JsonResponse({
                    'error': 'Rate limit exceeded',
                }, status=429)
            
            cache.set(cache_key, request_count + 1, 60)
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator

def get_client_ip(request):
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0]
    return request.META.get('REMOTE_ADDR')
