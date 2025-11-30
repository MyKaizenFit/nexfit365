import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card'

describe('Card Components', () => {
  it('renders Card with content', () => {
    render(
      <Card>
        <CardContent>Card content</CardContent>
      </Card>
    )
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('renders Card with all subcomponents', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Card</CardTitle>
          <CardDescription>This is a test card</CardDescription>
        </CardHeader>
        <CardContent>Main content here</CardContent>
        <CardFooter>Footer content</CardFooter>
      </Card>
    )
    
    expect(screen.getByText('Test Card')).toBeInTheDocument()
    expect(screen.getByText('This is a test card')).toBeInTheDocument()
    expect(screen.getByText('Main content here')).toBeInTheDocument()
    expect(screen.getByText('Footer content')).toBeInTheDocument()
  })

  it('applies custom className to Card', () => {
    const { container } = render(<Card className="custom-card">Test</Card>)
    expect(container.firstChild).toHaveClass('custom-card')
  })

  it('renders CardHeader with correct structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Header Title</CardTitle>
        </CardHeader>
      </Card>
    )
    expect(screen.getByText('Header Title')).toBeInTheDocument()
  })
})

