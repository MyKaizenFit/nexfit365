#!/bin/bash

# ============================================
# Script para Configurar SSL/HTTPS con Let's Encrypt
# ============================================
# Este script configura SSL end-to-end para nexfit365.dpdns.org
#
# Requisitos:
#   - Dominios apuntando correctamente a este servidor
#   - Nginx instalado y corriendo
#   - Puertos 80 y 443 abiertos en el firewall
#
# Uso:
#   sudo ./scripts/deployment/setup-ssl.sh

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Funciones de output
print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

echo ""
echo "========================================="
echo -e "${CYAN}🔒 CONFIGURACIÓN DE SSL/HTTPS${NC}"
echo "========================================="
echo ""

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
    print_error "Este script debe ejecutarse como root (usa sudo)"
    exit 1
fi

# 1. Instalar certbot
print_info "Instalando certbot y plugin de nginx..."
if command -v certbot &> /dev/null; then
    print_success "Certbot ya está instalado"
else
    apt update -qq
    apt install -y certbot python3-certbot-nginx
    print_success "Certbot instalado"
fi

# 2. Verificar que nginx está corriendo
print_info "Verificando nginx..."
if systemctl is-active --quiet nginx; then
    print_success "Nginx está corriendo"
else
    print_error "Nginx no está corriendo. Iniciando..."
    systemctl start nginx
    systemctl enable nginx
    print_success "Nginx iniciado"
fi

# 3. Verificar configuración de nginx
print_info "Verificando configuración de nginx..."
if nginx -t 2>&1 | grep -q "syntax is ok"; then
    print_success "Configuración de nginx válida"
else
    print_error "Error en la configuración de nginx:"
    nginx -t
    exit 1
fi

# 4. Obtener certificados SSL
print_info "Obteniendo certificados SSL de Let's Encrypt..."
print_warning "Asegúrate de que los dominios apuntan correctamente a este servidor"
print_warning "Cloudflare debe estar en modo 'DNS only' o 'Full' (no 'Full strict' aún)"

# Certificado para frontend
print_info "Obteniendo certificado para nexfit365.dpdns.org y www.nexfit365.dpdns.org..."
if certbot --nginx -d nexfit365.dpdns.org -d www.nexfit365.dpdns.org --non-interactive --agree-tos --email admin@nexfit365.dpdns.org --redirect 2>&1 | tee /tmp/certbot-frontend.log; then
    print_success "Certificado obtenido para frontend"
else
    print_error "Error obteniendo certificado para frontend"
    print_info "Revisa los logs en /tmp/certbot-frontend.log"
    exit 1
fi

# Certificado para backend
print_info "Obteniendo certificado para api.nexfit365.dpdns.org..."
if certbot --nginx -d api.nexfit365.dpdns.org --non-interactive --agree-tos --email admin@nexfit365.dpdns.org --redirect 2>&1 | tee /tmp/certbot-backend.log; then
    print_success "Certificado obtenido para backend"
else
    print_error "Error obteniendo certificado para backend"
    print_info "Revisa los logs en /tmp/certbot-backend.log"
    exit 1
fi

# 5. Verificar renovación automática
print_info "Configurando renovación automática..."
if systemctl is-enabled --quiet certbot.timer; then
    print_success "Renovación automática ya está habilitada"
else
    systemctl enable certbot.timer
    systemctl start certbot.timer
    print_success "Renovación automática habilitada"
fi

# 6. Verificar certificados
print_info "Verificando certificados..."
certbot certificates

# 7. Recargar nginx
print_info "Recargando nginx..."
systemctl reload nginx
print_success "Nginx recargado"

echo ""
echo "========================================="
echo -e "${GREEN}✅ SSL CONFIGURADO EXITOSAMENTE${NC}"
echo "========================================="
echo ""
print_success "Certificados SSL instalados y configurados"
echo ""
print_info "Próximos pasos:"
echo -e "${YELLOW}1. Verifica que HTTPS funciona:${NC}"
echo "   - https://nexfit365.dpdns.org"
echo "   - https://api.nexfit365.dpdns.org"
echo ""
echo -e "${YELLOW}2. Cambia Cloudflare a modo 'Full (strict)':${NC}"
echo "   - Ve a Cloudflare Dashboard"
echo "   - SSL/TLS → Overview"
echo "   - Cambia de 'Flexible' a 'Full (strict)'"
echo ""
echo -e "${YELLOW}3. Verifica la renovación automática:${NC}"
echo "   sudo certbot renew --dry-run"
echo ""


