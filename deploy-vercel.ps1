# Script para Deploy en Vercel

Write-Host "🚀 Preparando migración completa a Vercel..." -ForegroundColor Green

# Instalar dependencias backend en el frontend
Write-Host "📦 Instalando dependencias para Vercel Functions..." -ForegroundColor Yellow
npm install

# Add todos los archivos nuevos
Write-Host "📤 Enviando cambios al repositorio..." -ForegroundColor Yellow
git add .
git commit -m "🚀 Complete Vercel migration with serverless functions

✨ Features:
- Vercel Functions for backend API (/api/*)
- MySQL Azure connection configured
- JWT authentication system
- CORS properly configured
- Frontend updated for Vercel endpoints

📁 Structure:
- /api/auth/login.js - User authentication
- /api/auth/register.js - User registration  
- /api/gastos/index.js - Expense management
- /api/presupuestos/index.js - Budget management
- /lib/database.js - MySQL connection
- vercel.json - Vercel configuration

🔧 Ready for deployment!"

git push origin main

Write-Host ""
Write-Host "✅ Proyecto migrado exitosamente!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Próximos pasos para Vercel:" -ForegroundColor Yellow
Write-Host "1. Ve a https://vercel.com e inicia sesión con GitHub"
Write-Host "2. Importa el repositorio ProyPPTO"
Write-Host "3. Configura las variables de entorno:"
Write-Host "   - DB_HOST: mysql-presupuesto.mysql.database.azure.com"
Write-Host "   - DB_USER: rootppto"  
Write-Host "   - DB_PASSWORD: [tu-password]"
Write-Host "   - DB_NAME: presupuesto_db"
Write-Host "   - DB_SSL_ENABLED: true"
Write-Host "   - JWT_SECRET: [tu-jwt-secret]"
Write-Host "4. ¡Deploy automático en segundos!"
Write-Host ""
Write-Host "🎯 Tu app estará disponible en: https://altexppto.vercel.app" -ForegroundColor Cyan