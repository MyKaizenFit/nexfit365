import { render, screen } from '@testing-library/react'
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
})
