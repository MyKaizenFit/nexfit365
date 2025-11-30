# 🎭 Testing E2E con Playwright - Nex-Fit

## 📋 Resumen

Esta guía cubre la implementación de tests end-to-end (E2E) usando Playwright para Nex-Fit, incluyendo tests de flujos completos de usuario, tests de regresión y tests de cross-browser.

## 🏗️ Arquitectura de Testing E2E

### **Stack de Testing**
- **Framework**: Playwright
- **Navegadores**: Chromium, Firefox, WebKit
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL de testing
- **Servicios**: Docker Compose para servicios externos

### **Estructura de Directorios**
```
e2e/
├── tests/                      # Tests E2E
│   ├── auth/                   # Tests de autenticación
│   │   ├── login.spec.ts
│   │   ├── register.spec.ts
│   │   └── logout.spec.ts
│   ├── dashboard/              # Tests de dashboard
│   │   ├── navigation.spec.ts
│   │   ├── stats.spec.ts
│   │   └── widgets.spec.ts
│   ├── workouts/               # Tests de entrenamientos
│   │   ├── programs.spec.ts
│   │   ├── sessions.spec.ts
│   │   └── exercises.spec.ts
│   ├── nutrition/              # Tests de nutrición
│   │   ├── plans.spec.ts
│   │   ├── meals.spec.ts
│   │   └── tracking.spec.ts
│   ├── progress/               # Tests de progreso
│   │   ├── photos.spec.ts
│   │   ├── measurements.spec.ts
│   │   └── goals.spec.ts
│   └── admin/                  # Tests de administración
│       ├── users.spec.ts
│       ├── content.spec.ts
│       └── analytics.spec.ts
├── fixtures/                   # Datos de prueba
│   ├── users.json
│   ├── workouts.json
│   └── nutrition.json
├── utils/                      # Utilidades de testing
│   ├── auth.ts
│   ├── database.ts
│   └── helpers.ts
├── playwright.config.ts        # Configuración de Playwright
└── docker-compose.test.yml     # Servicios para testing
```

## ⚙️ Configuración

### **1. Instalación de Playwright**
```bash
# Instalar Playwright
npm install --save-dev @playwright/test

# Instalar navegadores
npx playwright install

# Instalar dependencias adicionales
npm install --save-dev @types/node
```

### **2. Configuración de Playwright (playwright.config.ts)**
```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: [
    {
      command: 'cd backend && python manage.py runserver 8000',
      url: 'http://localhost:8000',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'cd frontend && npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
    },
  ],
})
```

### **3. Configuración de Docker para Testing**
```yaml
# docker-compose.test.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: mykaizenfit_e2e
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5433:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6380:6379"

volumes:
  postgres_data:
```

## 🧪 Tests de Autenticación

### **1. Test de Login (auth/login.spec.ts)**
```typescript
// e2e/tests/auth/login.spec.ts
import { test, expect } from '@playwright/test'
import { loginUser, createTestUser } from '../../utils/auth'

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Crear usuario de prueba
    await createTestUser({
      email: 'test@example.com',
      password: 'password123',
      first_name: 'Test',
      last_name: 'User',
    })
  })

  test('successful login redirects to dashboard', async ({ page }) => {
    await page.goto('/auth')
    
    // Verificar que estamos en la página de login
    await expect(page).toHaveTitle(/iniciar sesión/i)
    
    // Llenar formulario de login
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    
    // Hacer clic en el botón de login
    await page.click('[data-testid="login-button"]')
    
    // Esperar redirección al dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page).toHaveTitle(/mi progreso/i)
    
    // Verificar que el usuario está autenticado
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-name"]')).toContainText('Test User')
  })

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/auth')
    
    // Llenar formulario con credenciales inválidas
    await page.fill('[data-testid="email-input"]', 'invalid@example.com')
    await page.fill('[data-testid="password-input"]', 'wrongpassword')
    
    // Hacer clic en el botón de login
    await page.click('[data-testid="login-button"]')
    
    // Verificar mensaje de error
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText(/credenciales inválidas/i)
    
    // Verificar que no se redirige
    await expect(page).toHaveURL('/auth')
  })

  test('empty form shows validation errors', async ({ page }) => {
    await page.goto('/auth')
    
    // Intentar enviar formulario vacío
    await page.click('[data-testid="login-button"]')
    
    // Verificar mensajes de validación
    await expect(page.locator('[data-testid="email-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="password-error"]')).toBeVisible()
  })

  test('login form is accessible', async ({ page }) => {
    await page.goto('/auth')
    
    // Verificar que los campos tienen labels apropiados
    await expect(page.locator('label[for="email"]')).toBeVisible()
    await expect(page.locator('label[for="password"]')).toBeVisible()
    
    // Verificar que el botón tiene texto descriptivo
    await expect(page.locator('[data-testid="login-button"]')).toHaveAttribute('aria-label', 'Iniciar sesión')
    
    // Verificar navegación por teclado
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused()
    
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused()
  })
})
```

### **2. Test de Registro (auth/register.spec.ts)**
```typescript
// e2e/tests/auth/register.spec.ts
import { test, expect } from '@playwright/test'
import { clearDatabase } from '../../utils/database'

test.describe('Registration Flow', () => {
  test.beforeEach(async () => {
    await clearDatabase()
  })

  test('successful registration creates user and redirects to dashboard', async ({ page }) => {
    await page.goto('/auth')
    
    // Ir a la pestaña de registro
    await page.click('[data-testid="register-tab"]')
    
    // Llenar formulario de registro
    await page.fill('[data-testid="username-input"]', 'newuser')
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.fill('[data-testid="confirm-password-input"]', 'password123')
    await page.fill('[data-testid="first-name-input"]', 'New')
    await page.fill('[data-testid="last-name-input"]', 'User')
    
    // Hacer clic en el botón de registro
    await page.click('[data-testid="register-button"]')
    
    // Esperar redirección al dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('[data-testid="user-name"]')).toContainText('New User')
  })

  test('password mismatch shows error', async ({ page }) => {
    await page.goto('/auth')
    await page.click('[data-testid="register-tab"]')
    
    // Llenar formulario con contraseñas que no coinciden
    await page.fill('[data-testid="email-input"]', 'newuser@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.fill('[data-testid="confirm-password-input"]', 'differentpassword')
    
    await page.click('[data-testid="register-button"]')
    
    // Verificar mensaje de error
    await expect(page.locator('[data-testid="password-mismatch-error"]')).toBeVisible()
  })

  test('duplicate email shows error', async ({ page }) => {
    // Crear usuario existente
    await page.goto('/auth')
    await page.click('[data-testid="register-tab"]')
    await page.fill('[data-testid="email-input"]', 'existing@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.fill('[data-testid="confirm-password-input"]', 'password123')
    await page.click('[data-testid="register-button"]')
    
    // Esperar redirección
    await expect(page).toHaveURL('/dashboard')
    
    // Cerrar sesión
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')
    
    // Intentar registrar con el mismo email
    await page.goto('/auth')
    await page.click('[data-testid="register-tab"]')
    await page.fill('[data-testid="email-input"]', 'existing@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.fill('[data-testid="confirm-password-input"]', 'password123')
    await page.click('[data-testid="register-button"]')
    
    // Verificar mensaje de error
    await expect(page.locator('[data-testid="email-exists-error"]')).toBeVisible()
  })
})
```

## 🏠 Tests de Dashboard

### **1. Test de Navegación (dashboard/navigation.spec.ts)**
```typescript
// e2e/tests/dashboard/navigation.spec.ts
import { test, expect } from '@playwright/test'
import { loginUser } from '../../utils/auth'

test.describe('Dashboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, 'test@example.com', 'password123')
  })

  test('sidebar navigation works correctly', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Verificar que el sidebar está visible
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    
    // Navegar a diferentes secciones
    await page.click('[data-testid="progress-tab"]')
    await expect(page.locator('[data-testid="progress-content"]')).toBeVisible()
    
    await page.click('[data-testid="workouts-tab"]')
    await expect(page.locator('[data-testid="workouts-content"]')).toBeVisible()
    
    await page.click('[data-testid="nutrition-tab"]')
    await expect(page.locator('[data-testid="nutrition-content"]')).toBeVisible()
  })

  test('mobile navigation works on small screens', async ({ page }) => {
    // Simular pantalla móvil
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/dashboard')
    
    // Verificar que el menú hamburguesa está visible
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible()
    
    // Abrir menú móvil
    await page.click('[data-testid="mobile-menu-button"]')
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible()
    
    // Navegar usando el menú móvil
    await page.click('[data-testid="mobile-progress-tab"]')
    await expect(page.locator('[data-testid="progress-content"]')).toBeVisible()
    
    // Verificar que el menú se cierra
    await expect(page.locator('[data-testid="mobile-menu"]')).not.toBeVisible()
  })

  test('breadcrumbs show current location', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Verificar breadcrumb inicial
    await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('Dashboard')
    
    // Navegar a una subsección
    await page.click('[data-testid="progress-tab"]')
    await page.click('[data-testid="photos-subtab"]')
    
    // Verificar breadcrumb actualizado
    await expect(page.locator('[data-testid="breadcrumb"]')).toContainText('Progreso > Fotos')
  })
})
```

### **2. Test de Estadísticas (dashboard/stats.spec.ts)**
```typescript
// e2e/tests/dashboard/stats.spec.ts
import { test, expect } from '@playwright/test'
import { loginUser, createTestData } from '../../utils/auth'

test.describe('Dashboard Statistics', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, 'test@example.com', 'password123')
    await createTestData(page)
  })

  test('displays user statistics correctly', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Verificar que las estadísticas se cargan
    await expect(page.locator('[data-testid="stats-container"]')).toBeVisible()
    
    // Verificar métricas específicas
    await expect(page.locator('[data-testid="total-workouts"]')).toContainText('10')
    await expect(page.locator('[data-testid="calories-burned"]')).toContainText('5,000')
    await expect(page.locator('[data-testid="current-weight"]')).toContainText('70')
    await expect(page.locator('[data-testid="streak-days"]')).toContainText('5')
  })

  test('statistics update when data changes', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Verificar estadísticas iniciales
    await expect(page.locator('[data-testid="total-workouts"]')).toContainText('10')
    
    // Agregar un nuevo entrenamiento
    await page.click('[data-testid="workouts-tab"]')
    await page.click('[data-testid="add-workout-button"]')
    await page.fill('[data-testid="workout-name"]', 'New Workout')
    await page.click('[data-testid="save-workout-button"]')
    
    // Volver al dashboard
    await page.click('[data-testid="dashboard-tab"]')
    
    // Verificar que las estadísticas se actualizaron
    await expect(page.locator('[data-testid="total-workouts"]')).toContainText('11')
  })

  test('loading states are shown while fetching data', async ({ page }) => {
    // Interceptar request para simular delay
    await page.route('**/api/user-stats/', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.continue()
    })
    
    await page.goto('/dashboard')
    
    // Verificar que se muestra el estado de carga
    await expect(page.locator('[data-testid="stats-loading"]')).toBeVisible()
    
    // Verificar que las estadísticas se cargan eventualmente
    await expect(page.locator('[data-testid="stats-container"]')).toBeVisible()
    await expect(page.locator('[data-testid="stats-loading"]')).not.toBeVisible()
  })
})
```

## 🏋️ Tests de Entrenamientos

### **1. Test de Programas de Entrenamiento (workouts/programs.spec.ts)**
```typescript
// e2e/tests/workouts/programs.spec.ts
import { test, expect } from '@playwright/test'
import { loginUser } from '../../utils/auth'

test.describe('Workout Programs', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, 'test@example.com', 'password123')
  })

  test('create new workout program', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="workouts-tab"]')
    
    // Hacer clic en crear nuevo programa
    await page.click('[data-testid="create-program-button"]')
    
    // Llenar formulario
    await page.fill('[data-testid="program-name"]', 'My New Program')
    await page.fill('[data-testid="program-description"]', 'A comprehensive workout program')
    await page.selectOption('[data-testid="program-difficulty"]', 'intermediate')
    await page.fill('[data-testid="program-duration"]', '6')
    
    // Agregar ejercicios
    await page.click('[data-testid="add-exercise-button"]')
    await page.fill('[data-testid="exercise-name"]', 'Push-ups')
    await page.fill('[data-testid="exercise-sets"]', '3')
    await page.fill('[data-testid="exercise-reps"]', '15')
    
    // Guardar programa
    await page.click('[data-testid="save-program-button"]')
    
    // Verificar que el programa se creó
    await expect(page.locator('[data-testid="program-list"]')).toContainText('My New Program')
    await expect(page.locator('[data-testid="success-message"]')).toBeVisible()
  })

  test('edit existing workout program', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="workouts-tab"]')
    
    // Hacer clic en editar programa existente
    await page.click('[data-testid="edit-program-button"]')
    
    // Modificar nombre
    await page.fill('[data-testid="program-name"]', 'Updated Program Name')
    
    // Guardar cambios
    await page.click('[data-testid="save-program-button"]')
    
    // Verificar que los cambios se guardaron
    await expect(page.locator('[data-testid="program-list"]')).toContainText('Updated Program Name')
  })

  test('delete workout program', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="workouts-tab"]')
    
    // Hacer clic en eliminar programa
    await page.click('[data-testid="delete-program-button"]')
    
    // Confirmar eliminación
    await page.click('[data-testid="confirm-delete-button"]')
    
    // Verificar que el programa se eliminó
    await expect(page.locator('[data-testid="program-list"]')).not.toContainText('Test Program')
  })

  test('workout program validation', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="workouts-tab"]')
    await page.click('[data-testid="create-program-button"]')
    
    // Intentar guardar sin nombre
    await page.click('[data-testid="save-program-button"]')
    
    // Verificar mensajes de validación
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible()
    await expect(page.locator('[data-testid="name-error"]')).toContainText('El nombre es requerido')
  })
})
```

## 🥗 Tests de Nutrición

### **1. Test de Planes Nutricionales (nutrition/plans.spec.ts)**
```typescript
// e2e/tests/nutrition/plans.spec.ts
import { test, expect } from '@playwright/test'
import { loginUser } from '../../utils/auth'

test.describe('Nutrition Plans', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, 'test@example.com', 'password123')
  })

  test('create nutrition plan', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="nutrition-tab"]')
    
    // Hacer clic en crear plan
    await page.click('[data-testid="create-plan-button"]')
    
    // Llenar formulario
    await page.fill('[data-testid="plan-name"]', 'My Nutrition Plan')
    await page.fill('[data-testid="daily-calories"]', '2000')
    await page.fill('[data-testid="protein-goal"]', '150')
    await page.fill('[data-testid="carbs-goal"]', '200')
    await page.fill('[data-testid="fat-goal"]', '80')
    
    // Guardar plan
    await page.click('[data-testid="save-plan-button"]')
    
    // Verificar que el plan se creó
    await expect(page.locator('[data-testid="plan-list"]')).toContainText('My Nutrition Plan')
  })

  test('track daily meals', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="nutrition-tab"]')
    
    // Agregar comida
    await page.click('[data-testid="add-meal-button"]')
    await page.selectOption('[data-testid="meal-type"]', 'breakfast')
    await page.fill('[data-testid="food-name"]', 'Oatmeal')
    await page.fill('[data-testid="food-quantity"]', '100')
    await page.fill('[data-testid="food-calories"]', '350')
    
    // Guardar comida
    await page.click('[data-testid="save-meal-button"]')
    
    // Verificar que la comida se agregó
    await expect(page.locator('[data-testid="meal-list"]')).toContainText('Oatmeal')
    
    // Verificar que las calorías se actualizaron
    await expect(page.locator('[data-testid="daily-calories"]')).toContainText('350')
  })

  test('nutrition progress tracking', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="nutrition-tab"]')
    
    // Verificar gráficos de progreso
    await expect(page.locator('[data-testid="calories-chart"]')).toBeVisible()
    await expect(page.locator('[data-testid="macros-chart"]')).toBeVisible()
    
    // Verificar métricas diarias
    await expect(page.locator('[data-testid="protein-progress"]')).toBeVisible()
    await expect(page.locator('[data-testid="carbs-progress"]')).toBeVisible()
    await expect(page.locator('[data-testid="fat-progress"]')).toBeVisible()
  })
})
```

## 📊 Tests de Progreso

### **1. Test de Fotos de Progreso (progress/photos.spec.ts)**
```typescript
// e2e/tests/progress/photos.spec.ts
import { test, expect } from '@playwright/test'
import { loginUser } from '../../utils/auth'
import path from 'path'

test.describe('Progress Photos', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page, 'test@example.com', 'password123')
  })

  test('upload progress photo', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="progress-tab"]')
    await page.click('[data-testid="photos-subtab"]')
    
    // Hacer clic en subir foto
    await page.click('[data-testid="upload-photo-button"]')
    
    // Seleccionar archivo
    const fileInput = page.locator('[data-testid="photo-input"]')
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/test-photo.jpg'))
    
    // Seleccionar categoría
    await page.selectOption('[data-testid="photo-category"]', 'front')
    
    // Agregar notas
    await page.fill('[data-testid="photo-notes"]', 'Progress photo for January')
    
    // Subir foto
    await page.click('[data-testid="upload-button"]')
    
    // Verificar que la foto se subió
    await expect(page.locator('[data-testid="photo-list"]')).toContainText('Progress photo for January')
  })

  test('view photo gallery', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="progress-tab"]')
    await page.click('[data-testid="photos-subtab"]')
    
    // Verificar que la galería se carga
    await expect(page.locator('[data-testid="photo-gallery"]')).toBeVisible()
    
    // Hacer clic en una foto
    await page.click('[data-testid="photo-item"]')
    
    // Verificar que se abre el modal
    await expect(page.locator('[data-testid="photo-modal"]')).toBeVisible()
    
    // Verificar información de la foto
    await expect(page.locator('[data-testid="photo-date"]')).toBeVisible()
    await expect(page.locator('[data-testid="photo-category"]')).toBeVisible()
  })

  test('delete progress photo', async ({ page }) => {
    await page.goto('/dashboard')
    await page.click('[data-testid="progress-tab"]')
    await page.click('[data-testid="photos-subtab"]')
    
    // Hacer clic en eliminar foto
    await page.click('[data-testid="delete-photo-button"]')
    
    // Confirmar eliminación
    await page.click('[data-testid="confirm-delete-button"]')
    
    // Verificar que la foto se eliminó
    await expect(page.locator('[data-testid="photo-list"]')).toBeEmpty()
  })
})
```

## 🔧 Utilidades de Testing

### **1. Utilidades de Autenticación (utils/auth.ts)**
```typescript
// e2e/utils/auth.ts
import { Page } from '@playwright/test'

export async function loginUser(page: Page, email: string, password: string) {
  await page.goto('/auth')
  await page.fill('[data-testid="email-input"]', email)
  await page.fill('[data-testid="password-input"]', password)
  await page.click('[data-testid="login-button"]')
  await page.waitForURL('/dashboard')
}

export async function logoutUser(page: Page) {
  await page.click('[data-testid="user-menu"]')
  await page.click('[data-testid="logout-button"]')
  await page.waitForURL('/auth')
}

export async function createTestUser(userData: {
  email: string
  password: string
  first_name: string
  last_name: string
}) {
  // Implementar creación de usuario de prueba
  // Esto podría usar la API directamente o un script de base de datos
}

export async function createTestData(page: Page) {
  // Crear datos de prueba para los tests
  // Esto podría incluir programas de entrenamiento, planes nutricionales, etc.
}
```

### **2. Utilidades de Base de Datos (utils/database.ts)**
```typescript
// e2e/utils/database.ts
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function clearDatabase() {
  // Limpiar base de datos antes de cada test
  await execAsync('cd backend && python manage.py flush --noinput')
}

export async function seedDatabase() {
  // Poblar base de datos con datos de prueba
  await execAsync('cd backend && python manage.py loaddata fixtures/test_data.json')
}

export async function resetDatabase() {
  await clearDatabase()
  await seedDatabase()
}
```

### **3. Utilidades de Ayuda (utils/helpers.ts)**
```typescript
// e2e/utils/helpers.ts
import { Page, expect } from '@playwright/test'

export async function waitForApiResponse(page: Page, url: string) {
  const response = await page.waitForResponse(response => 
    response.url().includes(url) && response.status() === 200
  )
  return response
}

export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `screenshots/${name}.png` })
}

export async function waitForElementToBeVisible(page: Page, selector: string) {
  await page.waitForSelector(selector, { state: 'visible' })
}

export async function fillFormField(page: Page, selector: string, value: string) {
  await page.fill(selector, value)
  await expect(page.locator(selector)).toHaveValue(value)
}
```

## 🚀 Comandos de Testing

### **1. Scripts de package.json**
```json
{
  "scripts": {
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:e2e:debug": "playwright test --debug",
    "test:e2e:report": "playwright show-report",
    "test:e2e:install": "playwright install"
  }
}
```

### **2. Comandos de Testing**
```bash
# Ejecutar todos los tests E2E
npm run test:e2e

# Ejecutar tests con interfaz gráfica
npm run test:e2e:ui

# Ejecutar tests en modo headed (ver navegador)
npm run test:e2e:headed

# Ejecutar tests en modo debug
npm run test:e2e:debug

# Ver reporte de tests
npm run test:e2e:report

# Ejecutar tests específicos
npx playwright test auth/login.spec.ts

# Ejecutar tests en navegador específico
npx playwright test --project=chromium

# Ejecutar tests en paralelo
npx playwright test --workers=4
```

## 📊 Reportes y Métricas

### **1. Configuración de Reportes**
```typescript
// playwright.config.ts
export default defineConfig({
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['line'],
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
})
```

### **2. Métricas de Testing**
```bash
# Generar reporte HTML
npm run test:e2e
open playwright-report/index.html

# Ver métricas de performance
npx playwright test --reporter=html
```

## 🔧 Mejores Prácticas

### **1. Organización de Tests**
- Un archivo por funcionalidad
- Tests independientes y aislados
- Usar Page Object Model para tests complejos
- Agrupar tests relacionados con `describe`

### **2. Selectores**
- Usar `data-testid` para elementos de testing
- Evitar selectores CSS frágiles
- Usar selectores semánticos cuando sea posible
- Documentar convenciones de naming

### **3. Manejo de Datos**
- Limpiar datos entre tests
- Usar factories para datos de prueba
- Mockear servicios externos
- Usar datos determinísticos

### **4. Performance**
- Usar `waitFor` en lugar de `sleep`
- Ejecutar tests en paralelo cuando sea posible
- Optimizar selectores para velocidad
- Usar `headless` para CI/CD

---

*Documentación de Testing E2E v1.0 - Nex-Fit*  
*Última actualización: Diciembre 2024*
