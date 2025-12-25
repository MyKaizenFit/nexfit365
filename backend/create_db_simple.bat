@echo off
echo ============================================================
echo CREANDO USUARIO Y BASE DE DATOS POSTGRESQL
echo ============================================================
echo.

REM Intentar crear usuario (puede fallar si ya existe, pero continuamos)
echo Creando usuario nexfit_user...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE USER nexfit_user WITH PASSWORD 'piaPL.1.1';" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Usuario creado exitosamente
) else (
    echo Usuario ya existe o error (continuando...)
)

echo.
echo Creando base de datos mykaizenfit_dev...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "CREATE DATABASE mykaizenfit_dev OWNER nexfit_user;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo Base de datos creada exitosamente
) else (
    echo Base de datos ya existe o error (continuando...)
)

echo.
echo Otorgando permisos...
"C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE mykaizenfit_dev TO nexfit_user;" 2>nul

echo.
echo ============================================================
echo CONFIGURACION COMPLETADA
echo ============================================================
echo.
echo Si hubo errores, ejecuta manualmente en psql:
echo   psql -U postgres
echo   CREATE USER nexfit_user WITH PASSWORD 'piaPL.1.1';
echo   CREATE DATABASE mykaizenfit_dev OWNER nexfit_user;
echo   GRANT ALL PRIVILEGES ON DATABASE mykaizenfit_dev TO nexfit_user;
echo.
pause




