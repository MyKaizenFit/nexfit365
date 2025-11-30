# 🔗 Testing de Integración API - Nex-Fit

## 📋 Resumen

Esta guía cubre las estrategias de testing de integración entre el frontend Next.js y el backend Django, incluyendo tests de endpoints, flujos completos y comunicación entre servicios.

## 🏗️ Arquitectura de Testing de Integración

### **Stack de Testing**
- **Frontend**: Jest + React Testing Library + MSW
- **Backend**: pytest + Django TestCase
- **Comunicación**: HTTP requests reales o mockeadas
- **Base de Datos**: PostgreSQL de testing
- **Mocking**: MSW para interceptar requests

### **Tipos de Tests de Integración**
1. **API Contract Tests** - Verificar contratos entre frontend y backend
2. **End-to-End API Tests** - Flujos completos de API
3. **Authentication Flow Tests** - Flujos de autenticación
4. **Data Flow Tests** - Flujo de datos entre servicios
5. **Error Handling Tests** - Manejo de errores de API

## ⚙️ Configuración

### **1. Configuración de Base de Datos de Testing**
```python
# backend/test_settings.py
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'mykaizenfit_test',
        'USER': 'postgres',
        'PASSWORD': 'postgres',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}

# Configuración para tests de integración
TEST_RUNNER = 'django.test.runner.DiscoverRunner'
```

### **2. Configuración de MSW para Frontend**
```typescript
// frontend/__tests__/mocks/handlers.ts
import { rest } from 'msw'

export const handlers = [
  // Auth endpoints
  rest.post('/api/auth/login/', async (req, res, ctx) => {
    const { email, password } = await req.json()
    
    // Simular validación de credenciales
    if (email === 'test@example.com' && password === 'password123') {
      return res(
        ctx.json({
          access: 'mock-access-token',
          refresh: 'mock-refresh-token',
          user: {
            id: 1,
            username: 'testuser',
            email: 'test@example.com',
            first_name: 'Test',
            last_name: 'User',
            role: 'user',
          },
        })
      )
    }
    
    return res(
      ctx.status(401),
      ctx.json({ error: 'Invalid credentials' })
    )
  }),

  // Workout endpoints
  rest.get('/api/workouts/programs/', (req, res, ctx) => {
    return res(
      ctx.json({
        results: [
          {
            id: 1,
            name: 'Beginner Program',
            description: 'A beginner workout program',
            difficulty: 'beginner',
            duration_weeks: 4,
            created_by: 1,
            tags: ['strength', 'cardio'],
          },
        ],
        count: 1,
        next: null,
        previous: null,
      })
    )
  }),

  rest.post('/api/workouts/programs/', async (req, res, ctx) => {
    const data = await req.json()
    
    // Simular validación del backend
    if (!data.name || !data.description) {
      return res(
        ctx.status(400),
        ctx.json({ error: 'Name and description are required' })
      )
    }
    
    return res(
      ctx.status(201),
      ctx.json({
        id: 2,
        ...data,
        created_by: 1,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })
    )
  }),

  // Nutrition endpoints
  rest.get('/api/nutrition/plans/', (req, res, ctx) => {
    return res(
      ctx.json({
        results: [
          {
            id: 1,
            name: 'My Plan',
            daily_calories: 2000,
            protein_goal: 150,
            carbs_goal: 200,
            fat_goal: 80,
            user: 1,
            is_active: true,
          },
        ],
        count: 1,
      })
    )
  }),

  // Progress endpoints
  rest.get('/api/progress/photos/', (req, res, ctx) => {
    return res(
      ctx.json({
        results: [
          {
            id: 1,
            date: '2024-01-01',
            photo: '/media/progress_photos/photo1.jpg',
            category: 'front',
            notes: 'Progress photo',
            user: 1,
          },
        ],
        count: 1,
      })
    )
  }),

  // User stats
  rest.get('/api/user-stats/', (req, res, ctx) => {
    return res(
      ctx.json({
        total_workouts: 10,
        total_calories_burned: 5000,
        current_weight: 70,
        target_weight: 65,
        streak_days: 5,
        achievements_unlocked: 3,
      })
    )
  }),
]
```

## 🧪 Tests de Contratos API

### **1. Tests de Esquemas de Request/Response**
```typescript
// frontend/__tests__/integration/api-contracts.test.ts
import { rest } from 'msw'
import { server } from '../mocks/server'

describe('API Contract Tests', () => {
  describe('Authentication API', () => {
    it('login endpoint returns correct schema', async () => {
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        access: expect.any(String),
        refresh: expect.any(String),
        user: {
          id: expect.any(Number),
          username: expect.any(String),
          email: expect.any(String),
          first_name: expect.any(String),
          last_name: expect.any(String),
          role: expect.any(String),
        },
      })
    })

    it('login endpoint handles invalid credentials', async () => {
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: 'invalid@example.com',
          password: 'wrongpassword',
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data).toMatchObject({
        error: expect.any(String),
      })
    })
  })

  describe('Workout API', () => {
    it('workout programs endpoint returns paginated response', async () => {
      const response = await fetch('/api/workouts/programs/')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        results: expect.any(Array),
        count: expect.any(Number),
        next: expect.any(String),
        previous: expect.any(String),
      })

      if (data.results.length > 0) {
        expect(data.results[0]).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          description: expect.any(String),
          difficulty: expect.any(String),
          duration_weeks: expect.any(Number),
          created_by: expect.any(Number),
          tags: expect.any(Array),
        })
      }
    })

    it('create workout program validates required fields', async () => {
      const response = await fetch('/api/workouts/programs/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          // Missing required fields
          difficulty: 'beginner',
        }),
      })

      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data).toMatchObject({
        error: expect.any(String),
      })
    })
  })

  describe('Nutrition API', () => {
    it('nutrition plans endpoint returns correct schema', async () => {
      const response = await fetch('/api/nutrition/plans/')
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        results: expect.any(Array),
        count: expect.any(Number),
      })

      if (data.results.length > 0) {
        expect(data.results[0]).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          daily_calories: expect.any(Number),
          protein_goal: expect.any(Number),
          carbs_goal: expect.any(Number),
          fat_goal: expect.any(Number),
          user: expect.any(Number),
          is_active: expect.any(Boolean),
        })
      }
    })
  })
})
```

## 🔄 Tests de Flujos Completos

### **1. Flujo de Autenticación Completo**
```typescript
// frontend/__tests__/integration/auth-flow.test.ts
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '@/contexts/auth-context'
import LoginPage from '@/app/auth/page'

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('Authentication Flow Integration', () => {
  it('complete login flow works end-to-end', async () => {
    const user = userEvent.setup()
    render(<LoginPage />, { wrapper: TestWrapper })

    // Fill login form
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(loginButton)

    // Wait for authentication
    await waitFor(() => {
      expect(screen.getByText('Welcome, Test User')).toBeInTheDocument()
    })

    // Verify user is authenticated
    expect(screen.getByText('Dashboard')).toBeInTheDocument()
  })

  it('handles login error gracefully', async () => {
    const user = userEvent.setup()
    render(<LoginPage />, { wrapper: TestWrapper })

    // Fill form with invalid credentials
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })

    await user.type(emailInput, 'invalid@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(loginButton)

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })

    // Verify user is not authenticated
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument()
  })

  it('token refresh works automatically', async () => {
    const user = userEvent.setup()
    render(<LoginPage />, { wrapper: TestWrapper })

    // Login first
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const loginButton = screen.getByRole('button', { name: /login/i })

    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })

    // Mock token expiration
    jest.advanceTimersByTime(3600000) // 1 hour

    // Verify token refresh happens automatically
    await waitFor(() => {
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
    })
  })
})
```

### **2. Flujo de Gestión de Entrenamientos**
```typescript
// frontend/__tests__/integration/workout-flow.test.ts
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '@/contexts/auth-context'
import Dashboard from '@/app/dashboard/page'

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('Workout Management Flow Integration', () => {
  beforeEach(async () => {
    // Mock authenticated user
    localStorage.setItem('access_token', 'mock-access-token')
    localStorage.setItem('refresh_token', 'mock-refresh-token')
  })

  it('complete workout program creation flow', async () => {
    const user = userEvent.setup()
    render(<Dashboard />, { wrapper: TestWrapper })

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Mi Progreso')).toBeInTheDocument()
    })

    // Navigate to workouts tab
    const workoutsTab = screen.getByRole('tab', { name: /entrenamientos/i })
    await user.click(workoutsTab)

    // Click create new program button
    const createButton = screen.getByRole('button', { name: /crear programa/i })
    await user.click(createButton)

    // Fill form
    const nameInput = screen.getByLabelText(/nombre/i)
    const descriptionInput = screen.getByLabelText(/descripción/i)
    const difficultySelect = screen.getByLabelText(/dificultad/i)
    const durationInput = screen.getByLabelText(/duración/i)

    await user.type(nameInput, 'My New Program')
    await user.type(descriptionInput, 'A new workout program')
    await user.selectOptions(difficultySelect, 'intermediate')
    await user.type(durationInput, '6')

    // Submit form
    const submitButton = screen.getByRole('button', { name: /guardar/i })
    await user.click(submitButton)

    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Programa creado exitosamente')).toBeInTheDocument()
    })

    // Verify program appears in list
    expect(screen.getByText('My New Program')).toBeInTheDocument()
  })

  it('workout program editing flow', async () => {
    const user = userEvent.setup()
    render(<Dashboard />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('Mi Progreso')).toBeInTheDocument()
    })

    // Navigate to workouts tab
    const workoutsTab = screen.getByRole('tab', { name: /entrenamientos/i })
    await user.click(workoutsTab)

    // Wait for programs to load
    await waitFor(() => {
      expect(screen.getByText('Beginner Program')).toBeInTheDocument()
    })

    // Click edit button
    const editButton = screen.getByRole('button', { name: /editar/i })
    await user.click(editButton)

    // Modify name
    const nameInput = screen.getByLabelText(/nombre/i)
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Program Name')

    // Save changes
    const saveButton = screen.getByRole('button', { name: /guardar/i })
    await user.click(saveButton)

    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Programa actualizado exitosamente')).toBeInTheDocument()
    })

    // Verify changes
    expect(screen.getByText('Updated Program Name')).toBeInTheDocument()
  })

  it('workout program deletion flow', async () => {
    const user = userEvent.setup()
    render(<Dashboard />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('Mi Progreso')).toBeInTheDocument()
    })

    // Navigate to workouts tab
    const workoutsTab = screen.getByRole('tab', { name: /entrenamientos/i })
    await user.click(workoutsTab)

    await waitFor(() => {
      expect(screen.getByText('Beginner Program')).toBeInTheDocument()
    })

    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /eliminar/i })
    await user.click(deleteButton)

    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /confirmar/i })
    await user.click(confirmButton)

    // Wait for success
    await waitFor(() => {
      expect(screen.getByText('Programa eliminado exitosamente')).toBeInTheDocument()
    })

    // Verify program is removed
    expect(screen.queryByText('Beginner Program')).not.toBeInTheDocument()
  })
})
```

## 📊 Tests de Flujo de Datos

### **1. Sincronización Frontend-Backend**
```typescript
// frontend/__tests__/integration/data-sync.test.ts
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '@/contexts/auth-context'
import Dashboard from '@/app/dashboard/page'

describe('Data Synchronization Integration', () => {
  it('user stats sync between frontend and backend', async () => {
    const user = userEvent.setup()
    render(<Dashboard />, { wrapper: TestWrapper })

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('Mi Progreso')).toBeInTheDocument()
    })

    // Verify stats are loaded from backend
    expect(screen.getByText('10')).toBeInTheDocument() // total_workouts
    expect(screen.getByText('5000')).toBeInTheDocument() // total_calories_burned
    expect(screen.getByText('70')).toBeInTheDocument() // current_weight

    // Simulate data update from another source
    server.use(
      rest.get('/api/user-stats/', (req, res, ctx) => {
        return res(
          ctx.json({
            total_workouts: 12,
            total_calories_burned: 6000,
            current_weight: 69,
            target_weight: 65,
            streak_days: 7,
            achievements_unlocked: 4,
          })
        )
      })
    )

    // Trigger refresh
    const refreshButton = screen.getByRole('button', { name: /actualizar/i })
    await user.click(refreshButton)

    // Wait for updated data
    await waitFor(() => {
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('6000')).toBeInTheDocument()
      expect(screen.getByText('69')).toBeInTheDocument()
    })
  })

  it('nutrition data persists across page refreshes', async () => {
    const user = userEvent.setup()
    render(<Dashboard />, { wrapper: TestWrapper })

    await waitFor(() => {
      expect(screen.getByText('Mi Progreso')).toBeInTheDocument()
    })

    // Navigate to nutrition tab
    const nutritionTab = screen.getByRole('tab', { name: /nutrición/i })
    await user.click(nutritionTab)

    // Add a meal
    const addMealButton = screen.getByRole('button', { name: /agregar comida/i })
    await user.click(addMealButton)

    const foodInput = screen.getByLabelText(/alimento/i)
    const quantityInput = screen.getByLabelText(/cantidad/i)
    const saveButton = screen.getByRole('button', { name: /guardar/i })

    await user.type(foodInput, 'Oatmeal')
    await user.type(quantityInput, '100')
    await user.click(saveButton)

    // Wait for meal to be added
    await waitFor(() => {
      expect(screen.getByText('Oatmeal')).toBeInTheDocument()
    })

    // Simulate page refresh
    window.location.reload()

    // Verify data persists
    await waitFor(() => {
      expect(screen.getByText('Oatmeal')).toBeInTheDocument()
    })
  })
})
```

## 🚨 Tests de Manejo de Errores

### **1. Tests de Errores de API**
```typescript
// frontend/__tests__/integration/error-handling.test.ts
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '@/contexts/auth-context'
import Dashboard from '@/app/dashboard/page'

describe('API Error Handling Integration', () => {
  it('handles 500 server error gracefully', async () => {
    // Mock server error
    server.use(
      rest.get('/api/user-stats/', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Internal server error' }))
      })
    )

    const user = userEvent.setup()
    render(<Dashboard />, { wrapper: TestWrapper })

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/error al cargar datos/i)).toBeInTheDocument()
    })

    // Verify retry button is available
    const retryButton = screen.getByRole('button', { name: /reintentar/i })
    expect(retryButton).toBeInTheDocument()

    // Test retry functionality
    server.use(
      rest.get('/api/user-stats/', (req, res, ctx) => {
        return res(
          ctx.json({
            total_workouts: 10,
            total_calories_burned: 5000,
            current_weight: 70,
            target_weight: 65,
            streak_days: 5,
          })
        )
      })
    )

    await user.click(retryButton)

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument()
    })
  })

  it('handles network timeout', async () => {
    // Mock network timeout
    server.use(
      rest.get('/api/user-stats/', (req, res, ctx) => {
        return res(ctx.delay(10000), ctx.json({})) // 10 second delay
      })
    )

    render(<Dashboard />, { wrapper: TestWrapper })

    // Wait for timeout message
    await waitFor(() => {
      expect(screen.getByText(/tiempo de espera agotado/i)).toBeInTheDocument()
    })
  })

  it('handles 401 unauthorized error', async () => {
    // Mock unauthorized error
    server.use(
      rest.get('/api/user-stats/', (req, res, ctx) => {
        return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }))
      })
    )

    render(<Dashboard />, { wrapper: TestWrapper })

    // Wait for redirect to login
    await waitFor(() => {
      expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument()
    })
  })

  it('handles 429 rate limiting', async () => {
    // Mock rate limiting
    server.use(
      rest.get('/api/user-stats/', (req, res, ctx) => {
        return res(
          ctx.status(429),
          ctx.json({ error: 'Too many requests', retry_after: 60 })
        )
      })
    )

    render(<Dashboard />, { wrapper: TestWrapper })

    // Wait for rate limit message
    await waitFor(() => {
      expect(screen.getByText(/demasiadas solicitudes/i)).toBeInTheDocument()
    })

    // Verify retry after time is shown
    expect(screen.getByText(/60 segundos/i)).toBeInTheDocument()
  })
})
```

## 🔧 Configuración de CI/CD

### **1. GitHub Actions para Tests de Integración**
```yaml
# .github/workflows/integration-tests.yml
name: Integration Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: mykaizenfit_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install Backend Dependencies
      run: |
        cd backend
        python -m pip install --upgrade pip
        pip install -r requirements.txt
    
    - name: Install Frontend Dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Run Backend Tests
      run: |
        cd backend
        python manage.py test --settings=test_settings
    
    - name: Run Frontend Tests
      run: |
        cd frontend
        npm test -- --coverage --watchAll=false
    
    - name: Run Integration Tests
      run: |
        cd frontend
        npm run test:integration
    
    - name: Upload Coverage Reports
      uses: codecov/codecov-action@v3
      with:
        files: ./backend/coverage.xml,./frontend/coverage/lcov.info
        flags: integration
        name: integration-coverage
```

### **2. Scripts de package.json para Integración**
```json
{
  "scripts": {
    "test:integration": "jest --testPathPattern=integration",
    "test:integration:watch": "jest --testPathPattern=integration --watch",
    "test:integration:coverage": "jest --testPathPattern=integration --coverage",
    "test:all": "npm run test && npm run test:integration"
  }
}
```

## 📊 Métricas y Reportes

### **1. Configuración de Cobertura de Integración**
```javascript
// jest.config.js
module.exports = {
  // ... other config
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75,
    },
    './__tests__/integration/': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

### **2. Reportes de Integración**
```bash
# Ejecutar tests de integración
npm run test:integration

# Generar reporte de cobertura
npm run test:integration:coverage

# Ejecutar todos los tests
npm run test:all
```

## 🔧 Mejores Prácticas

### **1. Organización de Tests**
- Separar tests unitarios de tests de integración
- Usar MSW para mockear APIs externas
- Mantener tests de integración independientes
- Usar datos de prueba consistentes

### **2. Manejo de Estado**
- Limpiar estado entre tests
- Usar factories para datos de prueba
- Mockear servicios externos
- Verificar estado final, no implementación

### **3. Assertions**
- Verificar comportamiento, no implementación
- Usar matchers específicos
- Verificar mensajes de error
- Verificar redirecciones y navegación

### **4. Performance**
- Usar `waitFor` para elementos asíncronos
- Evitar timeouts largos
- Limpiar recursos después de tests
- Usar mocks para operaciones lentas

---

*Documentación de Testing de Integración v1.0 - Nex-Fit*  
*Última actualización: Diciembre 2024*
