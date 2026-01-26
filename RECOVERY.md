# Nex-Fit Recovery & Ops

## Estado actual
- Stack Docker Compose en /srv/mykaizenfit/pro
- Backend, frontend, db y redis levantados por pasos con bajo paralelismo
- Autenticación verificada (admin y usuario de prueba)

## Procedimiento rápido
1. Levantar servicios por partes para evitar picos:
   - db + redis
   - backend
   - frontend
2. Verificar health:
   - /api/health/
3. Verificar login:
   - /api/auth/login/
4. Contar tablas clave en DB

## Backups
- Backup inmediato con pg_dump a /srv/mykaizenfit/pro/backups
- Servicio db-backup programado (03:00)

## Seguridad
- ENCRYPTION_KEY definida en env (Fernet)
- CORS/CSRF definidos en backend.env.production

## Notas
- Evitar builds simultáneos cuando hay poca RAM/CPU.
- Usar COMPOSE_PARALLEL_LIMIT=1 para reducir carga.
