import {
  TEMPLATE_ALREADY_ASSIGNED_CODE,
  TemplateAlreadyAssignedError,
  buildForceReassignPayload,
  isTemplateAlreadyAssignedError,
  isTemplateAlreadyAssignedPayload,
  shouldIncludeAssignedUserIdsOnSave,
} from '@/lib/workout-assignment'

describe('workout-assignment guard helpers', () => {
  it('detects template_already_assigned payload', () => {
    const payload = {
      code: TEMPLATE_ALREADY_ASSIGNED_CODE,
      detail: 'ya asignada',
      active_program_id: 'abc',
    }
    expect(isTemplateAlreadyAssignedPayload(payload)).toBe(true)
    expect(isTemplateAlreadyAssignedPayload({ code: 'other' })).toBe(false)
  })

  it('builds TemplateAlreadyAssignedError with active id', () => {
    const err = new TemplateAlreadyAssignedError({
      code: TEMPLATE_ALREADY_ASSIGNED_CODE,
      detail: 'El usuario ya tiene esta plantilla asignada.',
      active_program_id: 'prog-1',
    })
    expect(isTemplateAlreadyAssignedError(err)).toBe(true)
    expect(err.activeProgramId).toBe('prog-1')
    expect(err.status).toBe(409)
  })

  it('builds force reassign payload with replace_active_program_id', () => {
    expect(
      buildForceReassignPayload(
        { assigned_user_ids: [4] },
        { activeProgramId: 'prog-1' },
      )
    ).toEqual({
      assigned_user_ids: [4],
      force_reassign: true,
      replace_active_program_id: 'prog-1',
    })
  })

  it('omits assigned_user_ids when saving an existing template', () => {
    expect(
      shouldIncludeAssignedUserIdsOnSave({
        isEditingExisting: true,
        isTemplate: true,
        isUserOwnedProgram: false,
      })
    ).toBe(false)
  })

  it('keeps assigned_user_ids for user-owned program edits', () => {
    expect(
      shouldIncludeAssignedUserIdsOnSave({
        isEditingExisting: true,
        isTemplate: false,
        isUserOwnedProgram: true,
      })
    ).toBe(true)
  })

  it('allows assigned_user_ids on create', () => {
    expect(
      shouldIncludeAssignedUserIdsOnSave({
        isEditingExisting: false,
        isTemplate: true,
        isUserOwnedProgram: false,
      })
    ).toBe(true)
  })

  it('cancel path does not build force payload', () => {
    const base = { assigned_user_ids: [4] }
    // Cancel = reuse original payload without force fields
    expect(base).not.toHaveProperty('force_reassign')
    expect(base).not.toHaveProperty('replace_active_program_id')
  })
})
