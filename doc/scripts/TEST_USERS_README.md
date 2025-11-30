# 🧪 Usuarios de Prueba - Nex-Fit

## 📋 **Descripción**

Este documento describe los usuarios de prueba disponibles para desarrollo y testing de Nex-Fit. Estos usuarios permiten probar la funcionalidad sin crear cuentas reales.

---

## 👥 **Usuarios Disponibles**

### **🔐 Usuario Cliente de Pruebas**
- **Email**: `test@mykaizenfit.com`
- **Contraseña**: `TestUser123!`
- **Rol**: `member` (cliente)
- **Permisos**: Acceso a funcionalidades de cliente
- **Uso**: Probar funcionalidades de usuario normal

### **🛡️ Admin de Pruebas**
- **Email**: `admin@example.invalid`
- **Contraseña**: `AdminTest123!`
- **Rol**: `admin`
- **Permisos**: Acceso completo a panel de administración
- **Uso**: Probar funcionalidades de administrador

---

## 🚀 **Cómo Crear los Usuarios**

### **Opción 1: Script Automático (Recomendado)**
Los usuarios se crean automáticamente al ejecutar el script de inicio:

```bash
# Windows
.\start-dev.ps1

# O manualmente desde backend/
cd backend
python create_test_users.py
```

### **Opción 2: Creación Manual**
```bash
cd backend
python manage.py shell

# En el shell de Django:
from create_test_users import create_test_users
create_test_users()
```

---

## 🎯 **Uso en el Frontend**

### **Login Automático**
El frontend incluye botones de acceso rápido para usuarios de prueba:

1. **Modo Desarrollador**: Acceso directo como usuario cliente
2. **Panel Admin**: Acceso directo como administrador

### **Credenciales Predefinidas**
Los botones de prueba usan las credenciales configuradas automáticamente.

---

## 🔧 **Configuración**

### **Archivos de Configuración**
- `backend/create_test_users.py` - Script principal
- `backend/test_users_config.py` - Configuración de usuarios
- `frontend/app/auth/page.tsx` - Botones de acceso rápido

### **Personalización**
Para cambiar las credenciales, edita `backend/test_users_config.py`:

```python
TEST_USER_CONFIG = {
    'email': 'tu-email@ejemplo.com',
    'password': 'TuContraseña123!',
    # ... otros campos
}
```

---

## 🚨 **Consideraciones de Seguridad**

### **⚠️ IMPORTANTE**
- **NO usar en producción**: Estos usuarios son solo para desarrollo
- **Contraseñas simples**: Las contraseñas son fáciles de recordar para testing
- **Acceso completo**: El admin de pruebas tiene permisos completos

### **Recomendaciones**
1. Usar solo en entornos de desarrollo
2. Cambiar contraseñas si se usan en entornos compartidos
3. No subir credenciales reales al repositorio

---

## 🧹 **Mantenimiento**

### **Actualizar Usuarios**
```bash
cd backend
python create_test_users.py
```

### **Eliminar Usuarios de Prueba**
```bash
cd backend
python manage.py shell

# En el shell:
from django.contrib.auth import get_user_model
User = get_user_model()
User.objects.filter(email__in=['test@mykaizenfit.com', 'admin@example.invalid']).delete()
```

---

## 🔍 **Troubleshooting**

### **Error: "Usuario no encontrado"**
1. Verificar que el script se ejecutó correctamente
2. Comprobar que las migraciones están aplicadas
3. Verificar la conexión a la base de datos

### **Error: "Credenciales inválidas"**
1. Verificar que la contraseña coincide
2. Comprobar que el usuario está activo
3. Verificar que no hay conflictos de roles

### **Error: "Permisos insuficientes"**
1. Verificar que el rol del usuario es correcto
2. Comprobar que `is_staff` está configurado
3. Verificar los permisos en Django

---

## 📚 **Referencias**

- [Django User Management](https://docs.djangoproject.com/en/stable/topics/auth/)
- [Custom User Model](https://docs.djangoproject.com/en/stable/topics/auth/customizing/)
- [Permissions](https://docs.djangoproject.com/en/stable/topics/auth/default/#permissions)

---

## 🎉 **Beneficios**

1. **Desarrollo Rápido**: Acceso inmediato a funcionalidades
2. **Testing Eficiente**: No necesidad de crear cuentas reales
3. **Consistencia**: Mismos usuarios en todos los entornos
4. **Seguridad**: Separación clara entre desarrollo y producción

---

*Usuarios de Prueba v1.0 - Nex-Fit*  
*Última actualización: Agosto 2024*
