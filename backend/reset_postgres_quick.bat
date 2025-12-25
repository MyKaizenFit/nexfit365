@echo off
echo ============================================================
echo CONFIGURACION RAPIDA DE POSTGRESQL
echo ============================================================
echo.
echo Este script te ayudara a configurar PostgreSQL
echo.
echo PASO 1: Conectate a PostgreSQL
echo Ejecuta: psql -U postgres
echo.
echo PASO 2: En psql, ejecuta estos comandos:
echo.
echo Opcion A - Cambiar contraseña de postgres:
echo   ALTER USER postgres WITH PASSWORD 'postgres123';
echo.
echo Opcion B - Crear nuevo usuario:
echo   CREATE USER nexfit_user WITH PASSWORD 'nexfit123';
echo   CREATE DATABASE mykaizenfit_dev OWNER nexfit_user;
echo   GRANT ALL PRIVILEGES ON DATABASE mykaizenfit_dev TO nexfit_user;
echo.
echo PASO 3: Actualiza el archivo .env con las credenciales
echo.
pause




