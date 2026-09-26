// Detección compartida de capacidades para la experiencia espacial.
// La usa SpacePage para decidir si descarga el chunk de three.js (~150 kB gzip)
// y SpaceHero para elegir su modo inicial. Una sola fuente de verdad para
// "¿este dispositivo corre la escena WebGL o va directo al fallback 2D?".

let cachedWebGL: boolean | null = null

export function canUseWebGL(): boolean {
  if (cachedWebGL !== null) return cachedWebGL
  try {
    const probe = document.createElement('canvas')
    // Intentar sin failIfMajorPerformanceCaveat primero: no descartar iGPUs integradas
    // que reportan caveat pero rinden bien para esta escena de baja poly.
    const gl2 =
      probe.getContext('webgl2') ||
      probe.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    if (gl2) {
      cachedWebGL = true
      return true
    }
    const gl =
      probe.getContext('webgl') ||
      probe.getContext('webgl', { failIfMajorPerformanceCaveat: true })
    cachedWebGL = Boolean(gl)
    return cachedWebGL
  } catch {
    cachedWebGL = false
    return false
  }
}

export function resetSpaceCapabilitiesCache() {
  cachedWebGL = null
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    // Sin matchMedia asumimos el camino más conservador.
    return true
  }
}

function hasSlowConnection(): boolean {
  try {
    const connection = (
      navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string }
      }
    ).connection
    if (!connection) return false
    if (connection.saveData) return true
    const type = connection.effectiveType
    return type === 'slow-2g' || type === '2g'
  } catch {
    return false
  }
}

// true solo si vale la pena descargar y animar la escena 3D completa.
export function canRunSpaceScene(): boolean {
  return !prefersReducedMotion() && !hasSlowConnection() && canUseWebGL()
}
