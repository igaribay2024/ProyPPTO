# Script simple para deployment
Write-Host "Actualizando repositorio..." -ForegroundColor Green

git add .
git commit -m "Add Railway + Netlify deployment config"
git push origin main

Write-Host "Cambios enviados al repositorio!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos pasos:" -ForegroundColor Yellow
Write-Host "1. Ve a https://railway.app"
Write-Host "2. Ve a https://netlify.com"
Write-Host "3. Conecta tu repositorio ProyPPTO"
Write-Host "4. Tu app estara desplegada!"