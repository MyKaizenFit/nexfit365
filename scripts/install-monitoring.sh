#!/bin/bash
#
# Script de Instalación de Monitoreo - Nex-Fit PRO
# =================================================
# Este script configura el servicio systemd y el monitoreo automático
#
# USO: sudo ./install-monitoring.sh

set -e  # Salir si hay errores

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_msg() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[i]${NC} $1"
}

# Verificar que se ejecuta como root
if [ "$EUID" -ne 0 ]; then 
    print_error "Este script debe ejecutarse como root (use sudo)"
    exit 1
fi

print_info "================================================"
print_info "  Instalación de Monitoreo - Nex-Fit PRO"
print_info "================================================"
echo ""

# Variables
PROJECT_DIR="/srv/mykaizenfit/pro"
SYSTEMD_SERVICE="/etc/systemd/system/nexfit-pro.service"
LOG_FILE="/var/log/nexfit-check.log"
CRONTAB_FILE="/etc/cron.d/nexfit-pro-monitoring"

# 1. Instalar servicio systemd
print_info "📝 Paso 1: Instalando servicio systemd..."
if [ -f "$PROJECT_DIR/nexfit-pro.service" ]; then
    cp "$PROJECT_DIR/nexfit-pro.service" "$SYSTEMD_SERVICE"
    chmod 644 "$SYSTEMD_SERVICE"
    print_msg "Servicio systemd instalado en $SYSTEMD_SERVICE"
else
    print_error "No se encontró el archivo nexfit-pro.service"
    exit 1
fi

# 2. Recargar systemd
print_info "🔄 Paso 2: Recargando systemd..."
systemctl daemon-reload
print_msg "Systemd recargado"

# 3. Habilitar servicio para inicio automático
print_info "✅ Paso 3: Habilitando servicio para inicio automático..."
systemctl enable nexfit-pro.service
print_msg "Servicio habilitado para inicio automático"

# 4. Crear archivo de log
print_info "📄 Paso 4: Configurando archivo de logs..."
touch "$LOG_FILE"
chmod 644 "$LOG_FILE"
print_msg "Archivo de logs creado: $LOG_FILE"

# 5. Configurar crontab para monitoreo
print_info "⏰ Paso 5: Configurando crontab para monitoreo..."
cat > "$CRONTAB_FILE" << 'EOF'
# Monitoreo automático de Nex-Fit PRO
# Ejecuta cada 5 minutos para verificar que los servicios estén corriendo

SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin

# Verificar servicios cada 5 minutos
*/5 * * * * root /srv/mykaizenfit/pro/scripts/check-services.sh >> /var/log/nexfit-check.log 2>&1

# Limpiar logs antiguos (mantener últimos 7 días)
0 0 * * * root find /var/log/nexfit-check.log -type f -mtime +7 -delete
EOF

chmod 644 "$CRONTAB_FILE"
print_msg "Crontab configurado en $CRONTAB_FILE"

# 6. Verificar que los scripts sean ejecutables
print_info "🔧 Paso 6: Verificando permisos de scripts..."
chmod +x "$PROJECT_DIR/scripts/check-services.sh"
chmod +x "$PROJECT_DIR/scripts/quick-check.sh"
print_msg "Permisos de scripts configurados"

# 7. Estado del servicio
print_info "📊 Paso 7: Verificando estado actual..."
systemctl status nexfit-pro.service --no-pager || true

echo ""
print_info "================================================"
print_msg "✅ Instalación completada exitosamente!"
print_info "================================================"
echo ""
print_info "Comandos útiles:"
echo "  • Ver estado:       sudo systemctl status nexfit-pro"
echo "  • Iniciar:          sudo systemctl start nexfit-pro"
echo "  • Detener:          sudo systemctl stop nexfit-pro"
echo "  • Reiniciar:        sudo systemctl restart nexfit-pro"
echo "  • Ver logs:         sudo journalctl -u nexfit-pro -f"
echo "  • Ver monitoreo:    tail -f /var/log/nexfit-check.log"
echo "  • Check rápido:     /srv/mykaizenfit/pro/scripts/quick-check.sh"
echo ""
print_warning "NOTA: El servicio systemd gestionará automáticamente Docker Compose"
print_warning "      Ya no necesitas ejecutar 'docker compose up' manualmente"
echo ""

# Preguntar si desea iniciar el servicio ahora
read -p "¿Deseas iniciar el servicio ahora? (s/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    print_info "Iniciando servicio..."
    systemctl start nexfit-pro.service
    sleep 3
    systemctl status nexfit-pro.service --no-pager
    print_msg "Servicio iniciado!"
else
    print_info "Puedes iniciar el servicio manualmente con: sudo systemctl start nexfit-pro"
fi

echo ""
print_msg "¡Todo listo! Tu aplicación ahora se mantendrá funcionando 24/7"
