# Plan de Migración ALTEXPPTO a Azure

## 📋 **Arquitectura Azure Propuesta**

### **Servicios Azure Necesarios:**
1. **Azure Database for MySQL Flexible Server** - Base de datos
2. **Azure App Service** - Backend (Node.js/Express)
3. **Azure Static Web Apps** - Frontend (React)
4. **Azure Application Gateway** (opcional) - Load balancer y SSL

### **Configuración Base de Datos:**
- Servidor: `mysql-presupuesto.mysql.database.azure.com`
- Usuario: `rootppto`
- Base de datos: `AltexPPTO`
- SSL: Habilitado con certificado `MysqlflexGlobalRootCA.crt.pem`

---

## 🚀 **Fase 1: Preparación de Archivos de Configuración**

### **1.1 Backend - Configuración Azure**
- Actualizar variables de entorno para Azure
- Configurar SSL para MySQL Azure
- Crear Dockerfile para containerización
- Configurar Azure App Service

### **1.2 Frontend - Configuración Azure**
- Actualizar configuración para Static Web Apps
- Configurar build para producción
- Actualizar URLs de API

### **1.3 Base de Datos**
- Migrar datos locales a MySQL Azure
- Configurar SSL y conectividad
- Verificar permisos y esquema

---

## 📁 **Archivos a Crear/Modificar**

### **Backend:**
- `.env.azure` - Variables de entorno Azure
- `Dockerfile` - Containerización
- `azure-pipelines.yml` - CI/CD
- `web.config` - IIS config para App Service

### **Frontend:**
- `staticwebapp.config.json` - Config Static Web Apps
- `.env.production` - Variables producción
- `package.json` - Scripts Azure

### **Infraestructura:**
- `azure-resources.json` - ARM Template
- `deploy-azure.ps1` - Script de despliegue

### **Repositorio GitHub:**
- Repositorio: `https://github.com/igaribay2024/altexppto-frontend`
- Branch principal: `main`
- CI/CD configurado para Azure Static Web Apps

---

## ⚙️ **Configuraciones Específicas**

### **MySQL Azure SSL:**
```javascript
const sslConfig = {
  ssl: {
    ca: fs.readFileSync('./MysqlflexGlobalRootCA.crt.pem')
  }
};
```

### **URLs Producción:**
- Frontend: `https://altexppto.azurestaticapps.net`
- Backend: `https://altexppto-api.azurewebsites.net`
- Database: `mysql-presupuesto.mysql.database.azure.com:3306`