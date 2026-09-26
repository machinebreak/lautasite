import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MainLayout } from './MainLayout'
import { ContentProvider } from '@/components/content-provider'
import { DesignProvider } from '@/components/design-provider'
import { ThemeProvider } from '@/components/theme-provider'

function setup() {
  return render(
    <MemoryRouter>
      <DesignProvider>
        <ThemeProvider>
          <ContentProvider>
            <MainLayout onOpenPalette={() => undefined} />
          </ContentProvider>
        </ThemeProvider>
      </DesignProvider>
    </MemoryRouter>,
  )
}

describe('MainLayout interactions', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    localStorage.removeItem('lauta-site-design')
    document.documentElement.dataset.design = 'modern'
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        url.includes('api.github.com/repos/machinebreak/quasarterm')
          ? Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({ stargazers_count: 143800, forks_count: 34800 }),
            })
          : Promise.reject(new Error('offline')),
      ),
    )
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  })

  it('opens the project dialog on click with source link and repo stats', async () => {
    setup()

    fireEvent.click(
      screen.getByRole('button', { name: /agent-aware terminal/ }),
    )

    const dialog = await screen.findByRole('dialog', { name: 'QuasarTerm' })
    expect(dialog).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Source/ }),
    ).toHaveAttribute('href', 'https://github.com/machinebreak/quasarterm')

    // Repo stats con formato compacto
    expect(await screen.findByText('143.8k')).toBeInTheDocument()
    expect(await screen.findByText('34.8k')).toBeInTheDocument()

    // El scroll del body queda bloqueado mientras el diálogo está abierto
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('closes the project dialog with Escape', async () => {
    setup()

    fireEvent.click(
      screen.getByRole('button', { name: /agent-aware terminal/ }),
    )
    await screen.findByRole('dialog', { name: 'QuasarTerm' })

    fireEvent.keyDown(window, { key: 'Escape' })

    expect(
      screen.queryByRole('dialog', { name: 'QuasarTerm' }),
    ).not.toBeInTheDocument()
    expect(document.body.style.overflow).not.toBe('hidden')
  })

  it('renders the QuasarTerm dialog without screenshot expand', async () => {
    setup()

    fireEvent.click(
      screen.getByRole('button', { name: /agent-aware terminal/ }),
    )
    await screen.findByRole('dialog', { name: 'QuasarTerm' })

    expect(
      screen.queryByRole('button', { name: 'Expand screenshot' }),
    ).not.toBeInTheDocument()
  })

  it('opens an info dialog when clicking a building row', async () => {
    setup()

    fireEvent.click(screen.getByRole('button', { name: /BeetBench logo/ }))

    const dialog = await screen.findByRole('dialog', { name: 'BeetBench' })
    expect(dialog).toBeInTheDocument()
    expect(
      screen.getByText('Benchmarks for games and FPS tracking.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Live/ })).toHaveAttribute(
      'href',
      'https://beetbench.com',
    )
  })

  it('renders the photos teaser linking to the gallery', () => {
    setup()

    const card = screen.getByRole('link', { name: /go to photos/i })
    expect(card).toHaveAttribute('href', '/photos')
    expect(card.querySelectorAll('img').length).toBe(3)
    expect(screen.getByText('click to see photos')).toBeInTheDocument()
  })

  it('renders the go-to-space card linking to /space', () => {
    setup()

    const card = screen.getByRole('link', { name: /go to space/i })
    expect(card).toBeInTheDocument()
    expect(card).toHaveAttribute('href', '/space')
    expect(screen.getByText('click to go to space')).toBeInTheDocument()
  })

  it('defaults the showcase to space and switches with the dots', () => {
    setup()

    const spaceDot = screen.getByRole('tab', { name: 'Show space card' })
    const photosDot = screen.getByRole('tab', { name: 'Show photos card' })
    expect(spaceDot).toHaveAttribute('aria-selected', 'true')
    expect(photosDot).toHaveAttribute('aria-selected', 'false')

    fireEvent.click(photosDot)
    expect(photosDot).toHaveAttribute('aria-selected', 'true')
    expect(spaceDot).toHaveAttribute('aria-selected', 'false')
  })

  it('lets a pixel beetle out and shoos it away', async () => {
    vi.useFakeTimers()
    setup()

    fireEvent.click(
      screen.getByRole('button', { name: /pixel beetle.*hiding/ }),
    )
    const beetle = screen.getByRole('button', {
      name: /pixel beetle.*scurrying/,
    })
    expect(beetle).toBeInTheDocument()

    fireEvent.click(beetle)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(
      screen.queryByRole('button', { name: /pixel beetle.*scurrying/ }),
    ).not.toBeInTheDocument()
  })

  it('switches between modern and 2000 web designs', async () => {
    setup()

    fireEvent.click(
      screen.getByRole('button', { name: /open time machine/i }),
    )
    const group = screen.getByRole('radiogroup', { name: /choose website design/i })
    expect(group).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: /choose a website era/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: /2000 web/i }))
    expect(document.documentElement.dataset.design).toBe('retro2000')
    expect(localStorage.getItem('lauta-site-design')).toBe('retro2000')

    // El portal se cierra solo tras la animación de salto
    await waitFor(() =>
      expect(
        screen.queryByRole('radiogroup', { name: /choose website design/i }),
      ).not.toBeInTheDocument(),
    )

    fireEvent.click(
      screen.getByRole('button', { name: /open time machine/i }),
    )
    fireEvent.click(screen.getByRole('radio', { name: /modern web/i }))
    expect(document.documentElement.dataset.design).toBe('modern')
    expect(localStorage.getItem('lauta-site-design')).toBe('modern')
  })

  it('previews an era in the portal without applying it and closes on Escape', async () => {
    setup()

    fireEvent.click(
      screen.getByRole('button', { name: /open time machine/i }),
    )
    const retro = screen.getByRole('radio', { name: /2000 web/i })

    retro.focus()
    fireEvent.pointerMove(retro)
    expect(document.documentElement.dataset.design).toBe('modern')
    expect(retro).toHaveAttribute('data-preview', 'true')

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() =>
      expect(
        screen.queryByRole('radiogroup', { name: /choose website design/i }),
      ).not.toBeInTheDocument(),
    )
  })
})
