# 📋 Funcionalidades Diferidas / Estado de superficies opcionales

> **Actualizado 2026-08-03** — verificar siempre contra el código. Este archivo
> ya no debe tratarse como checklist de “oculto” sin abrir el menú real.

## Estado actual (código)

| Superficie | Estado en app | Notas |
|------------|---------------|--------|
| Consejos (`/dashboard?section=tips`) | **Live en menú** | Empty state: “No hay consejos aún”. Seed opcional: `create_default_data` |
| Recomendaciones | **Live en menú** (oculto a `role=premium` vía `PREMIUM_BLOCKED_SECTIONS`) | No es checkout |
| Preferencias de notificación en Settings | **Live** | Persisten en `notification_preferences` (API) + caché local |
| Push / PWA | Parcial | Depende de `NEXT_PUBLIC_ENABLE_PWA` y VAPID |
| Pagos / Stripe | **No implementado** | Fase siguiente; copy UI marca precios como “próximamente” |

## Histórico (contexto)

Antes se diferían tips/recs/settings notifications para priorizar core. El menú
cliente ya las muestra; no volver a documentarlas como “comentadas” sin
comprobar `frontend/app/dashboard/page.tsx`.

## Activación de contenido (tips)

Si el feed está vacío en producción:

```bash
# en el contenedor backend / venv, con cuidado en prod
python manage.py create_default_data
```

O curar tips desde TipsBoard (staff) / admin API.
