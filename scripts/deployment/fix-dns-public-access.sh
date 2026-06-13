#!/usr/bin/env bash
# Fix public access: remove Cloudflare IPv6 (AAAA) and use direct IPv4 DNS.
# Root cause: proxied Cloudflare zones publish AAAA records; clients with broken
# IPv6 get ERR_CONNECTION_TIMED_OUT before falling back to IPv4.
#
# Usage:
#   CLOUDFLARE_API_TOKEN=xxx ./scripts/deployment/fix-dns-public-access.sh
#   ./scripts/deployment/fix-dns-public-access.sh   # prompts for token
#
# Required token permissions: Zone - DNS - Edit, Zone - Zone Settings - Edit

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ZONE_NAME="${ZONE_NAME:-nexfit365.dpdns.org}"
ORIGIN_IP="${ORIGIN_IP:-45.136.19.91}"
API_BASE="https://api.cloudflare.com/client/v4"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

info() { echo -e "${CYAN}ℹ️  $*${NC}"; }
ok() { echo -e "${GREEN}✅ $*${NC}"; }
warn() { echo -e "${YELLOW}⚠️  $*${NC}"; }
err() { echo -e "${RED}❌ $*${NC}" >&2; }

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  if [ -t 0 ]; then
    read -rsp "Cloudflare API Token: " CLOUDFLARE_API_TOKEN
    echo
  else
    err "CLOUDFLARE_API_TOKEN no definido."
    echo "Crea un token en Cloudflare → My Profile → API Tokens"
    echo "Permisos: Zone DNS Edit + Zone Settings Edit (zona ${ZONE_NAME})"
    echo ""
    echo "Ejecuta:"
    echo "  CLOUDFLARE_API_TOKEN='tu-token' $ROOT_DIR/scripts/deployment/fix-dns-public-access.sh"
    exit 1
  fi
fi

cf_api() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  if [ -n "$data" ]; then
    curl -sS -X "$method" "${API_BASE}${path}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json" \
      --data "$data"
  else
    curl -sS -X "$method" "${API_BASE}${path}" \
      -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
      -H "Content-Type: application/json"
  fi
}

json_ok() {
  python3 -c "import json,sys; d=json.load(sys.stdin); sys.exit(0 if d.get('success') else 1)" 2>/dev/null
}

echo ""
echo "========================================="
echo -e "${CYAN}🔧 FIX ACCESO PÚBLICO — ${ZONE_NAME}${NC}"
echo "========================================="
echo ""

info "Obteniendo Zone ID..."
ZONE_RESP="$(cf_api GET "/zones?name=${ZONE_NAME}")"
if ! echo "$ZONE_RESP" | json_ok; then
  err "No se pudo obtener la zona. Verifica el token y el nombre del dominio."
  echo "$ZONE_RESP" | python3 -m json.tool 2>/dev/null || echo "$ZONE_RESP"
  exit 1
fi

ZONE_ID="$(echo "$ZONE_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); r=d.get('result',[]); print(r[0]['id'] if r else '')")"
if [ -z "$ZONE_ID" ]; then
  err "Zona ${ZONE_NAME} no encontrada en esta cuenta de Cloudflare."
  exit 1
fi
ok "Zone ID: ${ZONE_ID}"

info "Desactivando IPv6 en la zona (si el plan lo permite)..."
IPV6_RESP="$(cf_api PATCH "/zones/${ZONE_ID}/settings/ipv6" '{"value":"off"}')"
if echo "$IPV6_RESP" | json_ok; then
  ok "IPv6 desactivado en Cloudflare"
else
  warn "No se pudo desactivar IPv6 vía API (normal en plan Free). Continuando con DNS directo..."
fi

info "Listando registros DNS..."
RECORDS_RESP="$(cf_api GET "/zones/${ZONE_ID}/dns_records?per_page=100")"
if ! echo "$RECORDS_RESP" | json_ok; then
  err "No se pudieron listar registros DNS."
  echo "$RECORDS_RESP" | python3 -m json.tool 2>/dev/null || echo "$RECORDS_RESP"
  exit 1
fi

info "Eliminando registros AAAA..."
while IFS= read -r rec_id; do
  [ -n "$rec_id" ] || continue
  cf_api DELETE "/zones/${ZONE_ID}/dns_records/${rec_id}" >/dev/null
  ok "AAAA eliminado: ${rec_id}"
done < <(echo "$RECORDS_RESP" | python3 -c "
import json, sys
data = json.load(sys.stdin)
for rec in data.get('result', []):
    if rec.get('type') == 'AAAA':
        print(rec['id'])
")

info "Configurando registros A en modo DNS-only (IPv4 directo → ${ORIGIN_IP})..."
while IFS='|' read -r rec_id rec_type rec_name; do
  [ -n "$rec_id" ] || continue
  PAYLOAD="$(python3 -c "import json; print(json.dumps({'type':'A','name':'''${rec_name}''','content':'${ORIGIN_IP}','proxied':False,'ttl':300}))")"
  if [ "$rec_type" = "CNAME" ]; then
    cf_api DELETE "/zones/${ZONE_ID}/dns_records/${rec_id}" >/dev/null
    cf_api POST "/zones/${ZONE_ID}/dns_records" "$PAYLOAD" >/dev/null
    ok "CNAME→A DNS-only: ${rec_name} → ${ORIGIN_IP}"
  else
    cf_api PATCH "/zones/${ZONE_ID}/dns_records/${rec_id}" "$PAYLOAD" >/dev/null
    ok "A DNS-only: ${rec_name} → ${ORIGIN_IP}"
  fi
done < <(echo "$RECORDS_RESP" | ZONE="$ZONE_NAME" python3 -c "
import json, os, sys
zone = os.environ['ZONE']
targets = {zone, f'www.{zone}', f'api.{zone}'}
data = json.load(sys.stdin)
for rec in data.get('result', []):
    name = rec.get('name', '').rstrip('.')
    rtype = rec.get('type', '')
    if name in targets and rtype in ('A', 'CNAME'):
        print(f\"{rec['id']}|{rtype}|{name}\")
")

info "Asegurando registro api.${ZONE_NAME}..."
API_EXISTS="$(cf_api GET "/zones/${ZONE_ID}/dns_records?type=A&name=api.${ZONE_NAME}")"
API_COUNT="$(echo "$API_EXISTS" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('result',[])))")"
if [ "$API_COUNT" = "0" ]; then
  PAYLOAD="$(python3 -c "import json; print(json.dumps({'type':'A','name':'api.${ZONE_NAME}','content':'${ORIGIN_IP}','proxied':False,'ttl':300}))")"
  cf_api POST "/zones/${ZONE_ID}/dns_records" "$PAYLOAD" >/dev/null
  ok "Creado api.${ZONE_NAME} → ${ORIGIN_IP}"
fi

info "Verificando DNS público (puede tardar 1-2 min)..."
sleep 5
AAAA_COUNT="$(dig +short AAAA "${ZONE_NAME}" @1.1.1.1 2>/dev/null | wc -l | tr -d ' ')"
A_RECORDS="$(dig +short A "${ZONE_NAME}" @1.1.1.1 2>/dev/null | tr '\n' ' ')"

echo ""
if [ "${AAAA_COUNT:-0}" = "0" ]; then
  ok "Sin registros AAAA públicos"
else
  warn "Aún hay ${AAAA_COUNT} registro(s) AAAA — espera propagación DNS o elimínalos manualmente en Cloudflare"
fi

if echo "$A_RECORDS" | grep -q "${ORIGIN_IP}"; then
  ok "A record apunta a ${ORIGIN_IP}: ${A_RECORDS}"
else
  warn "A record aún no muestra ${ORIGIN_IP}: ${A_RECORDS:-vacío} — espera propagación"
fi

HTTP_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://${ZONE_NAME}/" || echo "000")"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
  ok "HTTPS responde HTTP ${HTTP_CODE}"
else
  warn "HTTPS devolvió HTTP ${HTTP_CODE} — revisa nginx/SSL en el servidor"
fi

echo ""
echo "========================================="
ok "Fix DNS aplicado"
echo "========================================="
echo ""
info "Los usuarios deben poder entrar por IPv4 directo sin timeout IPv6."
info "Propagación DNS global: 2-15 minutos."
info "Prueba: https://${ZONE_NAME}/auth"
echo ""
