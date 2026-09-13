import fs from 'fs'
import path from 'path'

describe('meal dashboard sync badge', () => {
  it('cloud badge derives from syncing and syncError', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'components/dashboard/meal-dashboard.tsx'),
      'utf8',
    )
    expect(src).toContain('Sincronizado en la nube')
    expect(src).toContain('Guardando')
    expect(src).toContain('Sin sincronizar')
    expect(src).toMatch(/syncing \? 'Guardando/)
    expect(src).toMatch(/syncError \? 'Sin sincronizar'/)
  })
})
