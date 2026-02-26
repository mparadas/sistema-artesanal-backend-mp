@echo off
echo 🚀 Iniciando PostgreSQL como Administrador...
echo.
echo Si pide permisos, haz clic en "Sí"
echo.

net start postgresql-x64-18

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ PostgreSQL iniciado exitosamente
    echo.
    echo Ahora puedes ejecutar:
    echo    node contar_registros.js
    echo    node reinicio_completo_seguro.js
) else (
    echo.
    echo ❌ Error al iniciar PostgreSQL
    echo.
    echo Posibles soluciones:
    echo 1. Ejecuta este archivo como Administrador (clic derecho → Ejecutar como administrador)
    echo 2. Abre services.msc manualmente e inicia postgresql-x64-18
    echo 3. Reinicia tu computadora y vuelve a intentarlo
)

echo.
pause
