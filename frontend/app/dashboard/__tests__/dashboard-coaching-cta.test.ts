import fs from 'fs'
import path from 'path'

describe('dashboard coaching CTA placement', () => {
  it('does not render the promotional CTA in meals while keeping the coaching page CTA', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/dashboard/page.tsx'), 'utf8')

    expect(source).not.toContain('CoachingCTA placement="meals"')
    expect(source).toContain('CoachingCTA fullPage placement="coaching-page"')
  })
})
