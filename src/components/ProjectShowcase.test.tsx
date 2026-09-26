import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProjectShowcase } from './ProjectShowcase'

describe('ProjectShowcase', () => {
  afterEach(cleanup)

  it('exposes an accessible terminal trigger for every project', () => {
    render(<ProjectShowcase />)

    expect(
      screen.getByRole('button', { name: /Interact with the HardSeek project console/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Interact with the Futbolito project console/ }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Interact with the BeetBench project console/ }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Visit HardSeek/ })).toHaveAttribute(
      'href',
      'https://hardseek.net',
    )
  })

  it('emits the selected project id when a terminal trigger is pressed', () => {
    const onProjectOpen = vi.fn<(event: Event) => void>()
    window.addEventListener('space-project-open', onProjectOpen)
    render(<ProjectShowcase />)

    fireEvent.click(screen.getByRole('button', { name: /Interact with the Futbolito project console/ }))

    expect(onProjectOpen).toHaveBeenCalledTimes(1)
    expect((onProjectOpen.mock.calls[0]?.[0] as CustomEvent).detail).toEqual({
      projectId: 'futbolito',
    })
    window.removeEventListener('space-project-open', onProjectOpen)
  })

  it('does not create an HTML modal when a project-detail event is emitted', () => {
    render(<ProjectShowcase />)

    fireEvent(window, new Event('space-project-details'))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Visit HardSeek/ })).toBeInTheDocument()
  })
})
