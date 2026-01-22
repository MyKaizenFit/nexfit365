#!/bin/bash

# Optimización de Base de Datos PostgreSQL
# Ejecutar weekly para mantener performance

COMPOSE_FILE="/srv/mykaizenfit/pro/docker-compose.prod.yml"
PROJECT="nexfit-pro"
LOG_FILE="/srv/mykaizenfit/pro/backups/optimization.log"

echo "[$(date)] ========== INICIANDO OPTIMIZACIÓN DE BD ==========" >> "$LOG_FILE"

# 1. VACUUM FULL - Limpiar espacio muerto
echo "[$(date)] VACUUM ANALYZE..." >> "$LOG_FILE"
COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d mykaizenfit -c "VACUUM ANALYZE;" 2>> "$LOG_FILE"
echo "[$(date)] ✅ VACUUM completado" >> "$LOG_FILE"

# 2. Crear índices si no existen
echo "[$(date)] Creando índices..." >> "$LOG_FILE"
COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d mykaizenfit << SQL 2>> "$LOG_FILE"
-- Índices para queries frecuentes
CREATE INDEX IF NOT EXISTS idx_customuser_email ON accounts_customuser(email);
CREATE INDEX IF NOT EXISTS idx_customuser_is_active ON accounts_customuser(is_active);
CREATE INDEX IF NOT EXISTS idx_userprofile_user ON accounts_userprofile(user_id);
CREATE INDEX IF NOT EXISTS idx_mealplan_user ON nutrition_mealplan(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_name ON nutrition_recipe(name);

-- Índices compuestos
CREATE INDEX IF NOT EXISTS idx_mealplan_user_date ON nutrition_mealplan(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_created ON nutrition_recipe(created_at DESC);

-- Índices para búsqueda de texto (si existe)
CREATE INDEX IF NOT EXISTS idx_recipe_description ON nutrition_recipe(name, description);
SQL

echo "[$(date)] ✅ Índices creados/verificados" >> "$LOG_FILE"

# 3. Reindexar
echo "[$(date)] REINDEX DATABASE..." >> "$LOG_FILE"
COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d mykaizenfit -c "REINDEX DATABASE mykaizenfit;" 2>> "$LOG_FILE"
echo "[$(date)] ✅ REINDEX completado" >> "$LOG_FILE"

# 4. Estadísticas de tamaño
echo "[$(date)] Estadísticas de BD:" >> "$LOG_FILE"
COMPOSE_PROJECT_NAME=$PROJECT docker compose -f "$COMPOSE_FILE" exec -T db psql -U postgres -d mykaizenfit << SQL 2>> "$LOG_FILE"
-- Tamaño total de BD
SELECT pg_size_pretty(pg_database_size('mykaizenfit')) as "Tamaño DB";

-- Top 10 tablas más grandes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
LIMIT 10;

-- Índices no usados
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC 
LIMIT 10;
SQL

echo "[$(date)] ========== OPTIMIZACIÓN COMPLETADA ==========" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
