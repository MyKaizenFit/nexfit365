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

CORRUPTION_PATTERN='could not open file|could not read block|read only 0 of 8192|invalid page|missing chunk|cache lookup failed|could not access status of transaction'

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

if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
  set -Eeuo pipefail
  msg=""
  rc=0
  msg=$(check_db_integrity) || rc=$?
  printf '%s\n' "$msg"
  exit "$rc"
fi
