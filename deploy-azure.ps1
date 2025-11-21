# PowerShell Script para Desplegar ALTEXPPTO a Azure

param(
    [string]$ResourceGroupName = "rg-altexppto",
    [string]$Location = "East US",
    [string]$AppServicePlanName = "asp-altexppto",
    [string]$BackendAppName = "altexppto-api",
    [string]$FrontendAppName = "altexppto-frontend",
    [string]$MySQLServerName = "mysql-presupuesto",
    [string]$DatabaseName = "AltexPPTO",
    [string]$MySQLAdminUser = "rootppto"
)

Write-Host "🚀 Iniciando despliegue de ALTEXPPTO a Azure..." -ForegroundColor Green

# Verificar Azure CLI
try {
    az account show | Out-Null
    Write-Host "✅ Azure CLI autenticado" -ForegroundColor Green
} catch {
    Write-Host "❌ Error: Azure CLI no está autenticado. Ejecute 'az login'" -ForegroundColor Red
    exit 1
}

# 1. Crear Resource Group
Write-Host "📦 Creando Resource Group..." -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location

# 2. Crear App Service Plan (Backend)
Write-Host "🏗️ Creando App Service Plan..." -ForegroundColor Yellow
az appservice plan create `
    --name $AppServicePlanName `
    --resource-group $ResourceGroupName `
    --location $Location `
    --sku B1 `
    --is-linux

# 3. Crear Web App para Backend
Write-Host "🌐 Creando Backend App Service..." -ForegroundColor Yellow
az webapp create `
    --name $BackendAppName `
    --resource-group $ResourceGroupName `
    --plan $AppServicePlanName `
    --runtime "NODE:18-lts"

# 4. Configurar variables de entorno del Backend
Write-Host "⚙️ Configurando variables de entorno del Backend..." -ForegroundColor Yellow
az webapp config appsettings set `
    --name $BackendAppName `
    --resource-group $ResourceGroupName `
    --settings `
        NODE_ENV=production `
        PORT=80 `
        DB_HOST="$MySQLServerName.mysql.database.azure.com" `
        DB_USER=$MySQLAdminUser `
        DB_NAME=$DatabaseName `
        DB_SSL_ENABLED=true `
        FRONTEND_URL="https://$FrontendAppName.azurestaticapps.net" `
        JWT_SECRET=$(New-Guid).Guid

# 5. Crear Static Web App para Frontend
Write-Host "🎨 Creando Static Web App para Frontend..." -ForegroundColor Yellow
az staticwebapp create `
    --name $FrontendAppName `
    --resource-group $ResourceGroupName `
    --location $Location `
    --source "https://github.com/igaribay2024/ProyPPTO" `
    --branch "main" `
    --app-location "/" `
    --api-location "" `
    --output-location "build"

# 6. Obtener información de conexión
Write-Host "📋 Obteniendo información de despliegue..." -ForegroundColor Yellow

$backendUrl = az webapp show --name $BackendAppName --resource-group $ResourceGroupName --query "hostNames[0]" -o tsv
$frontendUrl = az staticwebapp show --name $FrontendAppName --resource-group $ResourceGroupName --query "repositoryUrl" -o tsv

Write-Host "✅ Despliegue completado!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Información del despliegue:" -ForegroundColor Cyan
Write-Host "  Resource Group: $ResourceGroupName" -ForegroundColor White
Write-Host "  Backend URL: https://$backendUrl" -ForegroundColor White
Write-Host "  Frontend configurado para GitHub: $frontendUrl" -ForegroundColor White
Write-Host "  MySQL Server: $MySQLServerName.mysql.database.azure.com" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Pasos adicionales necesarios:" -ForegroundColor Yellow
Write-Host "  1. Configurar la contraseña de MySQL en las variables de entorno" -ForegroundColor White
Write-Host "  2. Subir el certificado SSL de MySQL al App Service" -ForegroundColor White
Write-Host "  3. Configurar GitHub Actions para auto-deploy" -ForegroundColor White
Write-Host "  4. Migrar datos de la base de datos local a Azure" -ForegroundColor White