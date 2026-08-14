import fs from 'fs'
import path from 'path'

describe('dashboard commercial upsell gating', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'app/dashboard/page.tsx'), 'utf8')

  it('does not use the fail-open paid-only membership check', () => {
    expect(source).not.toMatch(/subscription_status \|\| ""\)\.toLowerCase\(\) === "active"/)
    expect(source).toContain('canShowCommercialUpsellForUser')
    expect(source).toContain('hideUpsellSections = !showCommercialUpsell')
  })

  it('gates every SubscriptionStatusCard behind the fail-closed commercial helper', () => {
    const cardChunks = source.split('<SubscriptionStatusCard />')
    expect(cardChunks.length - 1).toBe(2)
    cardChunks.slice(0, -1).forEach((chunk) => {
      expect(chunk.slice(-250)).toContain('showCommercialUpsell ? (')
    })
  })

  it('gates every CoachingCTA behind the fail-closed commercial helper', () => {
    const matches = source.match(/showCommercialUpsell \? \([\s\S]*?<CoachingCTA[\s\S]*?\/>/g) || []
    expect(source.match(/<CoachingCTA/g)?.length).toBe(4)
    expect(matches.length).toBe(4)
  })
})
