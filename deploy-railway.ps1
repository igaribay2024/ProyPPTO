# 🚀 Script para Deploy en Railway + Netlify

Write-Host "🔄 Actualizando repositorio para Railway + Netlify deployment..." -ForegroundColor Green

# Add todos los archivos nuevos
git add .

# Commit con mensaje descriptivo
git commit -m "Add Railway + Netlify deployment configuration"

# Push al repositorio
git push origin main

Write-Host "✅ Cambios enviados al repositorio!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Próximos pasos:" -ForegroundColor Yellow
Write-Host "1. Ve a https://railway.app y conecta tu repositorio"
Write-Host "2. Ve a https://netlify.com y conecta tu repositorio"  
Write-Host "3. Configura las variables de entorno en ambas plataformas"
Write-Host "4. ¡Tu app estará desplegada sin restricciones de Azure!"