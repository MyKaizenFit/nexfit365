# Solución al Problema de Contraseña

## Problema Detectado

El script de pruebas muestra que Django no puede conectarse a la base de datos porque la contraseña del usuario `nexfit_app` tiene caracteres especiales (`$`) que pueden estar causando problemas.

## Soluciones

### Opción 1: Cambiar la contraseña a una más simple (Recomendado)

1. **Configura pg_hba.conf temporalmente** (si aún no lo has hecho):
   - Edita: `C:\Program Files\PostgreSQL\17\data\pg_hba.conf`
   - Cambia `scram-sha-256` a `trust` en las líneas de conexión local
   - Reinicia PostgreSQL

2. **Ejecuta este comando en psql** (como postgres):
   ```sql
   ALTER USER nexfit_app WITH PASSWORD 'nexfit_app_2024';
   ```

3. **Actualiza el .env** con la nueva contraseña:
   ```
   DB_PASSWORD=nexfit_app_2024
   ```

### Opción 2: Escapar la contraseña en el .env

Si quieres mantener la contraseña actual, asegúrate de que en el `.env` esté entre comillas o escapada correctamente. La contraseña actual es:
```
$ydEt4Kdpe012oB$07tArRak
```

En el `.env` debería estar así:
```
DB_PASSWORD='$ydEt4Kdpe012oB$07tArRak'
```

O sin comillas pero escapando los `$`:
```
DB_PASSWORD=\$ydEt4Kdpe012oB\$07tArRak
```

### Opción 3: Verificar que pg_hba.conf permite conexiones

Si `pg_hba.conf` está configurado con `trust`, deberías poder conectarte sin contraseña. Verifica que las líneas relevantes digan `trust` y no `scram-sha-256`.

## Verificación

Después de aplicar la solución, ejecuta:

```powershell
cd "F:\Proyecto Sara Aitor\nexfit365\backend"
python test_database_connection.py
```

Todas las pruebas deberían pasar.



