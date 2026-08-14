import fs from 'fs'
import path from 'path'

describe('dashboard premium CTA gating', () => {
  it('gates every SubscriptionStatusCard behind the fail-closed Premium CTA helper', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app/dashboard/page.tsx'), 'utf8')
    const cardChunks = source.split('<SubscriptionStatusCard />')

    expect(source).toContain('canShowPremiumCTAForUser')
    expect(cardChunks.length - 1).toBe(2)
    cardChunks.slice(0, -1).forEach((chunk) => {
      expect(chunk.slice(-250)).toContain('showPremiumCta ? (')
    })
  })
})
