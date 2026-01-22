#!/bin/bash

# Script de Backup Automático para Base de Datos PostgreSQL
# Ejecuta DIARIAMENTE a las 2:00 AM
# Mantiene backups de los últimos 7 días
# Formato de fecha: DD-MM-YYYY-HH-MM-SS

BACKUP_DIR="/srv/mykaizenfit/pro/backups"
TIMESTAMP=$(date '+%d-%m-%Y-%H-%M-%S')
LOG_FILE="$BACKUP_DIR/backup.log"
MAX_RETRIES=3
RETRY_DELAY=5

# Crear directorio si no existe
mkdir -p "$BACKUP_DIR"

echo "[$(date)] ====== INICIANDO BACKUP DE BASE DE DATOS ======" >> "$LOG_FILE"

# Función para intentar backup SQL con reintentos
backup_sql_with_retry() {
    local attempt=1
    local backup_file="$BACKUP_DIR/backup_$TIMESTAMP.sql"
    
    while [ $attempt -le $MAX_RETRIES ]; do
        echo "[$(date)] Intento $attempt/$MAX_RETRIES de backup SQL..." >> "$LOG_FILE"
        
        if COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f /srv/mykaizenfit/pro/docker-compose.prod.yml exec -T db pg_dump -U postgres -d mykaizenfit > "$backup_file" 2>> "$LOG_FILE"; then
            SIZE=$(du -h "$backup_file" | cut -f1)
            
            # Comprimir si es mayor a 100MB
            if [ $(stat -c%s "$backup_file") -gt 104857600 ]; then
                gzip "$backup_file"
                echo "[$(date)] ✅ Backup SQL completado y comprimido: $SIZE" >> "$LOG_FILE"
            else
                echo "[$(date)] ✅ Backup SQL completado: $SIZE" >> "$LOG_FILE"
            fi
            return 0
        fi
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            echo "[$(date)] Fallo en intento $attempt, reintentando en $RETRY_DELAY segundos..." >> "$LOG_FILE"
            sleep $RETRY_DELAY
        fi
        
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Función para backup de archivos de datos (fallback seguro)
backup_data_files() {
    local backup_file="$BACKUP_DIR/pg_data_backup_$TIMESTAMP.tar.gz"
    local temp_dir="$BACKUP_DIR/data_temp_$TIMESTAMP"
    
    echo "[$(date)] Iniciando backup de archivos de datos (fallback)..." >> "$LOG_FILE"
    
    # Copiar datos de PostgreSQL
    if ! docker cp nexfit-pro-db-1:/var/lib/postgresql/data "$temp_dir" 2>> "$LOG_FILE"; then
        echo "[$(date)] ❌ ERROR: No se pudo copiar datos de PostgreSQL" >> "$LOG_FILE"
        rm -rf "$temp_dir"
        return 1
    fi
    
    # Comprimir
    echo "[$(date)] Comprimiendo datos..." >> "$LOG_FILE"
    if tar -czf "$backup_file" -C "$BACKUP_DIR" "data_temp_$TIMESTAMP" 2>> "$LOG_FILE"; then
        rm -rf "$temp_dir"
        SIZE=$(du -h "$backup_file" | cut -f1)
        echo "[$(date)] ✅ Backup de datos completado (fallback): $SIZE" >> "$LOG_FILE"
        return 0
    else
        echo "[$(date)] ❌ ERROR: Fallo al comprimir datos" >> "$LOG_FILE"
        rm -rf "$temp_dir" "$backup_file"
        return 1
    fi
}

# Ejecutar backup
if backup_sql_with_retry; then
    :
else
    echo "[$(date)] ⚠️  pg_dump no disponible, intentando backup de archivos de datos..." >> "$LOG_FILE"
    if ! backup_data_files; then
        echo "[$(date)] ❌ ERROR: Todos los métodos de backup fallaron" >> "$LOG_FILE"
        exit 1
    fi
fi

# Limpiar backups anteriores a 7 días
echo "[$(date)] Limpiando backups anteriores a 7 días..." >> "$LOG_FILE"
find "$BACKUP_DIR" -maxdepth 1 -type f \( -name "backup_*.sql*" -o -name "pg_data_backup_*.tar.gz" \) -mtime +7 -delete 2>/dev/null || true

# Limpiar directorios temporales
find "$BACKUP_DIR" -maxdepth 1 -type d -name "data_temp_*" -delete 2>/dev/null || true

echo "[$(date)] ====== BACKUP FINALIZADO EXITOSAMENTE ======" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
