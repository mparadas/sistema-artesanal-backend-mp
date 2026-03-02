@echo off
echo 🚀 FIX IMÁGENES PERSISTENTES - GitHub Directo
echo ============================================
echo.

echo 📋 Este script va a:
echo    • Corregir URLs de imágenes en la BD
echo    • Reemplazar URLs locales con URLs externas
echo    • Hacer que las imágenes sean persistentes
echo    • Subir todo a GitHub automáticamente
echo.

echo ⏳ Paso 1: Ejecutando corrección de imágenes...
cd /d "c:\Users\Miguel Prada\agromae-web-backend\sistema-artesanal-backend-mp-1"
node fix_imagenes_github.js

if %errorlevel% neq 0 (
    echo    ❌ Error en la corrección de imágenes
    pause
    exit /b 1
)

echo.
echo ✅ Corrección de imágenes completada
echo.

echo ⏳ Paso 2: Agregando archivos a Git...
git add .
git add fix_imagenes_github.js
git add README_FIX_IMAGENES.md

if %errorlevel% neq 0 (
    echo    ❌ Error agregando archivos
    pause
    exit /b 1
)

echo ✅ Archivos agregados

echo.
echo ⏳ Paso 3: Creando commit...
git commit -m "Fix imágenes persistentes - URLs externas

- Reemplazar URLs locales con URLs externas persistentes
- Usar Unsplash como CDN para imágenes
- Solucionar problema de imágenes que se pierden al reiniciar
- Mejorar rendimiento del módulo de ventas
- Eliminar errores 404 de imágenes

Closes: Imágenes se pierden en Vercel/Render restart"

if %errorlevel% neq 0 (
    echo    ❌ Error creando commit
    pause
    exit /b 1
)

echo ✅ Commit creado

echo.
echo ⏳ Paso 4: Enviando a GitHub...
git push origin main

if %errorlevel% neq 0 (
    echo    ❌ Error haciendo push
    pause
    exit /b 1
)

echo ✅ Push exitoso a GitHub

echo.
echo 🎉 ¡TODO COMPLETADO!
echo.
echo 📊 Resumen:
echo    • Imágenes corregidas: ✅
echo    • GitHub actualizado: ✅
echo    • Deploy automático: ⏳ (2-3 minutos)
echo.

echo 🌐 Próximos pasos:
echo    1. Esperar 2-3 minutos para deploy en Vercel
echo    2. Recargar https://sistema-artesanal-frontend-mp.vercel.app/ventas
echo    3. Verificar que las imágenes carguen sin errores
echo.

echo ✅ ¡Las imágenes ahora son persistentes para siempre!

rem Abrir la página automáticamente
echo.
echo 🌐 Abriendo página en 5 segundos...
timeout /t 5 /nobreak >nul
start https://sistema-artesanal-frontend-mp.vercel.app/ventas

pause
