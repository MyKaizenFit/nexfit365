# 🔄 Sincronización de Base de Datos de Desarrollo entre Equipos

Este sistema permite trabajar con la misma BD de desarrollo en múltiples equipos (portátil y torre) sincronizándola a través de Git.

## 📋 Características

- ✅ **Backup automático** de la BD de desarrollo
- ✅ **Sincronización** a través de Git (solo el backup, no la BD completa)
- ✅ **Restauración automática** después de `git pull`
- ✅ **Monitoreo de cambios** para backups automáticos
- ✅ **Solo mantiene el backup más reciente** (ahorra espacio)

## 🚀 Configuración Inicial (Hacer en AMBOS equipos)

### 1. Configurar Git Hooks

```powershell
# Hacer el hook ejecutable (si estás en Linux/Mac)
chmod +x .git/hooks/post-merge

# En Windows, el hook ya está configurado para usar PowerShell
```

### 2. Asegurar que backups/dev/ está en .gitignore

Verifica que `backups/dev/` NO esté en `.gitignore`, o que al menos `backups/dev/*.sql.gz` y `backups/dev/latest_backup.txt` estén incluidos en Git.

## 📝 Uso Diario

### En el Equipo 1 (Portátil)

#### Al hacer cambios en la BD:

1. **Opción A: Backup manual** (recomendado antes de hacer commit)
   ```powershell
   .\scripts\development\backup-dev-db.ps1
   ```

2. **Opción B: Monitoreo automático** (backup cada 5 minutos)
   ```powershell
   .\scripts\development\watch-db-changes.ps1
   ```
   Deja esto corriendo en segundo plano mientras trabajas.

#### Al terminar de trabajar:

```powershell
# 1. Hacer backup final
.\scripts\development\backup-dev-db.ps1

# 2. Subir cambios a Git
git add backups/dev/
git commit -m "backup: actualizar BD de desarrollo"
git push origin develop
```

### En el Equipo 2 (Torre)

#### Al iniciar trabajo:

```powershell
# 1. Obtener últimos cambios
git pull origin develop

# 2. Si hay un nuevo backup, se te preguntará si quieres restaurarlo
# Responde 's' para restaurar automáticamente

# O restaurar manualmente:
.\scripts\development\restore-dev-db.ps1
```

## 🔧 Scripts Disponibles

### `backup-dev-db.ps1`
Hace backup de la BD de desarrollo.

```powershell
.\scripts\development\backup-dev-db.ps1
```

**Qué hace:**
- Crea backup de `mykaizenfit_dev`
- Comprime el backup
- Guarda en `backups/dev/mykaizenfit_dev_YYYYMMDD_HHMMSS.sql.gz`
- Elimina backups antiguos (mantiene solo el más reciente)
- Crea `backups/dev/latest_backup.txt` con referencia al último backup

### `restore-dev-db.ps1`
Restaura la BD de desarrollo desde un backup.

```powershell
.\scripts\development\restore-dev-db.ps1
```

**Qué hace:**
- Busca el backup más reciente en `backups/dev/`
- Elimina la BD actual
- Restaura el backup
- Reinicia el backend

### `watch-db-changes.ps1`
Monitorea cambios en la BD y hace backup automático.

```powershell
.\scripts\development\watch-db-changes.ps1
# O con intervalo personalizado (en segundos):
.\scripts\development\watch-db-changes.ps1 -IntervalSeconds 600  # Cada 10 minutos
```

**Qué hace:**
- Monitorea cambios en la BD cada X segundos
- Hace backup automático cuando detecta cambios
- Se ejecuta en segundo plano

## 📁 Estructura de Archivos

```
backups/
└── dev/
    ├── latest_backup.txt          # Referencia al último backup
    └── mykaizenfit_dev_YYYYMMDD_HHMMSS.sql.gz  # Backup comprimido
```

## ⚠️ Importante

1. **Siempre haz backup antes de hacer push:**
   ```powershell
   .\scripts\development\backup-dev-db.ps1
   git add backups/dev/
   git commit -m "backup: actualizar BD"
   git push
   ```

2. **Después de git pull, restaura el backup:**
   - Se te preguntará automáticamente
   - O ejecuta manualmente: `.\scripts\development\restore-dev-db.ps1`

3. **El backup se actualiza automáticamente** si usas `watch-db-changes.ps1`

4. **Solo se mantiene el backup más reciente** para ahorrar espacio en Git

## 🔍 Verificación

### Ver el último backup:
```powershell
Get-Content backups/dev/latest_backup.txt
```

### Ver todos los backups:
```powershell
Get-ChildItem backups/dev/*.sql.gz | Sort-Object LastWriteTime -Descending
```

### Verificar que la BD está sincronizada:
```powershell
# En ambos equipos, verificar el número de registros
docker exec nexfit-dev-db-1 psql -U postgres -d mykaizenfit_dev -c "SELECT COUNT(*) FROM accounts_customuser;"
```

## 🆘 Solución de Problemas

### "No se encontró backup"
- Asegúrate de que alguien haya hecho backup y subido a Git
- Ejecuta `.\scripts\development\backup-dev-db.ps1` en el otro equipo

### "Error al restaurar backup"
- Verifica que Docker esté corriendo
- Verifica que el contenedor de BD esté activo: `docker ps | grep nexfit-dev-db`

### "El backup es muy grande"
- Los backups están comprimidos (normalmente < 2MB)
- Si es muy grande, considera limpiar datos de prueba antiguos

### "No se detectan cambios automáticamente"
- El monitoreo automático puede no detectar todos los cambios
- Haz backup manual antes de hacer commit: `.\scripts\development\backup-dev-db.ps1`

## 📝 Flujo de Trabajo Recomendado

### Equipo 1 (Portátil):
1. Trabajar en la BD
2. Antes de hacer commit: `.\scripts\development\backup-dev-db.ps1`
3. `git add backups/dev/ && git commit -m "backup: actualizar BD" && git push`

### Equipo 2 (Torre):
1. `git pull origin develop`
2. Si hay backup nuevo, restaurar: `.\scripts\development\restore-dev-db.ps1`
3. Continuar trabajando

## ✅ Checklist de Configuración

- [ ] Scripts copiados a `scripts/development/`
- [ ] Git hook configurado (`.git/hooks/post-merge`)
- [ ] `backups/dev/` no está en `.gitignore` (o está configurado para incluir backups)
- [ ] Probado backup: `.\scripts\development\backup-dev-db.ps1`
- [ ] Probado restore: `.\scripts\development\restore-dev-db.ps1`
- [ ] Configurado en ambos equipos


