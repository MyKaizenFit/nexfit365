#!/bin/bash
# db-integrity-check.sh — Detección temprana de corrupción PostgreSQL
#
# Uso:
#   ./db-integrity-check.sh          → exit 0 OK, 1 corrupción, 2 no accesible
#   source ... && check_db_integrity → return con el mismo código
#
# Diseñado para detectar el patrón que el health-check simple no veía:
# SELECT 1 OK pero archivos de datos vacíos / catálogo inconsistente.

COMPOSE_FILE="${COMPOSE_FILE:-/srv/mykaizenfit/pro/docker-compose.prod.yml}"
PROJECT="${COMPOSE_PROJECT_NAME:-nexfit-pro}"
DB_NAME="${DB_NAME:-mykaizenfit}"
DB_USER="${DB_USER:-postgres}"

CORRUPTION_PATTERN='could not open file|could not read block|read only 0 of 8192|invalid page|missing chunk|cache lookup failed|could not access status of transaction|unexpected data beyond EOF'

_dbc_psql() {
  COMPOSE_PROJECT_NAME="$PROJECT" docker compose -f "$COMPOSE_FILE" exec -T db \
    psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

_dbc_is_corruption_output() {
  local output=$1
  echo "$output" | grep -qiE "$CORRUPTION_PATTERN"
}

check_db_integrity() {
  local output probe_tables=(
    accounts_customuser
    workouts_workoutprogram
    workouts_workoutday
    nutrition_recipe
    token_blacklist_outstandingtoken
    token_blacklist_blacklistedtoken
  )

  if ! COMPOSE_PROJECT_NAME="$PROJECT" docker compose -f "$COMPOSE_FILE" exec -T db \
    pg_isready -U "$DB_USER" >/dev/null 2>&1; then
    echo "PostgreSQL no accesible (pg_isready falló)"
    return 2
  fi

  # Introspección de catálogo (similar a migrate / REINDEX DATABASE)
  output=$(_dbc_psql -c "
    SELECT COUNT(*) AS public_relations
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'i', 'S', 't');
  " 2>&1) || {
    if _dbc_is_corruption_output "$output"; then
      echo "Corrupción en catálogo: $output"
      return 1
    fi
    echo "Fallo al leer catálogo: $output"
    return 2
  }

  output=$(_dbc_psql -c "
    SELECT obj_description(c.oid, 'pg_class')
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
    ORDER BY c.oid
    LIMIT 20;
  " 2>&1) || {
    if _dbc_is_corruption_output "$output"; then
      echo "Corrupción en obj_description: $output"
      return 1
    fi
    echo "Fallo en obj_description: $output"
    return 2
  }

  local table
  for table in "${probe_tables[@]}"; do
    output=$(_dbc_psql -tA -c "SELECT COUNT(*) FROM ${table};" 2>&1) || {
      if _dbc_is_corruption_output "$output"; then
        echo "Corrupción en tabla ${table}: $output"
        return 1
      fi
      echo "Fallo al leer ${table}: $output"
      return 2
    }
  done

  echo "Integridad OK"
  return 0
}

# Prueba de escritura en tablas JWT (detecta corrupción que COUNT no ve).
probe_jwt_blacklist_writable() {
  local output
  output=$(_dbc_psql -c "
    INSERT INTO token_blacklist_outstandingtoken (token, created_at, expires_at, user_id, jti)
    SELECT 'integrity-probe', NOW(), NOW() + interval '1 day', id,
           'integrity-probe-' || floor(extract(epoch from clock_timestamp()))::text
    FROM accounts_customuser
    WHERE is_active = true
    ORDER BY id
    LIMIT 1;
    DELETE FROM token_blacklist_outstandingtoken WHERE jti LIKE 'integrity-probe-%';
  " 2>&1) || {
    if _dbc_is_corruption_output "$output"; then
      echo "Corrupción en escritura JWT (outstandingtoken): $output"
      return 1
    fi
    echo "Fallo en probe JWT: $output"
    return 2
  }
  echo "JWT writable OK"
  return 0
}

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  set -Eeuo pipefail
  msg=""
  rc=0
  msg=$(check_db_integrity) || rc=$?
  printf '%s\n' "$msg"
  exit "$rc"
fi
