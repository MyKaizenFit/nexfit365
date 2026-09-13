import {
  chooseWorkoutRecoveryState,
  timestampsMatchMs,
} from '../choose-workout-recovery-state'

const T1 = '2026-09-13T10:00:00.000Z'
const T2 = '2026-09-13T11:00:00.000Z'
const LOG_A = 'log-a'
const LOG_B = 'log-b'

describe('chooseWorkoutRecoveryState', () => {
  it('SERVER_COMPLETED wins when there is no local snapshot', () => {
    expect(
      chooseWorkoutRecoveryState(null, { id: LOG_A, completed: true, updated_at: T2 }),
    ).toBe('server')
  })

  it('SERVER_COMPLETED wins over a local draft without server identity', () => {
    expect(
      chooseWorkoutRecoveryState(
        { savedAt: Date.parse(T2) + 7_200_000 },
        { id: LOG_A, completed: true, updated_at: T2 },
      ),
    ).toBe('server')
  })

  it('clock-ahead local based on T1 cannot beat SERVER_COMPLETED T2', () => {
    expect(
      chooseWorkoutRecoveryState(
        {
          savedAt: Date.parse(T2) + 7_200_000,
          serverLogId: LOG_A,
          baseServerUpdatedAt: T1,
        },
        { id: LOG_A, completed: true, updated_at: T2 },
      ),
    ).toBe('server')
  })

  it('pending completed edit of the same log version can restore locally', () => {
    expect(
      chooseWorkoutRecoveryState(
        {
          savedAt: Date.parse(T2) + 60_000,
          serverLogId: LOG_A,
          baseServerUpdatedAt: T2,
        },
        { id: LOG_A, completed: true, updated_at: T2 },
      ),
    ).toBe('local')
  })

  it('different serverLogId never wins even if timestamps match', () => {
    expect(
      chooseWorkoutRecoveryState(
        {
          savedAt: Date.parse(T2) + 60_000,
          serverLogId: LOG_B,
          baseServerUpdatedAt: T2,
        },
        { id: LOG_A, completed: true, updated_at: T2 },
      ),
    ).toBe('server')
  })

  it('newer local draft wins over SERVER_DRAFT', () => {
    expect(
      chooseWorkoutRecoveryState(
        { savedAt: Date.parse('2026-09-13T11:05:00.000Z') },
        { completed: false, updated_at: '2026-09-13T11:00:00.000Z' },
      ),
    ).toBe('local')
  })

  it('older local draft loses to SERVER_DRAFT', () => {
    expect(
      chooseWorkoutRecoveryState(
        { savedAt: Date.parse('2026-09-13T10:00:00.000Z') },
        { completed: false, updated_at: '2026-09-13T11:00:00.000Z' },
      ),
    ).toBe('server')
  })

  it('uses local when there is no server snapshot', () => {
    expect(chooseWorkoutRecoveryState({ savedAt: 1 }, null)).toBe('local')
  })
})

describe('timestampsMatchMs', () => {
  it('treats microseconds, milliseconds, Z and +00:00 as the same instant', () => {
    expect(timestampsMatchMs('2026-09-13T10:00:00.123456Z', '2026-09-13T10:00:00.123Z')).toBe(true)
    expect(timestampsMatchMs('2026-09-13T10:00:00.123+00:00', '2026-09-13T10:00:00.123Z')).toBe(true)
    expect(timestampsMatchMs('2026-09-13T10:00:00.123456+00:00', '2026-09-13T10:00:00.123Z')).toBe(true)
  })

  it('rejects a different millisecond', () => {
    expect(timestampsMatchMs('2026-09-13T10:00:00.123Z', '2026-09-13T10:00:00.124Z')).toBe(false)
  })
})
