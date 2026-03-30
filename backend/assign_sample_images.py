from nutrition.models import Recipe
from itertools import cycle

urls = [
    'https://content-cocina.lecturas.com/medio/2025/01/23/ensalada-coleslaw_95db5c99_250123112611_1200x1200.webp',
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
    'https://images.unsplash.com/photo-1519864600265-abb23847ef2c',
    'https://images.unsplash.com/photo-1464306076886-debca5e8a6b0',
    'https://images.unsplash.com/photo-1502741338009-cac2772e18bc',
    'https://images.unsplash.com/photo-1523987355523-c7b5b0723c36',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd',
    'https://images.unsplash.com/photo-1467003909585-2f8a72700288',
    'https://images.unsplash.com/photo-1506089676908-3592f7389d4d',
]

qs1 = list(Recipe.objects.filter(is_active=True, image__isnull=True, image_url__isnull=True))
qs2 = list(Recipe.objects.filter(is_active=True, image__isnull=True, image_url=''))
qs = qs1 + qs2
updated = 0
for r, url in zip(qs, cycle(urls)):
    r.image_url = url
    r.save()
    print(f"{r.name} -> {url}")
    updated += 1
print(f"updated={updated}")
