import { buildAdminSectionErrorReport, classifyAdminSectionError } from '../admin-section-error'

describe('admin section error report', () => {
  it('classifies dynamic import failures and redacts secrets', () => {
    expect(classifyAdminSectionError({
      name: 'TypeError',
      message: 'Failed to fetch dynamically imported module: /nexfit/_next/static/chunks/app/admin/components/workout-plan-management.js',
    })).toBe('chunk_load')

    const report = buildAdminSectionErrorReport({
      error: new Error('password=sekret user sara@example.com Authorization: Bearer eyJaaa.bbbb.cccc'),
      componentStack: 'at TrainingPlans',
      section: 'workout-plans',
      pathname: '/nexfit/admin/',
      now: new Date('2026-09-24T15:36:00.000Z'),
    })

    expect(report.kind).toBe('render')
    expect(report.message).not.toMatch(/sekret|sara@example.com|eyJaaa/)
    expect(report.stack).not.toMatch(/sekret|eyJaaa/)
    expect(report.build).toContain('commit=')
  })
})
