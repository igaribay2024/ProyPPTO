# ✅ Checklist de Deployment Azure - ALTEXPPTO

## 🎯 **Prerrequisitos Completados:**
- [x] Certificado SSL descargado: `MysqlflexGlobalRootCA.crt.pem`
- [x] Backend ZIP creado: `backend-deploy.zip` (2MB)
- [x] Repositorio en GitHub: `https://github.com/igaribay2024/ProyPPTO`
- [x] Configuraciones Azure preparadas

## 📋 **Pasos a Seguir en Azure Portal:**

### **1. Resource Group** ⏳
- [ ] Ir a: https://portal.azure.com/#create/Microsoft.ResourceGroup
- [ ] Nombre: `rg-altexppto-manual`
- [ ] Región: `West US 2` o `Central US`
- [ ] Crear

### **2. App Service (Backend)** ⏳
- [ ] Ir a: https://portal.azure.com/#create/Microsoft.WebSite
- [ ] Resource Group: `rg-altexppto-manual`
- [ ] Name: `altexppto-api-[tu-nombre]` (único)
- [ ] Runtime: `Node 18 LTS`
- [ ] OS: `Linux`
- [ ] Pricing: `Free F1`
- [ ] Crear

### **3. Configurar Variables de Entorno** ⏳
- [ ] App Service > Settings > Environment variables
- [ ] Agregar todas las variables del archivo `.env.azure`
- [ ] **Importante:** Cambiar `FRONTEND_URL` por tu Static Web App URL

### **4. Deploy Backend** ⏳
- [ ] App Service > Deployment Center
- [ ] Subir: `backend-deploy.zip`
- [ ] Reiniciar App Service

### **5. Static Web App (Frontend)** ⏳
- [ ] Ir a: https://portal.azure.com/#create/Microsoft.StaticApp
- [ ] Resource Group: `rg-altexppto-manual`
- [ ] Name: `altexppto-frontend`
- [ ] Source: `GitHub`
- [ ] Repository: `igaribay2024/ProyPPTO`
- [ ] Branch: `main`
- [ ] Build Presets: `React`

### **6. Configurar Frontend** ⏳
- [ ] Static Web App > Settings > Configuration
- [ ] Agregar: `REACT_APP_API_URL` con tu App Service URL

## 🧪 **Testing:**

### **Backend Tests:**
- [ ] https://[tu-app-service].azurewebsites.net (debe mostrar página)
- [ ] https://[tu-app-service].azurewebsites.net/api/usuarios (debe mostrar JSON)

### **Frontend Tests:**
- [ ] https://[tu-static-web-app].azurestaticapps.net (debe abrir app)
- [ ] Login con: `ana.martinez@correo.com` / `1234`
- [ ] Dashboard debe mostrar "Alertas del mes"

## 🆘 **Si algo falla:**

### **Error de conexión MySQL:**
1. Verificar variables de entorno en App Service
2. Revisar logs: App Service > Monitoring > Log stream
3. Confirmar que `MysqlflexGlobalRootCA.crt.pem` está en el ZIP

### **Error CORS:**
1. Verificar `FRONTEND_URL` en backend
2. Verificar `REACT_APP_API_URL` en frontend
3. Reiniciar ambos servicios

### **App no inicia:**
1. Revisar logs del App Service
2. Verificar que Node.js version es 18
3. Confirmar que `package.json` tiene script `start`

---

## 🎉 **Al completar todo:**

Tu aplicación estará disponible en:
- **Frontend:** https://[nombre].azurestaticapps.net
- **API:** https://[nombre].azurewebsites.net

¡ALTEXPPTO funcionando 100% en la nube de Azure! 🚀