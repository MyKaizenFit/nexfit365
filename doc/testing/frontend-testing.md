# 🧪 Testing Frontend - Nex-Fit

## 📋 Resumen

Esta guía cubre todas las estrategias de testing para el frontend Next.js de Nex-Fit, incluyendo tests unitarios, de componentes, de hooks y de integración.

## 🏗️ Arquitectura de Testing

### **Stack de Testing**
- **Framework**: Jest + React Testing Library
- **Testing Library**: @testing-library/react, @testing-library/jest-dom
- **Mocking**: Jest mocks + MSW (Mock Service Worker)
- **E2E**: Playwright
- **Cobertura**: Jest coverage

### **Estructura de Directorios**
```
frontend/
├── __tests__/                   # Tests globales
│   ├── setup.ts
│   ├── test-utils.tsx
│   └── mocks/
│       ├── handlers.ts
│       └── server.ts
├── app/
│   └── __tests__/              # Tests de páginas
│       ├── dashboard.test.tsx
│       ├── auth.test.tsx
│       └── admin.test.tsx
├── components/
│   └── __tests__/              # Tests de componentes
│       ├── ui/
│       ├── dashboard/
│       └── forms/
├── hooks/
│   └── __tests__/              # Tests de hooks
│       ├── use-auth.test.ts
│       ├── use-workouts.test.ts
│       └── use-nutrition.test.ts
├── lib/
│   └── __tests__/              # Tests de servicios
│       ├── api.test.ts
│       ├── auth.test.ts
│       └── utils.test.ts
└── jest.config.js
```

## ⚙️ Configuración

### **1. Instalación de Dependencias**
```bash
# Instalar dependencias de testing
npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom @types/jest msw

# Agregar a package.json
{
  "devDependencies": {
    "@testing-library/react": "^14.0.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/user-event": "^14.0.0",
    "jest": "^29.0.0",
    "jest-environment-jsdom": "^29.0.0",
    "@types/jest": "^29.0.0",
    "msw": "^2.0.0"
  }
}
```

### **2. Configuración Jest (jest.config.js)**
```javascript
// jest.config.js
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  dir: './',
})

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    'hooks/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}

module.exports = createJestConfig(customJestConfig)
```

### **3. Setup de Testing (__tests__/setup.ts)**
```typescript
// __tests__/setup.ts
import '@testing-library/jest-dom'
import { server } from './mocks/server'

// Establecer MSW server
beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

// Mock de Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
    }
  },
}))

// Mock de Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock de localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock de fetch
global.fetch = jest.fn()
```

### **4. Test Utils (__tests__/test-utils.tsx)**
```typescript
// __tests__/test-utils.tsx
import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { AuthProvider } from '@/contexts/auth-context'

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }
```

## 🧪 Tests de Componentes

### **1. Tests de Componentes UI (components/__tests__/ui/)**
```typescript
// components/__tests__/ui/button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('handles click events', () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant styles correctly', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })
})
```

### **2. Tests de Componentes de Dashboard**
```typescript
// components/__tests__/dashboard/profile-panel.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfilePanel } from '@/components/dashboard/profile-panel'
import { mockUser } from '../../__mocks__/user'

// Mock del hook useAuth
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: mockUser,
    updateProfile: jest.fn(),
    loading: false,
    error: null,
  }),
}))

describe('ProfilePanel Component', () => {
  it('renders user profile information', () => {
    render(<ProfilePanel />)
    
    expect(screen.getByText(mockUser.first_name)).toBeInTheDocument()
    expect(screen.getByText(mockUser.email)).toBeInTheDocument()
    expect(screen.getByText(mockUser.activity_level)).toBeInTheDocument()
  })

  it('shows loading state', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      updateProfile: jest.fn(),
      loading: true,
      error: null,
    })
    
    render(<ProfilePanel />)
    expect(screen.getByText('Cargando perfil...')).toBeInTheDocument()
  })

  it('handles profile update', async () => {
    const user = userEvent.setup()
    const updateProfile = jest.fn()
    
    jest.mocked(useAuth).mockReturnValue({
      user: mockUser,
      updateProfile,
      loading: false,
      error: null,
    })
    
    render(<ProfilePanel />)
    
    const editButton = screen.getByRole('button', { name: /editar/i })
    await user.click(editButton)
    
    const firstNameInput = screen.getByLabelText(/nombre/i)
    await user.clear(firstNameInput)
    await user.type(firstNameInput, 'New Name')
    
    const saveButton = screen.getByRole('button', { name: /guardar/i })
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith({
        first_name: 'New Name',
        last_name: mockUser.last_name,
        email: mockUser.email,
      })
    })
  })

  it('shows error state', () => {
    jest.mocked(useAuth).mockReturnValue({
      user: null,
      updateProfile: jest.fn(),
      loading: false,
      error: 'Error loading profile',
    })
    
    render(<ProfilePanel />)
    expect(screen.getByText('Error loading profile')).toBeInTheDocument()
  })
})
```

## 🎣 Tests de Hooks

### **1. Tests de Hook de Autenticación**
```typescript
// hooks/__tests__/use-auth.test.ts
import { renderHook, act } from '@testing-library/react'
import { useAuth } from '@/hooks/use-auth'
import { AuthProvider } from '@/contexts/auth-context'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
)

describe('useAuth Hook', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  it('initializes with no user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    expect(result.current.user).toBeNull()
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.loading).toBe(false)
  })

  it('logs in user successfully', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })
    
    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.user).toBeDefined()
  })

  it('handles login error', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      await result.current.login('invalid@example.com', 'wrongpassword')
    })
    
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.error).toBeDefined()
  })

  it('logs out user', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    // Login first
    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })
    
    expect(result.current.isAuthenticated).toBe(true)
    
    // Logout
    await act(async () => {
      await result.current.logout()
    })
    
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.user).toBeNull()
  })

  it('refreshes token automatically', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })
    
    await act(async () => {
      await result.current.login('test@example.com', 'password')
    })
    
    // Mock token expiration
    jest.advanceTimersByTime(3600000) // 1 hour
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })
    
    expect(result.current.isAuthenticated).toBe(true)
  })
})
```

### **2. Tests de Hook de Workouts**
```typescript
// hooks/__tests__/use-workouts.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useWorkouts } from '@/hooks/use-workouts'
import { server } from '../../__tests__/mocks/server'
import { rest } from 'msw'

describe('useWorkouts Hook', () => {
  it('fetches workout programs', async () => {
    const { result } = renderHook(() => useWorkouts())
    
    await waitFor(() => {
      expect(result.current.workoutPrograms).toHaveLength(2)
    })
    
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('handles fetch error', async () => {
    server.use(
      rest.get('/api/workouts/programs/', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }))
      })
    )
    
    const { result } = renderHook(() => useWorkouts())
    
    await waitFor(() => {
      expect(result.current.error).toBeDefined()
    })
    
    expect(result.current.workoutPrograms).toHaveLength(0)
  })

  it('creates new workout program', async () => {
    const { result } = renderHook(() => useWorkouts())
    
    const newProgram = {
      name: 'New Program',
      description: 'New Description',
      difficulty: 'beginner',
      duration_weeks: 4,
    }
    
    await act(async () => {
      await result.current.createWorkoutProgram(newProgram)
    })
    
    expect(result.current.workoutPrograms).toHaveLength(3)
    expect(result.current.workoutPrograms[2].name).toBe('New Program')
  })

  it('updates workout program', async () => {
    const { result } = renderHook(() => useWorkouts())
    
    await waitFor(() => {
      expect(result.current.workoutPrograms).toHaveLength(2)
    })
    
    const programId = result.current.workoutPrograms[0].id
    const updates = { name: 'Updated Program' }
    
    await act(async () => {
      await result.current.updateWorkoutProgram(programId, updates)
    })
    
    expect(result.current.workoutPrograms[0].name).toBe('Updated Program')
  })

  it('deletes workout program', async () => {
    const { result } = renderHook(() => useWorkouts())
    
    await waitFor(() => {
      expect(result.current.workoutPrograms).toHaveLength(2)
    })
    
    const programId = result.current.workoutPrograms[0].id
    
    await act(async () => {
      await result.current.deleteWorkoutProgram(programId)
    })
    
    expect(result.current.workoutPrograms).toHaveLength(1)
  })
})
```

## 🔗 Tests de Integración

### **1. Tests de Páginas Completas**
```typescript
// app/__tests__/dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Dashboard from '@/app/dashboard/page'
import { server } from '../../__tests__/mocks/server'

describe('Dashboard Page', () => {
  it('renders dashboard with all sections', async () => {
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Mi Progreso')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Resumen')).toBeInTheDocument()
    expect(screen.getByText('Progreso')).toBeInTheDocument()
    expect(screen.getByText('Entrenamientos')).toBeInTheDocument()
    expect(screen.getByText('Nutrición')).toBeInTheDocument()
  })

  it('switches between tabs', async () => {
    const user = userEvent.setup()
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Mi Progreso')).toBeInTheDocument()
    })
    
    const progressTab = screen.getByRole('tab', { name: /progreso/i })
    await user.click(progressTab)
    
    expect(screen.getByText('Fotos de Progreso')).toBeInTheDocument()
  })

  it('shows loading state', () => {
    server.use(
      rest.get('/api/user-stats/', (req, res, ctx) => {
        return res(ctx.delay(1000), ctx.json({}))
      })
    )
    
    render(<Dashboard />)
    expect(screen.getByText('Cargando...')).toBeInTheDocument()
  })

  it('handles error state', async () => {
    server.use(
      rest.get('/api/user-stats/', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }))
      })
    )
    
    render(<Dashboard />)
    
    await waitFor(() => {
      expect(screen.getByText('Error al cargar datos')).toBeInTheDocument()
    })
  })
})
```

## 🎭 Mocking y MSW

### **1. Mock Handlers (__tests__/mocks/handlers.ts)**
```typescript
// __tests__/mocks/handlers.ts
import { rest } from 'msw'

export const handlers = [
  // Auth endpoints
  rest.post('/api/auth/login/', (req, res, ctx) => {
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
        },
      })
    )
  }),

  rest.post('/api/auth/register/', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        user: {
          id: 2,
          username: 'newuser',
          email: 'newuser@example.com',
          first_name: 'New',
          last_name: 'User',
        },
      })
    )
  }),

  // Workout endpoints
  rest.get('/api/workouts/programs/', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 1,
          name: 'Beginner Program',
          description: 'A beginner workout program',
          difficulty: 'beginner',
          duration_weeks: 4,
          created_by: 1,
        },
        {
          id: 2,
          name: 'Advanced Program',
          description: 'An advanced workout program',
          difficulty: 'advanced',
          duration_weeks: 8,
          created_by: 1,
        },
      ])
    )
  }),

  rest.post('/api/workouts/programs/', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: 3,
        name: 'New Program',
        description: 'New Description',
        difficulty: 'beginner',
        duration_weeks: 4,
        created_by: 1,
      })
    )
  }),

  // Nutrition endpoints
  rest.get('/api/nutrition/plans/', (req, res, ctx) => {
    return res(
      ctx.json([
        {
          id: 1,
          name: 'My Plan',
          daily_calories: 2000,
          protein_goal: 150,
          carbs_goal: 200,
          fat_goal: 80,
          user: 1,
        },
      ])
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
      })
    )
  }),
]
```

### **2. Mock Server (__tests__/mocks/server.ts)**
```typescript
// __tests__/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

## 🚀 Comandos de Testing

### **1. Ejecutar Tests**
```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar tests específicos
npm test -- --testPathPattern=button.test.tsx

# Ejecutar tests con verbose
npm test -- --verbose

# Ejecutar tests y parar en el primer fallo
npm test -- --bail
```

### **2. Scripts de package.json**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false",
    "test:debug": "jest --detectOpenHandles --forceExit"
  }
}
```

## 📊 Cobertura y Métricas

### **1. Configuración de Cobertura**
```javascript
// jest.config.js - configuración de cobertura
collectCoverageFrom: [
  'app/**/*.{js,jsx,ts,tsx}',
  'components/**/*.{js,jsx,ts,tsx}',
  'hooks/**/*.{js,jsx,ts,tsx}',
  'lib/**/*.{js,jsx,ts,tsx}',
  '!**/*.d.ts',
  '!**/node_modules/**',
  '!**/__tests__/**',
  '!**/coverage/**',
],
coverageThreshold: {
  global: {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
  './components/': {
    branches: 85,
    functions: 85,
    lines: 85,
    statements: 85,
  },
  './hooks/': {
    branches: 90,
    functions: 90,
    lines: 90,
    statements: 90,
  },
}
```

### **2. Reportes de Cobertura**
```bash
# Generar reporte HTML
npm run test:coverage
open coverage/lcov-report/index.html

# Generar reporte para CI/CD
npm run test:coverage -- --coverageReporters=text-lcov > coverage.lcov
```

## 🔧 Mejores Prácticas

### **1. Naming Conventions**
- Tests de componentes: `ComponentName.test.tsx`
- Tests de hooks: `useHookName.test.ts`
- Tests de páginas: `PageName.test.tsx`
- Tests de utilidades: `utilityName.test.ts`

### **2. Estructura de Tests**
```typescript
describe('ComponentName', () => {
  describe('when condition', () => {
    it('should do something', () => {
      // Test implementation
    })
  })
})
```

### **3. Testing Library Queries**
- Preferir `getByRole`, `getByLabelText`, `getByText`
- Evitar `getByTestId` cuando sea posible
- Usar `findBy*` para elementos asíncronos
- Usar `queryBy*` para verificar ausencia

### **4. Mocking**
- Mock servicios externos con MSW
- Mock hooks con `jest.mock()`
- Mock props con factories
- Limpiar mocks entre tests

### **5. Assertions**
- Usar matchers específicos de jest-dom
- Un assertion por test cuando sea posible
- Usar `waitFor` para elementos asíncronos
- Verificar estado y comportamiento, no implementación

---

*Documentación de Testing Frontend v1.0 - Nex-Fit*  
*Última actualización: Diciembre 2024*
