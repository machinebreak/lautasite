import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

// El sitio arranca sin fotos ni posts: comprobamos que los empty states
// queden bien en vez de romper.
vi.mock('@/data/content', () => ({
  content: { version: 1, exportedAt: '', photos: [], posts: [] },
  contentPhotos: [],
  contentPosts: [],
}))

const { MinimalPhotos } = await import('./MinimalPhotos')
const { MinimalWriting } = await import('./MinimalWriting')
const { PhotosCard } = await import('@/components/photos-card')
const { ContentProvider } = await import('@/components/content-provider')
const { ThemeProvider } = await import('@/components/theme-provider')

function renderPage(page: React.ReactNode, path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ThemeProvider>
        <ContentProvider>{page}</ContentProvider>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('empty content', () => {
  afterEach(() => cleanup())

  it('explains how to fill the gallery', () => {
    renderPage(<MinimalPhotos />, '/photos')

    expect(
      screen.getByRole('heading', { name: /todavía no hay fotos/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /studio/i })).toHaveAttribute(
      'href',
      '/studio',
    )
  })

  it('points the home teaser at the studio', () => {
    renderPage(<PhotosCard />, '/')

    const card = screen.getByRole('link', { name: /open the studio/i })
    expect(card).toHaveAttribute('href', '/studio')
    expect(screen.getByText(/no photos yet/i)).toBeInTheDocument()
  })

  it('invites the first post from the writing page', () => {
    renderPage(<MinimalWriting />, '/writing')

    expect(
      screen.getByRole('heading', { name: 'Writing', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText(/no posts yet/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /studio/i })).toHaveAttribute(
      'href',
      '/studio',
    )
  })
})
