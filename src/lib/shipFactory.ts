import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { Project } from '../data/projects'

export type ShipVariant = 'explorer' | 'racer' | 'benchmark'
export type StationMode = 'standby' | 'overview' | 'details'

export interface StationPalette {
  accent: string
  accentSoft: string
  panel: string
  panelLine: string
  hull: number
  light: number
}

export interface NavLight {
  sprite: THREE.Sprite
  phase: number
  baseOpacity: number
}

export interface HullMonitor {
  group: THREE.Group
  screenMaterial: THREE.MeshBasicMaterial
  glowMaterial: THREE.SpriteMaterial
}

export interface ShipBundle {
  group: THREE.Group
  screenAnchor: THREE.Object3D
  screenAssembly: THREE.Group
  screenMesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>
  screenWorldWidth: number
  solarTexture: THREE.Texture
  screenMaterial: THREE.MeshBasicMaterial
  screenBezelMaterial: THREE.MeshStandardMaterial
  engineGlows: THREE.Sprite[]
  engineTrailMaterials: THREE.MeshBasicMaterial[]
  standbyScreenTexture: THREE.Texture
  // Las texturas overview/details se generan lazy: solo cuando la consola
  // abre ese modo. Ahorra ~6 canvas de 1400px en el arranque de la escena.
  openScreenTexture: THREE.CanvasTexture | null
  detailsScreenTexture: THREE.CanvasTexture | null
  hullMonitor: HullMonitor
  navLights: NavLight[]
  scanDish: THREE.Group | null
  beaconMaterial: THREE.MeshStandardMaterial | null
}

export function createRadialTexture(inner: string, middle: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 96
  canvas.height = 96
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(48, 48, 0, 48, 48, 48)
    gradient.addColorStop(0, inner)
    gradient.addColorStop(0.2, middle)
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 96, 96)
  }
  return new THREE.CanvasTexture(canvas)
}

function createCanvasTexture(
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D) => void,
) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (context) draw(context)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function projectCopy(project: Project) {
  if (project.id === 'futbolito') {
    return ['Minigames and quizzes for football fans.', 'Compete, guess right and live every match.']
  }
  if (project.id === 'beetbench') {
    return ['Game benchmarks and FPS tracking.', "Understand how your PC performs in every game."]
  }
  return ['Hardware search engine to compare prices.', 'Explore products, prices and alternatives.']
}

export function createSolarPanelTexture(panel: string, panelLine: string) {
  return createCanvasTexture(512, 256, (context) => {
    const gradient = context.createLinearGradient(0, 0, 512, 256)
    gradient.addColorStop(0, '#081226')
    gradient.addColorStop(0.5, panel)
    gradient.addColorStop(1, '#071020')
    context.fillStyle = gradient
    context.fillRect(0, 0, 512, 256)

    const columns = 8
    const rows = 4
    const cellWidth = 512 / columns
    const cellHeight = 256 / rows
    for (let column = 0; column < columns; column += 1) {
      for (let row = 0; row < rows; row += 1) {
        const sheen = context.createLinearGradient(
          column * cellWidth,
          row * cellHeight,
          (column + 1) * cellWidth,
          (row + 1) * cellHeight,
        )
        sheen.addColorStop(0, 'rgba(190,222,255,.09)')
        sheen.addColorStop(0.55, 'rgba(190,222,255,0)')
        context.fillStyle = sheen
        context.fillRect(column * cellWidth + 2, row * cellHeight + 2, cellWidth - 4, cellHeight - 4)
      }
    }

    context.strokeStyle = panelLine
    context.lineWidth = 2
    for (let column = 0; column <= columns; column += 1) {
      context.beginPath()
      context.moveTo(column * cellWidth, 0)
      context.lineTo(column * cellWidth, 256)
      context.stroke()
    }
    for (let row = 0; row <= rows; row += 1) {
      context.beginPath()
      context.moveTo(0, row * cellHeight)
      context.lineTo(512, row * cellHeight)
      context.stroke()
    }

    context.fillStyle = 'rgba(216,229,244,.34)'
    for (let row = 1; row < rows; row += 1) {
      context.fillRect(0, row * cellHeight - 2, 512, 3)
    }
  })
}

export function createMissionDisplayTexture(
  mode: StationMode,
  project: Project,
  palette: StationPalette,
) {
  const isMobile =
    typeof window !== 'undefined' &&
    window.matchMedia('(max-width: 760px)').matches
  // En móvil la textura se ve a <1.5u y DPR<=1.2: 700x380 es 4x menos memoria
  // y se estira sin pérdida perceptible (el panel del casco es <8% del viewport).
  const width = isMobile ? 700 : 1400
  const height = isMobile ? 380 : 760
  const scale = width / 1400
  return createCanvasTexture(width, height, (context) => {
    context.scale(scale, scale)
    const W = 1400
    const H = 760
    const [copyFirst, copySecond] = projectCopy(project)
    const hostname = project.url.replace(/^https?:\/\//, '').replace(/\/$/, '')
    const seed = Number.parseInt(project.number, 10) || 1
    const statusLabel = project.status.toUpperCase()
    const SANS = '"Geist Variable", Geist, sans-serif'
    const MONO = '"Geist Mono Variable", ui-monospace, Menlo, monospace'

    // ---------- Fondo: display opaco, casi negro ----------
    // Una pantalla de nave real no es una ventana: fondo plano oscuro +
    // retícula fina. Sin starfield, sin glows radiales, sin barridos.
    context.fillStyle = '#040910'
    context.fillRect(0, 0, W, H)

    // Retícula fina de display
    context.strokeStyle = 'rgba(140,185,230,.06)'
    context.lineWidth = 1
    context.beginPath()
    for (let gx = 104; gx <= W - 64; gx += 76) {
      context.moveTo(gx, 150)
      context.lineTo(gx, H - 60)
    }
    for (let gy = 150; gy <= H - 60; gy += 76) {
      context.moveTo(64, gy)
      context.lineTo(W - 64, gy)
    }
    context.stroke()

    // Scanlines + viñeta leve
    context.fillStyle = 'rgba(150,195,250,.028)'
    for (let y = 8; y < H; y += 5) context.fillRect(0, y, W, 1)
    const vignette = context.createRadialGradient(W / 2, H / 2, 320, W / 2, H / 2, 920)
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,.42)')
    context.fillStyle = vignette
    context.fillRect(0, 0, W, H)

    // ---------- Marco: borde 1px + esquinas ----------
    context.strokeStyle = 'rgba(150,190,225,.30)'
    context.lineWidth = 1
    context.strokeRect(28.5, 28.5, W - 57, H - 57)
    // Esquinas de acento
    context.strokeStyle = palette.accent
    context.lineWidth = 3
    const corner = 44
    const inset = 28
    const corners: Array<[number, number, number, number]> = [
      [inset, inset, 1, 1],
      [W - inset, inset, -1, 1],
      [inset, H - inset, 1, -1],
      [W - inset, H - inset, -1, -1],
    ]
    for (const [cx, cy, dx, dy] of corners) {
      context.beginPath()
      context.moveTo(cx + dx * corner, cy)
      context.lineTo(cx, cy)
      context.lineTo(cx, cy + dy * corner)
      context.stroke()
    }
    // Divisor bajo cabecera
    context.strokeStyle = 'rgba(150,190,225,.22)'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(64, 132)
    context.lineTo(W - 64, 132)
    context.stroke()

    // ---------- Cabecera: terminal + estado + × ----------
    context.textAlign = 'left'
    context.textBaseline = 'alphabetic'
    context.fillStyle = '#d7e4f2'
    context.font = `700 25px ${MONO}`
    context.fillText(`TRM-${project.number} // DATA LINK`, 64, 96)
    context.fillStyle = 'rgba(140,170,200,.55)'
    context.font = `600 19px ${MONO}`
    context.fillText(statusLabel, 392, 95)

    const modeLabel =
      mode === 'details' ? '● LINKED' : mode === 'overview' ? '● LINKING' : '○ STANDBY'
    const modeColor =
      mode === 'details' ? '#7ee2a0' : mode === 'overview' ? '#ffc37a' : 'rgba(150,180,210,.65)'
    context.textAlign = 'right'
    context.fillStyle = modeColor
    context.font = `700 21px ${MONO}`
    context.fillText(modeLabel, W - 150, 96)
    context.textAlign = 'left'
    // Botón × (zona de cierre: uv.x > .88, uv.y > .78 → arriba a la derecha)
    context.strokeStyle = 'rgba(180,212,248,.45)'
    context.lineWidth = 2
    context.beginPath()
    context.arc(W - 84, 90, 26, 0, Math.PI * 2)
    context.stroke()
    context.fillStyle = '#dfeaf7'
    context.font = `400 36px ${SANS}`
    context.textAlign = 'center'
    context.fillText('×', W - 84, 103)
    context.textAlign = 'left'

    // ---------- Línea de estado ----------
    const stateText =
      mode === 'details'
        ? 'LINK STABLE — CHANNEL OPEN'
        : mode === 'overview'
          ? 'NEGOTIATING UPLINK'
          : 'SCANNING FOR SIGNAL'
    const stateColor =
      mode === 'details' ? '#7ee2a0' : mode === 'overview' ? '#ffc37a' : 'rgba(150,180,210,.7)'
    context.font = `700 23px ${MONO}`
    context.fillStyle = stateColor
    context.fillText(`▸ ${stateText}`, 64, 188)
    context.textAlign = 'right'
    context.fillStyle = 'rgba(140,170,200,.5)'
    context.font = `600 19px ${MONO}`
    context.fillText(`CH-${project.number}`, W - 64, 188)
    context.textAlign = 'left'
    context.strokeStyle = 'rgba(150,190,225,.14)'
    context.lineWidth = 1
    context.beginPath()
    context.moveTo(64, 214)
    context.lineTo(W - 64, 214)
    context.stroke()

    // ---------- Ficha del proyecto ----------
    if (mode === 'details') {
      const title = project.title.toUpperCase()
      context.fillStyle = 'rgba(140,170,200,.55)'
      context.font = `700 19px ${MONO}`
      context.fillText(`FILE // ${project.id.toUpperCase()}_${project.number}`, 64, 282)
      context.fillStyle = '#e8f1fa'
      context.font = `700 64px ${MONO}`
      context.fillText(title, 60, 356)
      context.fillStyle = '#93a9c2'
      context.font = `500 27px ${SANS}`
      context.fillText(copyFirst, 64, 398)
      context.fillStyle = '#71879f'
      context.font = `500 24px ${SANS}`
      context.fillText(copySecond, 64, 430)

      // Meta: REF / STATUS / DEST en una sola fila
      const metaY = 492
      const meta: Array<[number, string, string]> = [
        [64, 'REF', `${project.id}_${project.number}.dat`],
        [430, 'STATUS', statusLabel],
        [730, 'DEST', hostname],
      ]
      for (const [x, label, value] of meta) {
        context.fillStyle = 'rgba(140,170,200,.5)'
        context.font = `700 17px ${MONO}`
        context.fillText(label, x, metaY)
        context.fillStyle = '#dbe7f4'
        context.font = `700 23px ${MONO}`
        context.fillText(value, x, metaY + 32)
      }
      context.fillStyle = 'rgba(150,190,225,.25)'
      context.fillRect(64, metaY + 54, 886, 1)

      // ---------- Panel lateral: estado del enlace ----------
      const panelX = 980
      const panelW = W - 64 - panelX
      context.strokeStyle = 'rgba(150,190,225,.25)'
      context.lineWidth = 1
      context.strokeRect(panelX + 0.5, 250.5, panelW - 1, 342)
      context.fillStyle = '#d7e4f2'
      context.font = `700 19px ${MONO}`
      context.fillText('LINK', panelX + 24, 292)
      const ping = 34 + seed * 4
      const down = (11 + seed * 1.8).toFixed(1)
      const sig = -(62 + seed * 2)
      const linkRows: Array<[string, string]> = [
        ['PING', `${ping} MS`],
        ['DOWN', `${down} MB/S`],
        ['SIG', `${sig} DBM`],
        ['ERR', '0'],
      ]
      linkRows.forEach(([label, value], i) => {
        const y = 344 + i * 62
        context.fillStyle = 'rgba(140,170,200,.5)'
        context.font = `600 17px ${MONO}`
        context.fillText(label, panelX + 24, y)
        context.fillStyle = '#dbe7f4'
        context.font = `700 25px ${MONO}`
        context.fillText(value, panelX + 24, y + 32)
        if (i < linkRows.length - 1) {
          context.strokeStyle = 'rgba(150,190,225,.12)'
          context.beginPath()
          context.moveTo(panelX + 24, y + 46)
          context.lineTo(panelX + panelW - 24, y + 46)
          context.stroke()
        }
      })

      // ---------- Botón visitar (zona clic: x 56-770, y > 608) ----------
      context.fillStyle = '#0a1622'
      context.fillRect(84, 642, 566, 70)
      context.strokeStyle = palette.accent
      context.lineWidth = 2
      context.strokeRect(84, 642, 566, 70)
      context.fillStyle = palette.accent
      context.font = `800 23px ${MONO}`
      context.fillText(`▸ OPEN ${title}  ↗`, 118, 686)

      context.textAlign = 'right'
      context.fillStyle = 'rgba(140,170,200,.5)'
      context.font = `600 18px ${MONO}`
      context.fillText('ESC / × — CLOSE', W - 64, 686)
      context.textAlign = 'left'
    } else if (mode === 'overview') {
      // ---------- Enlace en curso: % grande + barra fina + registro ----------
      context.fillStyle = '#d7e4f2'
      context.font = `700 28px ${MONO}`
      context.fillText('ESTABLISHING UPLINK', 64, 300)
      context.textAlign = 'right'
      context.fillStyle = '#ffc37a'
      context.font = `700 76px ${MONO}`
      context.fillText('68%', W - 64, 322)
      context.textAlign = 'left'
      // Barra fina de progreso
      context.fillStyle = 'rgba(150,180,210,.18)'
      context.fillRect(64, 352, W - 128, 3)
      context.fillStyle = palette.accent
      context.fillRect(64, 352, (W - 128) * 0.68, 3)
      // Registro con timestamp
      const logLines: Array<[string, string, boolean]> = [
        ['T+00:01 · HANDSHAKE', 'OK', true],
        ['T+00:02 · DECRYPT', 'OK', true],
        ['T+00:03 · SYNC PAYLOAD', '…', false],
      ]
      context.font = `600 22px ${MONO}`
      logLines.forEach(([label, state, done], i) => {
        const y = 448 + i * 46
        context.fillStyle = 'rgba(150,180,210,.6)'
        context.fillText(label, 64, y)
        context.fillStyle = done ? '#7ee2a0' : '#ffc37a'
        context.fillText(state, 560, y)
      })
      context.fillStyle = 'rgba(140,170,200,.5)'
      context.font = `600 19px ${MONO}`
      context.fillText(`UPLINK // CH-${project.number}`, 64, 690)
      context.textAlign = 'right'
      context.fillText('× — ABORT', W - 64, 690)
      context.textAlign = 'left'
    } else {
      // ---------- Reposo: retícula + acople ----------
      const reticleX = W / 2
      const reticleY = 380
      context.strokeStyle = 'rgba(150,190,225,.35)'
      context.lineWidth = 2
      context.beginPath()
      context.arc(reticleX, reticleY, 104, 0, Math.PI * 2)
      context.stroke()
      // Marcas cardinales
      context.strokeStyle = 'rgba(150,190,225,.30)'
      context.beginPath()
      context.moveTo(reticleX - 140, reticleY)
      context.lineTo(reticleX - 116, reticleY)
      context.moveTo(reticleX + 116, reticleY)
      context.lineTo(reticleX + 140, reticleY)
      context.moveTo(reticleX, reticleY - 140)
      context.lineTo(reticleX, reticleY - 116)
      context.moveTo(reticleX, reticleY + 116)
      context.lineTo(reticleX, reticleY + 140)
      context.stroke()
      // Blip de señal
      context.fillStyle = palette.accent
      context.fillRect(reticleX + 56, reticleY - 62, 10, 10)
      context.textAlign = 'center'
      context.fillStyle = 'rgba(150,180,210,.7)'
      context.font = `600 23px ${MONO}`
      context.fillText('AWAITING UPLINK', reticleX, 238)
      context.textAlign = 'left'
      // ---------- Botón de acople ----------
      const btnW = 560
      const btnH = 72
      const btnX = (W - btnW) / 2
      const btnY = 592
      context.fillStyle = '#0a1622'
      context.fillRect(btnX, btnY, btnW, btnH)
      context.strokeStyle = palette.accent
      context.lineWidth = 2
      context.strokeRect(btnX, btnY, btnW, btnH)
      context.fillStyle = palette.accent
      context.font = `800 24px ${MONO}`
      context.textAlign = 'center'
      context.fillText('▸ TAP TO CONNECT', W / 2, btnY + 46)
      context.textAlign = 'left'
    }
  })
}

interface ShipMaterialSet {
  hull: THREE.MeshStandardMaterial
  dark: THREE.MeshStandardMaterial
  trim: THREE.MeshStandardMaterial
  accent: THREE.MeshStandardMaterial
  accentGlow: THREE.MeshStandardMaterial
  glass: THREE.MeshPhysicalMaterial
  solar: THREE.MeshStandardMaterial
  engineCore: THREE.MeshBasicMaterial
}

function createMaterialSet(
  palette: StationPalette,
  solarTexture: THREE.Texture,
  envMap?: THREE.Texture,
): ShipMaterialSet {
  const applyEnv = (material: THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial, intensity: number) => {
    if (!envMap) return
    material.envMap = envMap
    material.envMapIntensity = intensity
  }

  // Casco con acabado satinado (no espejo): así el sol point light y los
  // fills de la escena tiñen poco y la nave se lee igual en cualquier sector.
  // La consistencia la dan envMap + emissive propio + su localLight.
  const hull = new THREE.MeshStandardMaterial({
    color: palette.hull,
    roughness: 0.52,
    metalness: 0.55,
    emissive: new THREE.Color(palette.hull).multiplyScalar(0.1),
  })
  applyEnv(hull, 0.5)
  const dark = new THREE.MeshStandardMaterial({
    color: 0x141a22,
    roughness: 0.5,
    metalness: 0.6,
    emissive: new THREE.Color(0x141a22).multiplyScalar(0.4),
  })
  applyEnv(dark, 0.5)
  const trim = new THREE.MeshStandardMaterial({
    color: 0xd3dade,
    roughness: 0.42,
    metalness: 0.6,
    emissive: new THREE.Color(0xd3dade).multiplyScalar(0.06),
  })
  applyEnv(trim, 0.5)
  const accent = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.accent),
    emissive: new THREE.Color(palette.accent).multiplyScalar(0.16),
    emissiveIntensity: 0.5,
    roughness: 0.4,
    metalness: 0.4,
  })
  applyEnv(accent, 0.5)
  const accentGlow = new THREE.MeshStandardMaterial({
    color: new THREE.Color(palette.accent),
    emissive: new THREE.Color(palette.accent).multiplyScalar(0.45),
    emissiveIntensity: 0.75,
    roughness: 0.4,
    metalness: 0.2,
  })
  const glass = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(palette.panel).lerp(new THREE.Color(0x9fd4ff), 0.55),
    emissive: new THREE.Color(palette.accent).multiplyScalar(0.1),
    roughness: 0.07,
    metalness: 0.05,
    clearcoat: 1,
    clearcoatRoughness: 0.06,
    transparent: true,
    opacity: 0.88,
  })
  applyEnv(glass, 0.45)
  const solar = new THREE.MeshStandardMaterial({
    map: solarTexture,
    color: new THREE.Color(palette.panel).lerp(new THREE.Color(0xffffff), 0.22),
    roughness: 0.5,
    metalness: 0.35,
    side: THREE.DoubleSide,
  })
  applyEnv(solar, 0.5)
  const engineCore = new THREE.MeshBasicMaterial({
    color: new THREE.Color(palette.light),
    toneMapped: false,
  })

  return { hull, dark, trim, accent, accentGlow, glass, solar, engineCore }
}

function latheAlongX(profile: Array<[number, number]>, radialSegments = 56): THREE.LatheGeometry {
  const control = profile.map(([radius, axis]) => new THREE.Vector3(radius, axis, 0))
  const curve = new THREE.CatmullRomCurve3(control, false, 'centripetal')
  const points = curve
    .getPoints(Math.max(28, profile.length * 9))
    .map((point) => new THREE.Vector2(Math.max(0.004, point.x), point.y))
  const geometry = new THREE.LatheGeometry(points, radialSegments)
  geometry.rotateZ(-Math.PI / 2)
  return geometry
}

interface EnginePod {
  group: THREE.Group
  glow: THREE.Sprite
  trailMaterial: THREE.MeshBasicMaterial
}

function createEnginePod(
  materials: ShipMaterialSet,
  palette: StationPalette,
  glowTexture: THREE.Texture,
  size: number,
): EnginePod {
  const group = new THREE.Group()

  const bell = new THREE.Mesh(
    latheAlongX(
      [
        [0.31, -0.6],
        [0.27, -0.32],
        [0.19, 0.04],
        [0.16, 0.3],
        [0.21, 0.5],
      ],
      40,
    ),
    materials.dark,
  )
  bell.scale.setScalar(size)
  group.add(bell)

  const throat = new THREE.Mesh(
    new THREE.TorusGeometry(0.175 * size, 0.038 * size, 12, 32),
    materials.trim,
  )
  throat.rotation.y = Math.PI / 2
  throat.position.x = 0.44 * size
  group.add(throat)

  const core = new THREE.Mesh(new THREE.CircleGeometry(0.2 * size, 28), materials.engineCore)
  core.rotation.y = -Math.PI / 2
  core.position.x = -0.16 * size
  group.add(core)

  const glow = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTexture,
      color: palette.light,
      transparent: true,
      opacity: 0.62,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  glow.position.x = -0.6 * size
  glow.scale.set(0.52 * size, 0.52 * size, 1)
  glow.userData.baseScale = 0.52 * size
  group.add(glow)

  const trailMaterial = new THREE.MeshBasicMaterial({
    color: palette.light,
    transparent: true,
    opacity: 0.02,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  })
  const trail = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05 * size, 0.22 * size, 1.7 * size, 20, 1, true),
    trailMaterial,
  )
  trail.rotation.z = Math.PI / 2
  trail.position.x = -1.32 * size
  group.add(trail)

  return { group, glow, trailMaterial }
}

function createNavLight(texture: THREE.Texture, color: number, phase: number): NavLight {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      color,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  sprite.scale.set(0.17, 0.17, 1)
  return { sprite, phase, baseOpacity: 0.85 }
}

interface BuildContext {
  group: THREE.Group
  materials: ShipMaterialSet
  palette: StationPalette
  glowTexture: THREE.Texture
  navTexture: THREE.Texture
  engineGlows: THREE.Sprite[]
  engineTrailMaterials: THREE.MeshBasicMaterial[]
  navLights: NavLight[]
  hullMonitor: HullMonitor
  scanDish: THREE.Group | null
  beaconMaterial: THREE.MeshStandardMaterial | null
}

function attachPod(context: BuildContext, pod: EnginePod, position: THREE.Vector3Tuple) {
  pod.group.position.set(...position)
  context.group.add(pod.group)
  context.engineGlows.push(pod.glow)
  context.engineTrailMaterials.push(pod.trailMaterial)
}

function addPanelWithFrame(
  context: BuildContext,
  width: number,
  height: number,
  position: THREE.Vector3Tuple,
  rotationX = 0,
) {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.045), context.materials.solar)
  panel.position.set(...position)
  panel.rotation.x = rotationX
  context.group.add(panel)
  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.06, height + 0.06, 0.026),
    context.materials.dark,
  )
  frame.position.set(position[0], position[1], position[2] - 0.014)
  frame.rotation.x = rotationX
  context.group.add(frame)
  return panel
}

function buildExplorer(context: BuildContext) {
  const { group, materials } = context

  const hull = new THREE.Mesh(
    latheAlongX([
      [0.03, -2.1],
      [0.34, -1.86],
      [0.56, -1.28],
      [0.63, -0.5],
      [0.6, 0.3],
      [0.5, 1.05],
      [0.3, 1.72],
      [0.05, 2.06],
    ]),
    materials.hull,
  )
  group.add(hull)

  const tailCap = new THREE.Mesh(new THREE.SphereGeometry(0.44, 32, 24), materials.dark)
  tailCap.position.x = -2.02
  tailCap.scale.set(0.62, 1, 1)
  group.add(tailCap)

  const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 14), materials.accent)
  noseTip.position.x = 2.08
  group.add(noseTip)

  const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.028, 1.1, 10), materials.trim)
  boom.rotation.z = -Math.PI / 2
  boom.position.x = 2.62
  group.add(boom)
  const boomTip = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), materials.trim)
  boomTip.position.x = 3.16
  group.add(boomTip)

  const rings: Array<[number, number]> = [
    [-1.15, 0.585],
    [0.35, 0.615],
    [1.2, 0.475],
  ]
  for (const [x, radius] of rings) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.015, 10, 64), materials.accent)
    ring.rotation.y = Math.PI / 2
    ring.position.x = x
    group.add(ring)
  }

  const railGeometry = new THREE.CylinderGeometry(0.022, 0.022, 1.02, 8)
  const railGeometryB = new THREE.CylinderGeometry(0.019, 0.019, 0.6, 8)
  for (const side of [-1, 1]) {
    const root = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.062, 0.52, 12), materials.trim)
    root.position.set(-0.15, side * 0.72, 0)
    group.add(root)

    for (const z of [-0.32, 0.32]) {
      const rail = new THREE.Mesh(railGeometry, materials.trim)
      rail.position.set(-0.15, side * 1.42, z)
      group.add(rail)
    }
    addPanelWithFrame(context, 1.78, 1.0, [-0.15, side * 1.42, 0])

    for (const z of [-0.26, 0.26]) {
      const rail = new THREE.Mesh(railGeometryB, materials.trim)
      rail.position.set(-0.15, side * 2.24, z)
      group.add(rail)
    }
    addPanelWithFrame(context, 1.32, 0.58, [-0.15, side * 2.24, 0])

    const nav = createNavLight(context.navTexture, side < 0 ? 0xff5f52 : 0x5cff9f, side < 0 ? 1.3 : 4.2)
    nav.sprite.position.set(-0.15, side * 2.6, 0)
    group.add(nav.sprite)
    context.navLights.push(nav)
  }

  // El radar vive adelante de los paneles solares: los paneles llegan hasta
  // x≈0.74 y antes el plato (radio ~0.55) barria atravesándolos al rotar.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.74, 12), materials.trim)
  mast.position.set(1.55, 0.62, 0)
  group.add(mast)

  const scanDish = new THREE.Group()
  scanDish.position.set(1.55, 1.0, 0)
  group.add(scanDish)

  const dish = new THREE.Mesh(
    latheAlongX([
      [0.03, 0],
      [0.2, 0.05],
      [0.38, 0.13],
      [0.53, 0.25],
    ]),
    materials.trim,
  )
  dish.rotation.set(1.04, 0, Math.PI / 2)
  dish.position.set(0, 0.06, 0.05)
  scanDish.add(dish)
  const dishRim = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.018, 10, 48), materials.accent)
  dishRim.rotation.set(-0.52, 0, 0)
  dishRim.position.set(0, 0.06, 0.05)
  scanDish.add(dishRim)

  const feed = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.4, 8), materials.trim)
  feed.position.set(0, 0.16, 0.22)
  feed.rotation.x = 1.04
  scanDish.add(feed)
  const feedTip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), materials.accent)
  feedTip.position.set(0, 0.25, 0.38)
  scanDish.add(feedTip)
  context.scanDish = scanDish

  const greeble = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.3), materials.dark)
  greeble.position.set(-0.7, 0.58, 0.18)
  greeble.rotation.z = 0.08
  group.add(greeble)
  const greebleB = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.24), materials.dark)
  greebleB.position.set(0.95, -0.5, -0.14)
  group.add(greebleB)

  for (const side of [-1, 1]) {
    const pod = createEnginePod(context.materials, context.palette, context.glowTexture, 0.82)
    attachPod(context, pod, [-2.3, side * 0.3, -0.05])
  }

  context.hullMonitor.group.position.set(-0.05, 0.15, 0.63)
  context.hullMonitor.group.rotation.set(-0.18, 0, 0)
  context.hullMonitor.group.scale.setScalar(0.88)
}

function buildRacer(context: BuildContext) {
  const { group, materials } = context

  const hull = new THREE.Mesh(
    latheAlongX([
      [0.03, -2.3],
      [0.3, -2.02],
      [0.44, -1.3],
      [0.47, -0.35],
      [0.44, 0.55],
      [0.32, 1.4],
      [0.12, 2.05],
      [0.04, 2.28],
    ]),
    materials.hull,
  )
  group.add(hull)

  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.36, 24), materials.accent)
  nose.rotation.z = -Math.PI / 2
  nose.position.x = 2.36
  group.add(nose)

  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.5, 40, 28), materials.glass)
  canopy.position.set(0.78, 0.27, 0)
  canopy.scale.set(1.62, 0.68, 0.72)
  group.add(canopy)
  const canopyBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.3, 0.36, 0.1, 24),
    materials.dark,
  )
  canopyBase.rotation.z = Math.PI / 2
  canopyBase.scale.set(1.5, 1, 0.72)
  canopyBase.position.set(0.78, 0.12, 0)
  group.add(canopyBase)

  const stripes: Array<[number, number]> = [
    [-0.5, 0.462],
    [1.05, 0.375],
  ]
  for (const [x, radius] of stripes) {
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.016, 10, 64), materials.accent)
    stripe.rotation.y = Math.PI / 2
    stripe.position.x = x
    group.add(stripe)
  }

  const extrudeSettings = {
    depth: 0.07,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.022,
    bevelSegments: 2,
  }
  const wingShapeLeft = new THREE.Shape()
  wingShapeLeft.moveTo(0.55, 0)
  wingShapeLeft.lineTo(-1.52, 1.34)
  wingShapeLeft.lineTo(-1.04, 1.46)
  wingShapeLeft.lineTo(-0.92, 0.02)
  wingShapeLeft.closePath()
  const wingGeometryLeft = new THREE.ExtrudeGeometry(wingShapeLeft, extrudeSettings)
  wingGeometryLeft.rotateX(-Math.PI / 2)
  const wingLeft = new THREE.Mesh(wingGeometryLeft, materials.hull)
  wingLeft.position.set(0.12, -0.02, 0.16)
  group.add(wingLeft)

  const wingShapeRight = new THREE.Shape()
  wingShapeRight.moveTo(0.55, 0)
  wingShapeRight.lineTo(-1.52, -1.34)
  wingShapeRight.lineTo(-1.04, -1.46)
  wingShapeRight.lineTo(-0.92, -0.02)
  wingShapeRight.closePath()
  const wingGeometryRight = new THREE.ExtrudeGeometry(wingShapeRight, extrudeSettings)
  wingGeometryRight.rotateX(-Math.PI / 2)
  const wingRight = new THREE.Mesh(wingGeometryRight, materials.hull)
  wingRight.position.set(0.12, -0.02, -0.16)
  group.add(wingRight)

  const wingEdgeGeometry = new THREE.BoxGeometry(0.62, 0.035, 0.03)
  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(wingEdgeGeometry, materials.accent)
    edge.position.set(-1.32, -0.02, side * 1.32)
    edge.rotation.y = side * -0.62
    group.add(edge)
    const nav = createNavLight(context.navTexture, side < 0 ? 0xff5f52 : 0x5cff9f, side < 0 ? 2.1 : 5)
    nav.sprite.position.set(-1.42, 0.02, side * 1.42)
    group.add(nav.sprite)
    context.navLights.push(nav)
  }

  for (const side of [-1, 1]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.74, 0.52, 0.035), materials.accent)
    fin.position.set(-1.6, 0.2, side * 0.22)
    fin.rotation.x = side * 0.66
    fin.rotation.z = -0.14
    group.add(fin)
  }

  for (const side of [-1, 1]) {
    const nacelle = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.5, 8, 24), materials.dark)
    nacelle.rotation.z = Math.PI / 2
    nacelle.position.set(-1.5, side * 0.28, 0)
    group.add(nacelle)
    const nacelleRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.25, 0.024, 10, 32),
      materials.trim,
    )
    nacelleRing.rotation.y = Math.PI / 2
    nacelleRing.position.set(-1.05, side * 0.28, 0)
    group.add(nacelleRing)

    const pod = createEnginePod(context.materials, context.palette, context.glowTexture, 0.92)
    attachPod(context, pod, [-2.42, side * 0.28, 0])
  }

  const tailCap = new THREE.Mesh(new THREE.SphereGeometry(0.24, 24, 18), materials.hull)
  tailCap.position.x = -2.2
  tailCap.scale.set(0.7, 1, 1)
  group.add(tailCap)

  context.hullMonitor.group.position.set(0.2, 0.28, 0.41)
  context.hullMonitor.group.rotation.set(-0.35, 0, 0)
  context.hullMonitor.group.scale.setScalar(0.8)
}

function buildBenchmark(context: BuildContext) {
  const { group, materials } = context

  const hull = new THREE.Mesh(
    latheAlongX(
      [
        [0.03, -2.62],
        [0.5, -2.28],
        [0.72, -1.45],
        [0.8, -0.2],
        [0.74, 0.9],
        [0.5, 1.85],
        [0.14, 2.48],
        [0.03, 2.6],
      ],
      64,
    ),
    materials.hull,
  )
  hull.scale.set(1, 0.78, 0.92)
  group.add(hull)

  const prow = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 16), materials.accent)
  prow.position.x = 2.56
  prow.scale.set(1.4, 1, 1)
  group.add(prow)

  const tower = new THREE.Mesh(
    latheAlongX([
      [0.03, -0.55],
      [0.3, -0.3],
      [0.34, 0.1],
      [0.26, 0.42],
      [0.13, 0.6],
      [0.03, 0.68],
    ]),
    materials.hull,
  )
  tower.rotation.z = Math.PI / 2
  tower.position.set(0.92, 0.5, 0)
  group.add(tower)

  const bridgeWindows = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.3), materials.accentGlow)
  bridgeWindows.position.set(1.2, 0.86, 0)
  group.add(bridgeWindows)
  context.beaconMaterial = materials.accentGlow

  const towerRing = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.02, 10, 40), materials.accent)
  towerRing.rotation.set(Math.PI / 2, 0, 0)
  towerRing.position.set(0.92, 0.72, 0)
  group.add(towerRing)

  const spine = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.09, 0.42), materials.dark)
  spine.position.set(-0.35, 0.56, 0)
  group.add(spine)

  const stripes: Array<[number, number]> = [
    [-0.9, 0.8],
    [0.7, 0.75],
  ]
  for (const [x, radius] of stripes) {
    for (const side of [-1, 1]) {
      const stripe = new THREE.Mesh(
        new THREE.TorusGeometry(radius, 0.014, 8, 64, Math.PI),
        materials.accent,
      )
      stripe.rotation.set(side > 0 ? 0 : Math.PI, Math.PI / 2, 0)
      stripe.scale.set(0.92, 0.78, 1)
      stripe.position.set(x, 0, 0)
      group.add(stripe)
    }
  }

  for (const side of [-1, 1]) {
    const podBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 2.5, 8, 24), materials.hull)
    podBody.rotation.z = Math.PI / 2
    podBody.position.set(-0.35, side * 0.95, -0.05)
    group.add(podBody)

    const podRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.026, 10, 36), materials.trim)
    podRing.rotation.y = Math.PI / 2
    podRing.position.set(0.55, side * 0.95, -0.05)
    group.add(podRing)

    const pylon = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.62, 0.13), materials.dark)
    pylon.position.set(-0.3, side * 0.66, -0.05)
    group.add(pylon)

    const nav = createNavLight(context.navTexture, side < 0 ? 0xff5f52 : 0x5cff9f, side < 0 ? 0.6 : 3.4)
    nav.sprite.position.set(0.95, side * 1.02, -0.05)
    group.add(nav.sprite)
    context.navLights.push(nav)

    const podEngine = createEnginePod(context.materials, context.palette, context.glowTexture, 0.72)
    attachPod(context, podEngine, [-1.95, side * 0.95, -0.05])
  }

  const railGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.72, 8)
  for (const side of [-1, 1]) {
    for (const x of [-1.2, 0.35]) {
      const rail = new THREE.Mesh(railGeometry, materials.trim)
      rail.position.set(x, side * 0.62, 0)
      group.add(rail)
    }
    addPanelWithFrame(context, 1.95, 0.6, [-0.42, side * 0.62, 0], side * 0.34)
  }

  const greebles: Array<[number, number, number, number]> = [
    [-1.7, 0.42, 0.3, 0.4],
    [0.1, 0.6, -0.24, 0.32],
    [1.6, 0.3, 0.2, 0.3],
  ]
  for (const [x, y, z, size] of greebles) {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(0.42 * size + 0.2, 0.12, 0.2),
      materials.dark,
    )
    block.position.set(x, y * 0.78, z)
    group.add(block)
  }

  for (const y of [-0.28, 0.28]) {
    for (const z of [-0.3, 0.3]) {
      const engine = createEnginePod(context.materials, context.palette, context.glowTexture, 0.74)
      attachPod(context, engine, [-2.52, y, z])
    }
  }

  const sternCap = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 24), materials.dark)
  sternCap.position.x = -2.45
  sternCap.scale.set(0.55, 0.78, 0.92)
  group.add(sternCap)

  context.hullMonitor.group.position.set(0.3, 0.1, 0.76)
  context.hullMonitor.group.rotation.set(-0.12, 0, 0)
  context.hullMonitor.group.scale.setScalar(0.9)
}

function createHullMonitor(
  palette: StationPalette,
  standbyTexture: THREE.Texture,
  materials: ShipMaterialSet,
  glowTexture: THREE.Texture,
): HullMonitor {
  const group = new THREE.Group()

  const bezel = new THREE.Mesh(new RoundedBoxGeometry(1.32, 0.76, 0.09, 3, 0.05), materials.dark)
  group.add(bezel)
  const bezelRim = new THREE.Mesh(
    new RoundedBoxGeometry(1.38, 0.82, 0.05, 2, 0.05),
    materials.trim,
  )
  bezelRim.position.z = -0.028
  group.add(bezelRim)

  // Pantalla retroiluminada: overdrive >1 para que el MFD se lea como un
  // display real (el fondo #040910 sigue negro, el texto quema apenas y el
  // bloom lo levanta). toneMapped:false para colores puros.
  const screenMaterial = new THREE.MeshBasicMaterial({
    map: standbyTexture,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    color: new THREE.Color(1.3, 1.3, 1.3),
  })
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.652), screenMaterial)
  screen.position.z = 0.05
  group.add(screen)

  const glowMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color: palette.light,
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const glow = new THREE.Sprite(glowMaterial)
  glow.scale.set(2.2, 1.5, 1)
  glow.position.z = -0.12
  group.add(glow)

  const mount = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.3, 12), materials.trim)
  mount.rotation.x = Math.PI / 2
  mount.position.set(0, -0.12, -0.2)
  group.add(mount)

  return { group, screenMaterial, glowMaterial }
}

export function createShip(
  project: Project,
  palette: StationPalette,
  variant: ShipVariant,
  envMap?: THREE.Texture,
): ShipBundle {
  const group = new THREE.Group()
  group.name = `${project.id}-ship`

  const solarTexture = createSolarPanelTexture(palette.panel, palette.panelLine)
  const materials = createMaterialSet(palette, solarTexture, envMap)
  const glowTexture = createRadialTexture('rgba(196,228,255,1)', 'rgba(122,182,255,.4)')
  const navTexture = createRadialTexture('rgba(255,255,255,1)', 'rgba(255,255,255,.42)')

  const standbyScreenTexture = createMissionDisplayTexture('standby', project, palette)

  const hullMonitor = createHullMonitor(palette, standbyScreenTexture, materials, glowTexture)

  const context: BuildContext = {
    group,
    materials,
    palette,
    glowTexture,
    navTexture,
    engineGlows: [],
    engineTrailMaterials: [],
    navLights: [],
    hullMonitor,
    scanDish: null,
    beaconMaterial: null,
  }

  let screenWidth = 3.36
  let screenHeight = 1.8
  let screenZ = 0.985

  if (variant === 'explorer') {
    buildExplorer(context)
  } else if (variant === 'racer') {
    screenWidth = 2.82
    screenHeight = 1.48
    // La punta del ala del racer se extiende en profundidad; esta pantalla
    // necesita quedar por delante de toda la geometría al enfocar, si no
    // la atravesaría (bug visual en Futbolito).
    screenZ = 1.45
    buildRacer(context)
  } else {
    screenWidth = 3.14
    screenHeight = 1.66
    screenZ = 0.79
    buildBenchmark(context)
  }
  group.add(hullMonitor.group)

  const screenBezelMaterial = new THREE.MeshStandardMaterial({
    color: 0x11161e,
    roughness: 0.3,
    metalness: 0.88,
    transparent: true,
    opacity: 0,
  })
  if (envMap) {
    screenBezelMaterial.envMap = envMap
    screenBezelMaterial.envMapIntensity = 0.4
  }

  const screenMaterial = new THREE.MeshBasicMaterial({
    map: standbyScreenTexture,
    transparent: true,
    opacity: 0,
    toneMapped: false,
    // Overdrive de display retroiluminado (ver createHullMonitor): el MFD
    // rinde como pantalla real en vez de plástico oscuro.
    color: new THREE.Color(1.55, 1.55, 1.55),
  })

  const screenAssembly = new THREE.Group()
  screenAssembly.name = `${project.id}-console`
  screenAssembly.scale.setScalar(0.16)
  screenAssembly.visible = false
  const screenOuter = new THREE.Mesh(
    new RoundedBoxGeometry(screenWidth + 0.3, screenHeight + 0.3, 0.16, 2, 0.06),
    screenBezelMaterial,
  )
  screenOuter.position.set(0, -0.05, screenZ - 0.08)
  screenAssembly.add(screenOuter)
  const screenMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(screenWidth, screenHeight),
    screenMaterial,
  )
  screenMesh.position.set(0, -0.05, screenZ + 0.02)
  screenAssembly.add(screenMesh)
  group.add(screenAssembly)

  const screenAnchor = new THREE.Object3D()
  screenAnchor.position.set(0, -0.05, screenZ + 0.08)
  group.add(screenAnchor)

  for (const side of [-1, 1]) {
    const light = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: side < 0 ? 0xff7867 : palette.light,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    light.position.set(side * 1.55, 0.62, screenZ + 0.04)
    light.scale.set(0.13, 0.13, 1)
    group.add(light)
  }

  // Rig propio neutro: viaja con la nave y la deja legible en cualquier
  // sector, compense o no la luz del sol / nebulosa de fondo.
  const localLight = new THREE.PointLight(0xdfeaff, 0.9, 7, 2)
  localLight.position.set(0.4, 0.2, 2.1)
  group.add(localLight)

  return {
    group,
    screenAnchor,
    screenAssembly,
    screenMesh,
    screenWorldWidth: screenWidth,
    solarTexture,
    screenMaterial,
    screenBezelMaterial,
    engineGlows: context.engineGlows,
    engineTrailMaterials: context.engineTrailMaterials,
    standbyScreenTexture,
    openScreenTexture: null,
    detailsScreenTexture: null,
    hullMonitor,
    navLights: context.navLights,
    scanDish: context.scanDish,
    beaconMaterial: context.beaconMaterial,
  }
}
