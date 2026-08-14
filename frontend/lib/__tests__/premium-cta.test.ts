import {
  canShowCommercialUpsell,
  canShowCommercialUpsellForUser,
  canShowPremiumCTA,
  canShowPremiumCTAForUser,
  hasPremiumAccess,
} from '../premium-cta'

describe('hasPremiumAccess', () => {
  it('treats paid and trial membership as Premium access', () => {
    expect(hasPremiumAccess({ status: 'active' })).toBe(true)
    expect(hasPremiumAccess({ status: 'trial' })).toBe(true)
    expect(hasPremiumAccess({ subscription_status: 'ACTIVE' })).toBe(true)
    expect(hasPremiumAccess({ has_active_membership: true, status: 'none' })).toBe(true)
    expect(hasPremiumAccess({ isActive: true })).toBe(true)
    expect(hasPremiumAccess({ role: 'premium', status: 'none' })).toBe(true)
  })

  it('does not treat confirmed free states as Premium access', () => {
    expect(hasPremiumAccess({ status: 'none' })).toBe(false)
    expect(hasPremiumAccess({ status: 'expired' })).toBe(false)
    expect(hasPremiumAccess({ status: 'cancelled' })).toBe(false)
    expect(hasPremiumAccess(null)).toBe(false)
  })
})

describe('commercial upsell fail-closed matrix', () => {
  const cases: Array<{
    name: string
    input: Parameters<typeof canShowCommercialUpsell>[0]
    show: boolean
  }> = [
    { name: 'FREE none', input: { loaded: true, status: 'none' }, show: true },
    { name: 'expired', input: { loaded: true, status: 'expired' }, show: true },
    { name: 'cancelled', input: { loaded: true, status: 'cancelled' }, show: true },
    { name: 'TRIAL', input: { loaded: true, status: 'trial' }, show: false },
    { name: 'ACTIVE', input: { loaded: true, status: 'active' }, show: false },
    { name: 'LOADING', input: { loaded: false, status: 'none' }, show: false },
    { name: 'UNDEFINED input', input: undefined, show: false },
    { name: 'NULL input', input: null, show: false },
    { name: 'UNDEFINED status', input: { loaded: true, status: undefined }, show: false },
    { name: 'NULL status', input: { loaded: true, status: null }, show: false },
    { name: 'ERROR', input: { loaded: true, error: true, status: 'none' }, show: false },
  ]

  it.each(cases)('$name', ({ input, show }) => {
    expect(canShowPremiumCTA(input)).toBe(show)
    expect(canShowCommercialUpsell(input)).toBe(show)
  })
})

describe('canShowCommercialUpsellForUser', () => {
  it('hides all commercial upsells until auth/membership is loaded', () => {
    expect(canShowCommercialUpsellForUser({ subscription_status: 'none' }, false)).toBe(false)
    expect(canShowPremiumCTAForUser({ subscription_status: 'none' }, false)).toBe(false)
    expect(canShowCommercialUpsellForUser(null, true)).toBe(false)
    expect(canShowCommercialUpsellForUser(undefined, true)).toBe(false)
  })

  it('hides Premium and Coaching CTAs for trial and paid Premium', () => {
    expect(canShowCommercialUpsellForUser({ subscription_status: 'active' })).toBe(false)
    expect(canShowCommercialUpsellForUser({ subscription_status: 'trial' })).toBe(false)
    expect(canShowCommercialUpsellForUser({ has_active_membership: true, subscription_status: 'none' })).toBe(false)
    expect(canShowCommercialUpsellForUser({ role: 'PREMIUM', subscription_status: 'none' })).toBe(false)
  })

  it('hides commercial upsells when the profile has no membership status yet', () => {
    expect(canShowCommercialUpsellForUser({ role: 'basic' })).toBe(false)
    expect(canShowCommercialUpsellForUser({ subscription_status: null, role: 'basic' })).toBe(false)
  })

  it('shows Premium and Coaching CTAs for confirmed free users', () => {
    expect(canShowCommercialUpsellForUser({ subscription_status: 'none', role: 'basic' })).toBe(true)
    expect(canShowCommercialUpsellForUser({ subscription_status: 'expired', has_active_membership: false })).toBe(true)
    expect(canShowCommercialUpsellForUser({ subscription_status: 'cancelled', role: 'basic' })).toBe(true)
  })
})
