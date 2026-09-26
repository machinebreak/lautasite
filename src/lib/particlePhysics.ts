export interface Vector {
  x: number
  y: number
}

export function calculateRepulsion(
  dx: number,
  dy: number,
  radius: number,
  strength: number,
): Vector {
  const distanceSquared = dx * dx + dy * dy
  const radiusSquared = radius * radius

  if (distanceSquared >= radiusSquared) {
    return { x: 0, y: 0 }
  }

  const distance = Math.sqrt(distanceSquared) || 0.0001
  const falloff = 1 - distance / radius
  const force = falloff * falloff * strength

  return {
    x: (dx / distance) * force,
    y: (dy / distance) * force,
  }
}

export function capVelocity(
  vx: number,
  vy: number,
  maxSpeed: number,
): Vector {
  const speed = Math.sqrt(vx * vx + vy * vy)

  if (speed <= maxSpeed) {
    return { x: vx, y: vy }
  }

  return {
    x: (vx / speed) * maxSpeed,
    y: (vy / speed) * maxSpeed,
  }
}
