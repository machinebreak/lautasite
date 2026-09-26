import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { calculateMissionProgress } from '../lib/spaceProgress'
import { SpaceHero } from './SpaceHero'

describe('SpaceHero', () => {
  it('uses an accessible 2D fallback when WebGL is unavailable', () => {
    const { container } = render(
      <MemoryRouter>
        <SpaceHero />
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('heading', { name: 'Lautaro Bertucci' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View projects' })).toHaveAttribute(
      'href',
      '#projects',
    )
    expect(container.querySelector('.space-experience')).toHaveClass(
      'space-experience--fallback',
    )
    expect(container.querySelector('.space-experience')).toBeInTheDocument()
    expect(container.querySelector('.space-experience__fallback-saturn')).toBeInTheDocument()
    expect(container.querySelectorAll('.space-experience__fallback-planet')).toHaveLength(5)
    expect(screen.queryByText('LAUTA.SITE')).not.toBeInTheDocument()
  })

  it('maps the full project scroll distance from zero to one', () => {
    const viewportHeight = 900
    const missionHeight = viewportHeight * 3

    expect(calculateMissionProgress(viewportHeight, missionHeight, viewportHeight)).toBe(0)
    expect(calculateMissionProgress(-viewportHeight * 0.35, missionHeight, viewportHeight)).toBe(1)
  })
})
