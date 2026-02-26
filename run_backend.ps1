Write-Host "🚀 Iniciando servidor backend..."
Set-Location "C:\sistema-artesanal\backend"
try {
    node server.js
} catch {
    Write-Host "❌ Error al iniciar backend: $_"
}
Read-Host "Presiona Enter para salir"
