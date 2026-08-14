import { canShowPremiumCTA, canShowPremiumCTAForUser, hasPremiumAccess } from '../premium-cta'

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

describe('canShowPremiumCTA', () => {
  it('hides the CTA for paid Premium', () => {
    expect(canShowPremiumCTA({ loaded: true, status: 'active' })).toBe(false)
  })

  it('hides the CTA for active trial Premium', () => {
    expect(canShowPremiumCTA({ loaded: true, status: 'trial' })).toBe(false)
  })

  it('hides the CTA while membership is loading', () => {
    expect(canShowPremiumCTA({ loaded: false, status: 'none' })).toBe(false)
    expect(canShowPremiumCTA({ loaded: true, status: 'none' })).toBe(true)
  })

  it('hides the CTA when membership is undefined, null, or missing', () => {
    expect(canShowPremiumCTA(undefined)).toBe(false)
    expect(canShowPremiumCTA(null)).toBe(false)
    expect(canShowPremiumCTA({ loaded: true, status: undefined })).toBe(false)
    expect(canShowPremiumCTA({ loaded: true, status: null })).toBe(false)
    expect(canShowPremiumCTA({ loaded: true, status: '' })).toBe(false)
    expect(canShowPremiumCTA({ loaded: true })).toBe(false)
  })

  it('hides the CTA when membership failed to load', () => {
    expect(canShowPremiumCTA({ loaded: true, error: true, status: 'none' })).toBe(false)
    expect(canShowPremiumCTA({ loaded: false, error: true })).toBe(false)
  })

  it('shows the CTA only for confirmed free membership', () => {
    expect(canShowPremiumCTA({ loaded: true, status: 'none' })).toBe(true)
    expect(canShowPremiumCTA({ loaded: true, status: 'expired' })).toBe(true)
    expect(canShowPremiumCTA({ loaded: true, status: 'cancelled' })).toBe(true)
  })

  it('hides the CTA for unknown statuses', () => {
    expect(canShowPremiumCTA({ loaded: true, status: 'pending' })).toBe(false)
  })
})

describe('canShowPremiumCTAForUser', () => {
  it('hides the CTA until auth/membership is loaded', () => {
    expect(canShowPremiumCTAForUser({ subscription_status: 'none' }, false)).toBe(false)
    expect(canShowPremiumCTAForUser(null, true)).toBe(false)
    expect(canShowPremiumCTAForUser(undefined, true)).toBe(false)
  })

  it('hides the CTA for Premium and trial users from the auth profile', () => {
    expect(canShowPremiumCTAForUser({ subscription_status: 'active' })).toBe(false)
    expect(canShowPremiumCTAForUser({ subscription_status: 'trial' })).toBe(false)
    expect(canShowPremiumCTAForUser({ has_active_membership: true, subscription_status: 'none' })).toBe(false)
    expect(canShowPremiumCTAForUser({ role: 'PREMIUM', subscription_status: 'none' })).toBe(false)
  })

  it('hides the CTA when the profile has no membership status yet', () => {
    expect(canShowPremiumCTAForUser({ role: 'basic' })).toBe(false)
    expect(canShowPremiumCTAForUser({ subscription_status: null, role: 'basic' })).toBe(false)
  })

  it('shows the CTA for a confirmed free user', () => {
    expect(canShowPremiumCTAForUser({ subscription_status: 'none', role: 'basic' })).toBe(true)
    expect(canShowPremiumCTAForUser({ subscription_status: 'expired', has_active_membership: false })).toBe(true)
  })
})
