import { describe, expect, it } from 'vitest'
import { calculateRepulsion, capVelocity } from './particlePhysics'

describe('calculateRepulsion', () => {
  it('returns no force outside the brush radius', () => {
    expect(calculateRepulsion(50, 0, 40, 3)).toEqual({ x: 0, y: 0 })
  })

  it('pushes a particle away from the pointer', () => {
    const force = calculateRepulsion(10, 0, 40, 3)

    expect(force.x).toBeGreaterThan(0)
    expect(force.y).toBe(0)
  })
})

describe('capVelocity', () => {
  it('keeps slow velocities unchanged', () => {
    expect(capVelocity(2, 3, 10)).toEqual({ x: 2, y: 3 })
  })

  it('limits high velocity while preserving direction', () => {
    const velocity = capVelocity(30, 40, 10)

    expect(velocity.x).toBeCloseTo(6)
    expect(velocity.y).toBeCloseTo(8)
  })
})
