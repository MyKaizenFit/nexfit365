# Explicación: Error "No active account found with the given credentials"

## ¿Qué significa este error?

El error **"No active account found with the given credentials"** (HTTP 401 Unauthorized) significa que el backend de Django **no pudo autenticar al usuario** con las credenciales proporcionadas (email y contraseña).

Este error es generado por **Django REST Framework SimpleJWT** cuando intenta validar las credenciales en el endpoint `/api/auth/login/`.

---

## ¿Qué puede provocar este error?

Hay **varias causas posibles**. Te explico cada una:

### 1. ❌ **El usuario NO existe en la base de datos**

**Causa:** La base de datos de desarrollo está vacía o el usuario nunca fue creado.

**Cómo detectarlo:**
- El usuario no aparece en la tabla `accounts_customuser`
- No hay registros en la base de datos de desarrollo

**Solución:**
```bash
# Crear el usuario administrador
sudo bash /srv/mykaizenfit/pro/crear_usuario_admin.sh

# O copiar todos los datos de producción
sudo bash /srv/mykaizenfit/pro/verificar_y_copiar_datos.sh
```

---

### 2. ❌ **El usuario está INACTIVO** (`is_active = False`)

**Causa:** El usuario existe pero Django lo considera inactivo. Django REST Framework SimpleJWT **rechaza usuarios inactivos** por seguridad.

**Cómo detectarlo:**
```sql
SELECT email, is_active FROM accounts_customuser WHERE email = 'admin@mykaizenfit.com';
-- Si is_active = False, ese es el problema
```

**Solución:**
```bash
# Activar el usuario mediante script
sudo bash /srv/mykaizenfit/pro/solucionar_login_dev.sh
```

O manualmente:
```python
from accounts.models import CustomUser
admin = CustomUser.objects.get(email='admin@mykaizenfit.com')
admin.is_active = True
admin.save()
```

---

### 3. ❌ **La contraseña es INCORRECTA**

**Causa:** La contraseña almacenada en la base de datos no coincide con la contraseña que estás usando.

**Cómo detectarlo:**
- Verificar el hash de la contraseña
- Intentar cambiar la contraseña

**Solución:**
```bash
# Resetear la contraseña
sudo bash /srv/mykaizenfit/pro/solucionar_login_dev.sh
```

O manualmente:
```python
from accounts.models import CustomUser
admin = CustomUser.objects.get(email='admin@mykaizenfit.com')
admin.set_password('AdminNex-Fit123!')
admin.save()
```

---

### 4. ❌ **El usuario NO tiene contraseña configurada**

**Causa:** El usuario fue creado sin contraseña o el hash de la contraseña está vacío/null.

**Cómo detectarlo:**
```sql
SELECT email, password FROM accounts_customuser WHERE email = 'admin@mykaizenfit.com';
-- Si password está vacío o es null
```

**Solución:**
```bash
# Configurar la contraseña
sudo bash /srv/mykaizenfit/pro/crear_usuario_admin.sh
```

---

### 5. ❌ **Problema con el campo `username_field`**

**Causa:** El modelo de usuario usa `email` como `USERNAME_FIELD`, pero hay un problema en la configuración o en cómo se busca el usuario.

**Cómo detectarlo:**
- Revisar la configuración de `AUTH_USER_MODEL` en `settings.py`
- Verificar que el serializer `EmailTokenObtainPairSerializer` esté usando correctamente el email

**Nota:** En este proyecto, el serializer ya está configurado para usar `email` como `username_field`:
```python
def validate(self, attrs):
    attrs["username"] = attrs.get("email")  # Convierte email a username
    return super().validate(attrs)
```

---

### 6. ❌ **Base de datos no conectada correctamente**

**Causa:** El backend no puede conectarse a la base de datos, o está conectándose a la base de datos incorrecta (producción en lugar de desarrollo).

**Cómo detectarlo:**
- Revisar los logs del backend
- Verificar las variables de entorno `DATABASE_URL` o configuración de Django
- Verificar que los contenedores estén usando la misma red Docker

**Solución:**
```bash
# Verificar logs del backend
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml logs backend

# Reiniciar el entorno
sudo bash /srv/mykaizenfit/pro/reiniciar_dev_completo.sh
```

---

### 7. ❌ **Error en el serializer de autenticación**

**Causa:** Hay un error en el código del serializer `EmailTokenObtainPairSerializer` o en la clase padre `TokenObtainPairSerializer`.

**Cómo detectarlo:**
- Revisar los logs del backend para ver errores de Python
- Verificar que el serializer esté importado correctamente

---

### 8. ❌ **Problema de sincronización entre contenedores**

**Causa:** El backend y la base de datos están en diferentes redes Docker o no pueden comunicarse.

**Cómo detectarlo:**
```bash
# Verificar que ambos contenedores estén corriendo
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml ps

# Verificar conectividad desde el backend
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py dbshell
```

---

## 🔍 Cómo diagnosticar el problema

Ejecuta este script para diagnosticar automáticamente:

```bash
sudo bash /srv/mykaizenfit/pro/diagnosticar_error_login.sh
```

Este script verificará:
1. ✅ Si el backend está corriendo
2. ✅ Si la base de datos está conectada
3. ✅ Si el usuario existe
4. ✅ Si el usuario está activo
5. ✅ Si el usuario tiene contraseña
6. ✅ Si la contraseña es correcta
7. ✅ Los logs del backend

---

## 🛠️ Solución rápida

### Opción 1: Crear/Resetear usuario admin

```bash
sudo bash /srv/mykaizenfit/pro/crear_usuario_admin.sh
```

Este script:
- Crea el usuario si no existe
- Resetea la contraseña a `AdminNex-Fit123!`
- Activa el usuario (`is_active = True`)
- Configura permisos de administrador

### Opción 2: Copiar datos de producción

Si quieres trabajar con todos los usuarios y datos reales:

```bash
sudo bash /srv/mykaizenfit/pro/verificar_y_copiar_datos.sh
```

### Opción 3: Solución interactiva

```bash
sudo bash /srv/mykaizenfit/pro/solucionar_login_dev.sh
```

Este script te guía paso a paso para resolver el problema.

---

## 📋 Verificación manual

Si prefieres verificar manualmente, ejecuta:

```bash
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml exec backend python manage.py shell
```

Y luego en el shell de Python:

```python
from accounts.models import CustomUser

# Verificar si existe
try:
    admin = CustomUser.objects.get(email='admin@mykaizenfit.com')
    print(f"✅ Usuario existe")
    print(f"   Email: {admin.email}")
    print(f"   is_active: {admin.is_active}")
    print(f"   is_staff: {admin.is_staff}")
    print(f"   is_superuser: {admin.is_superuser}")
    
    # Verificar contraseña
    if admin.check_password('AdminNex-Fit123!'):
        print("✅ Contraseña correcta")
    else:
        print("❌ Contraseña incorrecta")
        admin.set_password('AdminNex-Fit123!')
        admin.save()
        print("✅ Contraseña reseteada")
    
    # Activar usuario
    if not admin.is_active:
        admin.is_active = True
        admin.save()
        print("✅ Usuario activado")
        
except CustomUser.DoesNotExist:
    print("❌ Usuario no existe")
    # Crear usuario
    admin = CustomUser.objects.create_superuser(
        email='admin@mykaizenfit.com',
        password='AdminNex-Fit123!',
        first_name='Administrador',
        last_name='Nex-Fit',
    )
    print("✅ Usuario creado")
```

---

## 📝 Notas importantes

1. **El backend debe estar corriendo** para que el login funcione
2. **La base de datos debe estar conectada** y accesible
3. **El usuario debe tener `is_active = True`** - Django rechaza usuarios inactivos por seguridad
4. **Las contraseñas en Django se almacenan como hash** - nunca se guarda la contraseña en texto plano
5. **El email debe coincidir exactamente** - puede haber diferencias de mayúsculas/minúsculas o espacios

---

## 🔗 Referencias

- [Django REST Framework SimpleJWT Documentation](https://django-rest-framework-simplejwt.readthedocs.io/)
- [Django Authentication Documentation](https://docs.djangoproject.com/en/stable/topics/auth/)

