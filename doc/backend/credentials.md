# Credenciales del Usuario Administrador

## Usuario Administrador Creado

**Email:** `iagoadmin@gmail.com`  
**Contraseña:** La que configuraste durante la creación del superusuario

## Datos del Perfil

- **Nombre:** Iago Administrador
- **Teléfono:** +34 666 777 888
- **Fecha de nacimiento:** 15/05/1990
- **Género:** Masculino
- **Altura:** 180 cm
- **Peso:** 75 kg
- **Nivel de actividad:** Moderado
- **Objetivo de fitness:** Mantenimiento
- **Condiciones médicas:** Ninguna
- **Contacto de emergencia:** María García (+34 666 999 000)

## Datos Creados

### Ejercicios
- Press de banca
- Sentadilla
- Peso muerto
- Press militar
- Dominadas
- Plancha

### Plan de Entrenamiento
- **Nombre:** Plan Principiante - 4 Semanas
- **Dificultad:** Principiante
- **Objetivo:** Ganancia muscular
- **Duración:** 4 semanas
- **Días por semana:** 3

### Plan Nutricional
- **Nombre:** Plan Básico de Mantenimiento
- **Calorías diarias:** 2000
- **Proteínas:** 150g
- **Carbohidratos:** 250g
- **Grasas:** 67g

### Alimentos
- Pechuga de pollo
- Arroz blanco
- Brócoli
- Aceite de oliva
- Plátano
- Avena

### Datos de Progreso
- 30 entradas de peso (últimos 30 días)
- Mediciones corporales iniciales

## Acceso al Panel de Admin

Al iniciar sesión con este usuario, serás redirigido automáticamente al panel de administración en `/admin` donde podrás:

1. **Gestionar usuarios** - Ver, crear, editar y eliminar usuarios
2. **Ver tu perfil** - Información completa del administrador
3. **Gestionar entrenamientos** - Crear y modificar planes de entrenamiento

## Notas Importantes

- Este usuario tiene permisos de superusuario (`is_superuser = True`)
- También tiene permisos de staff (`is_staff = True`)
- Puede acceder a todas las funcionalidades del sistema
- Los datos de prueba se crearon automáticamente al ejecutar el comando `python manage.py create_admin_data`
