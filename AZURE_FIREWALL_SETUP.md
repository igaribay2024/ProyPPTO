# 🔧 Configuración Azure MySQL para Vercel

## 📋 Problema Identificado

La base de datos Azure MySQL está **bloqueando conexiones desde Vercel** debido a restricciones de firewall.

**Error actual:**
```
connect ETIMEDOUT 4.249.104.218:3306
```

## ⚠️ **ACCIÓN REQUERIDA - Configurar Azure MySQL**

### 1. **Abrir Azure Portal**
- Ve a: https://portal.azure.com
- Busca tu recurso: `mysql-presupuesto`

### 2. **Configurar Firewall y Redes**
```bash
# En Azure Portal:
# 1. Buscar "mysql-presupuesto" 
# 2. Ir a "Connection security" o "Conexión y seguridad"
# 3. En "Firewall rules":

Agregar regla:
- Nombre: "Vercel-AllowAll" 
- IP Inicio: 0.0.0.0
- IP Fin: 255.255.255.255

# ⚠️ IMPORTANTE: También activar
☑️ "Allow access to Azure services"
☑️ "Enforce SSL connection" = OFF (temporalmente)
```

### 3. **Verificar Conexión SSL**
En las configuraciones de servidor:
```
- SSL Status: Disabled (temporalmente para pruebas)
- Server parameters > require_secure_transport = OFF
```

### 4. **Comandos Azure CLI (Alternativo)**
Si prefieres usar línea de comandos:

```powershell
# Instalar Azure CLI si no lo tienes
# https://docs.microsoft.com/en-us/cli/azure/install-azure-cli

# Login
az login

# Listar servidores MySQL
az mysql server list

# Configurar firewall (permite todas las IPs temporalmente)
az mysql server firewall-rule create \
  --resource-group "tu-resource-group" \
  --server "mysql-presupuesto" \
  --name "VercelAccess" \
  --start-ip-address "0.0.0.0" \
  --end-ip-address "255.255.255.255"

# Verificar SSL
az mysql server update \
  --resource-group "tu-resource-group" \
  --name "mysql-presupuesto" \
  --ssl-enforcement Disabled
```

## 🧪 **Después de Configurar Azure**

Prueba la conexión:
1. `https://proy-ppto.vercel.app/api/debug/original-connection`
2. `https://proy-ppto.vercel.app/api/debug/database-structure`

## 📊 **Estado Actual Mientras Tanto**

✅ **Datos Mock Funcionando** - El dashboard mostrará datos realistas
✅ **Sistema Operativo** - Usuarios pueden usar la aplicación  
⏳ **BD Azure Pendiente** - Requiere configuración manual

## 🎯 **Próximos Pasos**

1. **AHORA:** Configura el firewall Azure según las instrucciones arriba
2. **DESPUÉS:** Prueba las conexiones de diagnóstico  
3. **FINALMENTE:** Sistema funcionará con BD real

**Una vez configurado Azure, todos los datos se sincronizarán automáticamente.**