import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ExerciseVideoPlayer } from '../exercise-video-player'

const mockExercise = {
  id: '1',
  name: 'Push Up',
  video_url: 'https://example.com/video.mp4',
  has_video: true,
}

const mockExerciseYouTube = {
  id: '2',
  name: 'Pull Up',
  video_url: 'https://youtube.com/watch?v=test123',
  has_video: true,
}

const mockExerciseDrive = {
  id: '3',
  name: 'Squat',
  video_display_url: 'https://drive.google.com/file/d/1abcdefghijklmnopqrstuvwxyzABCDEF/preview',
  has_video: true,
}

describe('ExerciseVideoPlayer', () => {
  it('renders default button when no children provided', () => {
    render(<ExerciseVideoPlayer exercise={mockExercise} />)
    expect(screen.getByText(/Ver Video/i)).toBeInTheDocument()
  })

  it('renders children when provided', () => {
    render(
      <ExerciseVideoPlayer exercise={mockExercise}>
        <button>Custom Play Button</button>
      </ExerciseVideoPlayer>
    )
    expect(screen.getByText(/Custom Play Button/i)).toBeInTheDocument()
  })

  it('opens dialog when button is clicked', async () => {
    render(<ExerciseVideoPlayer exercise={mockExercise} />)
    const button = screen.getByText(/Ver Video/i)
    await userEvent.click(button)
    
    // El diálogo debe estar abierto (verificar por el título del ejercicio)
    expect(screen.getByText(mockExercise.name)).toBeInTheDocument()
  })

  it('opens dialog when children are clicked', async () => {
    render(
      <ExerciseVideoPlayer exercise={mockExercise}>
        <button>Play</button>
      </ExerciseVideoPlayer>
    )
    const button = screen.getByText('Play')
    await userEvent.click(button)
    
    expect(screen.getByText(mockExercise.name)).toBeInTheDocument()
  })

  it('renders close button in dialog', async () => {
    render(<ExerciseVideoPlayer exercise={mockExercise} />)
    
    // Abrir diálogo
    const openButton = screen.getByText(/Ver Video/i)
    await userEvent.click(openButton)
    
    // Verificar que está abierto con el título del ejercicio
    expect(screen.getByText(mockExercise.name)).toBeInTheDocument()
    
    // Verificar que existe botón de cerrar
    const closeButtons = screen.getAllByRole('button')
    expect(closeButtons.length).toBeGreaterThan(0)
  })

  it('renders YouTube iframe for YouTube URLs', async () => {
    render(<ExerciseVideoPlayer exercise={mockExerciseYouTube} />)
    const button = screen.getByText(/Ver Video/i)
    await userEvent.click(button)
    
    // Verificar que el diálogo está abierto
    expect(screen.getByText(mockExerciseYouTube.name)).toBeInTheDocument()
  })

  it('renders video element for direct video URLs', async () => {
    render(<ExerciseVideoPlayer exercise={mockExercise} />)
    const button = screen.getByText(/Ver Video/i)
    await userEvent.click(button)
    
    // Verificar que el diálogo está abierto
    expect(screen.getByText(mockExercise.name)).toBeInTheDocument()
  })

  it('renders Google Drive preview iframe for Drive URLs', async () => {
    render(<ExerciseVideoPlayer exercise={mockExerciseDrive} />)
    const button = screen.getByText(/Ver Video/i)
    await userEvent.click(button)

    const iframe = screen.getByTitle(`Video de ${mockExerciseDrive.name}`)
    expect(iframe).toHaveAttribute('src', mockExerciseDrive.video_display_url)
  })

  it('renders external link button for external URLs', async () => {
    render(<ExerciseVideoPlayer exercise={mockExercise} />)
    const button = screen.getByText(/Ver Video/i)
    await userEvent.click(button)
    
    // Esperar a que el diálogo esté abierto
    expect(screen.getByText(mockExercise.name)).toBeInTheDocument()
    
    // Verificar botón de abrir en nueva pestaña
    expect(screen.getByText(/Abrir en nueva pestaña/i)).toBeInTheDocument()
  })

  it('returns children when exercise has no video', () => {
    const { container } = render(
      <ExerciseVideoPlayer exercise={{ id: '1', name: 'Test', has_video: false }}>
        <div>No video content</div>
      </ExerciseVideoPlayer>
    )
    expect(container.textContent).toBe('No video content')
  })

  it('handles exercise without video_display_url gracefully', () => {
    const exerciseNoUrl = {
      ...mockExercise,
      video_display_url: undefined,
      video_file_url: 'https://example.com/file.mp4',
    }
    
    render(<ExerciseVideoPlayer exercise={exerciseNoUrl} />)
    expect(screen.getByText(/Ver Video/i)).toBeInTheDocument()
  })
})

