# 🚀 Guía de Migración ALTEXPPTO a Azure

## 📋 **Requisitos Previos**

### **Herramientas Necesarias:**
- Azure CLI instalado (`az --version`)
- Node.js 18.x o superior
- MySQL Client tools (mysqldump, mysql)
- PowerShell 5.1+ (Windows) o PowerShell Core (Linux/Mac)
- Git configurado
- Cuenta Azure con permisos de Contributor

### **Archivos Requeridos:**
- `MysqlflexGlobalRootCA.crt.pem` (Certificado SSL Azure MySQL)
- Credenciales de base de datos local y Azure

---

## 🎯 **Paso a Paso de Migración**

### **Fase 1: Preparación**

1. **Descargar certificado SSL de Azure MySQL:**
```bash
curl -o MysqlflexGlobalRootCA.crt.pem https://dl.cacerts.digicert.com/DigiCertGlobalRootCA.crt.pem
```

2. **Configurar Azure CLI:**
```powershell
az login
az account set --subscription "YOUR_SUBSCRIPTION_ID"
```

3. **Clonar repositorio y configurar:**
```bash
git clone https://github.com/igaribay2024/ProyPPTO.git
cd ProyPPTO
```

### **Fase 2: Infraestructura Azure**

4. **Ejecutar script de despliegue:**
```powershell
.\deploy-azure.ps1 -ResourceGroupName "rg-altexppto" -Location "East US"
```

5. **Configurar variables de entorno:**
```powershell
# Configurar password de MySQL en App Service
az webapp config appsettings set \
  --name altexppto-api \
  --resource-group rg-altexppto \
  --settings DB_PASS="YOUR_AZURE_MYSQL_PASSWORD"
```

### **Fase 3: Base de Datos**

6. **Migrar base de datos:**
```powershell
.\migrate-database.ps1 -LocalMySQLPassword "root" -AzureMySQLPassword "YOUR_AZURE_PASSWORD"
```

7. **Verificar conectividad:**
```bash
mysql -h mysql-presupuesto.mysql.database.azure.com -u rootppto -p \
  --ssl-ca=MysqlflexGlobalRootCA.crt.pem -e "SHOW DATABASES;"
```

### **Fase 4: Aplicaciones**

8. **Subir certificado SSL al App Service:**
```powershell
# Comprimir certificado
Compress-Archive -Path "MysqlflexGlobalRootCA.crt.pem" -DestinationPath "ssl-cert.zip"

# Subir usando Azure CLI
az webapp deployment source config-zip \
  --name altexppto-api \
  --resource-group rg-altexppto \
  --src ssl-cert.zip
```

9. **Desplegar Backend:**
```powershell
cd backend
# Usar .env.azure para configuración
cp .env.azure .env

# Build y deploy
zip -r backend-deploy.zip . -x "*.git*" "node_modules/*"
az webapp deployment source config-zip \
  --name altexppto-api \
  --resource-group rg-altexppto \
  --src backend-deploy.zip
```

10. **Configurar Frontend (GitHub Actions):**
```bash
# El frontend se despliega automáticamente via GitHub Actions
# Repositorio: https://github.com/igaribay2024/ProyPPTO
# Solo necesita configurar los secrets en GitHub:
# - AZURE_STATIC_WEB_APPS_API_TOKEN
# - AZURE_WEBAPP_PUBLISH_PROFILE
```

---

## 🔧 **Configuración Post-Despliegue**

### **URLs Finales:**
- **Frontend:** `https://altexppto.azurestaticapps.net`
- **Backend API:** `https://altexppto-api.azurewebsites.net`
- **Base de Datos:** `mysql-presupuesto.mysql.database.azure.com:3306`

### **Variables de Entorno Críticas:**

**Backend (Azure App Service):**
```env
NODE_ENV=production
PORT=80
DB_HOST=mysql-presupuesto.mysql.database.azure.com
DB_USER=rootppto
DB_PASS=[CONFIGURAR]
DB_NAME=AltexPPTO
DB_SSL_ENABLED=true
DB_SSL_CA_PATH=./MysqlflexGlobalRootCA.crt.pem
JWT_SECRET=[GENERAR]
FRONTEND_URL=https://altexppto.azurestaticapps.net
```

**Frontend (.env.production):**
```env
REACT_APP_API_URL=https://altexppto-api.azurewebsites.net
REACT_APP_ENVIRONMENT=production
```

---

## 🔍 **Verificación y Testing**

### **1. Test Backend:**
```bash
curl https://altexppto-api.azurewebsites.net/api/health
```

### **2. Test Base de Datos:**
```bash
mysql -h mysql-presupuesto.mysql.database.azure.com -u rootppto -p \
  --ssl-ca=MysqlflexGlobalRootCA.crt.pem \
  -e "USE AltexPPTO; SELECT COUNT(*) FROM users;"
```

### **3. Test Frontend:**
- Abrir `https://altexppto.azurestaticapps.net`
- Probar login con: `ana.martinez@correo.com` / `1234`
- Verificar que los datos cargan correctamente

---

## 🚨 **Troubleshooting**

### **Errores Comunes:**

1. **Error SSL MySQL:**
   - Verificar que el certificado está en la ruta correcta
   - Confirmar que SSL está habilitado en Azure MySQL

2. **CORS Errors:**
   - Verificar ALLOWED_ORIGINS en backend
   - Confirmar URLs en .env.production

3. **Connection Timeouts:**
   - Verificar firewall rules en Azure MySQL
   - Aumentar timeout en aplicación

### **Logs y Diagnóstico:**
```powershell
# Ver logs del backend
az webapp log tail --name altexppto-api --resource-group rg-altexppto

# Ver métricas
az monitor metrics list --resource "/subscriptions/.../altexppto-api"
```

---

## 📈 **Optimizaciones Futuras**

1. **Performance:**
   - Configurar CDN para static assets
   - Implementar caching en Redis
   - Optimizar queries de base de datos

2. **Seguridad:**
   - Configurar Azure Key Vault para secrets
   - Implementar WAF (Web Application Firewall)
   - Configurar Azure AD authentication

3. **Monitoring:**
   - Application Insights para logging
   - Alertas automáticas
   - Dashboard de métricas

4. **Backup y Recovery:**
   - Backups automáticos de MySQL
   - Disaster recovery plan
   - Blue/Green deployments