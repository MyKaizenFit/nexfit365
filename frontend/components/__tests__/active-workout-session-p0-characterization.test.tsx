/**
 * P0 characterization for ActiveWorkoutSession persistence (PR1).
 * No production changes.
 *
 * [characterization] = current behavior (PASS today)
 * [expected-until-fix] = product contract (test.failing until the fix PR)
 */
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActiveWorkoutSession } from '../active-workout-session'
import { todayLocalDate } from '@/lib/local-date'

jest.mock('../exercise-video-player', () => ({
  ExerciseVideoPlayer: () => <div data-testid="exercise-video-player" />,
}))

jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
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

function draftKey() {
  return `active_workout_${workoutDay.id}_${todayLocalDate()}`
}

function readDraft() {
  const raw = window.localStorage.getItem(draftKey())
  return raw ? JSON.parse(raw) : null
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

    it('[characterization] immediate set write is stored, then the 5s timer tick overwrites with the start closure', async () => {
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

      const afterInput = readDraft()
      expect(JSON.stringify(afterInput)).toContain('"reps":8')

      await act(async () => {
        jest.advanceTimersByTime(5000)
      })

      const afterTick = readDraft()
      expect(JSON.stringify(afterTick)).not.toContain('"reps":8')
    })

    it.failing('[expected-until-fix] 5s timer tick must keep the latest reps in localStorage', async () => {
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

    it('[characterization] visibilitychange/pagehide persist the latest input', async () => {
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
    it('[characterization] local draft hydrates over SERVER_COMPLETED and later autosave sends completed:true with local sets', async () => {
      jest.useFakeTimers()
      const onSaveProgress = jest.fn().mockResolvedValue(undefined)

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

      const { rerender } = render(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen={false}
          onClose={jest.fn()}
          onComplete={jest.fn()}
          onSaveProgress={onSaveProgress}
        />,
      )

      rerender(
        <ActiveWorkoutSession
          workoutDay={workoutDay}
          isOpen
          onClose={jest.fn()}
          onComplete={jest.fn()}
          onSaveProgress={onSaveProgress}
          initialDraftLog={{
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
          }}
        />,
      )

      expect((await screen.findAllByDisplayValue('40')).length).toBeGreaterThan(0)
      expect(screen.queryAllByDisplayValue('80')).toHaveLength(0)

      await act(async () => {
        jest.advanceTimersByTime(1000)
      })

      expect(onSaveProgress).toHaveBeenCalled()
      const payload = onSaveProgress.mock.calls[0][0]
      expect(payload.completed).toBe(true)
      expect(payload.notes).toBe('local draft T1')
      const firstSet = payload.exercises_data?.[0]?.sets?.[0]
      expect(firstSet.weight).toBe(40)
      expect(firstSet.reps).toBe(8)
    })

    it.failing('[expected-until-fix] SERVER_COMPLETED must win over an older local draft', async () => {
      jest.useFakeTimers()

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
          initialDraftLog={{
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
          }}
        />,
      )

      expect((await screen.findAllByDisplayValue('80')).length).toBeGreaterThan(0)
      expect(screen.queryAllByDisplayValue('40')).toHaveLength(0)
    })
  })
})
