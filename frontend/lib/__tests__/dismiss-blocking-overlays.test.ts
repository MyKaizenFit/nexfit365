import { dismissBlockingOverlays } from '@/lib/dismiss-blocking-overlays'

describe('dismissBlockingOverlays', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    document.body.style.pointerEvents = 'none'
    document.body.style.overflow = 'hidden'
    document.body.setAttribute('data-scroll-locked', '')
  })

  it('restores body pointer events and scroll lock', () => {
    dismissBlockingOverlays()

    expect(document.body.style.pointerEvents).toBe('')
    expect(document.body.style.overflow).toBe('')
    expect(document.body.hasAttribute('data-scroll-locked')).toBe(false)
  })

  it('removes radix focus guards and portal overlays', () => {
    const portal = document.createElement('div')
    portal.setAttribute('data-radix-portal', '')

    const wrapper = document.createElement('div')
    wrapper.setAttribute('data-radix-popper-content-wrapper', '')
    portal.appendChild(wrapper)
    document.body.appendChild(portal)

    const focusGuard = document.createElement('span')
    focusGuard.setAttribute('data-radix-focus-guard', '')
    document.body.appendChild(focusGuard)

    dismissBlockingOverlays()

    expect(document.querySelector('[data-radix-popper-content-wrapper]')).toBeNull()
    expect(document.querySelector('[data-radix-focus-guard]')).toBeNull()
  })
})
