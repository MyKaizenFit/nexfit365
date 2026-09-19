import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RestTimer } from '../rest-timer'

describe('RestTimer background clock', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('subtracts real elapsed time after returning from background', async () => {
    const user = userEvent.setup()
    const startedAt = 5_000_000
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(startedAt)

    render(<RestTimer defaultDuration={60} />)

    await user.click(screen.getByTitle('Iniciar'))
    nowSpy.mockReturnValue(startedAt + 30_000)

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(screen.getByText('0:30')).toBeInTheDocument()
  })

  it('reaches zero if background lasted longer than the rest', async () => {
    const user = userEvent.setup()
    const startedAt = 5_000_000
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(startedAt)

    render(<RestTimer defaultDuration={60} />)

    await user.click(screen.getByTitle('Iniciar'))
    nowSpy.mockReturnValue(startedAt + 90_000)

    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })

    expect(screen.getByText('0:00')).toBeInTheDocument()
  })
})
