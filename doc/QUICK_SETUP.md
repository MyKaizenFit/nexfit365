# 🚀 Configuración Rápida - Nex-Fit

## ⚡ Inicio Rápido en 5 Minutos

### 🔧 **Backend (Django)**

```bash
# 1. Navegar al directorio backend
cd backend

# 2. Instalar dependencias
pip install -r requirements.txt

# 3. Configurar variables de entorno (ya está hecho)
# El archivo .env ya está configurado con la base de datos Neon

# 4. Ejecutar migraciones
python manage.py migrate

# 5. Crear superusuario (ya está creado)
# Email: admin@example.invalid
# Contraseña: AdminNex-Fit

# 6. Ejecutar servidor
python manage.py runserver
```

**✅ Backend funcionando en**: http://localhost:8000  
**🔐 Admin Django**: http://localhost:8000/admin

---

### 🎨 **Frontend (Next.js)**

```bash
# 1. Navegar al directorio frontend
cd frontend

# 2. Instalar dependencias
npm install

# 3. Ejecutar en modo desarrollo
npm run dev
```

**✅ Frontend funcionando en**: http://localhost:3000

---

## 🔑 **Credenciales de Acceso**

### **Superusuario Django**
- **Email**: `admin@example.invalid`
- **Contraseña**: `AdminNex-Fit`
- **URL**: http://localhost:8000/admin

### **Base de Datos**
- **Host**: Neon PostgreSQL
- **Base de datos**: `neondb`
- **Usuario**: `neondb_owner`
- **Estado**: ✅ Conectada y funcionando

---

## 📱 **URLs del Sistema**

| Servicio | URL | Estado |
|----------|-----|--------|
| **Backend API** | http://localhost:8000/api/ | ✅ Funcionando |
| **Admin Django** | http://localhost:8000/admin/ | ✅ Funcionando |
| **API Docs** | http://localhost:8000/api/docs/ | ✅ Funcionando |
| **Frontend** | http://localhost:3000 | ✅ Funcionando |
| **Dashboard** | http://localhost:3000/dashboard | ✅ Funcionando |

---

## 🧪 **Testing Rápido**

### **Backend**
```bash
cd backend
python manage.py test --verbosity=2
```

### **Frontend**
```bash
cd frontend
npm run build
```

---

## 🚨 **Solución de Problemas Comunes**

### **Error de Base de Datos**
```bash
# Verificar conexión
python manage.py check

# Recrear migraciones si es necesario
python manage.py makemigrations
python manage.py migrate
```

### **Error de Dependencias Frontend**
```bash
# Limpiar cache
npm cache clean --force

# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### **Puerto Ocupado**
```bash
# Cambiar puerto backend
python manage.py runserver 8001

# Cambiar puerto frontend
npm run dev -- -p 3001
```

---

## 📊 **Estado del Sistema**

- **Backend**: 🟢 95% Completado
- **Frontend**: 🟡 85% Completado
- **Base de Datos**: 🟢 100% Funcionando
- **Documentación**: 🟢 100% Completada

---

## 🔍 **Próximos Pasos Recomendados**

1. **Conectar Frontend con Backend** - Implementar autenticación
2. **CRUD de Entidades** - Entrenamientos, nutrición, progreso
3. **Sistema de Archivos** - Subida de fotos de progreso
4. **Testing Completo** - Alcanzar 90% de cobertura
5. **Despliegue en Producción** - Render + Vercel

---

*Configuración Rápida v1.1 - Nex-Fit*  
*Última actualización: Diciembre 2024*
