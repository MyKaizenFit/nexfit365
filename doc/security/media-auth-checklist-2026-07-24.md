# Media auth checklist — 2026-07-24

Review of progress photos / protected media (plan 004). No secret values.

| Área | Evidencia | ¿OK? |
|------|-----------|------|
| Ruta `/media/...` cruda denegada | `progress/tests/test_protected_media.py::test_raw_media_path_forbidden` | sí |
| URL firmada sirve archivo | `test_signed_url_serves_file` | sí |
| Sin token → 403 | `test_missing_token_forbidden` | sí |
| Serializer expone URL firmada | `test_serializer_returns_signed_url` + `build_signed_progress_media_url` | sí |
| Validación MIME de fotos | `progress/tests/test_photo_mime_validation.py` (en CI critical path) | sí |
| IDOR entre usuarios | Cubierto parcialmente por permisos de progreso + media firmada por path; ampliar tests IDOR explícitos = follow-up | parcial |
| Strip EXIF / antivirus | No implementado | gap / follow-up P2 |
| JWT no en `localStorage` | grep `localStorage.setItem` ∩ token/jwt vacío (2026-07-24) | sí |

**Verdict P0.6:** `[~]` → aceptable como `[x]` operativo con gaps EXIF/AV documentados; no bloquea cierre de auth docs.
