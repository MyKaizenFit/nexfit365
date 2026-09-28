/** Helpers for template → user assignment without silent clones. */

export const TEMPLATE_ALREADY_ASSIGNED_CODE = 'template_already_assigned'
export const ASSIGNMENT_CONFLICT_CODE = 'assignment_conflict'

export type TemplateAlreadyAssignedPayload = {
  code: typeof TEMPLATE_ALREADY_ASSIGNED_CODE
  detail?: string
  active_program_id?: string | null
  already_assigned?: Array<{
    user_id: number
    active_program_id: string
    template_id?: string
  }>
}

export class TemplateAlreadyAssignedError extends Error {
  readonly code = TEMPLATE_ALREADY_ASSIGNED_CODE
  readonly status = 409
  readonly activeProgramId: string | null
  readonly payload: TemplateAlreadyAssignedPayload

  constructor(payload: TemplateAlreadyAssignedPayload) {
    super(payload.detail || 'El usuario ya tiene esta plantilla asignada.')
    this.name = 'TemplateAlreadyAssignedError'
    this.payload = payload
    this.activeProgramId = payload.active_program_id || payload.already_assigned?.[0]?.active_program_id || null
  }
}

export function isTemplateAlreadyAssignedPayload(data: unknown): data is TemplateAlreadyAssignedPayload {
  if (!data || typeof data !== 'object') return false
  return (data as { code?: string }).code === TEMPLATE_ALREADY_ASSIGNED_CODE
}

export function isTemplateAlreadyAssignedError(error: unknown): error is TemplateAlreadyAssignedError {
  return error instanceof TemplateAlreadyAssignedError
}

/**
 * Guardar/editar una plantilla no debe reenviar assigned_user_ids.
 * La asignación es una acción explícita aparte (dialog / create con usuarios).
 */
export function shouldIncludeAssignedUserIdsOnSave(options: {
  isEditingExisting: boolean
  isTemplate: boolean
  isUserOwnedProgram: boolean
}): boolean {
  if (!options.isEditingExisting) return true
  if (options.isUserOwnedProgram) return true
  if (options.isTemplate) return false
  return false
}

export function buildForceReassignPayload(
  base: Record<string, unknown>,
  options: { activeProgramId: string }
): Record<string, unknown> {
  return {
    ...base,
    force_reassign: true,
    replace_active_program_id: options.activeProgramId,
  }
}
