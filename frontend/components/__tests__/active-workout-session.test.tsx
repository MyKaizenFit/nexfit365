import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ActiveWorkoutSession } from '../active-workout-session'

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

describe('ActiveWorkoutSession', () => {
  it('shows the target RPE in the exercise detail objective', () => {
    render(
      <ActiveWorkoutSession
        workoutDay={{
          ...workoutDay,
          exercises: [
            {
              ...workoutDay.exercises[0],
              sets: 3,
              reps: '12',
              weight: 'RPE 8',
            },
          ],
        }}
        isOpen
        onClose={jest.fn()}
        onComplete={jest.fn()}
      />
    )

    expect(screen.getByText('3 × 12 reps @ RPE 8')).toBeInTheDocument()
  })

  it('closes the workout detail from the mobile back button', async () => {
    const user = userEvent.setup()
    const onClose = jest.fn()

    render(
      <ActiveWorkoutSession
        workoutDay={workoutDay}
        isOpen
        onClose={onClose}
        onComplete={jest.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /volver/i }))

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  describe('server autosave', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.runOnlyPendingTimers()
      jest.useRealTimers()
      localStorage.clear()
    })

    it('does not autosave to the server on every workout timer tick', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    const onSaveProgress = jest.fn().mockResolvedValue(undefined)

    render(
      <ActiveWorkoutSession
        workoutDay={workoutDay}
        isOpen
        onClose={jest.fn()}
        onSaveProgress={onSaveProgress}
        onComplete={jest.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: /comenzar entrenamiento/i }))

    const repsInputs = screen.getAllByPlaceholderText('10')
    await user.type(repsInputs[0], '8')

    await act(async () => {
      jest.advanceTimersByTime(1_000)
    })

    const callsAfterProgress = onSaveProgress.mock.calls.length
    expect(callsAfterProgress).toBeLessThanOrEqual(1)

    await act(async () => {
      jest.advanceTimersByTime(5_000)
    })

    expect(onSaveProgress.mock.calls.length).toBe(callsAfterProgress)
    })
  })
})
