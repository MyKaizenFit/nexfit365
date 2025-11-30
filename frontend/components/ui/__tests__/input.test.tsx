import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../input'

describe('Input', () => {
  it('renders an input field', () => {
    render(<Input placeholder="Enter text" />)
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
  })

  it('accepts and displays value', () => {
    render(<Input defaultValue="Hello World" />)
    const input = screen.getByDisplayValue('Hello World')
    expect(input).toBeInTheDocument()
  })

  it('handles user input', async () => {
    const user = userEvent.setup()
    render(<Input />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'test input')
    
    expect(input).toHaveValue('test input')
  })

  it('handles onChange callback', async () => {
    const handleChange = jest.fn()
    const user = userEvent.setup()
    render(<Input onChange={handleChange} />)
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'a')
    
    expect(handleChange).toHaveBeenCalled()
  })

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled />)
    const input = screen.getByRole('textbox')
    expect(input).toBeDisabled()
  })

  it('applies custom className', () => {
    const { container } = render(<Input className="custom-input" />)
    expect(container.firstChild).toHaveClass('custom-input')
  })

  it('renders different input types', () => {
    const { rerender } = render(<Input type="email" />)
    expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
    
    rerender(<Input type="password" />)
    expect(screen.getByDisplayValue('')).toHaveAttribute('type', 'password')
  })

  it('supports controlled component pattern', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Input value="initial" onChange={() => {}} />)
    
    const input = screen.getByDisplayValue('initial')
    expect(input).toHaveValue('initial')
    
    rerender(<Input value="updated" onChange={() => {}} />)
    expect(input).toHaveValue('updated')
  })
})

