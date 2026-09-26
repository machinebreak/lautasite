import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'

function navigate(path: string) {
  window.history.pushState({}, '', path)
}

describe('App', () => {
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

  it('renders the bio at the root route', () => {
    navigate('/')
    const { container } = render(<App />)

    expect(document.getElementById('bio-root')).toBeInTheDocument()
    expect(container.querySelector('header')).not.toBeNull()
    expect(
      screen.getByRole('heading', { name: 'Lautaro Bertucci' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Projects' }),
    ).toBeInTheDocument()
  })

  it('renders the space experience at /space', async () => {
    navigate('/space')
    render(<App />)

    expect(
      await screen.findByRole('heading', { name: 'Lautaro Bertucci' }),
    ).toBeInTheDocument()
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
    expect(document.getElementById('bio-root')).not.toBeInTheDocument()
  })
})
