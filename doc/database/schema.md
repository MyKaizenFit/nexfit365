# 🗄️ Esquema de Base de Datos - Nex-Fit

## 🏗️ Arquitectura de la Base de Datos

### **Sistema de Base de Datos**
- **Motor**: PostgreSQL 15+
- **Hosting**: Neon (PostgreSQL as a Service)
- **Conexión**: SSL requerido
- **Pooling**: Connection pooling habilitado
- **Backup**: Automático diario

### **Configuración de Conexión**
```bash
# Variables de entorno
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=CHANGE_ME_DB_PASSWORD
DB_HOST=CHANGE_ME_DB_HOST
DB_PORT=5432
DB_SSLMODE=require
```

## 👥 Módulo de Usuarios (accounts)

### **CustomUser Model**
```sql
-- Tabla principal de usuarios
CREATE TABLE accounts_customuser (
    id SERIAL PRIMARY KEY,
    password VARCHAR(128) NOT NULL,
    last_login TIMESTAMP WITH TIME ZONE,
    is_superuser BOOLEAN NOT NULL,
    username VARCHAR(150) UNIQUE NOT NULL,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    is_staff BOOLEAN NOT NULL,
    is_active BOOLEAN NOT NULL,
    date_joined TIMESTAMP WITH TIME ZONE NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    profile_picture VARCHAR(100),
    date_of_birth DATE,
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    fitness_goals JSONB DEFAULT '{}',
    is_verified BOOLEAN NOT NULL DEFAULT FALSE
);

-- Índices
CREATE INDEX idx_customuser_email ON accounts_customuser(email);
CREATE INDEX idx_customuser_role ON accounts_customuser(role);
CREATE INDEX idx_customuser_is_active ON accounts_customuser(is_active);
```

### **Campos del Usuario**
- **id**: Identificador único autoincremental
- **username**: Nombre de usuario único
- **email**: Email único del usuario
- **role**: Rol del usuario (user, trainer, admin)
- **profile_picture**: Ruta a la foto de perfil
- **date_of_birth**: Fecha de nacimiento
- **height**: Altura en centímetros
- **weight**: Peso en kilogramos
- **fitness_goals**: Objetivos de fitness en formato JSON
- **is_verified**: Estado de verificación de la cuenta

## 🏋️ Módulo de Entrenamientos (workouts)

### **WorkoutProgram Model**
```sql
-- Programas de entrenamiento
CREATE TABLE workouts_workoutprogram (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    duration_weeks INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by_id INTEGER NOT NULL REFERENCES accounts_customuser(id),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    tags JSONB DEFAULT '[]',
    exercises JSONB DEFAULT '[]'
);

-- Índices
CREATE INDEX idx_workoutprogram_created_by ON workouts_workoutprogram(created_by_id);
CREATE INDEX idx_workoutprogram_difficulty ON workouts_workoutprogram(difficulty);
CREATE INDEX idx_workoutprogram_is_public ON workouts_workoutprogram(is_public);
CREATE INDEX idx_workoutprogram_tags ON workouts_workoutprogram USING GIN(tags);
```

### **WorkoutSession Model**
```sql
-- Sesiones de entrenamiento
CREATE TABLE workouts_workoutsession (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES accounts_customuser(id),
    program_id INTEGER NOT NULL REFERENCES workouts_workoutprogram(id),
    date DATE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    notes TEXT,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índices
CREATE INDEX idx_workoutsession_user ON workouts_workoutsession(user_id);
CREATE INDEX idx_workoutsession_program ON workouts_workoutsession(program_id);
CREATE INDEX idx_workoutsession_date ON workouts_workoutsession(date);
CREATE INDEX idx_workoutsession_completed ON workouts_workoutsession(completed);
```

### **Exercise Model**
```sql
-- Ejercicios individuales
CREATE TABLE workouts_exercise (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    muscle_groups JSONB DEFAULT '[]',
    equipment_needed JSONB DEFAULT '[]',
    difficulty VARCHAR(20) NOT NULL,
    instructions TEXT,
    video_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índices
CREATE INDEX idx_exercise_muscle_groups ON workouts_exercise USING GIN(muscle_groups);
CREATE INDEX idx_exercise_difficulty ON workouts_exercise(difficulty);
```

## 🥗 Módulo de Nutrición (nutrition)

### **NutritionPlan Model**
```sql
-- Planes nutricionales
CREATE TABLE nutrition_nutritionplan (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES accounts_customuser(id),
    name VARCHAR(200) NOT NULL,
    daily_calories INTEGER NOT NULL,
    protein_goal INTEGER NOT NULL,
    carbs_goal INTEGER NOT NULL,
    fat_goal INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índices
CREATE INDEX idx_nutritionplan_user ON nutrition_nutritionplan(user_id);
CREATE INDEX idx_nutritionplan_is_active ON nutrition_nutritionplan(is_active);
CREATE INDEX idx_nutritionplan_dates ON nutrition_nutritionplan(start_date, end_date);
```

### **Meal Model**
```sql
-- Comidas registradas
CREATE TABLE nutrition_meal (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES accounts_customuser(id),
    date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    foods JSONB NOT NULL,
    total_calories INTEGER NOT NULL,
    protein_grams DECIMAL(6,2),
    carbs_grams DECIMAL(6,2),
    fat_grams DECIMAL(6,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índices
CREATE INDEX idx_meal_user ON nutrition_meal(user_id);
CREATE INDEX idx_meal_date ON nutrition_meal(date);
CREATE INDEX idx_meal_type ON nutrition_meal(meal_type);
```

### **Food Database Model**
```sql
-- Base de datos de alimentos
CREATE TABLE nutrition_food (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    brand VARCHAR(200),
    serving_size VARCHAR(100) NOT NULL,
    calories_per_serving INTEGER NOT NULL,
    protein_per_serving DECIMAL(6,2),
    carbs_per_serving DECIMAL(6,2),
    fat_per_serving DECIMAL(6,2),
    fiber_per_serving DECIMAL(6,2),
    sugar_per_serving DECIMAL(6,2),
    category VARCHAR(100),
    barcode VARCHAR(50),
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índices
CREATE INDEX idx_food_name ON nutrition_food(name);
CREATE INDEX idx_food_brand ON nutrition_food(brand);
CREATE INDEX idx_food_category ON nutrition_food(category);
CREATE INDEX idx_food_barcode ON nutrition_food(barcode);
```

## 📊 Módulo de Progreso (progress)

### **ProgressPhoto Model**
```sql
-- Fotos de progreso
CREATE TABLE progress_progressphoto (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES accounts_customuser(id),
    date DATE NOT NULL,
    photo VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL,
    notes TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índices
CREATE INDEX idx_progressphoto_user ON progress_progressphoto(user_id);
CREATE INDEX idx_progressphoto_date ON progress_progressphoto(date);
CREATE INDEX idx_progressphoto_category ON progress_progressphoto(category);
```

### **BodyMeasurement Model**
```sql
-- Medidas corporales
CREATE TABLE progress_bodymeasurement (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES accounts_customuser(id),
    date DATE NOT NULL,
    weight DECIMAL(5,2),
    chest DECIMAL(5,2),
    waist DECIMAL(5,2),
    hips DECIMAL(5,2),
    biceps DECIMAL(5,2),
    thighs DECIMAL(5,2),
    calves DECIMAL(5,2),
    body_fat_percentage DECIMAL(4,2),
    muscle_mass_percentage DECIMAL(4,2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índices
CREATE INDEX idx_bodymeasurement_user ON progress_bodymeasurement(user_id);
CREATE INDEX idx_bodymeasurement_date ON progress_bodymeasurement(date);
```

### **Goal Model**
```sql
-- Objetivos de fitness
CREATE TABLE progress_goal (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES accounts_customuser(id),
    title VARCHAR(200) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    target_value DECIMAL(8,2),
    current_value DECIMAL(8,2),
    unit VARCHAR(20),
    target_date DATE,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índices
CREATE INDEX idx_goal_user ON progress_goal(user_id);
CREATE INDEX idx_goal_category ON progress_goal(category);
CREATE INDEX idx_goal_is_completed ON progress_goal(is_completed);
CREATE INDEX idx_goal_target_date ON progress_goal(target_date);
```

## 🏆 Sistema de Logros (achievements)

### **Achievement Model**
```sql
-- Logros disponibles
CREATE TABLE achievements_achievement (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    icon VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL,
    criteria JSONB NOT NULL,
    points INTEGER NOT NULL DEFAULT 0,
    rarity VARCHAR(20) NOT NULL DEFAULT 'common',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Índices
CREATE INDEX idx_achievement_category ON achievements_achievement(category);
CREATE INDEX idx_achievement_rarity ON achievements_achievement(rarity);
CREATE INDEX idx_achievement_is_active ON achievements_achievement(is_active);
```

### **UserAchievement Model**
```sql
-- Logros desbloqueados por usuario
CREATE TABLE achievements_userachievement (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES accounts_customuser(id),
    achievement_id INTEGER NOT NULL REFERENCES achievements_achievement(id),
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    progress INTEGER NOT NULL DEFAULT 0,
    UNIQUE(user_id, achievement_id)
);

-- Índices
CREATE INDEX idx_userachievement_user ON achievements_userachievement(user_id);
CREATE INDEX idx_userachievement_achievement ON achievements_userachievement(achievement_id);
CREATE INDEX idx_userachievement_unlocked_at ON achievements_userachievement(unlocked_at);
```

## 🔔 Sistema de Notificaciones (notifications)

### **Notification Model**
```sql
-- Notificaciones del sistema
CREATE TABLE notifications_notification (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES accounts_customuser(id),
    type VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Índices
CREATE INDEX idx_notification_user ON notifications_notification(user_id);
CREATE INDEX idx_notification_type ON notifications_notification(type);
CREATE INDEX idx_notification_read_at ON notifications_notification(read_at);
CREATE INDEX idx_notification_created_at ON notifications_notification(created_at);
CREATE INDEX idx_notification_expires_at ON notifications_notification(expires_at);
```

## 📊 Dashboard y Analytics (dashboard)

### **UserStats Model**
```sql
-- Estadísticas del usuario
CREATE TABLE dashboard_userstats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES accounts_customuser(id),
    date DATE NOT NULL,
    total_workouts INTEGER NOT NULL DEFAULT 0,
    total_workout_time INTEGER NOT NULL DEFAULT 0,
    total_calories_burned INTEGER NOT NULL DEFAULT 0,
    total_calories_consumed INTEGER NOT NULL DEFAULT 0,
    weight_change DECIMAL(5,2) DEFAULT 0,
    achievements_unlocked INTEGER NOT NULL DEFAULT 0,
    streak_days INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE(user_id, date)
);

-- Índices
CREATE INDEX idx_userstats_user ON dashboard_userstats(user_id);
CREATE INDEX idx_userstats_date ON dashboard_userstats(date);
```

## 🔗 Relaciones entre Tablas

### **Diagrama de Relaciones**
```
accounts_customuser (1) ←→ (N) workouts_workoutprogram
accounts_customuser (1) ←→ (N) workouts_workoutsession
accounts_customuser (1) ←→ (N) nutrition_nutritionplan
accounts_customuser (1) ←→ (N) nutrition_meal
accounts_customuser (1) ←→ (N) progress_progressphoto
accounts_customuser (1) ←→ (N) progress_bodymeasurement
accounts_customuser (1) ←→ (N) progress_goal
accounts_customuser (1) ←→ (N) achievements_userachievement
accounts_customuser (1) ←→ (N) notifications_notification
accounts_customuser (1) ←→ (N) dashboard_userstats

workouts_workoutprogram (1) ←→ (N) workouts_workoutsession
achievements_achievement (1) ←→ (N) achievements_userachievement
```

### **Restricciones de Integridad Referencial**
```sql
-- Ejemplo de restricciones
ALTER TABLE workouts_workoutsession 
ADD CONSTRAINT fk_workoutsession_user 
FOREIGN KEY (user_id) REFERENCES accounts_customuser(id) ON DELETE CASCADE;

ALTER TABLE workouts_workoutsession 
ADD CONSTRAINT fk_workoutsession_program 
FOREIGN KEY (program_id) REFERENCES workouts_workoutprogram(id) ON DELETE CASCADE;
```

## 📈 Optimizaciones de Rendimiento

### **Índices Compuestos**
```sql
-- Índices para consultas frecuentes
CREATE INDEX idx_workoutsession_user_date ON workouts_workoutsession(user_id, date DESC);
CREATE INDEX idx_meal_user_date_type ON nutrition_meal(user_id, date DESC, meal_type);
CREATE INDEX idx_progressphoto_user_category_date ON progress_progressphoto(user_id, category, date DESC);
```

### **Particionamiento (Para tablas grandes)**
```sql
-- Ejemplo de particionamiento por fecha para workouts_workoutsession
CREATE TABLE workouts_workoutsession_2024 PARTITION OF workouts_workoutsession
FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE workouts_workoutsession_2025 PARTITION OF workouts_workoutsession
FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');
```

## 🔒 Seguridad y Permisos

### **Roles de Base de Datos**
```sql
-- Crear roles específicos
CREATE ROLE mykaizenfit_app;
CREATE ROLE mykaizenfit_readonly;

-- Asignar permisos
GRANT CONNECT ON DATABASE neondb TO mykaizenfit_app;
GRANT USAGE ON SCHEMA public TO mykaizenfit_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO mykaizenfit_app;

GRANT CONNECT ON DATABASE neondb TO mykaizenfit_readonly;
GRANT USAGE ON SCHEMA public TO mykaizenfit_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mykaizenfit_readonly;
```

### **Row Level Security (RLS)**
```sql
-- Ejemplo para workouts_workoutprogram
ALTER TABLE workouts_workoutprogram ENABLE ROW LEVEL SECURITY;

CREATE POLICY workout_program_policy ON workouts_workoutprogram
    FOR ALL
    USING (
        created_by_id = current_setting('app.current_user_id')::integer
        OR is_public = true
    );
```

## 📊 Estadísticas de la Base de Datos

### **Tamaños de Tablas**
```sql
-- Consulta para obtener tamaños
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### **Índices y Rendimiento**
```sql
-- Consulta para analizar uso de índices
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

---

## 📖 Próximos Pasos

- [Migraciones](./migrations.md) - Historial de cambios en la estructura
- [Datos de Ejemplo](./sample-data.md) - Datos para testing y desarrollo
- [Backup y Restauración](./backup-restore.md) - Estrategias de backup
- [Monitoreo](./monitoring.md) - Herramientas de monitoreo

---

*Esquema de Base de Datos v1.1 - Nex-Fit*
*Última actualización: Diciembre 2024*
