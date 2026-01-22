# 🔐 Protección de Datos Sensibles - Guía de Implementación

## 📋 Resumen Ejecutivo

Este documento describe cómo proteger datos sensibles en la base de datos de MyKaizenFit usando encriptación.

## 🎯 Datos a Proteger

### ✅ YA PROTEGIDOS (Django)
```
- password: Hasheada automáticamente por Django
- email: En texto plano (necesario para autenticación)
```

### 🔐 NECESITAN PROTECCIÓN
```
1. phone_number (Número de teléfono)
   - Sensibilidad: ALTA
   - Frecuencia de uso: Baja (solo contacto)
   - Impacto si se filtra: CRÍTICO

2. injuries_or_medical_issues (Información médica)
   - Sensibilidad: CRÍTICA
   - Frecuencia de uso: Media (análisis de entrenamientos)
   - Impacto si se filtra: CRÍTICO

3. disliked_foods (Alimentos no deseados)
   - Sensibilidad: MEDIA (puede incluir alergias)
   - Frecuencia de uso: Alta (planes de nutrición)
   - Impacto si se filtra: ALTO
```

### 🟡 SEMI-PÚBLICOS (No encriptar)
```
- birth_date: Necesaria para cálculos, derivable de otros datos
- height/weight: Necesarias para IMC y cálculos, no sensibles
- gender: Para clasificación, no sensible
- training_days: Para horarios, no sensible
```

---

## 🛠️ Instalación

### 1. Instalar dependencia (cryptography)

```bash
# Ya está en requirements.txt
pip install cryptography
```

### 2. Configurar clave de encriptación en Django

En `backend/settings.py`, añadir:

```python
from cryptography.fernet import Fernet

# Generar clave (una sola vez):
# ENCRYPTION_KEY = Fernet.generate_key()  # Copiar este valor

ENCRYPTION_KEY = os.getenv(
    'ENCRYPTION_KEY',
    'CAMBIAR_ESTO_EN_PRODUCCION'  # ⚠️ CRÍTICO: usar variable de entorno
)
```

### 3. Generar y guardar la clave

```bash
# Generar clave:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Output ejemplo:
# XxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxAA

# Guardar en .env:
echo "ENCRYPTION_KEY=XxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxAA" >> /srv/mykaizenfit/pro/backend/.env
```

### 4. Ejecutar script de migración

```bash
# En DESARROLLO (para probar):
cd /srv/mykaizenfit/pro/backend
python scripts/encrypt_sensitive_data.py

# En PRODUCCIÓN (cuidado):
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f /srv/mykaizenfit/pro/docker-compose.prod.yml exec -T app python scripts/encrypt_sensitive_data.py
```

---

## 📝 Uso en Código

### Encriptar al Crear/Actualizar Usuario

```python
from utils.encryption import encrypt_sensitive_field

# Al guardar
user.phone_number = encrypt_sensitive_field(user.phone_number)
user.save()
```

### Desencriptar al Leer

```python
from utils.encryption import decrypt_sensitive_field

# Al leer
phone = decrypt_sensitive_field(user.phone_number)
```

### Opción: Property en Modelo (Recomendado)

```python
# En accounts/models.py

@property
def phone_number_decrypted(self):
    if not self.phone_number:
        return None
    return decrypt_sensitive_field(self.phone_number)
```

Así el código sigue siendo seguro:
```python
phone = user.phone_number_decrypted  # Automáticamente desencriptado
```

---

## ⚠️ Consideraciones Críticas

### ✅ SEGURIDAD
- [x] Datos encriptados en reposo (BD)
- [x] Usa Fernet (AES-128, HMAC)
- [x] Clave única por instancia
- [ ] TODO: TLS para transmisión (nginx/SSL)
- [ ] TODO: Field-level permissions en BD

### 🚨 PERFORMANCE
- Encriptación/desencriptación es rápida
- NO indexar campos encriptados
- Buscar por teléfono: convertir a hash primero

### 💾 BACKUP
- La clave ENCRYPTION_KEY debe guardarse por separado
- Sin la clave, los datos encriptados son irrecuperables
- Usar: `pass` o `1password` para guardar claves

### 🔄 MIGRACIÓN DE DATOS
- El script es idempotente (seguro ejecutar múltiples veces)
- Detecta datos ya encriptados
- Permite migración progresiva

---

## 🧪 Testing

```bash
# Probar encriptación/desencriptación
cd /srv/mykaizenfit/pro/backend

python manage.py shell
>>> from utils.encryption import encrypt_sensitive_field, decrypt_sensitive_field
>>> encrypted = encrypt_sensitive_field("1234567890")
>>> decrypted = decrypt_sensitive_field(encrypted)
>>> print(decrypted)
1234567890
```

---

## 📊 Checklist de Implementación

```
PRE-PRODUCCIÓN:
- [ ] Generar clave ENCRYPTION_KEY
- [ ] Guardar clave en lugar seguro
- [ ] Configurar variable de entorno
- [ ] Probar en desarrollo
- [ ] Backup de BD antes de migración

PRODUCCIÓN:
- [ ] Hacer backup de BD
- [ ] Ejecutar script de migración
- [ ] Verificar que datos se encriptaron
- [ ] Probar lectura de datos desencriptados
- [ ] Actualizar serializers si es necesario

POST-IMPLEMENTACIÓN:
- [ ] Documentar clave (guardar segura)
- [ ] Monitorear logs de errores
- [ ] Probar recuperación de datos
- [ ] Actualizar política de privacidad
```

---

## 🔗 Próximos Pasos

1. **Encriptación de transmisión**: Configurar TLS end-to-end
2. **Hashing de búsqueda**: Para buscar sin desencriptar
3. **Audit logs**: Registrar accesos a datos sensibles
4. **GDPR compliance**: Derecho al olvido (borrado de datos)
5. **Rotación de claves**: Sistema para cambiar claves periódicamente

---

## 📞 Soporte

Si hay problemas:
1. Revisar `/srv/mykaizenfit/pro/backend/logs/` para errores
2. Asegurar que ENCRYPTION_KEY está en .env
3. Verificar que cryptography está instalada: `pip show cryptography`
