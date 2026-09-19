/**
 * Deterministic workout recovery. Completed logs are never overwritten by a
 * local draft just because the device clock is ahead.
 *
 * LOCAL wins against SERVER_COMPLETED only when the snapshot was born from
 * that exact server row version (id + updated_at).
 */

export type WorkoutRecoverySource = 'local' | 'server' | 'none'

export interface WorkoutRecoveryLocal {
  savedAt?: number | null
  serverLogId?: string | null
  baseServerUpdatedAt?: string | number | null
}

export interface WorkoutRecoveryServer {
  id?: string | null
  completed?: boolean | null
  updated_at?: string | null
}

export function parseTimestampMs(value: string | number | null | undefined): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value)
  if (typeof value !== 'string' || value.trim() === '') return null
  const ms = Date.parse(value)
  return Number.isFinite(ms) ? ms : null
}

export function timestampsMatchMs(
  left: string | number | null | undefined,
  right: string | number | null | undefined,
): boolean {
  const a = parseTimestampMs(left)
  const b = parseTimestampMs(right)
  if (a == null || b == null) return false
  return a === b
}

function isPendingCompletedEdit(
  local: WorkoutRecoveryLocal,
  server: WorkoutRecoveryServer,
): boolean {
  if (!local.serverLogId || !server.id) return false
  if (String(local.serverLogId) !== String(server.id)) return false
  return timestampsMatchMs(local.baseServerUpdatedAt, server.updated_at)
}

export function chooseWorkoutRecoveryState(
  local: WorkoutRecoveryLocal | null | undefined,
  server: WorkoutRecoveryServer | null | undefined,
): WorkoutRecoverySource {
  const hasLocal = Boolean(local)
  const hasServer = Boolean(server)
  if (!hasLocal && !hasServer) return 'none'
  if (!hasLocal) return 'server'
  if (!hasServer) return 'local'

  if (server?.completed) {
    return isPendingCompletedEdit(local as WorkoutRecoveryLocal, server) ? 'local' : 'server'
  }

  const localSavedAt = parseTimestampMs(local?.savedAt ?? null)
  const serverUpdatedAt = parseTimestampMs(server?.updated_at ?? null)
  if (localSavedAt != null && serverUpdatedAt != null) {
    return localSavedAt >= serverUpdatedAt ? 'local' : 'server'
  }
  if (localSavedAt != null) return 'local'
  return 'server'
}
