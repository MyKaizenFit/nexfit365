import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExerciseCard } from '../exercise-card'
import { ExerciseVideoPlayer } from '../exercise-video-player'

const mockExercise = {
  id: '1',
  name: 'Push Up',
  category: 'Strength',
  muscle_groups: ['chest', 'triceps'],
  instructions: 'Keep your body straight and lower yourself',
  video_url: 'https://example.com/video.mp4',
  has_video: true,
}

const mockExerciseWithoutVideo = {
  id: '2',
  name: 'Plank',
  category: 'Core',
  muscle_groups: ['core'],
  instructions: 'Hold position',
  has_video: false,
}

describe('ExerciseCard', () => {
  it('renders exercise name and category', () => {
    render(<ExerciseCard exercise={mockExercise} />)
    expect(screen.getByText('Push Up')).toBeInTheDocument()
    expect(screen.getByText('Strength')).toBeInTheDocument()
  })

  it('shows video badge when exercise has video', () => {
    render(<ExerciseCard exercise={mockExercise} />)
    expect(screen.getByText('Video')).toBeInTheDocument()
  })

  it('does not show video badge when exercise has no video', () => {
    render(<ExerciseCard exercise={mockExerciseWithoutVideo} />)
    expect(screen.queryByText('Video')).not.toBeInTheDocument()
  })

  it('displays muscle groups as badges', () => {
    render(<ExerciseCard exercise={mockExercise} />)
    expect(screen.getByText('chest')).toBeInTheDocument()
    expect(screen.getByText('triceps')).toBeInTheDocument()
  })

  it('renders instructions when showDetails is true', () => {
    render(<ExerciseCard exercise={mockExercise} showDetails={true} />)
    expect(screen.getByText('Keep your body straight and lower yourself')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<ExerciseCard exercise={mockExercise} className="custom-class" />)
    const card = screen.getByText('Push Up').closest('.custom-class')
    expect(card).toBeInTheDocument()
  })

  it('handles exercise without muscle groups', () => {
    const exerciseNoMuscles = { ...mockExercise, muscle_groups: undefined }
    render(<ExerciseCard exercise={exerciseNoMuscles} />)
    expect(screen.getByText('Push Up')).toBeInTheDocument()
  })

  it('handles exercise without category', () => {
    const exerciseNoCategory = { ...mockExercise, category: undefined }
    render(<ExerciseCard exercise={exerciseNoCategory} />)
    expect(screen.getByText('Push Up')).toBeInTheDocument()
  })
})


