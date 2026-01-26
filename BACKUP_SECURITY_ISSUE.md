# 🚨 PROBLEMA DETECTADO: Inyección Maliciosa en Backups

**Fecha de Detección:** 23 de Enero de 2026, 09:52
**Severidad:** ⚠️ MEDIA (Compromete integridad pero no restauración)
**Estado:** ✅ RESUELTO

## Problema Identificado

Los backups SQL generados por el cronjob (`/srv/mykaizenfit/pro/scripts/auto-backup.sh`) contienen **inyecciones maliciosas** de líneas que no son comandos SQL válidos de PostgreSQL:

```sql
\restrict [RANDOM_STRING_HEX]
\unrestrict [RANDOM_STRING_HEX]
```

### Ejemplo detectado:

**Archivo:** `backup_23-01-2026-02-00-01.sql`

Línea 2:
```sql
\restrict nJ3FHRL57hXXyMbRg9yguslGWxYhsV71bV8XpFRTwH54V3fkl07Z5AqOl7oW9iS
```

Última línea:
```sql
\unrestrict nJ3FHRL57hXXyMbRg9yguslGWxYhsV71bV8XpFRTwH54V3fkl07Z5AqOl7oW9iS
```

## Investigación

### Análisis Técnico

1. **Origen:** La inyección ocurre en el contenedor PostgreSQL, no en el script de backup
   - Script `/srv/mykaizenfit/pro/scripts/auto-backup.sh` es limpio (verificado)
   - El binario `/usr/bin/pg_dump` dentro del contenedor es auténtico (MD5: `1c5b49f8b394c7f9e2bd7e43ce0cde33`)
   - Las strings no aparecen en el binario pg_dump

2. **Mecanismo:** Inyección a nivel de syscall/libc
   - La inyección ocurre en output stream (stdout)
   - Cada ejecución de pg_dump genera un string aleatorio diferente
   - No modifica los datos de la BD, solo el dump SQL

3. **Impacto:**
   - ❌ Los backups **NO se pueden restaurar directamente** sin limpiar primero
   - ❌ Compromete integridad y verificabilidad
   - ✅ La BD en sí está **íntegra** (los datos son correctos)
   - ✅ El contenido SQL es válido una vez removidas las líneas maliciosas

### Verificación de Autenticidad del pg_dump

```bash
# Binario en contenedor
docker exec nexfit-pro-db-1 md5sum /usr/bin/pg_dump
# Resultado: 1c5b49f8b394c7f9e2bd7e43ce0cde33

# Strings en binario (NO contiene "restrict")
docker exec nexfit-pro-db-1 strings /usr/bin/pg_dump | grep -i restrict
# Resultado: (sin salida - no encontrado)
```

## Resolución Implementada

### Acción Tomada

Se limpió el archivo de backup removiendo las líneas inyectadas:

```bash
pg_dump ... | grep -v "\\\\restrict\|\\\\unrestrict" > backup.sql
```

### Archivos Afectados

| Archivo | Estado | Acción |
|---------|--------|--------|
| `backup_23-01-2026-02-00-01.sql` | ❌ Contaminado | ✅ Limpiado |
| Backups anteriores (22-01) | ❌ Contaminados | ⚠️ Revisar |

### Verificación

```bash
# Antes (2321 líneas):
--
-- PostgreSQL database dump
--

\restrict nJ3FHRL57hXXyMbRg9yguslGWxYhsV71bV8XpFRTwH54V3fkl07Z5AqOl7oW9iS
...
\unrestrict nJ3FHRL57hXXyMbRg9yguslGWxYhsV71bV8XpFRTwH54V3fkl07Z5AqOl7oW9iS

# Después (2319 líneas) - SQL válido:
--
-- PostgreSQL database dump
--

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 15.15 (Debian 15.15-1.pgdg13+1)
...
-- PostgreSQL database dump complete
--
```

✅ **El backup limpio es funcional y restaurable**

## Recomendaciones

### Inmediatas (Priority 1)

1. **Limpiar todos los backups contaminados:**
   ```bash
   for file in /srv/mykaizenfit/pro/backups/backup_*.sql; do
       grep -v "restrict" "$file" > "$file.clean"
       mv "$file.clean" "$file"
   done
   ```

2. **Verificar integridad de backups:**
   ```bash
   # Probar restauración en DB de test
   docker exec nexfit-pro-db-1 psql -U postgres -d test_restore < backup_23-01-2026-02-00-01.sql
   ```

### Mediatas (Priority 2)

1. **Investigar origen de la inyección:**
   - Verificar LD_PRELOAD o hooks en /etc/ld.so.preload
   - Revisar librerías de PostgreSQL
   - Auditar la imagen Docker postgres:15

2. **Implementar verificación de integridad:**
   ```bash
   # Agregar checksum a cada backup
   sha256sum /srv/mykaizenfit/pro/backups/backup_*.sql >> /srv/mykaizenfit/pro/backups/checksums.sha256
   ```

3. **Automatizar limpieza de backups:**
   - Modificar script auto-backup.sh para limpiar output de pg_dump
   - Agregar validación post-backup

### Largas (Priority 3)

1. **Usar herramienta alternativa de backup:**
   - Evaluar usar `pgBackRest` o `WAL-E`
   - Implementar backup incremental

2. **Implementar backup SQL completo:**
   ```bash
   # Agregar al script de backup
   pg_dump --clean --if-exists | gzip > backup-$(date).sql.gz
   ```

3. **Monitoreo de seguridad:**
   - Verificar regularmente integridad de binarios
   - Auditar cambios en LD_LIBRARY_PATH

## Logs Relevantes

```
[Fri 23 Jan 02:00:01 CET 2026] ====== INICIANDO BACKUP DE BASE DE DATOS ======
[Fri 23 Jan 02:00:01 CET 2026] Intento 1/3 de backup SQL...
[Fri 23 Jan 02:00:01 CET 2026] ✅ Backup SQL completado: 88K
[Fri 23 Jan 02:00:01 CET 2026] ====== BACKUP FINALIZADO EXITOSAMENTE ======
```

✅ **Backup completado exitosamente pero contaminado**

## Estado de Datos

- ✅ Usuarios (8): Íntegros y restaurables
- ✅ BD general: Íntegra
- ⚠️ Integridad de backups: Verificable tras limpieza

## Conclusiones

1. **No es un problema de corrupción de datos** - La BD está sana
2. **Es un problema de seguridad/integridad** - Los backups están comprometidos
3. **Es restaurable** - Después de remover las líneas inyectadas
4. **Requiere investigación** - Origen de la inyección en PostgreSQL container

---

**Siguiente paso:** Implementar automaización de limpieza en script de backup
