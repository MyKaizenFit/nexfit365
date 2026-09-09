import fs from 'fs'
import path from 'path'

describe('meal dashboard sync badge', () => {
  it('[characterization] cloud badge is static and does not depend on syncing or errors', () => {
    const src = fs.readFileSync(
      path.join(process.cwd(), 'components/dashboard/meal-dashboard.tsx'),
      'utf8',
    )
    expect(src).toContain('Sincronizado en la nube')
    expect(src).not.toMatch(/Sincronizado en la nube[\s\S]{0,200}syncing/)
    expect(src).not.toMatch(/syncing[\s\S]{0,200}Sincronizado en la nube/)
  })
})
