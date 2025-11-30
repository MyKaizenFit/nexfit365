# 📚 Documentación de API - Nex-Fit

## 📋 Resumen

Esta guía proporciona documentación completa de la API REST de Nex-Fit, incluyendo todos los endpoints, esquemas de datos, códigos de error y ejemplos de uso.

## 🏗️ Información General de la API

### **Base URL**
```
Producción: https://mykaizenfit-backend.onrender.com/api
Desarrollo: http://localhost:8000/api
```

### **Autenticación**
- **Tipo**: JWT (JSON Web Token)
- **Header**: `Authorization: Bearer <access_token>`
- **Refresh Token**: Para renovar tokens expirados

### **Formato de Respuesta**
```json
{
  "data": {},
  "message": "Success",
  "status": 200
}
```

### **Códigos de Estado HTTP**
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error

## 🔐 Autenticación

### **POST /auth/login/**
Iniciar sesión de usuario

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response 200:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "username": "testuser",
    "email": "user@example.com",
    "first_name": "Test",
    "last_name": "User",
    "role": "user",
    "is_active": true,
    "date_joined": "2024-01-01T00:00:00Z"
  }
}
```

**Response 401:**
```json
{
  "error": "Invalid credentials",
  "message": "The provided email or password is incorrect"
}
```

### **POST /auth/register/**
Registrar nuevo usuario

**Request Body:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "password123",
  "confirm_password": "password123",
  "first_name": "New",
  "last_name": "User"
}
```

**Response 201:**
```json
{
  "user": {
    "id": 2,
    "username": "newuser",
    "email": "newuser@example.com",
    "first_name": "New",
    "last_name": "User",
    "role": "user",
    "is_active": true,
    "date_joined": "2024-01-01T00:00:00Z"
  },
  "message": "User created successfully"
}
```

**Response 400:**
```json
{
  "error": "Validation error",
  "details": {
    "email": ["This field is required"],
    "password": ["This password is too short"]
  }
}
```

### **POST /auth/refresh/**
Renovar token de acceso

**Request Body:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response 200:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

### **POST /auth/logout/**
Cerrar sesión

**Request Body:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

**Response 205:**
```json
{
  "message": "Successfully logged out"
}
```

### **GET /auth/me/**
Obtener información del usuario actual

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "id": 1,
  "username": "testuser",
  "email": "user@example.com",
  "first_name": "Test",
  "last_name": "User",
  "role": "user",
  "profile_picture": "https://example.com/profile.jpg",
  "date_of_birth": "1990-01-01",
  "height": 175.5,
  "weight": 70.0,
  "fitness_goals": {
    "primary_goal": "weight_loss",
    "target_weight": 65.0,
    "activity_level": "moderate"
  },
  "is_verified": true,
  "date_joined": "2024-01-01T00:00:00Z"
}
```

## 🏋️ Entrenamientos

### **GET /workouts/programs/**
Listar programas de entrenamiento

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (int): Número de página (default: 1)
- `page_size` (int): Tamaño de página (default: 20)
- `difficulty` (string): Filtrar por dificultad (beginner, intermediate, advanced)
- `search` (string): Buscar por nombre
- `tags` (string): Filtrar por tags (separados por coma)

**Response 200:**
```json
{
  "count": 25,
  "next": "http://api.example.com/workouts/programs/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "Beginner Strength Program",
      "description": "A comprehensive strength training program for beginners",
      "difficulty": "beginner",
      "duration_weeks": 8,
      "created_by": 1,
      "created_by_name": "Test User",
      "is_public": true,
      "tags": ["strength", "beginner", "full-body"],
      "exercises": [
        {
          "id": 1,
          "name": "Push-ups",
          "sets": 3,
          "reps": 10,
          "rest_seconds": 60
        }
      ],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### **POST /workouts/programs/**
Crear programa de entrenamiento

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "My Custom Program",
  "description": "A custom workout program",
  "difficulty": "intermediate",
  "duration_weeks": 6,
  "is_public": false,
  "tags": ["strength", "cardio"],
  "exercises": [
    {
      "name": "Squats",
      "sets": 4,
      "reps": 12,
      "rest_seconds": 90,
      "notes": "Keep your back straight"
    }
  ]
}
```

**Response 201:**
```json
{
  "id": 2,
  "name": "My Custom Program",
  "description": "A custom workout program",
  "difficulty": "intermediate",
  "duration_weeks": 6,
  "created_by": 1,
  "is_public": false,
  "tags": ["strength", "cardio"],
  "exercises": [
    {
      "id": 1,
      "name": "Squats",
      "sets": 4,
      "reps": 12,
      "rest_seconds": 90,
      "notes": "Keep your back straight"
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### **GET /workouts/programs/{id}/**
Obtener programa de entrenamiento específico

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "id": 1,
  "name": "Beginner Strength Program",
  "description": "A comprehensive strength training program for beginners",
  "difficulty": "beginner",
  "duration_weeks": 8,
  "created_by": 1,
  "created_by_name": "Test User",
  "is_public": true,
  "tags": ["strength", "beginner", "full-body"],
  "exercises": [
    {
      "id": 1,
      "name": "Push-ups",
      "sets": 3,
      "reps": 10,
      "rest_seconds": 60,
      "notes": "Keep your body straight"
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### **PUT /workouts/programs/{id}/**
Actualizar programa de entrenamiento

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Updated Program Name",
  "description": "Updated description",
  "difficulty": "advanced",
  "duration_weeks": 10
}
```

**Response 200:**
```json
{
  "id": 1,
  "name": "Updated Program Name",
  "description": "Updated description",
  "difficulty": "advanced",
  "duration_weeks": 10,
  "created_by": 1,
  "is_public": true,
  "tags": ["strength", "beginner", "full-body"],
  "exercises": [],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T12:00:00Z"
}
```

### **DELETE /workouts/programs/{id}/**
Eliminar programa de entrenamiento

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 204:**
```
No Content
```

### **GET /workouts/sessions/**
Listar sesiones de entrenamiento

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (int): Número de página
- `page_size` (int): Tamaño de página
- `program` (int): Filtrar por programa
- `date_from` (date): Fecha desde (YYYY-MM-DD)
- `date_to` (date): Fecha hasta (YYYY-MM-DD)
- `completed` (boolean): Filtrar por completado

**Response 200:**
```json
{
  "count": 50,
  "next": "http://api.example.com/workouts/sessions/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "user": 1,
      "program": 1,
      "program_name": "Beginner Strength Program",
      "date": "2024-01-01",
      "duration_minutes": 60,
      "notes": "Great workout!",
      "completed": true,
      "exercises_completed": [
        {
          "exercise_name": "Push-ups",
          "sets_completed": 3,
          "reps_completed": 10,
          "weight_used": null
        }
      ],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### **POST /workouts/sessions/**
Crear sesión de entrenamiento

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "program": 1,
  "date": "2024-01-01",
  "duration_minutes": 60,
  "notes": "Great workout!",
  "completed": true,
  "exercises_completed": [
    {
      "exercise_name": "Push-ups",
      "sets_completed": 3,
      "reps_completed": 10,
      "weight_used": null
    }
  ]
}
```

**Response 201:**
```json
{
  "id": 1,
  "user": 1,
  "program": 1,
  "program_name": "Beginner Strength Program",
  "date": "2024-01-01",
  "duration_minutes": 60,
  "notes": "Great workout!",
  "completed": true,
  "exercises_completed": [
    {
      "exercise_name": "Push-ups",
      "sets_completed": 3,
      "reps_completed": 10,
      "weight_used": null
    }
  ],
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

## 🥗 Nutrición

### **GET /nutrition/plans/**
Listar planes nutricionales

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "count": 5,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "user": 1,
      "name": "Weight Loss Plan",
      "daily_calories": 1800,
      "protein_goal": 135,
      "carbs_goal": 180,
      "fat_goal": 60,
      "start_date": "2024-01-01",
      "end_date": null,
      "is_active": true,
      "preferences": {
        "diet_type": "balanced",
        "allergies": ["nuts"],
        "dislikes": ["fish"]
      },
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### **POST /nutrition/plans/**
Crear plan nutricional

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "My Nutrition Plan",
  "daily_calories": 2000,
  "protein_goal": 150,
  "carbs_goal": 200,
  "fat_goal": 80,
  "start_date": "2024-01-01",
  "end_date": "2024-03-01",
  "preferences": {
    "diet_type": "balanced",
    "allergies": ["nuts"],
    "dislikes": ["fish"]
  }
}
```

**Response 201:**
```json
{
  "id": 2,
  "user": 1,
  "name": "My Nutrition Plan",
  "daily_calories": 2000,
  "protein_goal": 150,
  "carbs_goal": 200,
  "fat_goal": 80,
  "start_date": "2024-01-01",
  "end_date": "2024-03-01",
  "is_active": true,
  "preferences": {
    "diet_type": "balanced",
    "allergies": ["nuts"],
    "dislikes": ["fish"]
  },
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### **GET /nutrition/meals/**
Listar comidas

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (int): Número de página
- `page_size` (int): Tamaño de página
- `date` (date): Filtrar por fecha (YYYY-MM-DD)
- `meal_type` (string): Filtrar por tipo (breakfast, lunch, dinner, snack)

**Response 200:**
```json
{
  "count": 100,
  "next": "http://api.example.com/nutrition/meals/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "user": 1,
      "date": "2024-01-01",
      "meal_type": "breakfast",
      "foods": [
        {
          "name": "Oatmeal",
          "quantity": 100,
          "unit": "g",
          "calories": 350,
          "protein": 12,
          "carbs": 60,
          "fat": 6
        }
      ],
      "total_calories": 350,
      "protein_grams": 12,
      "carbs_grams": 60,
      "fat_grams": 6,
      "notes": "Healthy breakfast",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### **POST /nutrition/meals/**
Crear comida

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "date": "2024-01-01",
  "meal_type": "breakfast",
  "foods": [
    {
      "name": "Oatmeal",
      "quantity": 100,
      "unit": "g",
      "calories": 350,
      "protein": 12,
      "carbs": 60,
      "fat": 6
    }
  ],
  "notes": "Healthy breakfast"
}
```

**Response 201:**
```json
{
  "id": 1,
  "user": 1,
  "date": "2024-01-01",
  "meal_type": "breakfast",
  "foods": [
    {
      "name": "Oatmeal",
      "quantity": 100,
      "unit": "g",
      "calories": 350,
      "protein": 12,
      "carbs": 60,
      "fat": 6
    }
  ],
  "total_calories": 350,
  "protein_grams": 12,
  "carbs_grams": 60,
  "fat_grams": 6,
  "notes": "Healthy breakfast",
  "created_at": "2024-01-01T00:00:00Z"
}
```

## 📊 Progreso

### **GET /progress/photos/**
Listar fotos de progreso

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (int): Número de página
- `page_size` (int): Tamaño de página
- `category` (string): Filtrar por categoría (front, side, back)
- `date_from` (date): Fecha desde
- `date_to` (date): Fecha hasta

**Response 200:**
```json
{
  "count": 20,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "user": 1,
      "date": "2024-01-01",
      "photo": "https://example.com/progress_photos/photo1.jpg",
      "category": "front",
      "notes": "Progress photo for January",
      "is_public": false,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### **POST /progress/photos/**
Subir foto de progreso

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: multipart/form-data
```

**Request Body:**
```
photo: (file) - Archivo de imagen
category: "front" - Categoría de la foto
notes: "Progress photo for January" - Notas opcionales
```

**Response 201:**
```json
{
  "id": 1,
  "user": 1,
  "date": "2024-01-01",
  "photo": "https://example.com/progress_photos/photo1.jpg",
  "category": "front",
  "notes": "Progress photo for January",
  "is_public": false,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### **GET /progress/measurements/**
Listar medidas corporales

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "count": 30,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "user": 1,
      "date": "2024-01-01",
      "weight": 70.5,
      "chest": 95.0,
      "waist": 80.0,
      "hips": 95.0,
      "biceps": 32.0,
      "thighs": 55.0,
      "calves": 35.0,
      "body_fat_percentage": 15.5,
      "muscle_mass_percentage": 45.0,
      "notes": "Monthly measurements",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### **POST /progress/measurements/**
Registrar medidas corporales

**Headers:**
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "date": "2024-01-01",
  "weight": 70.5,
  "chest": 95.0,
  "waist": 80.0,
  "hips": 95.0,
  "biceps": 32.0,
  "thighs": 55.0,
  "calves": 35.0,
  "body_fat_percentage": 15.5,
  "muscle_mass_percentage": 45.0,
  "notes": "Monthly measurements"
}
```

**Response 201:**
```json
{
  "id": 1,
  "user": 1,
  "date": "2024-01-01",
  "weight": 70.5,
  "chest": 95.0,
  "waist": 80.0,
  "hips": 95.0,
  "biceps": 32.0,
  "thighs": 55.0,
  "calves": 35.0,
  "body_fat_percentage": 15.5,
  "muscle_mass_percentage": 45.0,
  "notes": "Monthly measurements",
  "created_at": "2024-01-01T00:00:00Z"
}
```

## 📈 Dashboard y Estadísticas

### **GET /user-stats/**
Obtener estadísticas del usuario

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "total_workouts": 25,
  "total_workout_time": 1500,
  "total_calories_burned": 12500,
  "total_calories_consumed": 45000,
  "current_weight": 70.5,
  "target_weight": 65.0,
  "weight_change": -2.5,
  "achievements_unlocked": 8,
  "streak_days": 15,
  "last_workout": "2024-01-15",
  "last_meal": "2024-01-15",
  "weekly_stats": {
    "workouts": 4,
    "calories_burned": 2000,
    "calories_consumed": 14000
  },
  "monthly_stats": {
    "workouts": 16,
    "calories_burned": 8000,
    "calories_consumed": 56000
  }
}
```

### **GET /progress-stats/dashboard/**
Obtener estadísticas de progreso para el dashboard

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "weight_progress": [
    {
      "date": "2024-01-01",
      "weight": 73.0
    },
    {
      "date": "2024-01-15",
      "weight": 70.5
    }
  ],
  "workout_progress": [
    {
      "date": "2024-01-01",
      "workouts": 1,
      "duration": 60
    },
    {
      "date": "2024-01-15",
      "workouts": 1,
      "duration": 75
    }
  ],
  "nutrition_progress": [
    {
      "date": "2024-01-01",
      "calories": 2000,
      "protein": 150,
      "carbs": 200,
      "fat": 80
    }
  ]
}
```

## 🏆 Logros

### **GET /achievements/**
Listar logros disponibles

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "count": 50,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "First Workout",
      "description": "Complete your first workout",
      "icon": "🏋️",
      "category": "workout",
      "criteria": {
        "workouts_completed": 1
      },
      "points": 10,
      "rarity": "common",
      "is_active": true
    }
  ]
}
```

### **GET /achievements/my/**
Obtener logros del usuario

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "count": 8,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "achievement": {
        "id": 1,
        "name": "First Workout",
        "description": "Complete your first workout",
        "icon": "🏋️",
        "category": "workout",
        "points": 10
      },
      "unlocked_at": "2024-01-01T00:00:00Z",
      "progress": 100
    }
  ],
  "total_points": 80,
  "level": 2
}
```

## 🔔 Notificaciones

### **GET /notifications/**
Listar notificaciones del usuario

**Headers:**
```
Authorization: Bearer <access_token>
```

**Query Parameters:**
- `page` (int): Número de página
- `page_size` (int): Tamaño de página
- `type` (string): Filtrar por tipo
- `read` (boolean): Filtrar por leídas/no leídas

**Response 200:**
```json
{
  "count": 25,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "type": "workout",
      "title": "Workout Reminder",
      "message": "Don't forget your workout today!",
      "data": {
        "workout_id": 1,
        "scheduled_time": "18:00"
      },
      "read_at": null,
      "created_at": "2024-01-15T10:00:00Z",
      "expires_at": "2024-01-16T10:00:00Z"
    }
  ]
}
```

### **POST /notifications/{id}/mark-read/**
Marcar notificación como leída

**Headers:**
```
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "message": "Notification marked as read"
}
```

## 🚨 Códigos de Error

### **400 Bad Request**
```json
{
  "error": "Validation error",
  "message": "The request data is invalid",
  "details": {
    "field_name": ["Error message"]
  }
}
```

### **401 Unauthorized**
```json
{
  "error": "Authentication required",
  "message": "You must be logged in to access this resource"
}
```

### **403 Forbidden**
```json
{
  "error": "Permission denied",
  "message": "You don't have permission to access this resource"
}
```

### **404 Not Found**
```json
{
  "error": "Resource not found",
  "message": "The requested resource was not found"
}
```

### **429 Too Many Requests**
```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retry_after": 60
}
```

### **500 Internal Server Error**
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred. Please try again later."
}
```

## 🔧 Rate Limiting

### **Límites por Usuario**
- **Anónimo**: 60 requests/hora
- **Autenticado**: 1000 requests/hora
- **Login**: 10 requests/hora
- **Registro**: 5 requests/hora

### **Headers de Rate Limiting**
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
```

## 📚 Ejemplos de Uso

### **Ejemplo: Flujo Completo de Usuario**

```bash
# 1. Registrar usuario
curl -X POST https://api.example.com/auth/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "confirm_password": "password123",
    "first_name": "New",
    "last_name": "User"
  }'

# 2. Iniciar sesión
curl -X POST https://api.example.com/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123"
  }'

# 3. Crear plan nutricional
curl -X POST https://api.example.com/nutrition/plans/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Plan",
    "daily_calories": 2000,
    "protein_goal": 150,
    "carbs_goal": 200,
    "fat_goal": 80
  }'

# 4. Crear programa de entrenamiento
curl -X POST https://api.example.com/workouts/programs/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Program",
    "description": "A custom program",
    "difficulty": "beginner",
    "duration_weeks": 4
  }'

# 5. Registrar sesión de entrenamiento
curl -X POST https://api.example.com/workouts/sessions/ \
  -H "Authorization: Bearer <access_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "program": 1,
    "date": "2024-01-15",
    "duration_minutes": 60,
    "completed": true
  }'

# 6. Obtener estadísticas
curl -X GET https://api.example.com/user-stats/ \
  -H "Authorization: Bearer <access_token>"
```

## 🔗 Enlaces Útiles

- **Swagger UI**: https://mykaizenfit-backend.onrender.com/api/docs/
- **ReDoc**: https://mykaizenfit-backend.onrender.com/api/redoc/
- **OpenAPI Spec**: https://mykaizenfit-backend.onrender.com/api/schema/

---

*Documentación de API v1.0 - Nex-Fit*  
*Última actualización: Diciembre 2024*
