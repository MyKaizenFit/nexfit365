# 🏗️ Arquitectura del Sistema - Nex-Fit

## 📋 Resumen

Esta documentación describe la arquitectura completa del sistema Nex-Fit, incluyendo patrones de diseño, flujos de datos, decisiones técnicas y estrategias de escalabilidad.

## 🎯 Principios Arquitectónicos

### **1. Separación de Responsabilidades**
- **Frontend**: Interfaz de usuario y experiencia del cliente
- **Backend**: Lógica de negocio y gestión de datos
- **Base de Datos**: Almacenamiento persistente y consultas

### **2. Escalabilidad Horizontal**
- Servicios independientes y desacoplados
- Capacidad de escalar componentes individualmente
- Diseño stateless para facilitar replicación

### **3. Seguridad por Diseño**
- Autenticación JWT distribuida
- Validación en múltiples capas
- Principio de menor privilegio

### **4. Observabilidad**
- Logging estructurado
- Métricas de performance
- Trazabilidad de requests

## 🏗️ Arquitectura General

### **Diagrama de Alto Nivel**
```
┌─────────────────────────────────────────────────────────────────┐
│                        Nex-Fit System                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │   Frontend  │    │   Backend   │    │   Database  │        │
│  │   (Vercel)  │◄──►│  (Render)   │◄──►│   (Neon)    │        │
│  │   Next.js   │    │   Django    │    │ PostgreSQL  │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐        │
│  │     CDN     │    │   Cache     │    │  Monitoring │        │
│  │   (Vercel)  │    │  (Redis)    │    │  (Sentry)   │        │
│  └─────────────┘    └─────────────┘    └─────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### **Stack Tecnológico**
```
Frontend:
├── Next.js 14 (React 18)
├── TypeScript 5.0
├── Tailwind CSS 3.3
├── Shadcn/ui
├── React Query (TanStack Query)
└── Zustand (State Management)

Backend:
├── Django 4.2 LTS
├── Django REST Framework 3.14
├── PostgreSQL 15
├── Redis 7
├── Celery (Task Queue)
└── Gunicorn (WSGI Server)

Infrastructure:
├── Vercel (Frontend Hosting)
├── Render (Backend Hosting)
├── Neon (Database)
├── Sentry (Error Monitoring)
└── GitHub Actions (CI/CD)
```

## 🎨 Arquitectura Frontend

### **Estructura de Componentes**
```
frontend/
├── app/                    # App Router (Next.js 14)
│   ├── (auth)/            # Grupo de rutas de autenticación
│   ├── dashboard/         # Dashboard principal
│   ├── admin/             # Panel de administración
│   └── api/               # API Routes
├── components/            # Componentes reutilizables
│   ├── ui/               # Componentes base (Shadcn/ui)
│   ├── dashboard/        # Componentes específicos del dashboard
│   ├── forms/            # Formularios
│   └── charts/           # Gráficos y visualizaciones
├── hooks/                # Custom hooks
├── lib/                  # Utilidades y servicios
├── contexts/             # Context providers
└── types/                # Definiciones TypeScript
```

### **Patrones de Diseño Implementados**

#### **1. Component Composition Pattern**
```typescript
// Composición de componentes para flexibilidad
<Card>
  <CardHeader>
    <CardTitle>Workout Progress</CardTitle>
  </CardHeader>
  <CardContent>
    <WorkoutChart data={workoutData} />
  </CardContent>
  <CardFooter>
    <WorkoutActions onEdit={handleEdit} onDelete={handleDelete} />
  </CardFooter>
</Card>
```

#### **2. Custom Hooks Pattern**
```typescript
// Encapsulación de lógica de estado y efectos
export function useWorkouts() {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchWorkouts = useCallback(async () => {
    // Lógica de fetching
  }, [])

  return { workouts, loading, error, fetchWorkouts }
}
```

#### **3. Service Layer Pattern**
```typescript
// Abstracción de la lógica de API
export class WorkoutService {
  static async getWorkouts(): Promise<Workout[]> {
    const response = await api.get('/workouts/programs/')
    return response.data.results
  }

  static async createWorkout(data: CreateWorkoutData): Promise<Workout> {
    const response = await api.post('/workouts/programs/', data)
    return response.data
  }
}
```

### **Gestión de Estado**

#### **1. Context API para Estado Global**
```typescript
// Contexto de autenticación
export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Lógica de autenticación
  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

#### **2. Local State con useState/useReducer**
```typescript
// Estado local para componentes específicos
function WorkoutForm() {
  const [formData, setFormData] = useState<WorkoutFormData>({
    name: '',
    description: '',
    difficulty: 'beginner'
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    // Lógica de envío
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* Formulario */}
    </form>
  )
}
```

### **Optimizaciones de Performance**

#### **1. Code Splitting**
```typescript
// Lazy loading de componentes
const AdminPanel = lazy(() => import('@/components/admin/AdminPanel'))
const WorkoutEditor = lazy(() => import('@/components/workouts/WorkoutEditor'))
```

#### **2. Memoización**
```typescript
// Memoización de componentes costosos
const WorkoutChart = memo(({ data }: { data: WorkoutData[] }) => {
  return <Chart data={data} />
})

// Memoización de callbacks
const handleWorkoutUpdate = useCallback((id: string, data: WorkoutData) => {
  updateWorkout(id, data)
}, [updateWorkout])
```

#### **3. Virtual Scrolling**
```typescript
// Para listas grandes de datos
import { FixedSizeList as List } from 'react-window'

function WorkoutList({ workouts }: { workouts: Workout[] }) {
  const Row = ({ index, style }: { index: number; style: CSSProperties }) => (
    <div style={style}>
      <WorkoutItem workout={workouts[index]} />
    </div>
  )

  return (
    <List
      height={600}
      itemCount={workouts.length}
      itemSize={80}
    >
      {Row}
    </List>
  )
}
```

## 🔧 Arquitectura Backend

### **Estructura de Aplicaciones Django**
```
backend/
├── accounts/              # Gestión de usuarios
├── api/                   # API principal y autenticación
├── workouts/              # Módulo de entrenamientos
├── nutrition/             # Módulo de nutrición
├── progress/              # Módulo de progreso
├── achievements/          # Sistema de logros
├── notifications/         # Sistema de notificaciones
├── dashboard/             # Datos del dashboard
└── backend/               # Configuración principal
```

### **Patrones de Diseño Implementados**

#### **1. Repository Pattern**
```python
# Abstracción del acceso a datos
class WorkoutRepository:
    def __init__(self):
        self.model = WorkoutProgram
    
    def get_by_user(self, user_id: int) -> QuerySet:
        return self.model.objects.filter(created_by_id=user_id)
    
    def create(self, data: dict) -> WorkoutProgram:
        return self.model.objects.create(**data)
    
    def update(self, instance: WorkoutProgram, data: dict) -> WorkoutProgram:
        for key, value in data.items():
            setattr(instance, key, value)
        instance.save()
        return instance
```

#### **2. Service Layer Pattern**
```python
# Lógica de negocio encapsulada
class WorkoutService:
    def __init__(self):
        self.repository = WorkoutRepository()
    
    def create_workout_program(self, user_id: int, data: dict) -> WorkoutProgram:
        # Validaciones de negocio
        if not self._validate_workout_data(data):
            raise ValidationError("Invalid workout data")
        
        # Crear programa
        workout = self.repository.create({
            **data,
            'created_by_id': user_id
        })
        
        # Lógica adicional (notificaciones, etc.)
        self._send_workout_created_notification(workout)
        
        return workout
```

#### **3. Factory Pattern**
```python
# Creación de objetos complejos
class WorkoutProgramFactory:
    @staticmethod
    def create_beginner_program(user_id: int) -> WorkoutProgram:
        return WorkoutProgram.objects.create(
            name="Beginner Program",
            description="A program for beginners",
            difficulty="beginner",
            duration_weeks=4,
            created_by_id=user_id,
            exercises=[
                {"name": "Push-ups", "sets": 3, "reps": 10},
                {"name": "Squats", "sets": 3, "reps": 15}
            ]
        )
```

### **Arquitectura de API**

#### **1. ViewSets con DRF**
```python
# API RESTful con ViewSets
class WorkoutProgramViewSet(viewsets.ModelViewSet):
    queryset = WorkoutProgram.objects.all()
    serializer_class = WorkoutProgramSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['difficulty', 'is_public']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'name']
    
    def get_queryset(self):
        if self.action == 'list':
            return WorkoutProgram.objects.filter(
                Q(is_public=True) | Q(created_by=self.request.user)
            )
        return super().get_queryset()
```

#### **2. Serializers con Validación**
```python
# Serialización y validación de datos
class WorkoutProgramSerializer(serializers.ModelSerializer):
    exercises = ExerciseSerializer(many=True, required=False)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = WorkoutProgram
        fields = '__all__'
        read_only_fields = ['created_by', 'created_at', 'updated_at']
    
    def validate_duration_weeks(self, value):
        if value < 1 or value > 52:
            raise serializers.ValidationError("Duration must be between 1 and 52 weeks")
        return value
    
    def create(self, validated_data):
        exercises_data = validated_data.pop('exercises', [])
        workout = WorkoutProgram.objects.create(**validated_data)
        
        for exercise_data in exercises_data:
            Exercise.objects.create(workout=workout, **exercise_data)
        
        return workout
```

### **Gestión de Datos**

#### **1. Modelos con Relaciones**
```python
# Modelos con relaciones optimizadas
class WorkoutProgram(models.Model):
    name = models.CharField(max_length=200)
    description = models.TextField()
    difficulty = models.CharField(max_length=20, choices=DIFFICULTY_CHOICES)
    duration_weeks = models.PositiveIntegerField()
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='workout_programs')
    is_public = models.BooleanField(default=False)
    tags = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['created_by', 'is_public']),
            models.Index(fields=['difficulty']),
            models.Index(fields=['created_at']),
        ]
```

#### **2. Migraciones Optimizadas**
```python
# Migraciones con índices y optimizaciones
class Migration(migrations.Migration):
    operations = [
        migrations.AddIndex(
            model_name='workoutprogram',
            index=models.Index(fields=['created_by', 'is_public'], name='workouts_workoutprogram_user_public_idx'),
        ),
        migrations.AddIndex(
            model_name='workoutprogram',
            index=models.Index(fields=['difficulty'], name='workouts_workoutprogram_difficulty_idx'),
        ),
    ]
```

## 🗄️ Arquitectura de Base de Datos

### **Diseño de Esquema**

#### **1. Normalización**
```sql
-- Tabla principal de usuarios
CREATE TABLE accounts_customuser (
    id SERIAL PRIMARY KEY,
    username VARCHAR(150) UNIQUE NOT NULL,
    email VARCHAR(254) UNIQUE NOT NULL,
    first_name VARCHAR(150) NOT NULL,
    last_name VARCHAR(150) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tabla de programas de entrenamiento
CREATE TABLE workouts_workoutprogram (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    duration_weeks INTEGER NOT NULL,
    created_by_id INTEGER NOT NULL REFERENCES accounts_customuser(id),
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

#### **2. Índices Optimizados**
```sql
-- Índices para consultas frecuentes
CREATE INDEX idx_workoutprogram_user_public ON workouts_workoutprogram(created_by_id, is_public);
CREATE INDEX idx_workoutprogram_difficulty ON workouts_workoutprogram(difficulty);
CREATE INDEX idx_workoutprogram_created_at ON workouts_workoutprogram(created_at DESC);

-- Índices GIN para JSONB
CREATE INDEX idx_workoutprogram_tags ON workouts_workoutprogram USING GIN(tags);
```

#### **3. Particionamiento (Para Escalabilidad)**
```sql
-- Particionamiento por fecha para tablas grandes
CREATE TABLE workouts_workoutsession (
    id SERIAL,
    user_id INTEGER NOT NULL,
    program_id INTEGER NOT NULL,
    date DATE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (date);

-- Particiones por mes
CREATE TABLE workouts_workoutsession_2024_01 PARTITION OF workouts_workoutsession
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### **Estrategias de Consulta**

#### **1. Consultas Optimizadas**
```python
# Uso de select_related y prefetch_related
workouts = WorkoutProgram.objects.select_related('created_by').prefetch_related('exercises').filter(is_public=True)

# Consultas con agregaciones
from django.db.models import Count, Avg, Sum

stats = WorkoutProgram.objects.aggregate(
    total_programs=Count('id'),
    avg_duration=Avg('duration_weeks'),
    public_programs=Count('id', filter=Q(is_public=True))
)
```

#### **2. Caching de Consultas**
```python
# Cache de consultas frecuentes
from django.core.cache import cache

def get_popular_workouts():
    cache_key = 'popular_workouts'
    workouts = cache.get(cache_key)
    
    if workouts is None:
        workouts = WorkoutProgram.objects.filter(is_public=True).order_by('-created_at')[:10]
        cache.set(cache_key, workouts, 300)  # 5 minutos
    
    return workouts
```

## 🔄 Flujos de Datos

### **1. Flujo de Autenticación**
```
1. Usuario ingresa credenciales
2. Frontend envía POST /auth/login/
3. Backend valida credenciales
4. Backend genera JWT tokens
5. Frontend almacena tokens
6. Frontend incluye token en requests
7. Backend valida token en cada request
```

### **2. Flujo de Creación de Entrenamiento**
```
1. Usuario llena formulario
2. Frontend valida datos localmente
3. Frontend envía POST /workouts/programs/
4. Backend valida datos
5. Backend crea programa en BD
6. Backend envía notificación
7. Frontend actualiza UI
8. Frontend sincroniza con backend
```

### **3. Flujo de Sincronización de Datos**
```
1. Frontend detecta cambios
2. Frontend envía PATCH/PUT request
3. Backend actualiza datos
4. Backend notifica a otros clientes (WebSocket)
5. Frontend recibe confirmación
6. Frontend actualiza estado local
```

## 📊 Monitoreo y Observabilidad

### **1. Logging Estructurado**
```python
# Logging con contexto
import logging
import json

logger = logging.getLogger(__name__)

def create_workout_program(user_id: int, data: dict):
    logger.info("Creating workout program", extra={
        'user_id': user_id,
        'program_name': data.get('name'),
        'difficulty': data.get('difficulty'),
        'action': 'workout_program_created'
    })
    
    try:
        program = WorkoutProgram.objects.create(**data)
        logger.info("Workout program created successfully", extra={
            'program_id': program.id,
            'user_id': user_id
        })
        return program
    except Exception as e:
        logger.error("Failed to create workout program", extra={
            'user_id': user_id,
            'error': str(e),
            'action': 'workout_program_creation_failed'
        })
        raise
```

### **2. Métricas de Performance**
```python
# Middleware para métricas
class PerformanceMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        start_time = time.time()
        
        response = self.get_response(request)
        
        duration = time.time() - start_time
        
        # Log métricas
        logger.info("Request completed", extra={
            'path': request.path,
            'method': request.method,
            'duration': duration,
            'status_code': response.status_code
        })
        
        return response
```

### **3. Health Checks**
```python
# Health check endpoint
def health_check(request):
    health_status = {
        'status': 'healthy',
        'timestamp': timezone.now().isoformat(),
        'services': {}
    }
    
    # Check database
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
        health_status['services']['database'] = 'healthy'
    except Exception as e:
        health_status['services']['database'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
    
    # Check cache
    try:
        cache.set('health_check', 'ok', 10)
        cache.get('health_check')
        health_status['services']['cache'] = 'healthy'
    except Exception as e:
        health_status['services']['cache'] = f'unhealthy: {str(e)}'
        health_status['status'] = 'unhealthy'
    
    return JsonResponse(health_status)
```

## 🚀 Estrategias de Escalabilidad

### **1. Escalabilidad Horizontal**

#### **Frontend (Vercel)**
- **Edge Functions**: Procesamiento en edge
- **CDN Global**: Distribución de contenido
- **Auto-scaling**: Escalado automático

#### **Backend (Render)**
- **Load Balancing**: Distribución de carga
- **Auto-scaling**: Escalado basado en métricas
- **Health Checks**: Monitoreo de instancias

### **2. Escalabilidad de Base de Datos**

#### **Read Replicas**
```python
# Configuración de read replicas
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'mykaizenfit_primary',
        'HOST': 'primary-db.example.com',
        'PORT': '5432',
    },
    'read_replica': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'mykaizenfit_replica',
        'HOST': 'replica-db.example.com',
        'PORT': '5432',
    }
}

# Router para read replicas
class DatabaseRouter:
    def db_for_read(self, model, **hints):
        return 'read_replica'
    
    def db_for_write(self, model, **hints):
        return 'default'
```

#### **Sharding**
```python
# Sharding por usuario
class ShardedWorkoutProgram(models.Model):
    user_id = models.IntegerField()
    
    def save(self, *args, **kwargs):
        # Determinar shard basado en user_id
        shard = self.user_id % 4
        self._state.db = f'shard_{shard}'
        super().save(*args, **kwargs)
```

### **3. Caching Estratégico**

#### **Cache de Aplicación**
```python
# Cache de consultas frecuentes
@cache_page(60 * 15)  # 15 minutos
def get_popular_workouts(request):
    return WorkoutProgram.objects.filter(is_public=True).order_by('-created_at')[:10]
```

#### **Cache de Base de Datos**
```python
# Query cache
from django.core.cache import cache

def get_user_workouts(user_id):
    cache_key = f'user_workouts_{user_id}'
    workouts = cache.get(cache_key)
    
    if workouts is None:
        workouts = list(WorkoutProgram.objects.filter(created_by_id=user_id))
        cache.set(cache_key, workouts, 300)
    
    return workouts
```

### **4. Microservicios (Futuro)**

#### **Arquitectura de Microservicios**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Auth Service  │    │  Workout Service│
│   (Kong/Nginx)  │◄──►│   (Django)      │    │   (Django)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Nutrition      │    │   Progress      │    │  Notification   │
│  Service        │    │   Service       │    │   Service       │
│  (Django)       │    │   (Django)      │    │   (Django)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔒 Seguridad Arquitectónica

### **1. Autenticación Distribuida**
```python
# JWT con refresh tokens
class JWTAuthentication:
    def authenticate(self, request):
        token = self.get_token_from_request(request)
        if not token:
            return None
        
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user = User.objects.get(id=payload['user_id'])
            return (user, token)
        except (jwt.ExpiredSignatureError, jwt.InvalidTokenError, User.DoesNotExist):
            return None
```

### **2. Rate Limiting**
```python
# Rate limiting por usuario
from django_ratelimit.decorators import ratelimit

@ratelimit(key='user', rate='1000/h', method='ALL')
def create_workout_program(request):
    # Lógica de creación
    pass
```

### **3. Validación en Múltiples Capas**
```python
# Validación en frontend, API y base de datos
class WorkoutProgramSerializer(serializers.ModelSerializer):
    def validate_name(self, value):
        if len(value) < 3:
            raise serializers.ValidationError("Name must be at least 3 characters")
        return value
    
    def validate(self, data):
        if data['duration_weeks'] < 1:
            raise serializers.ValidationError("Duration must be at least 1 week")
        return data
```

## 📈 Métricas y KPIs

### **1. Métricas de Performance**
- **Response Time**: < 200ms para 95% de requests
- **Throughput**: > 1000 requests/segundo
- **Error Rate**: < 0.1%
- **Uptime**: > 99.9%

### **2. Métricas de Negocio**
- **Usuarios Activos**: DAU/MAU
- **Engagement**: Tiempo en la aplicación
- **Retención**: Usuarios que regresan
- **Conversión**: Registros a usuarios activos

### **3. Métricas Técnicas**
- **CPU Usage**: < 70%
- **Memory Usage**: < 80%
- **Database Connections**: < 80% del pool
- **Cache Hit Rate**: > 90%

## 🔮 Roadmap de Arquitectura

### **Fase 1: Optimización Actual (Q1 2025)**
- [ ] Implementar caching avanzado
- [ ] Optimizar consultas de base de datos
- [ ] Implementar CDN para assets
- [ ] Configurar monitoreo avanzado

### **Fase 2: Escalabilidad (Q2 2025)**
- [ ] Implementar read replicas
- [ ] Configurar auto-scaling
- [ ] Implementar queue system (Celery)
- [ ] Optimizar bundle size

### **Fase 3: Microservicios (Q3 2025)**
- [ ] Separar servicios por dominio
- [ ] Implementar API Gateway
- [ ] Configurar service discovery
- [ ] Implementar circuit breakers

### **Fase 4: Avanzado (Q4 2025)**
- [ ] Implementar sharding
- [ ] Configurar multi-region
- [ ] Implementar event sourcing
- [ ] Configurar disaster recovery

---

*Documentación de Arquitectura del Sistema v1.0 - Nex-Fit*  
*Última actualización: Diciembre 2024*
