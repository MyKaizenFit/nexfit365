/**
 * Workout session integrity: local persistence, recovery, and completed vs draft.
 */
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActiveWorkoutSession } from '../active-workout-session'
import { formatLocalDate, todayLocalDate } from '@/lib/local-date'
import { getActiveWorkoutStorageKey } from '@/lib/user-local-storage'

jest.mock('../exercise-video-player', () => ({
  ExerciseVideoPlayer: () => <div data-testid="exercise-video-player" />,
}))

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}))

jest.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 1 } }),
}))

const workoutDay = {
  id: 'day-1',
  day_name: 'Día de fuerza',
  exercises: [
    {
      id: 'exercise-item-1',
      sets: 3,
      reps: '10',
      exercise: {
        id: 'exercise-1',
        name: 'Sentadilla',
        muscle_groups: ['piernas'],
      },
    },
  ],
}

function todayAtLocalTime(hours: number, minutes = 0): number {
  const [year, month, day] = todayLocalDate().split('-').map(Number)
  return new Date(year, month - 1, day, hours, minutes, 0, 0).getTime()
}

function draftKey(userId: string | number = 1) {
  return getActiveWorkoutStorageKey(userId, workoutDay.id, todayLocalDate())
}

function readDraft(userId: string | number = 1) {
  const raw = window.localStorage.getItem(draftKey(userId))
  return raw ? JSON.parse(raw) : null
}

const serverCompleted = {
  id: 'server-completed',
  completed: true,
  duration_minutes: 45,
  notes: 'finished on server T2',
  updated_at: new Date().toISOString(),
  exercises_data: [
    {
      exercise_id: 'exercise-1',
      exercise_name: 'Sentadilla',
      sets: [{ set_number: 1, reps: 12, weight: 80, completed: true }],
      completed: true,
    },
  ],
}

function seedOldLocalDraft() {
  window.localStorage.setItem(
    draftKey(),
    JSON.stringify({
      isStarted: true,
      isPaused: false,
      elapsedSeconds: 120,
      workoutStartTime: Date.now() - 120_000,
      completedExercises: ['exercise-item-1'],
      exerciseSets: {
        'exercise-item-1': {
          seriesCount: 3,
          base: { reps: 8, weight: 40 },
          overrides: {},
        },
      },
      rating: 0,
      notes: 'local draft T1',
      savedAt: Date.now() - 60_000,
    }),
  )
}

describe('ActiveWorkoutSession P0 persistence', () => {
  afterEach(() => {
    jest.useRealTimers()
    window.localStorage.clear()
  })

  describe('stale interval vs visibility', () => {
    beforeEach(() => {
      jest.useFakeTimers()
      window.localStorage.clear()
    })

    it('5s timer tick keeps the latest reps in localStorage', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: /comenzar entrenamiento/i }))
      const repsInputs = screen.getAllByPlaceholderText('10')
      await user.type(repsInputs[0], '8')

      await act(async () => {
        jest.advanceTimersByTime(5000)
      })

      expect(JSON.stringify(readDraft())).toContain('"reps":8')
    })

    it('visibilitychange/pagehide persist the latest input', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: /comenzar entrenamiento/i }))
      const repsInputs = screen.getAllByPlaceholderText('10')
      await user.type(repsInputs[0], '8')

      await act(async () => {
        window.dispatchEvent(new Event('pagehide'))
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(JSON.stringify(readDraft())).toContain('"reps":8')
    })
  })

  describe('SERVER_COMPLETED vs LOCAL_DRAFT', () => {
    it('SERVER_COMPLETED wins over an older local draft', async () => {
      seedOldLocalDraft()

      const { rerender } = render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen={false}
          onClose={jest.fn()}
          onComplete={jest.fn()}
        />,
      )

      rerender(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
          initialDraftLog={serverCompleted}
        />,
      )

      expect((await screen.findAllByDisplayValue('80')).length).toBeGreaterThan(0)
      expect(screen.queryAllByDisplayValue('40')).toHaveLength(0)
    })

    it('does not autosave the stale local payload after SERVER_COMPLETED recovery', async () => {
      jest.useFakeTimers()
      const onSaveProgress = jest.fn().mockResolvedValue({ updated_at: serverCompleted.updated_at })
      seedOldLocalDraft()

      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
          onSaveProgress={onSaveProgress}
          initialDraftLog={serverCompleted}
        />,
      )

      expect((await screen.findAllByDisplayValue('80')).length).toBeGreaterThan(0)

      await act(async () => {
        jest.advanceTimersByTime(1000)
      })

      if (onSaveProgress.mock.calls.length > 0) {
        const payload = onSaveProgress.mock.calls[0][0]
        const firstSet = payload.exercises_data?.[0]?.sets?.[0]
        expect(firstSet.weight).toBe(80)
        expect(firstSet.reps).toBe(12)
        expect(payload.notes).toBe('finished on server T2')
      }
    })

    it('clock-ahead local based on T1 cannot beat SERVER_COMPLETED T2', async () => {
      window.localStorage.setItem(
        draftKey(),
        JSON.stringify({
          isStarted: true,
          isPaused: false,
          elapsedSeconds: 120,
          completedExercises: ['exercise-item-1'],
          exerciseSets: {
            'exercise-item-1': {
              seriesCount: 3,
              base: { reps: 8, weight: 40 },
              overrides: {},
            },
          },
          notes: 'clock ahead stale',
          savedAt: todayAtLocalTime(23, 59),
          serverLogId: serverCompleted.id,
          baseServerUpdatedAt: '2020-01-01T00:00:00.000Z',
        }),
      )

      expect(formatLocalDate(new Date(todayAtLocalTime(23, 59)))).toBe(todayLocalDate())

      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
          initialDraftLog={serverCompleted}
        />,
      )

      expect((await screen.findAllByDisplayValue('80')).length).toBeGreaterThan(0)
      expect(screen.queryAllByDisplayValue('40')).toHaveLength(0)
    })

    it('pending completed edit of the same log version restores locally', async () => {
      window.localStorage.setItem(
        draftKey(),
        JSON.stringify({
          isStarted: true,
          isPaused: false,
          elapsedSeconds: 120,
          completedExercises: ['exercise-item-1'],
          exerciseSets: {
            'exercise-item-1': {
              seriesCount: 1,
              base: {},
              overrides: { '1': { reps: 8, weight: 40 } },
            },
          },
          notes: 'pending edit',
          savedAt: todayAtLocalTime(12),
          serverLogId: serverCompleted.id,
          baseServerUpdatedAt: serverCompleted.updated_at,
        }),
      )

      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
          initialDraftLog={serverCompleted}
        />,
      )

      expect((await screen.findAllByDisplayValue('40')).length).toBeGreaterThan(0)
      expect(screen.queryAllByDisplayValue('80')).toHaveLength(0)
    })

    it('different serverLogId restores SERVER_COMPLETED', async () => {
      window.localStorage.setItem(
        draftKey(),
        JSON.stringify({
          isStarted: true,
          isPaused: false,
          elapsedSeconds: 120,
          completedExercises: ['exercise-item-1'],
          exerciseSets: {
            'exercise-item-1': {
              seriesCount: 1,
              base: {},
              overrides: { '1': { reps: 8, weight: 40 } },
            },
          },
          savedAt: todayAtLocalTime(12),
          serverLogId: 'other-log',
          baseServerUpdatedAt: serverCompleted.updated_at,
        }),
      )

      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
          initialDraftLog={serverCompleted}
        />,
      )

      expect((await screen.findAllByDisplayValue('80')).length).toBeGreaterThan(0)
      expect(screen.queryAllByDisplayValue('40')).toHaveLength(0)
    })

    it('second completed edit sends the refreshed based_on_updated_at', async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const t1 = serverCompleted.updated_at
      const t2 = '2026-09-13T12:00:00.000Z'
      const onSaveProgress = jest
        .fn()
        .mockResolvedValueOnce({ id: serverCompleted.id, updated_at: t2 })
        .mockResolvedValueOnce({ id: serverCompleted.id, updated_at: '2026-09-13T12:01:00.000Z' })

      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
          onSaveProgress={onSaveProgress}
          initialDraftLog={serverCompleted}
        />,
      )

      expect((await screen.findAllByDisplayValue('80')).length).toBeGreaterThan(0)
      await act(async () => {
        jest.advanceTimersByTime(1200)
      })
      expect(onSaveProgress).toHaveBeenCalled()
      expect(onSaveProgress.mock.calls[0][0].based_on_updated_at).toBe(t1)

      await user.type(screen.getAllByDisplayValue('12')[0], '0')
      await act(async () => {
        jest.advanceTimersByTime(1200)
      })
      expect(onSaveProgress.mock.calls.length).toBeGreaterThanOrEqual(2)
      expect(onSaveProgress.mock.calls[1][0].based_on_updated_at).toBe(t2)
    })

    it('does not refresh the token when a stale write fails', async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const t1 = serverCompleted.updated_at
      const onSaveProgress = jest
        .fn()
        .mockRejectedValueOnce(new Error('stale_write'))
        .mockResolvedValueOnce({ id: serverCompleted.id, updated_at: '2026-09-13T12:00:00.000Z' })

      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
          onSaveProgress={onSaveProgress}
          initialDraftLog={serverCompleted}
        />,
      )

      expect((await screen.findAllByDisplayValue('80')).length).toBeGreaterThan(0)
      await act(async () => {
        jest.advanceTimersByTime(1200)
      })
      expect(onSaveProgress.mock.calls[0][0].based_on_updated_at).toBe(t1)
      expect(await screen.findByText(/guardado local activo/i)).toBeInTheDocument()

      await user.type(screen.getAllByDisplayValue('12')[0], '1')
      await act(async () => {
        jest.advanceTimersByTime(1200)
      })
      expect(onSaveProgress.mock.calls[1][0].based_on_updated_at).toBe(t1)
    })
  })

  describe('recovery', () => {
    it('refresh/app-kill remount restores the latest local reps', async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const view = render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: /comenzar entrenamiento/i }))
      await user.type(screen.getAllByPlaceholderText('10')[0], '8')
      await act(async () => {
        window.dispatchEvent(new Event('pagehide'))
      })
      view.unmount()

      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
        />,
      )

      expect((await screen.findAllByDisplayValue('8')).length).toBeGreaterThan(0)
    })

    it('offline local reps survive a failed autosave', async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const onSaveProgress = jest.fn().mockRejectedValue(new Error('network down'))

      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
          onSaveProgress={onSaveProgress}
        />,
      )

      await user.click(screen.getByRole('button', { name: /comenzar entrenamiento/i }))
      await user.type(screen.getAllByPlaceholderText('10')[0], '8')

      await act(async () => {
        jest.advanceTimersByTime(1200)
      })

      expect(JSON.stringify(readDraft())).toContain('"reps":8')
      expect(await screen.findByText(/guardado local activo/i)).toBeInTheDocument()
    })
  })

  describe('finalize', () => {
    it('waits for in-flight autosave then finalizes once', async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      let releaseAutosave: () => void = () => {}
      const onSaveProgress = jest.fn(
        () => new Promise<void>((resolve) => {
          releaseAutosave = resolve
        }),
      )
      const onComplete = jest.fn().mockResolvedValue(undefined)

      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={onComplete}
          onSaveProgress={onSaveProgress}
        />,
      )

      await user.click(screen.getByRole('button', { name: /comenzar entrenamiento/i }))
      await user.type(screen.getAllByPlaceholderText('10')[0], '8')
      await act(async () => {
        jest.advanceTimersByTime(1000)
      })
      expect(onSaveProgress).toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: /finalizar/i }))
      const saveButton = await screen.findByRole('button', { name: /^guardar$/i })
      await user.click(saveButton)
      await user.click(saveButton)

      expect(onComplete).not.toHaveBeenCalled()
      await act(async () => {
        releaseAutosave()
      })
      await act(async () => {
        await Promise.resolve()
      })
      expect(onComplete).toHaveBeenCalledTimes(1)
      expect(onComplete.mock.calls[0][0].exercises_data[0].sets[0].reps).toBe(8)
    })
  })

  describe('timers', () => {
    it('workout elapsed reflects wall-clock time after background', async () => {
      const user = userEvent.setup()
      const startedAt = 1_000_000
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(startedAt)

      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
        />,
      )

      await user.click(screen.getByRole('button', { name: /comenzar entrenamiento/i }))
      nowSpy.mockReturnValue(startedAt + 300_000)

      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
      })

      expect(screen.getAllByText('5:00').length).toBeGreaterThan(0)
      nowSpy.mockRestore()
    })
  })

  describe('reconnect', () => {
    it('retries server autosave after a failed offline write', async () => {
      jest.useFakeTimers()
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
      const onSaveProgress = jest
        .fn()
        .mockRejectedValueOnce(new Error('network down'))
        .mockResolvedValueOnce({ updated_at: '2026-09-13T12:00:00.000Z' })

      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
          onSaveProgress={onSaveProgress}
        />,
      )

      await user.click(screen.getByRole('button', { name: /comenzar entrenamiento/i }))
      await user.type(screen.getAllByPlaceholderText('10')[0], '8')
      await act(async () => {
        jest.advanceTimersByTime(1200)
      })
      expect(await screen.findByText(/guardado local activo/i)).toBeInTheDocument()

      await user.type(screen.getAllByPlaceholderText('10')[0], '1')
      await act(async () => {
        jest.advanceTimersByTime(1200)
      })

      expect(onSaveProgress).toHaveBeenCalledTimes(2)
      expect(await screen.findByText(/progreso guardado/i)).toBeInTheDocument()
    })
  })

  describe('user isolation', () => {
    it('does not read another user scoped workout key', async () => {
      window.localStorage.setItem(
        draftKey(2),
        JSON.stringify({
          isStarted: true,
          isPaused: false,
          elapsedSeconds: 10,
          completedExercises: ['exercise-item-1'],
          exerciseSets: {
            'exercise-item-1': {
              seriesCount: 1,
              base: { reps: 99, weight: 99 },
              overrides: {},
            },
          },
          savedAt: Date.now(),
        }),
      )

      render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
        />,
      )

      expect(screen.queryAllByDisplayValue('99')).toHaveLength(0)
    })
  })
})
