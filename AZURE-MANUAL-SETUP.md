# Guía Manual para crear recursos en Azure Portal

## 🎯 **Crear recursos paso a paso en Azure Portal**

### **1. Resource Group:**
- Ve a: https://portal.azure.com/#create/Microsoft.ResourceGroup
- Nombre: `rg-ppto`
- Región: `West Europe`

### **2. App Service (Backend):**
- Ve a: https://portal.azure.com/#create/Microsoft.WebSite
- **Basics:**
  - Resource Group: `rg-ppto`
  - Name: `ppto-api` (nombre simple)
  - Publish: `Code`
  - Runtime: `Node 18 LTS`
  - OS: `Linux`
  - Region: `West Europe`
- **App Service Plan:**
  - Pricing: `Free F1` (obligatorio por políticas)

### **3. Static Web App (Frontend):**
- Ve a: https://portal.azure.com/#create/Microsoft.StaticApp
- **Basics:**
  - Resource Group: `rg-ppto`
  - Name: `ppto-frontend`
  - Plan: `Free`
  - Region: `West Europe`
- **Deployment:**
  - Source: `GitHub`
  - Repository: `igaribay2024/ProyPPTO`
  - Branch: `main`
  - Build Presets: `React`

### **4. MySQL (Usar existente):**
- Server: `mysql-presupuesto.mysql.database.azure.com`
- User: `rootppto`
- Database: `AltexPPTO`

## 🔧 **Configuración Post-Creación:**

### **App Service Configuration:**
```env
NODE_ENV=production
PORT=80
DB_HOST=mysql-presupuesto.mysql.database.azure.com
DB_USER=rootppto
DB_PASS=[tu-password]
DB_NAME=AltexPPTO
DB_SSL_ENABLED=true
FRONTEND_URL=https://[tu-static-web-app].azurestaticapps.net
```

### **Deployment:**
1. Zip tu carpeta `backend`
2. Ve a App Service > Deployment Center
3. Sube el ZIP file

## 🚀 **Pasos Detallados de Configuración:**

### **Paso 1: Preparar archivos para deployment**

Primero creamos el archivo ZIP del backend:

### **Paso 2: Configurar Variables de Entorno en App Service**

Una vez creado el App Service, necesitas configurar las variables:

1. **Ve a tu App Service en Azure Portal**
2. **Settings > Environment variables**
3. **Agrega estas variables:**

```env
NODE_ENV=production
PORT=80
DB_HOST=mysql-presupuesto.mysql.database.azure.com
DB_USER=rootppto
DB_PASS=TU_PASSWORD_MYSQL
DB_NAME=AltexPPTO
DB_SSL_ENABLED=true
DB_SSL_CA_PATH=./MysqlflexGlobalRootCA.crt.pem
JWT_SECRET=genera_un_secreto_seguro_aqui
FRONTEND_URL=https://TU-STATIC-WEB-APP.azurestaticapps.net
```

### **Paso 3: Subir certificado SSL de MySQL**

El certificado `MysqlflexGlobalRootCA.crt.pem` debe estar en el backend:

### **Paso 4: Configurar Static Web App**

Para el frontend, necesitas:

1. **Ir a Static Web App en Azure Portal**
2. **Settings > Configuration**
3. **Agregar variable:**

```env
REACT_APP_API_URL=https://TU-APP-SERVICE.azurewebsites.net
```

### **Paso 5: Deployment del Backend**

1. **Ve a App Service > Deployment Center**
2. **Local Git o ZIP deploy**
3. **Sube el archivo `backend-deploy.zip`**

### **Paso 6: Verificar funcionamiento**

#### **Test 1: Backend Health Check**
```bash
curl https://TU-APP-SERVICE.azurewebsites.net/api/health
```

#### **Test 2: Database Connection**
```bash
curl https://TU-APP-SERVICE.azurewebsites.net/api/usuarios
```

#### **Test 3: Frontend**
- Abrir: `https://TU-STATIC-WEB-APP.azurestaticapps.net`
- Probar login con: `ana.martinez@correo.com` / `1234`

## 🔍 **Troubleshooting Común**

### **Error 1: "Cannot connect to MySQL"**
**Solución:**
- Verificar que el certificado SSL esté en el backend
- Confirmar variables de entorno
- Revisar firewall rules en Azure MySQL

### **Error 2: "CORS Error"**
**Solución:**
- Verificar `FRONTEND_URL` en backend
- Confirmar `REACT_APP_API_URL` en frontend

### **Error 3: "Application failed to start"**
**Solución:**
- Revisar logs: App Service > Monitoring > Log stream
- Verificar `package.json` scripts
- Confirmar Node.js version

## 📋 **Lista de Verificación Final:**

- [ ] Resource Group creado
- [ ] App Service con Node.js 18 configurado
- [ ] Variables de entorno configuradas
- [ ] Certificado SSL subido
- [ ] Backend deployado exitosamente
- [ ] Static Web App creado y conectado a GitHub
- [ ] Frontend deployado automáticamente
- [ ] Database connection funcionando
- [ ] Login funcional
- [ ] "Alertas del mes" mostrándose correctamente

## 🎉 **URLs Finales:**

Una vez completado todo:

- **Frontend:** `https://[tu-static-web-app].azurestaticapps.net`
- **Backend API:** `https://[tu-app-service].azurewebsites.net`
- **Base de Datos:** `mysql-presupuesto.mysql.database.azure.com:3306`

¡Tu aplicación ALTEXPPTO estará funcionando completamente en Azure! 🚀