import { notificationService, type NotificationSettings } from '@/lib/notification-service'

const originalFetch = global.fetch

describe('notificationService settings persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('loads settings from profile notification_preferences', async () => {
    const prefs: NotificationSettings = {
      email: false,
      push: true,
      meals: false,
      workouts: true,
      achievements: true,
      reminders: false,
      marketing: false,
      admin: true,
    }
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ notification_preferences: prefs }),
    }) as unknown as typeof fetch

    const loaded = await notificationService.getSettings()
    expect(loaded.email).toBe(false)
    expect(loaded.meals).toBe(false)
    expect(loaded.reminders).toBe(false)
    expect(JSON.parse(localStorage.getItem('nexfit_notification_settings') || '{}').email).toBe(false)
  })

  it('PATCHes notification_preferences on update', async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notification_preferences: { email: true } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ notification_preferences: { email: false } }),
      }) as unknown as typeof fetch

    const updated = await notificationService.updateSettings({ email: false })
    expect(updated.email).toBe(false)

    const patchCall = (global.fetch as jest.Mock).mock.calls[1]
    expect(String(patchCall[0])).toContain('profile')
    expect(patchCall[1].method).toBe('PATCH')
    expect(JSON.parse(patchCall[1].body).notification_preferences.email).toBe(false)
  })
})
