import { render, screen } from '@testing-library/react'
import { Badge } from '../badge'

describe('Badge', () => {
  it('renders badge with text', () => {
    render(<Badge>New</Badge>)
    expect(screen.getByText('New')).toBeInTheDocument()
  })

  it('applies default variant', () => {
    const { container } = render(<Badge>Default</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-primary')
  })

  it('applies secondary variant', () => {
    const { container } = render(<Badge variant="secondary">Secondary</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-secondary')
  })

  it('applies destructive variant', () => {
    const { container } = render(<Badge variant="destructive">Delete</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('bg-destructive')
  })

  it('applies outline variant', () => {
    const { container } = render(<Badge variant="outline">Outline</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('text-foreground')
  })

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-badge">Custom</Badge>)
    const badge = container.firstChild as HTMLElement
    expect(badge).toHaveClass('custom-badge')
  })

  it('renders with different content types', () => {
    render(
      <>
        <Badge>Text content</Badge>
        <Badge><span>Span content</span></Badge>
        <Badge><strong>Bold content</strong></Badge>
      </>
    )
    
    expect(screen.getByText('Text content')).toBeInTheDocument()
    expect(screen.getByText('Span content')).toBeInTheDocument()
    expect(screen.getByText('Bold content')).toBeInTheDocument()
  })
})

