// Precarga del chunk de /space: se dispara al hacer hover sobre los accesos a
// la experiencia espacial para que la navegación sea instantánea.
import { canRunSpaceScene } from './spaceCapabilities'

// Texturas que la escena 3D pide al boot: precalentadas en hover entran al
// cache del browser, así TextureLoader las resuelve al instante.
const SPACE_TEXTURES = [
  '/space/sun.webp',
  '/space/earth_atmos.webp',
  '/space/earth_normal.webp',
  '/space/earth_specular.webp',
  '/space/earth_clouds.webp',
  '/space/nebula.webp',
  '/space/moon.webp',
  '/space/venus.webp',
  '/space/mars.webp',
  '/space/saturn.webp',
]

let spacePreloaded = false
export function preloadSpacePage() {
  if (spacePreloaded) return
  spacePreloaded = true
  void import('../SpacePage')
  // Calentamos solo el chunk que va a usarse: la escena WebGL (three.js) en
  // dispositivos capaces, o el fallback liviano en el resto.
  if (canRunSpaceScene()) {
    void import('../components/SpaceHero')
    for (const src of SPACE_TEXTURES) {
      const img = new Image()
      img.src = src
    }
  } else {
    void import('../components/SpaceHeroLight')
  }
}
