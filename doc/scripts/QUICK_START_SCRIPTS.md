# 🚀 Scripts de Inicio Rápido - Nex-Fit

## 📋 **Descripción**

Scripts automatizados para inicializar el entorno de desarrollo completo de Nex-Fit de forma rápida y sencilla. Estos scripts verifican dependencias, configuran el entorno y muestran todas las rutas disponibles del sistema.

---

## 🎯 **Scripts Disponibles**

### **Windows (PowerShell)**
- **`start-dev.ps1`** - Script principal para Windows

### **Unix/Linux/macOS (Bash)**
- **`start-dev.sh`** - Script principal para sistemas Unix

---

## 🚀 **Uso Rápido**

### **Windows (PowerShell)**
```powershell
# Navegar al directorio raíz del proyecto
cd "F:\Proyecto Sara Aitor\repos separados para el host"

# Ejecutar script (inicia backend + frontend)
.\start-dev.ps1

# Solo backend
.\start-dev.ps1 -BackendOnly

# Solo frontend
.\start-dev.ps1 -FrontendOnly

# Mostrar ayuda
.\start-dev.ps1 -Help
```

### **Unix/Linux/macOS (Bash)**
```bash
# Navegar al directorio raíz del proyecto
cd /ruta/al/proyecto

# Hacer ejecutable (solo la primera vez)
chmod +x start-dev.sh

# Ejecutar script (inicia backend + frontend)
./start-dev.sh

# Solo backend
./start-dev.sh --backend-only

# Solo frontend
./start-dev.sh --frontend-only

# Mostrar ayuda
./start-dev.sh --help
```

---

## ✨ **Características de los Scripts**

### **🔍 Verificaciones Automáticas**
- ✅ Estructura del proyecto
- ✅ Dependencias de Python (Django)
- ✅ Dependencias de Node.js (Next.js)
- ✅ Entornos virtuales
- ✅ Archivos de configuración

### **🚀 Inicialización Inteligente**
- 🔧 Backend Django en puerto 8000
- 🎨 Frontend Next.js en puerto 3000
- 📊 Verificación de servicios
- 🔄 Manejo de procesos en segundo plano

### **📚 Información Completa**
- 🌐 Todas las rutas del sistema
- 🔑 Credenciales de acceso
- 📁 Estructura del proyecto
- 📋 Estado de los servicios

---

## 🌐 **Rutas que Muestran los Scripts**

### **🔧 Backend Django (Puerto 8000)**
| Ruta | Descripción | Estado |
|------|-------------|--------|
| `/` | Página principal | ✅ Funcionando |
| `/admin/` | Admin Django | ✅ Funcionando |
| `/api/docs/` | API Docs (Swagger) | ✅ Funcionando |
| `/api/auth/` | Autenticación | ✅ Funcionando |
| `/api/me/` | Usuario actual | ✅ Funcionando |
| `/api/workout-programs/` | Entrenamientos | ✅ Funcionando |
| `/api/nutrition-plans/` | Nutrición | ✅ Funcionando |
| `/api/progress-photos/` | Progreso | ✅ Funcionando |
| `/api/achievements/` | Logros | ✅ Funcionando |
| `/api/notifications/` | Notificaciones | ✅ Funcionando |
| `/api/dashboard/` | Dashboard | ✅ Funcionando |

### **🎨 Frontend Next.js (Puerto 3000)**
| Ruta | Descripción | Estado |
|------|-------------|--------|
| `/` | Página principal | ✅ Funcionando |
| `/auth` | Autenticación | ✅ Funcionando |
| `/dashboard` | Dashboard | ✅ Funcionando |
| `/admin` | Panel Admin | ✅ Funcionando |
| `/profile` | Perfil Usuario | ✅ Funcionando |
| `/workouts` | Entrenamientos | ✅ Funcionando |
| `/nutrition` | Nutrición | ✅ Funcionando |
| `/progress` | Progreso | ✅ Funcionando |
| `/achievements` | Logros | ✅ Funcionando |

---

## 🔑 **Credenciales de Acceso**

### **👑 Superusuario Django**
- **Email**: `admin@mykaizenfit.com`
- **Contraseña**: `AdminNex-Fit`
- **URL**: http://localhost:8000/admin/

### **🧪 Usuarios de Prueba (Desarrollo)**
- **Usuario Cliente**:
  - Email: `test@mykaizenfit.com`
  - Contraseña: `TestUser123!`
- **Admin de Pruebas**:
  - Email: `admin@mykaizenfit.com`
  - Contraseña: `AdminTest123!`

---

## 📁 **Estructura del Proyecto**

```
📁 Nex-Fit/
├── 📁 backend/              # API Django + DRF
│   ├── 📁 accounts/         # Gestión de usuarios
│   ├── 📁 workouts/         # Entrenamientos
│   ├── 📁 nutrition/        # Nutrición
│   ├── 📁 progress/         # Progreso
│   ├── 📁 achievements/     # Logros
│   ├── 📁 notifications/    # Notificaciones
│   ├── 📁 dashboard/        # Dashboard
│   ├── 📁 api/              # API REST
│   ├── 📁 docs/             # Documentación backend
│   ├── manage.py            # Comando Django
│   ├── requirements.txt     # Dependencias Python
│   └── .env                 # Variables de entorno
├── 📁 frontend/             # Aplicación Next.js
│   ├── 📁 app/              # Páginas y rutas
│   ├── 📁 components/       # Componentes UI
│   ├── 📁 lib/              # Utilidades y servicios
│   ├── 📁 contexts/         # Contextos de React
│   ├── 📁 hooks/            # Hooks personalizados
│   ├── package.json         # Dependencias Node.js
│   └── .env.local           # Variables de entorno
├── 📁 docs/                 # Documentación completa
├── 📄 start-dev.ps1         # Script Windows
├── 📄 start-dev.sh          # Script Unix
├── 📄 QUICK_START_SCRIPTS.md # Esta documentación
└── 📄 README.md             # Documentación principal
```

---

## 🚨 **Solución de Problemas**

### **Error: "No se encontró manage.py"**
```bash
# Asegúrate de estar en el directorio raíz del proyecto
# No en backend/ o frontend/
pwd
# Debe mostrar: /ruta/al/proyecto/Nex-Fit
```

### **Error: "No se encontró package.json"**
```bash
# Verifica que el directorio frontend existe
ls -la frontend/
# Debe contener package.json
```

### **Error: "Django no está instalado"**
```bash
# El script instalará automáticamente las dependencias
# Si falla, instala manualmente:
cd backend
pip install -r requirements.txt
```

### **Error: "Node.js no está instalado"**
```bash
# Instala Node.js desde: https://nodejs.org/
# Luego ejecuta:
cd frontend
npm install
```

### **Puerto 8000 ocupado**
```bash
# Detén otros procesos en el puerto 8000
# Windows:
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Unix/Linux/macOS:
lsof -ti:8000 | xargs kill -9
```

### **Puerto 3000 ocupado**
```bash
# Detén otros procesos en el puerto 3000
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Unix/Linux/macOS:
lsof -ti:3000 | xargs kill -9
```

---

## 🎯 **Flujo de Trabajo Recomendado**

### **1. Inicio Rápido (Desarrollo)**
```bash
# Ejecutar script completo
.\start-dev.ps1          # Windows
./start-dev.sh           # Unix/Linux/macOS

# Resultado: Backend + Frontend funcionando
# Backend: http://localhost:8000/
# Frontend: http://localhost:3000/
```

### **2. Solo Backend (API)**
```bash
# Para trabajar solo con la API
.\start-dev.ps1 -BackendOnly    # Windows
./start-dev.sh --backend-only   # Unix/Linux/macOS

# Resultado: Solo backend funcionando
# Backend: http://localhost:8000/
# API Docs: http://localhost:8000/api/docs/
```

### **3. Solo Frontend (UI)**
```bash
# Para trabajar solo con la interfaz
.\start-dev.ps1 -FrontendOnly   # Windows
./start-dev.sh --frontend-only  # Unix/Linux/macOS

# Resultado: Solo frontend funcionando
# Frontend: http://localhost:3000/
# Nota: Requiere backend funcionando para API
```

---

## 🔧 **Personalización**

### **Cambiar Puertos**
Si necesitas cambiar los puertos, edita los scripts:

**Windows (start-dev.ps1):**
```powershell
# Línea ~200: Cambiar puerto backend
python manage.py runserver 8001

# Línea ~250: Cambiar puerto frontend
npm run dev -- -p 3001
```

**Unix/Linux/macOS (start-dev.sh):**
```bash
# Línea ~200: Cambiar puerto backend
python manage.py runserver 8001

# Línea ~250: Cambiar puerto frontend
npm run dev -- -p 3001
```

### **Agregar Verificaciones**
Puedes agregar verificaciones adicionales en las funciones `Start-Backend` y `Start-Frontend`.

---

## 📊 **Estadísticas del Script**

- **✅ Verificaciones**: 15+ verificaciones automáticas
- **🚀 Servicios**: 2 servicios (Backend + Frontend)
- **🌐 Rutas**: 20+ rutas documentadas
- **🔧 Configuración**: Automática
- **📚 Documentación**: Integrada
- **🎨 Colores**: Interfaz colorida y amigable

---

## 🎉 **Beneficios**

1. **⚡ Inicio Rápido**: Un comando para todo el sistema
2. **🔍 Verificación Automática**: Detecta problemas antes de iniciar
3. **📚 Información Completa**: Muestra todas las rutas disponibles
4. **🚨 Manejo de Errores**: Mensajes claros y soluciones
5. **🎨 Interfaz Amigable**: Colores y emojis para mejor experiencia
6. **🔄 Flexibilidad**: Opciones para iniciar servicios individuales
7. **📱 Multiplataforma**: Funciona en Windows, Linux y macOS

---

## 🚀 **Próximos Pasos**

1. **Ejecuta el script** desde la raíz del proyecto
2. **Verifica que ambos servicios** estén funcionando
3. **Accede a las rutas** mostradas en el script
4. **Prueba la autenticación** con las credenciales
5. **Explora la documentación** en `/docs/`

---

*Scripts de Inicio Rápido v1.0 - Nex-Fit*  
*Última actualización: Agosto 2024*
