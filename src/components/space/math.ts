// Utilidades matemáticas puras compartidas por la escena espacial.

export function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value))
}

export function smoothstep(min: number, max: number, value: number) {
  const normalized = clamp((value - min) / Math.max(0.0001, max - min))
  return normalized * normalized * (3 - 2 * normalized)
}

export function createSeededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
