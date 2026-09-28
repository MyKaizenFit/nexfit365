/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  TemplateAlreadyAssignedError,
  TEMPLATE_ALREADY_ASSIGNED_CODE,
  buildForceReassignPayload,
  isTemplateAlreadyAssignedError,
} from '@/lib/workout-assignment'

/**
 * Mini harness mirroring assign dialog + reassign confirmation from
 * workout-plan-management (submit lock + force_reassign on confirm).
 */
function AssignHarness({
  updatePlan,
}: {
  updatePlan: (payload: Record<string, unknown>) => Promise<{ created_user_program_ids?: string[] }>
}) {
  const [assigning, setAssigning] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null)
  const [status, setStatus] = useState('idle')

  const assign = async (force = false) => {
    try {
      setAssigning(true)
      const base = { assigned_user_ids: [4] }
      const payload = force && activeProgramId
        ? buildForceReassignPayload(base, { activeProgramId })
        : base
      const result = await updatePlan(payload)
      setStatus(`created:${(result.created_user_program_ids || []).join(',')}`)
      setShowConfirm(false)
    } catch (error) {
      if (isTemplateAlreadyAssignedError(error)) {
        setActiveProgramId(error.activeProgramId)
        setShowConfirm(true)
        setStatus('already_assigned')
        return
      }
      setStatus('error')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div>
      <Button onClick={() => void assign(false)} disabled={assigning}>
        {assigning ? 'Asignando...' : 'Asignar'}
      </Button>
      <div data-testid="status">{status}</div>
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Reasignar esta plantilla?</DialogTitle>
            <DialogDescription>
              Este usuario ya tiene una copia activa de esta plantilla.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowConfirm(false)
                setStatus('cancelled')
              }}
              disabled={assigning}
            >
              Cancelar
            </Button>
            <Button onClick={() => void assign(true)} disabled={assigning || !activeProgramId}>
              Reasignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

describe('assign dialog confirmation flow', () => {
  it('disables assign button while request is in flight', async () => {
    const user = userEvent.setup()
    let resolveRequest: (value: { created_user_program_ids: string[] }) => void = () => {}
    const updatePlan = jest.fn(
      () =>
        new Promise<{ created_user_program_ids: string[] }>((resolve) => {
          resolveRequest = resolve
        })
    )

    render(<AssignHarness updatePlan={updatePlan} />)
    await user.click(screen.getByRole('button', { name: 'Asignar' }))
    expect(screen.getByRole('button', { name: 'Asignando...' })).toBeDisabled()
    resolveRequest({ created_user_program_ids: ['p1'] })
    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('created:p1'))
  })

  it('shows confirmation on already_assigned and cancel does not force', async () => {
    const user = userEvent.setup()
    const updatePlan = jest.fn(async () => {
      throw new TemplateAlreadyAssignedError({
        code: TEMPLATE_ALREADY_ASSIGNED_CODE,
        detail: 'ya asignada',
        active_program_id: 'active-1',
      })
    })

    render(<AssignHarness updatePlan={updatePlan} />)
    await user.click(screen.getByRole('button', { name: 'Asignar' }))
    expect(await screen.findByText('¿Reasignar esta plantilla?')).toBeInTheDocument()
    expect(screen.getByTestId('status')).toHaveTextContent('already_assigned')

    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByTestId('status')).toHaveTextContent('cancelled')
    expect(updatePlan).toHaveBeenCalledTimes(1)
    const firstCall = updatePlan.mock.calls[0]?.[0] as Record<string, unknown>
    expect(firstCall).not.toHaveProperty('force_reassign')
  })

  it('confirm sends force_reassign and replace_active_program_id', async () => {
    const user = userEvent.setup()
    const updatePlan = jest
      .fn()
      .mockRejectedValueOnce(
        new TemplateAlreadyAssignedError({
          code: TEMPLATE_ALREADY_ASSIGNED_CODE,
          detail: 'ya asignada',
          active_program_id: 'active-1',
        })
      )
      .mockResolvedValueOnce({ created_user_program_ids: ['new-1'] })

    render(<AssignHarness updatePlan={updatePlan} />)
    await user.click(screen.getByRole('button', { name: 'Asignar' }))
    await screen.findByText('¿Reasignar esta plantilla?')
    await user.click(screen.getByRole('button', { name: 'Reasignar' }))

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('created:new-1'))
    expect(updatePlan).toHaveBeenCalledTimes(2)
    expect(updatePlan.mock.calls[1]?.[0]).toEqual({
      assigned_user_ids: [4],
      force_reassign: true,
      replace_active_program_id: 'active-1',
    })
  })
})
