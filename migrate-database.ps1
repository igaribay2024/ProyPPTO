# Script de Migración de Base de Datos a Azure MySQL

param(
    [Parameter(Mandatory=$true)]
    [string]$LocalMySQLPassword,
    
    [Parameter(Mandatory=$true)]
    [string]$AzureMySQLPassword,
    
    [string]$LocalHost = "localhost",
    [string]$LocalUser = "root",
    [string]$LocalDatabase = "AltexPPTO",
    
    [string]$AzureHost = "mysql-presupuesto.mysql.database.azure.com",
    [string]$AzureUser = "rootppto",
    [string]$AzureDatabase = "AltexPPTO",
    [string]$SSLCertPath = ".\MysqlflexGlobalRootCA.crt.pem"
)

Write-Host "🚀 Iniciando migración de base de datos a Azure MySQL..." -ForegroundColor Green

# 1. Crear backup de la base de datos local
Write-Host "💾 Creando backup de la base de datos local..." -ForegroundColor Yellow
$backupFile = "altexppto_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss').sql"

try {
    $mysqldumpArgs = @(
        "--host=$LocalHost",
        "--user=$LocalUser",
        "--password=$LocalMySQLPassword",
        "--single-transaction",
        "--routines",
        "--triggers",
        "--databases",
        $LocalDatabase
    )
    
    & mysqldump @mysqldumpArgs > $backupFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Backup creado exitosamente: $backupFile" -ForegroundColor Green
    } else {
        throw "Error creating backup"
    }
} catch {
    Write-Host "❌ Error creando backup: $_" -ForegroundColor Red
    exit 1
}

# 2. Verificar conectividad a Azure MySQL
Write-Host "🔗 Verificando conectividad a Azure MySQL..." -ForegroundColor Yellow

try {
    $testQuery = "SELECT 1"
    $mysqlArgs = @(
        "--host=$AzureHost",
        "--user=$AzureUser",
        "--password=$AzureMySQLPassword",
        "--ssl-ca=$SSLCertPath",
        "--execute=$testQuery"
    )
    
    & mysql @mysqlArgs 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Conexión a Azure MySQL exitosa" -ForegroundColor Green
    } else {
        throw "Connection failed"
    }
} catch {
    Write-Host "❌ Error conectando a Azure MySQL: $_" -ForegroundColor Red
    Write-Host "Verifique que:" -ForegroundColor Yellow
    Write-Host "  - El servidor Azure MySQL esté activo" -ForegroundColor White
    Write-Host "  - Las credenciales sean correctas" -ForegroundColor White
    Write-Host "  - El certificado SSL esté en la ruta correcta" -ForegroundColor White
    Write-Host "  - Las reglas de firewall permitan la conexión" -ForegroundColor White
    exit 1
}

# 3. Restaurar backup en Azure MySQL
Write-Host "📤 Restaurando backup en Azure MySQL..." -ForegroundColor Yellow

try {
    $restoreArgs = @(
        "--host=$AzureHost",
        "--user=$AzureUser",
        "--password=$AzureMySQLPassword",
        "--ssl-ca=$SSLCertPath"
    )
    
    Get-Content $backupFile | & mysql @restoreArgs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Restauración completada exitosamente" -ForegroundColor Green
    } else {
        throw "Restore failed"
    }
} catch {
    Write-Host "❌ Error durante la restauración: $_" -ForegroundColor Red
    exit 1
}

# 4. Verificar migración
Write-Host "🔍 Verificando migración..." -ForegroundColor Yellow

try {
    $verifyQuery = "USE $AzureDatabase; SHOW TABLES; SELECT COUNT(*) as user_count FROM users;"
    $verifyArgs = @(
        "--host=$AzureHost",
        "--user=$AzureUser",
        "--password=$AzureMySQLPassword",
        "--ssl-ca=$SSLCertPath",
        "--execute=$verifyQuery"
    )
    
    $result = & mysql @verifyArgs
    Write-Host "Resultado de verificación:" -ForegroundColor Cyan
    Write-Host $result -ForegroundColor White
    
} catch {
    Write-Host "⚠️ Advertencia: No se pudo verificar la migración: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Migración de base de datos completada!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Información de conexión Azure:" -ForegroundColor Cyan
Write-Host "  Host: $AzureHost" -ForegroundColor White
Write-Host "  User: $AzureUser" -ForegroundColor White
Write-Host "  Database: $AzureDatabase" -ForegroundColor White
Write-Host "  SSL Required: Yes" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Próximos pasos:" -ForegroundColor Yellow
Write-Host "  1. Actualizar variables de entorno en Azure App Service" -ForegroundColor White
Write-Host "  2. Subir certificado SSL al App Service" -ForegroundColor White
Write-Host "  3. Probar conectividad desde la aplicación" -ForegroundColor White
Write-Host ""
Write-Host "📁 Backup guardado en: $backupFile" -ForegroundColor Cyan