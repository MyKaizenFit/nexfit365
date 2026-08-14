#!/usr/bin/env bash
# Helpers for frontend HTTP health paths.
# Do not source production env files from here.

read_named_env_value() {
  # usage: read_named_env_value FILE KEY
  # Prints the last KEY= value without sourcing or evaluating the file.
  local file="$1"
  local key="$2"
  local line value
  [ -f "$file" ] || return 0
  line="$(grep -E "^[[:space:]]*${key}=" "$file" | tail -n 1 || true)"
  [ -n "$line" ] || return 0
  value="${line#*=}"
  value="${value%$'\r'}"
  case "$value" in
    \"*\") value="${value#\"}"; value="${value%\"}" ;;
    \'*\') value="${value#\'}"; value="${value%\'}" ;;
  esac
  printf '%s' "$value"
}

normalize_frontend_health_path() {
  local raw="${1-}"
  raw="${raw#"${raw%%[![:space:]]*}"}"
  raw="${raw%"${raw##*[![:space:]]}"}"
  raw="${raw%/}"
  if [ -z "$raw" ] || [ "$raw" = "/" ]; then
    printf '/'
    return 0
  fi
  case "$raw" in
    /*) printf '%s/' "$raw" ;;
    *) printf '/%s/' "$raw" ;;
  esac
}

frontend_local_health_url() {
  local path
  path="$(normalize_frontend_health_path "${1-}")"
  printf 'http://localhost:3000%s' "$path"
}
