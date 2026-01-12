#!/bin/bash
#
# INSTALACIÓN FINAL - Ejecuta este script para completar la configuración
# ========================================================================
# 
# Este script debe ejecutarse con sudo:
#   sudo bash /srv/mykaizenfit/pro/INSTALL_NOW.sh

clear
echo "========================================================"
echo "  🚀 Instalación Final - Nex-Fit PRO"
echo "========================================================"
echo ""
echo "Este script instalará:"
echo "  1. ✅ Servicio systemd (inicio automático)"
echo "  2. ✅ Monitoreo automático cada 5 minutos"
echo "  3. ✅ Auto-recuperación de servicios"
echo ""
echo "Presiona ENTER para continuar o Ctrl+C para cancelar"
read

# Verificar sudo
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Error: Este script debe ejecutarse con sudo"
    echo "   Usa: sudo bash /srv/mykaizenfit/pro/INSTALL_NOW.sh"
    exit 1
fi

echo ""
echo "🔄 Ejecutando script de instalación..."
echo ""

cd /srv/mykaizenfit/pro
bash ./scripts/install-monitoring.sh

echo ""
echo "========================================================"
echo "  ✅ ¡Instalación Completada!"
echo "========================================================"
echo ""
echo "📖 Para más información, consulta:"
echo "   /srv/mykaizenfit/pro/MONITORING_SETUP.md"
echo ""
