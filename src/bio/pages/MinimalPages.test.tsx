import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useEffect, useRef } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { ThemeProvider } from '@/components/theme-provider'
import { ContentProvider, useContent } from '@/components/content-provider'
import { MinimalProjects } from './MinimalProjects'
import { MinimalExperience } from './MinimalExperience'
import { MinimalContact } from './MinimalContact'
import { MinimalWriting } from './MinimalWriting'
import { MinimalPhotos } from './MinimalPhotos'

function navigate(path: string) {
  window.history.pushState({}, '', path)
}

function renderPage(page: React.ReactNode, path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <ContentProvider>{page}</ContentProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

/** Sube N fotos al estudio como si fuera el owner, y recién ahí renderiza la página. */
function SeedPhotos({ count, children }: { count: number; children: React.ReactNode }) {
  const { ready, addPhotos, clearDrafts } = useContent()
  const seeded = useRef(false)
  useEffect(() => {
    if (!ready || seeded.current) return
    seeded.current = true
    const files = Array.from(
      { length: count },
      (_, i) => new File([new Uint8Array([1, 2, 3])], `foto-${i + 1}.jpg`, { type: 'image/jpeg' }),
    )
    // El driver en memoria es compartido en el archivo: limpiamos primero.
    void clearDrafts().then(() => addPhotos(files))
  }, [ready, count, addPhotos, clearDrafts])
  return <>{ready ? children : null}</>
}

function renderWithPhotos(count: number, path = '/photos') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <ContentProvider>
          <SeedPhotos count={count}>
            <MinimalPhotos onOpenPalette={() => undefined} />
          </SeedPhotos>
        </ContentProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('Minimal subpages', () => {
  afterEach(() => {
    cleanup()
    navigate('/')
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new Error('offline'))),
    )
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  })

  it('routes /projects to the minimal projects page', () => {
    navigate('/projects')
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Projects', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Search projects')).toBeInTheDocument()
  })

  it('filters projects by search query', () => {
    renderPage(<MinimalProjects onOpenPalette={() => undefined} />)

    fireEvent.change(screen.getByLabelText('Search projects'), {
      target: { value: 'quasar' },
    })

    expect(
      screen.getByRole('button', { name: /agent-aware terminal/ }),
    ).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Search projects'), {
      target: { value: 'zzz-no-match' },
    })

    expect(
      screen.queryByRole('button', { name: /agent-aware terminal/ }),
    ).not.toBeInTheDocument()
  })

  it('honours the ?search= param from the command palette', () => {
    renderPage(<MinimalProjects onOpenPalette={() => undefined} />, '/projects?search=quasarterm')

    expect(
      screen.getByRole('button', { name: /agent-aware terminal/ }),
    ).toBeInTheDocument()
    expect(screen.queryByText(/No projects match/)).not.toBeInTheDocument()
  })

  it('opens the project dialog from the projects page', async () => {
    renderPage(<MinimalProjects onOpenPalette={() => undefined} />)

    fireEvent.click(
      screen.getByRole('button', { name: /agent-aware terminal/ }),
    )

    expect(
      await screen.findByRole('dialog', { name: 'QuasarTerm' }),
    ).toBeInTheDocument()
  })

  it('renders the minimal experience page', () => {
    renderPage(<MinimalExperience onOpenPalette={() => undefined} />)

    expect(
      screen.getByRole('heading', { name: 'Experience', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('HardSeek').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('heading', { name: 'Building' }),
    ).toBeInTheDocument()
    expect(screen.getByText('BeetBench')).toBeInTheDocument()
  })

  it('renders the minimal contact page', () => {
    renderPage(<MinimalContact onOpenPalette={() => undefined} />)

    expect(
      screen.getByRole('heading', { name: 'Contact', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/machinebreak',
    )
  })

  it('lists the welcome post and links to its slug', async () => {
    renderPage(<MinimalWriting onOpenPalette={() => undefined} />, '/writing')

    const row = await screen.findByRole('link', {
      name: /hello, and what this place is for/i,
    })
    expect(row).toHaveAttribute('href', '/writing/hello-and-what-this-place-is-for')
    expect(screen.getByText(/3 min/)).toBeInTheDocument()
  })

  it('routes /photos to the masonry gallery', () => {
    navigate('/photos')
    render(<App />)

    expect(
      screen.getByRole('heading', { name: 'Photos', level: 1 }),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole('button', { name: /Open photo/ }).length,
    ).toBe(4)
    expect(
      screen.getByRole('button', { name: /Open photo 1, Plaza de Mayo/ }),
    ).toBeInTheDocument()
  })

  it('opens and navigates the detailed lightbox', async () => {
    renderPage(<MinimalPhotos onOpenPalette={() => undefined} />, '/photos')

    fireEvent.click(
      screen.getAllByRole('button', { name: /Open photo/ })[0],
    )

    expect(
      await screen.findByRole('dialog', { name: /Photo 1/ }),
    ).toBeInTheDocument()
    expect(screen.getByText('Camera')).toBeInTheDocument()
    expect(screen.getByText('Location')).toBeInTheDocument()
    expect(screen.getByText('iPhone 15 Pro Max')).toBeInTheDocument()
    expect(screen.getByText('1 / 4')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in photo' }))
    expect(screen.getByRole('button', { name: 'Zoom out photo' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next photo' }))
    expect(screen.getByRole('dialog', { name: /Photo 2/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zoom in photo' })).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: /Photo/ })).not.toBeInTheDocument()
  })

  it('marks studio uploads as drafts and only the owner sees them', async () => {
    await act(async () => {
      renderWithPhotos(1)
    })

    expect(
      screen.getByText(/en borrador/, { selector: '.lv-ph-drafts' }),
    ).toBeInTheDocument()
    const items = screen.getAllByRole('button', { name: /Open photo/ })
    expect(items).toHaveLength(5)
    // Las 4 publicadas van primero; el borrador va al final.
    expect(items[0]).toHaveAttribute('data-draft', 'false')
    expect(items[4]).toHaveAttribute('data-draft', 'true')
  })
})
