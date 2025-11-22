# Script Simplificado para Azure - Sin Políticas Restrictivas
param(
    [string]$ResourceGroupName = "rg-altexppto-basic",
    [string]$Location = "West US 2",
    [string]$AppName = "altexppto-webapp-$(Get-Random)"
)

Write-Host "🚀 Creando recursos Azure básicos..." -ForegroundColor Green

# Verificar login
try {
    az account show | Out-Null
    Write-Host "✅ Azure CLI autenticado" -ForegroundColor Green
} catch {
    Write-Host "❌ Por favor ejecute: az login" -ForegroundColor Red
    exit 1
}

# Listar ubicaciones disponibles
Write-Host "📍 Ubicaciones disponibles para Web Apps:" -ForegroundColor Cyan
az appservice list-locations --sku FREE --query "[].name" -o table

# Crear Resource Group con nombre único
Write-Host "📦 Creando Resource Group..." -ForegroundColor Yellow
az group create --name $ResourceGroupName --location $Location

# Crear App Service Plan GRATUITO
Write-Host "🏗️ Creando App Service Plan GRATUITO..." -ForegroundColor Yellow
az appservice plan create `
    --name "plan-$AppName" `
    --resource-group $ResourceGroupName `
    --location $Location `
    --sku FREE `
    --is-linux

# Crear Web App con Node.js
Write-Host "🌐 Creando Web App..." -ForegroundColor Yellow
az webapp create `
    --name $AppName `
    --resource-group $ResourceGroupName `
    --plan "plan-$AppName" `
    --runtime "NODE:18-lts"

Write-Host "✅ Recursos creados!" -ForegroundColor Green
Write-Host "📋 Información:" -ForegroundColor Cyan
Write-Host "  Resource Group: $ResourceGroupName" -ForegroundColor White
Write-Host "  Web App: https://$AppName.azurewebsites.net" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Siguientes pasos:" -ForegroundColor Yellow
Write-Host "  1. Configurar variables de entorno" -ForegroundColor White
Write-Host "  2. Desplegar código" -ForegroundColor White