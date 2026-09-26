import { useEffect } from 'react'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { projects, type Project } from '../../data/projects'
import { calculateMissionProgress } from '../../lib/spaceProgress'
import { canUseWebGL } from '../../lib/spaceCapabilities'
import {
  createMissionDisplayTexture,
  createRadialTexture,
  createShip,
  type ShipBundle,
  type ShipVariant,
  type StationMode,
  type StationPalette,
} from '../../lib/shipFactory'
import { clamp, createSeededRandom, smoothstep } from './math'
import { playUiSound } from './uiSound'
import { computeSceneLayout } from './sceneLayout'
import {
  createMeteorStreakTexture,
  createNameConstellation,
  createPlanetAtmosphere,
  createSaturnAtmosphere,
  createSaturnDetailTexture,
  createSaturnRings,
  createStarField,
  createSun,
  disposeMaterial,
} from './celestial'

type SpaceHeroMode = 'detecting' | 'fallback' | 'webgl'

interface ProjectStation {
  project: Project
  bundle: ShipBundle
  palette: StationPalette
  variant: ShipVariant
  start: THREE.Vector3
  end: THREE.Vector3
  arrivalStart: number
  arrivalEnd: number
  scale: number
  focusPosition: THREE.Vector3
  focusZoom: number
  mode: StationMode
  focus: number
}

export function useSpaceExperience(
  experienceRef: React.RefObject<HTMLDivElement | null>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  setMode: React.Dispatch<React.SetStateAction<SpaceHeroMode>>,
  audioMutedRef: React.MutableRefObject<boolean>,
) {
  // Refs y setMode son estables — el boot corre una sola vez por mount.
  useEffect(() => {
    // El armado de la escena es pesado: corre como tarea asíncrona por etapas,
    // cediendo el hilo al browser entre cada una, para que la página responda
    // y se pueda scrollear desde el primer momento sin bloqueos.
    let cancelled = false
    let cleanupFn: (() => void) | null = null
    const idle = () =>
      new Promise<void>((resolve) => {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => resolve(), { timeout: 200 })
        } else {
          setTimeout(resolve, 16)
        }
      })

    const boot = async () => {
    const experience = experienceRef.current
    const canvas = canvasRef.current
    const mission = experience?.querySelector<HTMLElement>('[data-project-mission]')
    const projectScreens = Array.from(
      experience?.querySelectorAll<HTMLElement>('[data-project-screen]') ?? [],
    )
    if (!experience || !canvas || !mission || projectScreens.length === 0 || !canUseWebGL()) {
      requestAnimationFrame(() => setMode('fallback'))
      return
    }

    const screenByProject = new Map(
      projectScreens.map((element) => [element.dataset.projectScreen ?? '', element]),
    )
    const labelByProject = new Map(
      Array.from(experience.querySelectorAll<HTMLElement>('[data-space-label]')).map(
        (element) => [element.dataset.spaceLabel ?? '', element],
      ),
    )

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      requestAnimationFrame(() => setMode('fallback'))
      return
    }

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      requestAnimationFrame(() => setMode('fallback'))
      return
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.95
    renderer.autoClear = false
    renderer.setClearColor(0x020204, 1)

    // Escena única: las estrellas/nebulosa/meteoros viven aquí mismo (antes
    // había una segunda escena con su propio render pass = coste GPU doble).
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x010104)
    scene.fog = new THREE.FogExp2(0x020204, 0.008)
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    camera.position.set(0, 0, 10)

    const composer = new EffectComposer(renderer)
    const scenePass = new RenderPass(scene, camera)
    const isMobileBloom =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      isMobileBloom ? 0.22 : 0.42,
      isMobileBloom ? 0.4 : 0.65,
      0.85,
    )
    bloomPass.enabled = !isMobileBloom
    composer.addPass(scenePass)
    composer.addPass(bloomPass)
    composer.addPass(new OutputPass())

    // La escena no se revela hasta que TODO está listo (texturas + consolas +
    // shaders + fuentes): así el primer scroll y la primera consola ya tienen
    // todo compilado y no hay pop-ins ni tirones. El HUD muestra progreso real
    // por etapas: texturas 0→65%, consolas 65→85%, compilación 85→100%.
    let texturesFailed = false
    let assetsLoaded = 0
    let assetsTotal = 0
    let bootStage = 'LOADING TEXTURES'
    // -1 = fase de texturas (progreso del LoadingManager); >=0 = fracción
    // absoluta impuesta por las etapas posteriores.
    let bootOverride = -1
    let resolveAssets: () => void = () => {}
    const assetsReady = new Promise<void>((resolve) => {
      resolveAssets = resolve
    })
    const updateBootHud = () => {
      const overall =
        bootOverride >= 0
          ? bootOverride
          : assetsTotal > 0
            ? (assetsLoaded / assetsTotal) * 0.65
            : 0.02
      const percent = experience.querySelector<HTMLElement>('[data-boot-percent]')
      if (percent) percent.textContent = `${Math.round(overall * 100)}%`
      const stage = experience.querySelector<HTMLElement>('[data-boot-stage]')
      if (stage) stage.textContent = bootStage
      const bar = experience.querySelector<HTMLElement>('.space-boot__bar')
      if (bar) {
        bar.style.setProperty('--boot-p', `${overall}`)
        const fill = bar.querySelector<HTMLElement>('span')
        if (fill) {
          // Barra determinada: relleno real en vez de scan infinito.
          fill.style.width = `${overall * 100}%`
          fill.style.animation = 'none'
          fill.style.transform = 'none'
          fill.style.left = '0'
        }
      }
    }
    const reportBoot = async (stage: string, fraction: number) => {
      bootStage = stage
      bootOverride = fraction
      updateBootHud()
      await idle()
    }
    const bootManager = new THREE.LoadingManager(
      () => {
        assetsLoaded = assetsTotal
        updateBootHud()
        resolveAssets()
      },
      undefined,
      () => {
        texturesFailed = true
      },
    )
    let loadStarted = false
    bootManager.onStart = () => {
      loadStarted = true
    }
    bootManager.onProgress = (_url, loaded, total) => {
      assetsLoaded = loaded
      assetsTotal = total
      updateBootHud()
    }

    // Sin bloqueo de scroll: el reveal sincroniza transitionProgress con el
    // scroll real de ese momento, así bajar durante la carga ya no rompe nada
    // y la página nunca queda congelada (bloquear dejaba la rueda muerta si
    // algo restauraba el overflow en el orden equivocado). unlock queda como
    // no-op para no tocar todos los caminos de salida del boot.
    const unlockScroll = () => {}

    const textureLoader = new THREE.TextureLoader(bootManager)
    // Temporarios reutilizados por frame para la sombra de los anillos.
    const ringHelperA = new THREE.Vector3()
    const ringHelperB = new THREE.Vector3()
    // Anisotropía 4 en vez de 8: indistinguible a estas distancias/ángulos y
    // reduce presión de VRAM/ancho de banda en el primer scroll.
    const maxAnisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    const loadSpaceTexture = (path: string) => {
      const texture = textureLoader.load(path)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = maxAnisotropy
      texture.wrapS = THREE.RepeatWrapping
      return texture
    }

    const farStars = createStarField(349, 3600, 34, 54, 0.075, 0.76)
    const nearStars = createStarField(971, 1050, 25, 34, 0.13, 0.72)
    scene.add(farStars.points, nearStars.points)

    // Polvo cercano a cámara: ~200 motas entre z 2 y 8 que derivan lento.
    // Al hacer scroll / mover el puntero tienen parallax fuerte y venden
    // la velocidad. Un solo draw call, geometría estática + offset en CPU.
    const isMobileDust =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches
    const DUST_COUNT = isMobileDust ? 110 : 220
    const dustRandom = createSeededRandom(20240)
    const dustPositions = new Float32Array(DUST_COUNT * 3)
    const dustBaseX = new Float32Array(DUST_COUNT)
    const dustBaseY = new Float32Array(DUST_COUNT)
    const dustPhase = new Float32Array(DUST_COUNT)
    for (let dustIndex = 0; dustIndex < DUST_COUNT; dustIndex += 1) {
      const baseX = (dustRandom() - 0.5) * 22
      const baseY = (dustRandom() - 0.5) * 12
      const baseZ = 2 + dustRandom() * 6
      dustBaseX[dustIndex] = baseX
      dustBaseY[dustIndex] = baseY
      dustPhase[dustIndex] = dustRandom() * Math.PI * 2
      dustPositions[dustIndex * 3] = baseX
      dustPositions[dustIndex * 3 + 1] = baseY
      dustPositions[dustIndex * 3 + 2] = baseZ
    }
    const dustGeometry = new THREE.BufferGeometry()
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3))
    const dustMaterial = new THREE.PointsMaterial({
      map: createRadialTexture('rgba(255,255,255,1)', 'rgba(210,226,255,.42)'),
      size: 0.055,
      sizeAttenuation: true,
      color: 0xaec6e8,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
      fog: false,
    })
    const dustPoints = new THREE.Points(dustGeometry, dustMaterial)
    scene.add(dustPoints)

    const nebulaMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, fog: false })
    const nebulaMesh = new THREE.Mesh(new THREE.PlaneGeometry(132, 54), nebulaMaterial)
    nebulaMesh.position.set(4, 5, -42)
    nebulaMesh.rotation.z = -0.26
    scene.add(nebulaMesh)
    // Segunda capa de nebulosa: otra región de la textura, más lejos. El
    // parallax distinto entre capas da profundidad.
    const nebulaMaterial2 = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, fog: false })
    const nebulaMesh2 = new THREE.Mesh(new THREE.PlaneGeometry(150, 62), nebulaMaterial2)
    nebulaMesh2.position.set(-28, -9, -50)
    nebulaMesh2.rotation.z = 0.34
    scene.add(nebulaMesh2)
    // Espacio negro: la textura de nebulosa es un collage rojo/rosa, así que
    // se tiñe a pizarra azul oscuro y a opacidad mínima. Quedan vetas frías
    // tenues sobre negro (detalle sin lavar la escena de rojo). El recorte lo
    // hace la GPU (repeat/offset) y el tinte es material.color.
    new THREE.TextureLoader(bootManager).load('/space/nebula.webp', (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(0.234, 1)
      texture.offset.set(0.258, 0)
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      nebulaMaterial.map = texture
      ;(nebulaMaterial as THREE.MeshBasicMaterial).color = new THREE.Color(0x4f6179)
      nebulaMaterial.needsUpdate = true
      nebulaMaterial.opacity = 0.09
      // La segunda capa reutiliza la imagen con otro encuadre y tinte pizarra
      // aún más oscuro.
      const texture2 = texture.clone()
      texture2.repeat.set(0.31, 0.9)
      texture2.offset.set(0.62, 0.1)
      texture2.needsUpdate = true
      nebulaMaterial2.map = texture2
      nebulaMaterial2.color = new THREE.Color(0x3e4a60)
      nebulaMaterial2.needsUpdate = true
      nebulaMaterial2.opacity = 0.05
    })

    const meteorTexture = createMeteorStreakTexture()
    const isMobileMeteors =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches
    const meteors = Array.from({ length: isMobileMeteors ? 3 : 6 }, () => {
      const material = new THREE.MeshBasicMaterial({
        map: meteorTexture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
        fog: false,
      })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.1), material)
      mesh.visible = false
      scene.add(mesh)
      return {
        mesh,
        material,
        active: false,
        nextAt: 3500 + Math.random() * 9000,
        velocity: new THREE.Vector3(),
        life: 0,
        duration: 1.6,
      }
    })

    // --- Etapa 2: constelación del nombre + sol ---
    await idle()
    if (cancelled) {
      unlockScroll()
      renderer.dispose()
      return
    }

    // La constelación muestrea la fuente Geist en un canvas: si se crea antes
    // de que cargue la fuente, el nombre queda con fallback para siempre.
    // Esperamos (con timeout) para que el primer frame ya tenga la tipografía.
    try {
      await Promise.race([
        document.fonts.ready,
        new Promise((resolve) => setTimeout(resolve, 1600)),
      ])
    } catch {
      // Sin Font Loading API: seguimos con la fuente del sistema.
    }

    const { points: name, uniforms: nameUniforms } = createNameConstellation()
    const nameGroup = new THREE.Group()
    nameGroup.add(name)
    scene.add(nameGroup)

    const sunBundle = createSun(bootManager)
    scene.add(sunBundle.group)

    // --- Etapa 3: Tierra ---
    await idle()
    if (cancelled) {
      unlockScroll()
      renderer.dispose()
      return
    }

    const earthTexture = loadSpaceTexture('/space/earth_atmos.webp')
    const earthNormalTexture = loadSpaceTexture('/space/earth_normal.webp')
    earthNormalTexture.colorSpace = THREE.NoColorSpace
    const earthRoughnessTexture = textureLoader.load('/space/earth_specular.webp', () => {
      const image = earthRoughnessTexture.image as HTMLImageElement
      const canvas = document.createElement('canvas')
      // Inversión specular->roughness: a 512 en vez de 1024 son 4x menos píxeles,
      // indistinguible en una esfera 0.84u a 8 unidades de distancia.
      const textureScale = Math.min(1, 512 / image.width)
      canvas.width = Math.max(1, Math.round(image.width * textureScale))
      canvas.height = Math.max(1, Math.round(image.height * textureScale))
      const context = canvas.getContext('2d', { willReadFrequently: true } as unknown as CanvasRenderingContext2DSettings)
      if (!context) return
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      const frameData = context.getImageData(0, 0, canvas.width, canvas.height)
      for (let index = 0; index < frameData.data.length; index += 4) {
        frameData.data[index] = 255 - frameData.data[index]
        frameData.data[index + 1] = 255 - frameData.data[index + 1]
        frameData.data[index + 2] = 255 - frameData.data[index + 2]
      }
      context.putImageData(frameData, 0, 0)
      earthRoughnessTexture.image = canvas as unknown as HTMLImageElement
      earthRoughnessTexture.needsUpdate = true
    })
    earthRoughnessTexture.colorSpace = THREE.NoColorSpace
    const earthMaterial = new THREE.MeshPhysicalMaterial({
      map: earthTexture,
      normalMap: earthNormalTexture,
      normalScale: new THREE.Vector2(0.85, 0.85),
      roughnessMap: earthRoughnessTexture,
      roughness: 0.72,
      metalness: 0.02,
      transparent: true,
      opacity: 0,
      // Luces nocturnas baratas: la máscara invertida (tierra clara) como
      // emissiveMap cálido. De día lo lava el difuso; de noche el lado oscuro
      // conserva un glow ámbar que sugiere ciudades. Sin textura extra.
      emissive: new THREE.Color(0xffb46b),
      emissiveMap: earthRoughnessTexture,
      emissiveIntensity: 0.32,
    })
    const earthBody = new THREE.Mesh(new THREE.SphereGeometry(0.84, 64, 48), earthMaterial)
    const earthCloudsMaterial = new THREE.MeshLambertMaterial({
      map: loadSpaceTexture('/space/earth_clouds.webp'),
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
    const earthClouds = new THREE.Mesh(new THREE.SphereGeometry(0.848, 48, 32), earthCloudsMaterial)
    earthClouds.renderOrder = 1
    const earthGlowMaterial = new THREE.SpriteMaterial({
      map: createRadialTexture('rgba(104,188,255,.26)', 'rgba(36,104,204,.05)'),
      color: 0x5fb8ff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const earthGlow = new THREE.Sprite(earthGlowMaterial)
    earthGlow.scale.set(2.45, 2.45, 1)
    earthGlow.position.z = -0.28
    const { mesh: earthAtmosphere, material: earthAtmosphereMaterial } = createPlanetAtmosphere(0.866, '#1a57e6', '#75c7ff', 2.8)
    const earth = new THREE.Group()
    earth.add(earthGlow, earthBody, earthClouds, earthAtmosphere)
    scene.add(earth)

    // --- Etapa 4: Saturno + Luna ---
    await idle()
    if (cancelled) {
      unlockScroll()
      renderer.dispose()
      return
    }

    const saturnTexture = loadSpaceTexture('/space/saturn.webp')
    const saturnDetailTexture = createSaturnDetailTexture()
    saturnDetailTexture.anisotropy = maxAnisotropy
    const saturnMaterial = new THREE.MeshPhysicalMaterial({
      map: saturnTexture,
      bumpMap: saturnDetailTexture,
      bumpScale: 0.042,
      color: 0xf0cfad,
      roughness: 0.78,
      metalness: 0.02,
      clearcoat: 0.08,
      clearcoatRoughness: 0.78,
    })
    const saturnBody = new THREE.Mesh(new THREE.SphereGeometry(1.48, 64, 48), saturnMaterial)
    saturnBody.scale.y = 0.91
    const { mesh: rings, material: ringMaterial } = createSaturnRings()
    const { mesh: saturnAtmosphere } = createSaturnAtmosphere()
    const saturnGlowMaterial = new THREE.SpriteMaterial({
      map: createRadialTexture('rgba(229,180,132,.24)', 'rgba(167,109,75,.045)'),
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const saturnGlow = new THREE.Sprite(saturnGlowMaterial)
    saturnGlow.position.z = -0.45
    saturnGlow.scale.set(6.6, 3.8, 1)
    saturnBody.renderOrder = 1
    const saturn = new THREE.Group()
    saturn.rotation.z = -0.17
    saturn.add(saturnGlow, saturnBody, saturnAtmosphere, rings)
    scene.add(saturn)

    const moonTexture = loadSpaceTexture('/space/moon.webp')
    const moonMaterial = new THREE.MeshStandardMaterial({
      map: moonTexture,
      bumpMap: moonTexture,
      bumpScale: 0.02,
      color: 0xcdd2d9,
      roughness: 0.96,
      transparent: true,
      opacity: 0,
    })
    const moonBody = new THREE.Mesh(new THREE.SphereGeometry(0.92, 48, 32), moonMaterial)
    const moon = new THREE.Group()
    moon.add(moonBody)
    scene.add(moon)

    const venusTexture = loadSpaceTexture('/space/venus.webp')
    const venusMaterial = new THREE.MeshPhysicalMaterial({
      map: venusTexture,
      bumpMap: venusTexture,
      bumpScale: 0.018,
      roughness: 0.94,
      clearcoat: 0.04,
      transparent: true,
      opacity: 0,
    })
    const venusBody = new THREE.Mesh(new THREE.SphereGeometry(0.82, 48, 32), venusMaterial)
    const venusGlowMaterial = new THREE.SpriteMaterial({
      map: createRadialTexture('rgba(255,214,157,.34)', 'rgba(211,128,72,.07)'),
      color: 0xffc68e,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const venusGlow = new THREE.Sprite(venusGlowMaterial)
    venusGlow.scale.set(2.5, 2.5, 1)
    venusGlow.position.z = -0.3
    const { mesh: venusAtmosphere, material: venusAtmosphereMaterial } = createPlanetAtmosphere(0.845, '#8c6a24', '#ffd88f', 3)
    const venus = new THREE.Group()
    venus.add(venusGlow, venusBody, venusAtmosphere)
    venus.position.set(-3.55, 1.32, -5.9)
    scene.add(venus)

    const marsTexture = loadSpaceTexture('/space/mars.webp')
    const marsMaterial = new THREE.MeshStandardMaterial({
      map: marsTexture,
      bumpMap: marsTexture,
      bumpScale: 0.03,
      roughness: 0.95,
      transparent: true,
      opacity: 0,
    })
    const marsBody = new THREE.Mesh(new THREE.SphereGeometry(0.94, 48, 32), marsMaterial)
    const marsGlowMaterial = new THREE.SpriteMaterial({
      map: createRadialTexture('rgba(255,130,87,.24)', 'rgba(193,64,42,.05)'),
      color: 0xff8a61,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    const marsGlow = new THREE.Sprite(marsGlowMaterial)
    marsGlow.scale.set(2.65, 2.65, 1)
    marsGlow.position.z = -0.32
    const { mesh: marsAtmosphere, material: marsAtmosphereMaterial } = createPlanetAtmosphere(0.965, '#66281a', '#ff9a5c', 3.2)
    const mars = new THREE.Group()
    mars.add(marsGlow, marsBody, marsAtmosphere)
    mars.position.set(3.72, -1.5, -6.35)
    scene.add(mars)

    // Gigante gaseoso de fondo: da escala a la escena sin coste de textura
    // externa. Bandas procedurales en canvas + atmósfera sutil. Quieto al
    // fondo, solo rota lento y hace reveal temprano.
    const createGiantBandsTexture = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 256
      const context = canvas.getContext('2d')
      const texture = new THREE.CanvasTexture(canvas)
      if (!context) return texture
      const giantRandom = createSeededRandom(6604)
      const bands: Array<[string, number, number]> = [
        ['#6b543e', 0.0, 0.14],
        ['#a0805c', 0.14, 0.24],
        ['#c9ab7e', 0.24, 0.34],
        ['#8a6a4c', 0.34, 0.44],
        ['#d8bd8e', 0.44, 0.54],
        ['#b08a5e', 0.54, 0.64],
        ['#7a5c42', 0.64, 0.76],
        ['#9c7c58', 0.76, 0.88],
        ['#5e4a36', 0.88, 1.0],
      ]
      for (const [color, from, to] of bands) {
        context.fillStyle = color
        context.fillRect(0, Math.floor(from * 256), 512, Math.ceil((to - from) * 256) + 1)
      }
      // Turbulencia: franjas onduladas claras/oscuras con alpha bajo.
      for (let streak = 0; streak < 260; streak += 1) {
        const y = giantRandom() * 256
        const height = 1 + giantRandom() * 3
        const light = giantRandom() > 0.5
        context.fillStyle = light ? 'rgba(255,235,200,.07)' : 'rgba(20,10,5,.09)'
        const wave = 6 + giantRandom() * 18
        for (let x = 0; x < 512; x += 8) {
          const offset = Math.sin((x / 512) * Math.PI * 2 + y) * wave * 0.08
          context.fillRect(x, y + offset, 8, height)
        }
      }
      // Gran mancha ovalada.
      context.fillStyle = 'rgba(190,110,70,.55)'
      context.beginPath()
      context.ellipse(360, 168, 42, 20, -0.12, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = 'rgba(230,170,120,.4)'
      context.beginPath()
      context.ellipse(360, 168, 28, 12, -0.12, 0, Math.PI * 2)
      context.fill()
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = maxAnisotropy
      return texture
    }
    const jupiterMaterial = new THREE.MeshStandardMaterial({
      map: createGiantBandsTexture(),
      color: 0x9a8878,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0,
    })
    const jupiterBody = new THREE.Mesh(new THREE.SphereGeometry(2.3, 48, 32), jupiterMaterial)
    const { mesh: jupiterAtmosphere, material: jupiterAtmosphereMaterial } = createPlanetAtmosphere(
      2.36,
      '#c8a06a',
      '#6a86c8',
      3.4,
    )
    const jupiter = new THREE.Group()
    jupiter.add(jupiterBody, jupiterAtmosphere)
    jupiter.position.set(15, 7.5, -34)
    scene.add(jupiter)

    const asteroidGeometry = new THREE.IcosahedronGeometry(1, 0)
    const asteroidMaterial = new THREE.MeshStandardMaterial({
      color: 0x565c66,
      roughness: 0.95,
      metalness: 0.08,
      transparent: true,
      opacity: 0,
    })
    const isMobileAsteroids =
      typeof window !== 'undefined' && window.matchMedia('(max-width: 760px)').matches
    const ASTEROID_COUNT = isMobileAsteroids ? 48 : 120
    const asteroidMesh = new THREE.InstancedMesh(asteroidGeometry, asteroidMaterial, ASTEROID_COUNT)
    asteroidMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    asteroidMesh.visible = false
    const asteroidRandom = createSeededRandom(4477)
    // Cinturón concentrado: 70% en banda (y ±3.5, z -14/-24) para que se lea
    // como cinturón entre estaciones; 30% disperso para profundidad. Pocos
    // grandes (4%) y resto polvo/roca pequeña. Tinte gris-cálido variado.
    const asteroidTint = new THREE.Color()
    const asteroidData = Array.from({ length: ASTEROID_COUNT }, (_, asteroidIndex) => {
      const inBelt = asteroidRandom() < 0.7
      const bigRock = asteroidRandom() < 0.04
      const scale = bigRock
        ? 0.24 + asteroidRandom() * 0.16
        : 0.05 + asteroidRandom() * asteroidRandom() * 0.17
      const datum = {
        position: new THREE.Vector3(
          (asteroidRandom() - 0.5) * (inBelt ? 56 : 62),
          (asteroidRandom() - 0.5) * (inBelt ? 7 : 13),
          inBelt ? -14 - asteroidRandom() * 10 : -13 - asteroidRandom() * 19,
        ),
        scale,
        axis: new THREE.Vector3(asteroidRandom() - 0.5, asteroidRandom() - 0.5, asteroidRandom() - 0.5).normalize(),
        speed: 0.25 + asteroidRandom() * 0.7,
        angle: asteroidRandom() * Math.PI * 2,
      }
      const warmth = asteroidRandom()
      asteroidTint.setRGB(
        0.34 + warmth * 0.14 + (bigRock ? 0.04 : 0),
        0.35 + warmth * 0.09,
        0.38 + (1 - warmth) * 0.06,
      )
      asteroidMesh.setColorAt(asteroidIndex, asteroidTint)
      return datum
    })
    if (asteroidMesh.instanceColor) asteroidMesh.instanceColor.needsUpdate = true
    scene.add(asteroidMesh)

    // --- Etapa 5: entorno PBR + naves (una por etapa) ---
    await idle()
    if (cancelled) {
      unlockScroll()
      renderer.dispose()
      return
    }

    const hardseek = projects.find((project) => project.id === 'hardseek')
    const futbolito = projects.find((project) => project.id === 'futbolito')
    const beetbench = projects.find((project) => project.id === 'beetbench')
    if (!hardseek || !futbolito || !beetbench) {
      unlockScroll()
      renderer.dispose()
      requestAnimationFrame(() => setMode('fallback'))
      return
    }

    const pmremGenerator = new THREE.PMREMGenerator(renderer)
    // Entorno espacial procedural en vez de un interior: los reflejos de los
    // cascos muestran estrellas y las manchas cálida (sol) y fría (nebulosa).
    const buildSpaceEnvironment = () => {
      const envScene = new THREE.Scene()
      envScene.background = new THREE.Color(0x0b0f1d)
      const starCount = 420
      const starPositions = new Float32Array(starCount * 3)
      for (let index = 0; index < starCount; index += 1) {
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)
        const radius = 34 + Math.random() * 6
        starPositions[index * 3] = radius * Math.sin(phi) * Math.cos(theta)
        starPositions[index * 3 + 1] = radius * Math.cos(phi)
        starPositions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
      }
      const starGeometry = new THREE.BufferGeometry()
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
      envScene.add(
        new THREE.Points(
          starGeometry,
          new THREE.PointsMaterial({ color: 0xe8efff, size: 0.75, sizeAttenuation: true }),
        ),
      )
      const warmGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createRadialTexture('rgba(255,210,140,1)', 'rgba(255,130,45,0)'),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      warmGlow.position.set(-26, 9, -18)
      warmGlow.scale.set(28, 28, 1)
      envScene.add(warmGlow)
      const coolGlow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: createRadialTexture('rgba(110,160,255,.7)', 'rgba(45,75,210,0)'),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      )
      coolGlow.position.set(24, -6, 16)
      coolGlow.scale.set(40, 40, 1)
      envScene.add(coolGlow)
      return envScene
    }
    const environmentTexture = pmremGenerator.fromScene(buildSpaceEnvironment(), 0.04).texture

    await idle()
    if (cancelled) {
      unlockScroll()
      renderer.dispose()
      return
    }

    const hardseekPalette: StationPalette = {
      accent: '#ff9d52', accentSoft: 'rgba(255,157,82,.23)', panel: '#7a3f13', panelLine: 'rgba(255,199,140,.42)', hull: 0x9a8c7e, light: 0xffab5e,
    }
    const futbolitoPalette: StationPalette = {
      accent: '#72d7a2', accentSoft: 'rgba(74,214,142,.22)', panel: '#12624f', panelLine: 'rgba(147,255,202,.36)', hull: 0x7c9388, light: 0x84f6ba,
    }
    const beetbenchPalette: StationPalette = {
      accent: '#e89340', accentSoft: 'rgba(240,160,80,.22)', panel: '#6e3d1a', panelLine: 'rgba(255,190,120,.36)', hull: 0x96785e, light: 0xffb877,
    }

    const projectStations: ProjectStation[] = [
      {
        project: hardseek,
        variant: 'explorer',
        palette: hardseekPalette,
        bundle: null as unknown as ShipBundle,
        start: new THREE.Vector3(9.8, -2.4, -15.5),
        end: new THREE.Vector3(-2.55, 0.62, -0.95),
        arrivalStart: 0.22,
        arrivalEnd: 0.48,
        scale: 0.62,
        focusPosition: new THREE.Vector3(-0.3, 0.35, 2.1),
        focusZoom: 2,
        mode: 'standby',
        focus: 0,
      },
      {
        project: futbolito,
        variant: 'racer',
        palette: futbolitoPalette,
        bundle: null as unknown as ShipBundle,
        start: new THREE.Vector3(-10.4, 1.1, -15.2),
        end: new THREE.Vector3(-0.2, -1.05, -1.45),
        arrivalStart: 0.25,
        arrivalEnd: 0.51,
        scale: 0.52,
        focusPosition: new THREE.Vector3(-0.1, -0.95, 2.05),
        focusZoom: 2.7,
        mode: 'standby',
        focus: 0,
      },
      {
        project: beetbench,
        variant: 'benchmark',
        palette: beetbenchPalette,
        bundle: null as unknown as ShipBundle,
        start: new THREE.Vector3(10.4, 1.5, -16.2),
        end: new THREE.Vector3(2.5, 0.55, -1.85),
        arrivalStart: 0.28,
        arrivalEnd: 0.54,
        scale: 0.5,
        focusPosition: new THREE.Vector3(0.35, 0.5, 1.85),
        focusZoom: 2.7,
        mode: 'standby',
        focus: 0,
      },
    ]
    // Construir las naves de a una, cediendo el hilo entre cada una:
    // cada createShip genera geometría + texturas de consola (lo más pesado del boot).
    for (const [stationIndex, record] of projectStations.entries()) {
      record.bundle = createShip(record.project, record.palette, record.variant, environmentTexture)
      if (stationIndex < projectStations.length - 1) {
        await idle()
        if (cancelled) {
          unlockScroll()
          renderer.dispose()
          return
        }
      }
    }
    for (const record of projectStations) {
      record.bundle.group.visible = false
      scene.add(record.bundle.group)
    }
    // Precargar las 6 texturas de consola (overview + details por nave): antes
    // eran lazy y el primer clic congelaba un instante al generar el canvas de
    // 1400px. Se hacen acá, con progreso en el HUD, para que abrir la primera
    // consola sea instantáneo. setStationMode las reutiliza vía ??=.
    const consoleModes: StationMode[] = ['overview', 'details']
    let consoleStep = 0
    const consoleTotal = projectStations.length * consoleModes.length
    for (const record of projectStations) {
      for (const consoleMode of consoleModes) {
        await reportBoot('BUILDING CONSOLES', 0.65 + (consoleStep / consoleTotal) * 0.2)
        if (cancelled) {
          unlockScroll()
          renderer.dispose()
          return
        }
        const texture = createMissionDisplayTexture(consoleMode, record.project, record.palette)
        if (consoleMode === 'overview') record.bundle.openScreenTexture = texture
        else record.bundle.detailsScreenTexture = texture
        consoleStep += 1
      }
    }
    const stationPalettes = [hardseekPalette, futbolitoPalette, beetbenchPalette]
    for (const [index, record] of projectStations.entries()) {
      labelByProject.get(record.project.id)?.style.setProperty('--label-accent', stationPalettes[index].accent)
    }

    scene.add(new THREE.AmbientLight(0x283043, 0.52))
    const keyLight = new THREE.DirectionalLight(0xffdfbd, 0.8)
    keyLight.position.set(-4.5, 5, 7)
    scene.add(keyLight)
    // Luz clave realista: viene del sol visible en escena, no de la cámara.
    // Así los planetas tienen terminador día/noche coherente con su posición.
    const sunLight = new THREE.DirectionalLight(0xfff1dc, 2.3)
    sunLight.position.set(-6.3, 2.55, -10.6)
    scene.add(sunLight)
    // Sol como point light con falloff físico: asteroides y planetas cercanos
    // al sol se calientan y los lejanos caen en frío. Intensidad contenida
    // para no teñir las naves (llevan rig propio neutro).
    const sunPoint = new THREE.PointLight(0xffd9a8, 20, 44, 2)
    sunPoint.position.set(-6.3, 2.55, -10.6)
    scene.add(sunPoint)
    // Relleno frío cenital para separar naves del fondo sin quemar el negro.
    scene.add(new THREE.HemisphereLight(0x33415e, 0x08080a, 0.35))
    const rimLight = new THREE.DirectionalLight(0x789dff, 0.58)
    rimLight.position.set(5, -2.6, 4)
    scene.add(rimLight)
    const stationLight = new THREE.PointLight(0x8fbaff, 0.8, 16)
    stationLight.position.set(0, 1.8, 4)
    scene.add(stationLight)
    const saturnWarmLight = new THREE.PointLight(0xffc38f, 0.85, 14, 2)
    saturnWarmLight.position.set(2.2, 2.6, 4.8)
    scene.add(saturnWarmLight)

    const pointerTarget = new THREE.Vector2()
    const pointer = new THREE.Vector2()
    const clickPointer = new THREE.Vector2()
    const raycaster = new THREE.Raycaster()
    // Zoom táctil: distancia objetivo de cámara (10 = default). Pinch la ajusta 6–14.
    let zoomTarget = 10
    let pinchStartDist = 0
    let pinchStartZoom = 10
    const moonStart = new THREE.Vector3(-5.8, -2.8, -9.2)
    const moonOrbitTarget = new THREE.Vector3()
    const projected = new THREE.Vector3()
    const screenWorld = new THREE.Vector3()
    let transitionTarget = 0
    let transitionProgress = 0
    let viewportWidth = 1
    let viewportHeight = 1
    let sceneLayout = computeSceneLayout(1280, 800)
    let saturnInitialX = 2.88
    let saturnInitialY = -0.04
    let sunBaseX = -5.6
    let sunBaseY = 2.25
    let earthBaseX = -0.9
    let earthBaseY = 2.12
    let earthBaseZ = -8.95
    let venusBaseX = 4.1
    let venusBaseY = -2.5
    let marsBaseX = -2
    let marsBaseY = -2.58
    const screenBaseWidths = new Map<string, number>()
    let animationFrame = 0
    let modeFrame = 0
    let pageVisible = !document.hidden
    let pixelRatioCap = 1.6
    // Arrancar en DPR 1 y subir solo si sobra GPU: el primer frame (el que más
    // duele al hacer scroll) sale barato y el auto-tuner lo sube en ~1s.
    let adaptivePixelRatio = 1
    let heavyTick = false
    let frameDtAccum = 0
    let frameDtSamples = 0
    let warmupFrames = 0
    let lastFrameTime = 0
    let disposed = false
    // Redes de seguridad de rendimiento: salteo frames si incluso al mínimo
    // de resolución sigue lento, y apago el bloom mientras se scrollea rápido.
    let slowStreak = 0
    let frameSkip = false
    let frameParity = 0
    let bloomCooldownFrames = 0
    let warpAmount = 0
    let warpActive = false
    let baseFov = 35
    let activeStation: ProjectStation | null = null
    let hoveredStation: ProjectStation | null = null
    let hoverCheckAt = 0
    let enginePowerLevel = 0
    let audioContext: AudioContext | null = null
    let audioMaster: GainNode | null = null
    let engineAudioGain: GainNode | null = null
    let engineAudioLevel = 0
    const asteroidMatrix = new THREE.Matrix4()
    const asteroidQuaternion = new THREE.Quaternion()
    const asteroidScaleVector = new THREE.Vector3()

    // El progreso del scroll se mide una vez y se sigue con un listener pasivo:
    // llamar a getBoundingClientRect cada frame fuerza layout y genera jank.
    let missionDocTop = 0
    let missionHeight = 1
    let scrollYPosition = window.scrollY
    // Objetivo de la luz de estación (reutilizada para bañar la consola
    // activa: no se suma ninguna luz nueva a la escena).
    const stationLightTarget = new THREE.Vector3(0, 1.8, 4)
    const STATION_LIGHT_HOME = new THREE.Vector3(0, 1.8, 4)
    const measureMission = () => {
      const bounds = mission.getBoundingClientRect()
      missionDocTop = bounds.top + window.scrollY
      missionHeight = Math.max(1, bounds.height)
    }
    const handleScroll = () => {
      scrollYPosition = window.scrollY
    }
    let lastRenderedScrollY = scrollYPosition

    // Secuencia de enlace: reposo → enlazando → ficha. El timer avanza solo
    // de enlazando a ficha tras ~1.6s; tocar de nuevo lo adelanta.
    const linkTimers = new Map<string, number>()
    const setStationMode = (record: ProjectStation, nextMode: StationMode) => {
      record.mode = nextMode
      const pendingTimer = linkTimers.get(record.project.id)
      if (pendingTimer !== undefined) {
        window.clearTimeout(pendingTimer)
        linkTimers.delete(record.project.id)
      }
      const { bundle } = record
      if (nextMode === 'standby') {
        bundle.screenMaterial.map = bundle.standbyScreenTexture
        if (activeStation === record) activeStation = null
      } else if (nextMode === 'overview') {
        // Textura generada la primera vez que se abre la consola (lazy).
        bundle.openScreenTexture ??= createMissionDisplayTexture('overview', record.project, record.palette)
        bundle.screenMaterial.map = bundle.openScreenTexture
        const timerId = window.setTimeout(() => {
          linkTimers.delete(record.project.id)
          if (record.mode === 'overview') {
            playUiSound('toggle-on')
            setStationMode(record, 'details')
          }
        }, 1600)
        linkTimers.set(record.project.id, timerId)
      } else {
        bundle.detailsScreenTexture ??= createMissionDisplayTexture('details', record.project, record.palette)
        bundle.screenMaterial.map = bundle.detailsScreenTexture
      }
      bundle.screenMaterial.needsUpdate = true
    }

    const handleProjectConsoleOpen = (event: Event) => {
      const requestedId = (event as CustomEvent<{ projectId?: string }>).detail?.projectId ?? 'hardseek'
      const record = projectStations.find((candidate) => candidate.project.id === requestedId)
      if (!record || !record.bundle.group.visible) return
      for (const candidate of projectStations) {
        if (candidate !== record && candidate.mode !== 'standby') setStationMode(candidate, 'standby')
      }
      activeStation = record
      if (record.mode === 'standby') setStationMode(record, 'overview')
      else if (record.mode === 'overview') setStationMode(record, 'details')
    }

    const closeStationConsole = (record = activeStation) => {
      if (!record || record.mode === 'standby') return
      setStationMode(record, 'standby')
    }

    const handleProjectConsoleClose = () => {
      closeStationConsole()
    }

    type AudioContextWindow = Window & { webkitAudioContext?: typeof AudioContext }
    // Nivel general del ambiente; lo usan la creación y los toggles para mantener consistencia.
    const AMBIENT_LEVEL = 0.06
    const setupAmbientAudio = (muted: boolean) => {
      if (audioContext) {
        void audioContext.resume()
        return
      }
      const AudioContextConstructor = window.AudioContext ?? (window as AudioContextWindow).webkitAudioContext
      if (!AudioContextConstructor) return
      try {
        const context = new AudioContextConstructor()
        const master = context.createGain()
        master.gain.value = 0
        master.connect(context.destination)

        // --- Drone base (medusa espacial): dos senos graves + quinta levemente desafinada ---
        const droneFilter = context.createBiquadFilter()
        droneFilter.type = 'lowpass'
        droneFilter.frequency.value = 640
        droneFilter.Q.value = 0.4
        const droneGain = context.createGain()
        droneGain.gain.value = 0.62
        droneFilter.connect(droneGain)
        droneGain.connect(master)
        for (const [frequency, level] of [
          [48.5, 0.5],
          [72.8, 0.26],
          [109.9, 0.11],
          [110.8, 0.09],
        ] as Array<[number, number]>) {
          const oscillator = context.createOscillator()
          oscillator.type = frequency > 90 ? 'triangle' : 'sine'
          oscillator.frequency.value = frequency
          const oscillatorGain = context.createGain()
          oscillatorGain.gain.value = level
          oscillator.connect(oscillatorGain)
          oscillatorGain.connect(droneFilter)
          oscillator.start()
        }

        // LFO lento que respira sobre el filtro del drone (movimiento amortiguado).
        const droneLfo = context.createOscillator()
        droneLfo.type = 'sine'
        droneLfo.frequency.value = 0.07
        const droneLfoDepth = context.createGain()
        droneLfoDepth.gain.value = 240
        droneLfo.connect(droneLfoDepth)
        droneLfoDepth.connect(droneFilter.frequency)
        droneLfo.start()

        // --- Viento solar: ruido con bandpass barrido por otro LFO muy lento ---
        const windBuffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate)
        const windChannel = windBuffer.getChannelData(0)
        let lastSample = 0
        for (let index = 0; index < windChannel.length; index += 1) {
          // Ruido "marrón" suavizado: suena a corriente en vez de estática.
          lastSample = (lastSample + Math.random() * 2 - 1) * 0.5
          windChannel[index] = lastSample
        }
        const windSource = context.createBufferSource()
        windSource.buffer = windBuffer
        windSource.loop = true
        const windFilter = context.createBiquadFilter()
        windFilter.type = 'bandpass'
        windFilter.frequency.value = 420
        windFilter.Q.value = 1.1
        const windGain = context.createGain()
        windGain.gain.value = 0.34
        windSource.connect(windFilter)
        windFilter.connect(windGain)
        windGain.connect(master)
        const windLfo = context.createOscillator()
        windLfo.type = 'sine'
        windLfo.frequency.value = 0.045
        const windLfoDepth = context.createGain()
        windLfoDepth.gain.value = 260
        windLfo.connect(windLfoDepth)
        windLfoDepth.connect(windFilter.frequency)
        windLfo.start()
        windSource.start()

        // --- Motor del puente (existente): ruido bandpass modulado por potencia ---
        engineAudioGain = context.createGain()
        engineAudioGain.gain.value = 0
        const engineNoise = context.createBufferSource()
        engineNoise.buffer = windBuffer
        engineNoise.loop = true
        const engineFilter = context.createBiquadFilter()
        engineFilter.type = 'bandpass'
        engineFilter.frequency.value = 340
        engineFilter.Q.value = 0.7
        engineNoise.connect(engineFilter)
        engineFilter.connect(engineAudioGain)
        engineAudioGain.connect(master)
        engineNoise.start()

        audioMaster = master
        audioContext = context
        master.gain.linearRampToValueAtTime(muted ? 0 : AMBIENT_LEVEL, context.currentTime + 2.4)
      } catch {
        audioContext = null
      }
    }
    const handleAudioGesture = () => {
      setupAmbientAudio(audioMutedRef.current)
    }
    const handleAudioToggle = (event: Event) => {
      const muted = Boolean((event as CustomEvent<{ muted?: boolean }>).detail?.muted)
      if (audioMaster && audioContext) {
        audioMaster.gain.cancelScheduledValues(audioContext.currentTime)
        audioMaster.gain.linearRampToValueAtTime(muted ? 0 : AMBIENT_LEVEL, audioContext.currentTime + 0.4)
      } else if (!muted) {
        setupAmbientAudio(false)
      }
    }
    const handleDeviceOrientation = (event: DeviceOrientationEvent) => {
      if (event.gamma == null || event.beta == null) return
      pointerTarget.set(clamp(event.gamma / 28, -1, 1), clamp((event.beta - 42) / 28, -1, 1))
    }
    const attachGyroscope = () => {
      if (!('DeviceOrientationEvent' in window) || !window.matchMedia('(pointer: coarse)').matches) return
      const orientationConstructor = DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }
      if (typeof orientationConstructor.requestPermission === 'function') {
        orientationConstructor
          .requestPermission()
          .then((state) => {
            if (state === 'granted') window.addEventListener('deviceorientation', handleDeviceOrientation)
          })
          .catch(() => {})
      } else {
        window.addEventListener('deviceorientation', handleDeviceOrientation)
      }
    }

    // Helper único para aplicar resolución: el bloom trabaja a mitad de
    // resolución (sus 5 mips internos igual submuestrean, así que el glow se
    // ve idéntico pero cuesta ~4x menos fill-rate, que era el cuello real).
    const applyRenderSizes = () => {
      renderer.setPixelRatio(adaptivePixelRatio)
      renderer.setSize(viewportWidth, viewportHeight, false)
      composer.setPixelRatio(adaptivePixelRatio)
      composer.setSize(viewportWidth, viewportHeight)
      bloomPass.setSize(
        Math.max(1, Math.floor(viewportWidth / 2)),
        Math.max(1, Math.floor(viewportHeight / 2)),
      )
    }

    const resize = () => {
      viewportWidth = Math.max(1, window.innerWidth)
      viewportHeight = Math.max(1, window.innerHeight)
      sceneLayout = computeSceneLayout(viewportWidth, viewportHeight)
      baseFov = sceneLayout.fov
      camera.fov = baseFov + warpAmount
      camera.aspect = viewportWidth / viewportHeight
      camera.updateProjectionMatrix()
      pixelRatioCap = Math.min(sceneLayout.mobile ? 1.2 : 1.6, window.devicePixelRatio || 1)
      // No resetear la calidad adaptativa en cada resize: conservar el nivel aprendido.
      adaptivePixelRatio = Math.min(adaptivePixelRatio, pixelRatioCap)
      applyRenderSizes()
      nameUniforms.uPixelRatio.value = adaptivePixelRatio
      for (const [projectId, element] of screenByProject) {
        screenBaseWidths.set(projectId, Math.max(1, element.offsetWidth))
      }

      nameGroup.position.set(...sceneLayout.namePosition)
      nameGroup.scale.setScalar(sceneLayout.nameScale)
      saturnInitialX = sceneLayout.saturnX
      saturnInitialY = sceneLayout.saturnY
      saturn.position.set(saturnInitialX, saturnInitialY, -0.15)
      sunBaseX = sceneLayout.sunPosition[0]
      sunBaseY = sceneLayout.sunPosition[1]
      sunBundle.group.position.set(...sceneLayout.sunPosition)
      earthBaseX = sceneLayout.earthX
      earthBaseY = sceneLayout.earthY
      earthBaseZ = sceneLayout.earthZ
      earth.position.set(earthBaseX, earthBaseY, earthBaseZ)
      moonStart.set(...sceneLayout.moonStart)
      venusBaseX = sceneLayout.venusX
      venusBaseY = sceneLayout.venusY
      marsBaseX = sceneLayout.marsX
      marsBaseY = sceneLayout.marsY
      venus.position.set(venusBaseX, venusBaseY, sceneLayout.venusZ)
      mars.position.set(marsBaseX, marsBaseY, sceneLayout.marsZ)
      for (const [index, record] of projectStations.entries()) {
        const stationLayout = sceneLayout.stations[index]
        record.end.set(...stationLayout.end)
        record.focusPosition.set(...stationLayout.focus)
        record.scale = stationLayout.scale
        record.focusZoom = stationLayout.focusZoom
      }
      measureMission()
    }

    const lastScreenStyles = new Map<string, { x: number; y: number; scale: number; opacity: number }>()
    const lastLabelPositions = new Map<string, { x: number; y: number }>()

    const updateScreen = (record: ProjectStation, reveal: number) => {
      const screen = screenByProject.get(record.project.id)
      if (!screen) return
      const nextActive = reveal > 0.03
      const wasActive = screen.dataset.active === 'true'
      if (!nextActive && !wasActive) {
        lastScreenStyles.delete(record.project.id)
        return
      }
      record.bundle.screenAnchor.getWorldPosition(screenWorld)
      projected.copy(screenWorld).project(camera)
      const x = (projected.x * 0.5 + 0.5) * viewportWidth
      const y = (-projected.y * 0.5 + 0.5) * viewportHeight
      const distance = Math.max(0.1, camera.position.distanceTo(screenWorld))
      const focalPixels = viewportHeight / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
      const projectedWidth = (record.bundle.screenWorldWidth * record.bundle.group.scale.x * focalPixels) / distance
      const screenBaseWidth = screenBaseWidths.get(record.project.id) ?? 340
      const scale = clamp(projectedWidth / screenBaseWidth, 0.28, 1.55)
      // Escribir CSS en el DOM cada frame (aunque los valores sean idénticos)
      // fuerza recálculos de estilo: solo se escribe si cambió lo suficiente.
      const previousStyle = lastScreenStyles.get(record.project.id)
      const shouldWrite =
        !previousStyle ||
        Math.abs(previousStyle.x - x) >= 0.5 ||
        Math.abs(previousStyle.y - y) >= 0.5 ||
        Math.abs(previousStyle.scale - scale) >= 0.004 ||
        Math.abs(previousStyle.opacity - reveal) >= 0.01
      if (shouldWrite) {
        lastScreenStyles.set(record.project.id, { x, y, scale, opacity: reveal })
        screen.style.setProperty('--screen-x', `${x.toFixed(2)}px`)
        screen.style.setProperty('--screen-y', `${y.toFixed(2)}px`)
        screen.style.setProperty('--screen-scale', scale.toFixed(4))
        screen.style.setProperty('--screen-opacity', reveal.toFixed(3))
      }
      if (nextActive !== wasActive) {
        screen.dataset.active = nextActive ? 'true' : 'false'
        screen.tabIndex = nextActive ? 0 : -1
      }
    }

    const updateTransition = (progress: number, time: number) => {
      if (progress < 0.16) {
        for (const record of projectStations) {
          if (record.mode !== 'standby') setStationMode(record, 'standby')
          record.focus = 0
        }
      }
      const nameScatter = smoothstep(0.08, 0.56, progress)
      const planetDeparture = smoothstep(0.14, 0.6, progress)
      const moonArrival = smoothstep(0.2, 0.5, progress)
      const solarArrival = smoothstep(0.12, 0.48, progress)
      const earthArrival = smoothstep(0.2, 0.5, progress)

      nameUniforms.uScatter.value = nameScatter
      nameUniforms.uOpacity.value = 1 - smoothstep(0.18, 0.48, progress) * 0.52

      sunBundle.material.uniforms.uTime.value = time
      sunBundle.material.uniforms.uReveal.value = solarArrival
      sunBundle.glowMaterial.opacity = solarArrival * 0.34
      sunBundle.coronaMaterial.opacity = solarArrival * (0.21 + Math.sin(time * 0.00021) * 0.05)
      sunBundle.coronaRaysMaterial.opacity = solarArrival * (0.41 + Math.sin(time * 0.00017) * 0.07)
      sunBundle.coronaRaysMaterial.rotation = time * 0.00002
      sunBundle.group.position.x = sunBaseX + Math.sin(time * 0.00004) * 0.06 * solarArrival
      sunBundle.group.position.y = sunBaseY + Math.cos(time * 0.000034) * 0.04 * solarArrival
      sunBundle.group.scale.setScalar(0.28 + solarArrival * 0.88)
      sunBundle.body.rotation.y = time * 0.000028

      earth.position.x = earthBaseX + Math.sin(time * 0.000047) * 0.08 * earthArrival
      earth.position.y = earthBaseY + Math.cos(time * 0.000039) * 0.055 * earthArrival
      earthBody.rotation.y = time * 0.000036
      earthClouds.rotation.y = time * 0.000043
      earth.scale.setScalar(0.28 + earthArrival * 0.82)
      earthMaterial.opacity = earthArrival
      earthCloudsMaterial.opacity = earthArrival * 0.85
      earthGlowMaterial.opacity = earthArrival * 0.2
      earthAtmosphereMaterial.uniforms.uOpacity.value = earthArrival * 0.34

      saturn.position.y = THREE.MathUtils.lerp(saturnInitialY, sceneLayout.mobile ? 2.52 : 2.4, planetDeparture)
      saturn.position.x = THREE.MathUtils.lerp(saturnInitialX, sceneLayout.mobile ? 1.9 : 4.7, planetDeparture)
      saturn.position.z = THREE.MathUtils.lerp(-0.15, -4.2, planetDeparture)
      saturn.position.x += Math.sin(time * 0.000045) * 0.08 * planetDeparture
      saturn.position.y += Math.cos(time * 0.000038) * 0.05 * planetDeparture
      const saturnBase = sceneLayout.mobile ? 0.66 : 0.86
      saturn.scale.setScalar(saturnBase * THREE.MathUtils.lerp(1, 0.56, planetDeparture))
      saturnGlowMaterial.opacity = 0.46 * (1 - planetDeparture * 0.6)

      const moonOrbitRadius = sceneLayout.mobile ? 1.65 : 1.75
      const moonOrbitAngle = time * 0.00008
      moonOrbitTarget.set(
        earth.position.x + Math.cos(moonOrbitAngle) * moonOrbitRadius,
        earth.position.y + Math.sin(moonOrbitAngle) * moonOrbitRadius * 0.88,
        earthBaseZ + Math.sin(moonOrbitAngle) * moonOrbitRadius * 0.32,
      )
      moon.position.lerpVectors(moonStart, moonOrbitTarget, moonArrival)
      moon.position.x += Math.sin(time * 0.000052) * 0.11 * moonArrival
      moon.position.y += Math.cos(time * 0.000043) * 0.07 * moonArrival
      moon.scale.setScalar(THREE.MathUtils.lerp(0.24, 0.48, moonArrival))
      moonMaterial.opacity = smoothstep(0.2, 0.48, progress) * (1 - smoothstep(0.88, 1, progress) * 0.24)
      moonBody.rotation.y = time * 0.00003

      const venusArrival = smoothstep(0.24, 0.54, progress)
      venus.scale.setScalar(0.34 + venusArrival * 0.84)
      venusMaterial.opacity = venusArrival * (1 - smoothstep(0.88, 1, progress) * 0.18)
      venusGlowMaterial.opacity = venusArrival * 0.2
      venusAtmosphereMaterial.uniforms.uOpacity.value = venusArrival * 0.3
      venusBody.rotation.y = -time * 0.000024
      venus.position.x = venusBaseX + Math.sin(time * 0.000071) * 0.1
      venus.position.y = venusBaseY + Math.cos(time * 0.000057) * 0.07

      const marsArrival = smoothstep(0.28, 0.58, progress)
      mars.scale.setScalar(0.32 + marsArrival * 0.76)
      marsMaterial.opacity = marsArrival
      marsGlowMaterial.opacity = marsArrival * 0.17
      marsAtmosphereMaterial.uniforms.uOpacity.value = marsArrival * 0.24
      marsBody.rotation.y = time * 0.000032
      mars.position.x = marsBaseX + Math.sin(time * 0.000063 + 2) * 0.09
      mars.position.y = marsBaseY + Math.cos(time * 0.000049 + 2) * 0.06

      // Júpiter de fondo: reveal temprano, fijo al fondo con deriva mínima.
      const jupiterArrival = smoothstep(0.05, 0.4, progress)
      jupiterMaterial.opacity = jupiterArrival * 0.95
      jupiterAtmosphereMaterial.uniforms.uOpacity.value = jupiterArrival * 0.18
      jupiterBody.rotation.y = time * 0.000012
      jupiter.position.x = 15 + Math.sin(time * 0.00002) * 0.3
      jupiter.position.y = 7.5 + Math.cos(time * 0.000017) * 0.2

      const asteroidReveal = smoothstep(0.3, 0.62, progress)
      asteroidMaterial.opacity = asteroidReveal * 0.92
      asteroidMesh.visible = asteroidReveal > 0.01
      // Rotación lenta: basta actualizar matrices a 30Hz (un frame sí, uno no).
      // Visual idéntico, mitad de CPU en el loop más caliente.
      if (asteroidMesh.visible && heavyTick) {
        for (const [asteroidIndex, asteroid] of asteroidData.entries()) {
          asteroidQuaternion.setFromAxisAngle(asteroid.axis, asteroid.angle + time * 0.0001 * asteroid.speed)
          asteroidScaleVector.setScalar(asteroid.scale)
          asteroidMatrix.compose(asteroid.position, asteroidQuaternion, asteroidScaleVector)
          asteroidMesh.setMatrixAt(asteroidIndex, asteroidMatrix)
        }
        asteroidMesh.instanceMatrix.needsUpdate = true
      }

      enginePowerLevel = 0
      for (const [index, record] of projectStations.entries()) {
        record.focus += ((record.mode !== 'standby' ? 1 : 0) - record.focus) * 0.065
        const approach = smoothstep(record.arrivalStart, record.arrivalEnd, progress)
        const focusAmount = smoothstep(0.05, 0.82, record.focus)
        const arrival = Math.max(approach, record.focus)
        const station = record.bundle.group
        const flightArc = Math.sin(Math.PI * clamp(approach))
        station.position.lerpVectors(record.start, record.end, approach)
        station.position.y += flightArc * (record.variant === 'racer' ? 0.72 : 0.5)
        station.position.z += flightArc * (record.variant === 'benchmark' ? 1.65 : 2.05)
        const cruiseAmount = smoothstep(0.8, 1, approach) * (1 - focusAmount)
        const cruiseSpeed = record.variant === 'racer' ? 0.00024 : record.variant === 'benchmark' ? 0.00014 : 0.00017
        const cruisePhase = time * cruiseSpeed + index * 2.1
        const cruiseWidth = record.variant === 'racer' ? 0.66 : record.variant === 'benchmark' ? 0.44 : 0.52
        station.position.x += Math.sin(cruisePhase) * cruiseWidth * cruiseAmount
        station.position.y += Math.cos(cruisePhase * 0.78) * cruiseWidth * 0.36 * cruiseAmount
        station.position.z += Math.sin(cruisePhase * 0.56 + index) * 0.34 * cruiseAmount
        station.position.lerp(record.focusPosition, focusAmount)
        station.scale.setScalar(
          record.scale *
            THREE.MathUtils.lerp(0.34, 0.58, approach) *
            THREE.MathUtils.lerp(1, record.focusZoom, focusAmount),
        )
        station.visible = arrival > 0.005
        if (!station.visible && record.mode !== 'standby') setStationMode(record, 'standby')
        const approachYaw = record.variant === 'racer' ? 0.82 : record.variant === 'benchmark' ? -0.76 : -0.64
        const settledRoll = record.variant === 'racer' ? 0.045 : record.variant === 'benchmark' ? -0.04 : -0.02
        station.rotation.y = THREE.MathUtils.lerp(approachYaw, 0, Math.max(approach, focusAmount))
        station.rotation.z = THREE.MathUtils.lerp(index === 2 ? -0.2 : 0.17, settledRoll, Math.max(approach, focusAmount))
        station.rotation.x = THREE.MathUtils.lerp(index === 1 ? 0.14 : -0.12, 0.025, Math.max(approach, focusAmount))
        station.rotation.y += Math.sin(cruisePhase * 0.62) * 0.08 * cruiseAmount
        station.rotation.z += Math.cos(cruisePhase * 0.9) * 0.035 * cruiseAmount
        if (record.variant === 'racer') {
          station.rotation.z += Math.sin(time * 0.00052 + index * 1.7) * 0.06 * cruiseAmount
        }
        const enginePower = clamp(
          0.14 +
            smoothstep(record.arrivalStart - 0.04, record.arrivalStart + 0.2, progress) * 0.76 -
            smoothstep(record.arrivalEnd + 0.04, 1, progress) * 0.62,
        )
        enginePowerLevel += enginePower
        for (const [glowIndex, glow] of record.bundle.engineGlows.entries()) {
          const baseScale = Number(glow.userData.baseScale ?? 0.42)
          const pulse = 1 + Math.sin(time * 0.008 + glowIndex * 1.8 + index) * 0.1
          const glowScale = baseScale * (0.76 + enginePower * 0.8) * pulse
          glow.scale.set(glowScale, glowScale, 1)
          const glowMaterial = glow.material as THREE.SpriteMaterial
          glowMaterial.opacity = 0.26 + enginePower * 0.5
        }
        for (const trailMaterial of record.bundle.engineTrailMaterials) {
          trailMaterial.opacity = 0.012 + enginePower * 0.18
        }
        for (const navLight of record.bundle.navLights) {
          const blink = Math.pow(Math.max(0, Math.sin(time * 0.0034 + navLight.phase)), 8)
          const navMaterial = navLight.sprite.material as THREE.SpriteMaterial
          navMaterial.opacity = navLight.baseOpacity * (0.16 + 0.84 * blink)
        }
        if (record.bundle.scanDish) {
          record.bundle.scanDish.rotation.y = time * 0.00042 + index * 1.4
        }
        if (record.variant === 'benchmark' && record.bundle.beaconMaterial) {
          record.bundle.beaconMaterial.emissiveIntensity = 1.15 + Math.sin(time * 0.0038 + index * 2.1) * 0.65
        }
        const monitorReveal = smoothstep(record.arrivalStart - 0.01, record.arrivalEnd - 0.04, progress)
        const monitorOpacity = monitorReveal * (1 - focusAmount * 0.92)
        const monitor = record.bundle.hullMonitor
        // Con la consola enfocada, el monitor del casco queda tapado detrás:
        // ocultarlo del todo evita que sus piezas sólidas asomen por los bordes.
        monitor.group.visible = monitorOpacity > 0.02 && station.visible && record.focus < 0.6
        monitor.screenMaterial.opacity = monitorOpacity * (0.9 + 0.1 * Math.sin(time * 0.0022 + index * 2.3))
        monitor.glowMaterial.opacity = monitorOpacity * (0.06 + 0.03 * Math.sin(time * 0.0027 + index * 1.7))
        const consoleReveal = smoothstep(0.04, 0.58, record.focus)
        record.bundle.screenAssembly.visible = consoleReveal > 0.01
        record.bundle.screenAssembly.position.z = THREE.MathUtils.lerp(-0.42, 0.08, consoleReveal)
        record.bundle.screenAssembly.scale.setScalar(THREE.MathUtils.lerp(0.16, 1.22, consoleReveal))
        record.bundle.screenMaterial.opacity = consoleReveal
        record.bundle.screenBezelMaterial.opacity = consoleReveal
        const reveal = station.visible
          ? Math.max(smoothstep(record.arrivalStart + 0.03, record.arrivalEnd - 0.03, progress), record.focus)
          : 0
        updateScreen(record, reveal)
      }
      enginePowerLevel /= projectStations.length
    }

    const stop = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
        animationFrame = 0
      }
    }

    const frame = (time: number) => {
      animationFrame = 0
      if (disposed || !pageVisible) return
      // Última red de seguridad: si aun al mínimo de resolución sigue lento,
      // renderizamos un frame sí y otro no (~30fps) en vez de endeudarnos.
      if (frameSkip) {
        frameParity = 1 - frameParity
        if (frameParity === 0) {
          lastFrameTime = time
          animationFrame = requestAnimationFrame(frame)
          return
        }
      }
      const frameDelta = lastFrameTime > 0 ? Math.min(0.1, (time - lastFrameTime) / 1000) : 0
      if (lastFrameTime > 0) {
        if (warmupFrames < 12) {
          warmupFrames += 1
        } else {
          frameDtAccum += Math.min(time - lastFrameTime, 100)
          frameDtSamples += 1
          if (frameDtSamples >= 30) {
            const averageDt = frameDtAccum / frameDtSamples
            frameDtAccum = 0
            frameDtSamples = 0
            if (averageDt > 21 && adaptivePixelRatio > 0.85) {
              adaptivePixelRatio = Math.max(0.85, adaptivePixelRatio - 0.15)
              applyRenderSizes()
              nameUniforms.uPixelRatio.value = adaptivePixelRatio
            } else if (averageDt < 13 && adaptivePixelRatio < pixelRatioCap) {
              adaptivePixelRatio = Math.min(pixelRatioCap, adaptivePixelRatio + 0.15)
              applyRenderSizes()
              nameUniforms.uPixelRatio.value = adaptivePixelRatio
            }
            if (averageDt > 24 && adaptivePixelRatio <= 0.86) {
              slowStreak += 1
              if (slowStreak >= 5) frameSkip = true
            } else if (averageDt < 15) {
              slowStreak = 0
              frameSkip = false
            }
          }
        }
      }
      lastFrameTime = time
      // El bloom es el pase más caro: apagarlo mientras se scrollea (incluso
      // despacio) es imperceptible y libera mucho GPU justo cuando más se
      // necesita. El umbral bajo (700px/s) cubre el scroll normal con rueda.
      const scrollSpeed = Math.abs(scrollYPosition - lastRenderedScrollY) / Math.max(0.001, frameDelta)
      lastRenderedScrollY = scrollYPosition
      if (scrollSpeed > 700) {
        bloomCooldownFrames = 9
      } else if (bloomCooldownFrames > 0) {
        bloomCooldownFrames -= 1
      }
      const bloomShouldRender = bloomCooldownFrames === 0
      if (bloomPass.enabled !== bloomShouldRender) bloomPass.enabled = bloomShouldRender
      // Warp: FOV kick + vignette CSS cuando el scroll vuela. El FOV +8 da
      // sensación de aceleración sin mover la cámara (barato: 1 updateProjectionMatrix).
      const warpTarget = scrollSpeed > 1600 ? Math.min(8, (scrollSpeed - 1600) / 400) : 0
      warpAmount += (warpTarget - warpAmount) * 0.08
      if (Math.abs(warpAmount) > 0.05) {
        camera.fov = baseFov + warpAmount
        camera.updateProjectionMatrix()
      } else if (warpAmount !== 0) {
        warpAmount = 0
        camera.fov = baseFov
        camera.updateProjectionMatrix()
      }
      const shouldWarp = warpAmount > 1.2
      if (shouldWarp !== warpActive) {
        warpActive = shouldWarp
        if (experience) {
          if (warpActive) experience.setAttribute('data-warp', 'true')
          else experience.removeAttribute('data-warp')
        }
      }
      pointer.lerp(pointerTarget, 0.035)
      transitionTarget = calculateMissionProgress(
        missionDocTop - scrollYPosition,
        missionHeight,
        viewportHeight,
      )
      // Suavizado independiente del framerate: en 120Hz y con tirones se mueve
      // igual que en 60Hz. Tasa 6 (constante ~160ms): la escena sigue al scroll
      // de cerca para que se sienta directa, sin el engomado que parecía lag.
      heavyTick = !heavyTick
      const transitionDamp = 1 - Math.exp(-Math.max(0.001, frameDelta) * 6)
      transitionProgress += (transitionTarget - transitionProgress) * transitionDamp
      // Si el tab vuelve con un salto grande de scroll, enganchar directo para
      // no atravesar toda la escena con lag.
      if (Math.abs(transitionTarget - transitionProgress) > 0.45) {
        transitionProgress = transitionTarget
      }
      updateTransition(transitionProgress, time)

      // La luz de estación baña la consola enfocada: al abrir un proyecto se
      // desliza frente a su pantalla y sube a 2.4 (bisel + casco iluminados);
      // al cerrar vuelve a su casa. Sin luces nuevas en la escena.
      if (activeStation && activeStation.focus > 0.4 && activeStation.bundle.group.visible) {
        stationLightTarget.copy(activeStation.focusPosition)
        stationLightTarget.z += 1.6
        stationLightTarget.y += 0.3
        stationLight.position.lerp(stationLightTarget, 1 - Math.exp(-Math.max(0.001, frameDelta) * 4))
        stationLight.intensity += (2.4 - stationLight.intensity) * 0.08
      } else {
        stationLight.position.lerp(STATION_LIGHT_HOME, 1 - Math.exp(-Math.max(0.001, frameDelta) * 4))
        stationLight.intensity += (0.8 - stationLight.intensity) * 0.08
      }

      camera.position.x += (pointer.x * 0.16 - camera.position.x) * 0.028
      camera.position.y += (-pointer.y * 0.1 - camera.position.y) * 0.028
      camera.position.z += (zoomTarget - camera.position.z) * 0.06
      camera.lookAt(0, 0, 0)
      nameGroup.rotation.y += (pointer.x * 0.012 - nameGroup.rotation.y) * 0.02
      nameUniforms.uTime.value = time
      saturnBody.rotation.y = time * 0.00005
      // La Tierra también gira sobre su eje, con nubes en capa independiente.
      earthBody.rotation.y = time * 0.0000085
      earthClouds.rotation.y = time * 0.000012
      // Shimmer sutil de los campos de estrellas (fases desfasadas).
      ;(farStars.points.material as THREE.PointsMaterial).opacity =
        0.72 + Math.sin(time * 0.0011) * 0.07
      ;(nearStars.points.material as THREE.PointsMaterial).opacity =
        0.66 + Math.sin(time * 0.0016 + 1.7) * 0.08
      // Uniforms de sombra de los anillos: posición real del sol y de saturno.
      sunBundle.group.getWorldPosition(ringHelperA)
      ringMaterial.uniforms.uSunPos.value.copy(ringHelperA)
      saturn.getWorldPosition(ringHelperB)
      ringMaterial.uniforms.uPlanetPos.value.copy(ringHelperB)
      // La luz clave sigue al sol cuando se mueve con el scroll.
      sunLight.position.copy(ringHelperA)
      sunPoint.position.copy(ringHelperA)
      ringMaterial.uniforms.uTime.value = time
      farStars.points.rotation.z = time * 0.0000016
      farStars.points.position.x = Math.sin(time * 0.000018) * 0.08 + pointer.x * 0.16
      farStars.points.position.y = Math.cos(time * 0.000014) * 0.06 - pointer.y * 0.1
      nearStars.points.rotation.z = -time * 0.0000034
      nearStars.points.position.x = Math.sin(time * -0.000026) * 0.14 + pointer.x * 0.34
      nearStars.points.position.y = Math.cos(time * 0.000021) * 0.1 - pointer.y * 0.22
      nearStars.points.position.z = Math.sin(time * 0.000032) * 0.32 + transitionProgress * 0.42
      nebulaMesh.position.x = 4 + pointer.x * 0.55
      nebulaMesh.position.y = 5 - pointer.y * 0.38
      // Segunda nebulosa con parallax mayor (está más lejos y desplazada).
      nebulaMesh2.position.x = -28 + pointer.x * 0.9 + transitionProgress * 1.2
      nebulaMesh2.position.y = -9 - pointer.y * 0.6
      // Polvo cercano: deriva lenta + parallax fuerte del puntero y scroll.
      // Se actualiza a 30Hz: la deriva es tan lenta que es indistinguible y
      // nos ahorramos un upload del buffer (needsUpdate) cada frame.
      if (heavyTick) {
        const positions = dustGeometry.attributes.position as THREE.BufferAttribute
        const array = positions.array as Float32Array
        for (let dustIndex = 0; dustIndex < DUST_COUNT; dustIndex += 1) {
          const phase = dustPhase[dustIndex]
          array[dustIndex * 3] =
            dustBaseX[dustIndex] +
            Math.sin(time * 0.00012 + phase) * 0.5 +
            pointer.x * 0.7 +
            transitionProgress * 1.6
          array[dustIndex * 3 + 1] =
            dustBaseY[dustIndex] +
            Math.cos(time * 0.0001 + phase * 1.3) * 0.4 -
            pointer.y * 0.5 -
            transitionProgress * 0.8
        }
        positions.needsUpdate = true
      }

      for (const meteor of meteors) {
        if (!meteor.active) {
          if (time >= meteor.nextAt) {
            meteor.active = true
            meteor.life = 0
            meteor.duration = 1.3 + Math.random() * 1.1
            meteor.mesh.position.set(
              (Math.random() - 0.5) * 30,
              6 + Math.random() * 8,
              -30 - Math.random() * 12,
            )
            const heading = Math.PI * (0.6 + Math.random() * 0.24)
            const speed = 16 + Math.random() * 10
            meteor.velocity.set(Math.cos(heading) * speed, -Math.sin(heading) * speed * 0.55, 0)
            meteor.mesh.rotation.z = Math.atan2(meteor.velocity.y, meteor.velocity.x)
            meteor.mesh.visible = true
          }
        } else {
          meteor.life += frameDelta
          meteor.mesh.position.addScaledVector(meteor.velocity, frameDelta)
          meteor.material.opacity = Math.sin(Math.min(1, meteor.life / meteor.duration) * Math.PI) * 0.85
          if (
            meteor.life >= meteor.duration ||
            Math.abs(meteor.mesh.position.x) > 26 ||
            meteor.mesh.position.y < -12
          ) {
            meteor.active = false
            meteor.mesh.visible = false
            meteor.nextAt = time + 5000 + Math.random() * 9000
          }
        }
      }

      for (const record of projectStations) {
        const label = labelByProject.get(record.project.id)
        if (!label) continue
        const active =
          hoveredStation === record && !activeStation && record.mode === 'standby' && record.bundle.group.visible
        if (!active && label.dataset.active !== 'true') continue
        projected.copy(record.bundle.group.position).project(camera)
        const labelX = (projected.x * 0.5 + 0.5) * viewportWidth
        const labelY = (-projected.y * 0.5 + 0.5) * viewportHeight
        const previousLabel = lastLabelPositions.get(record.project.id)
        if (!previousLabel || Math.abs(previousLabel.x - labelX) >= 0.75 || Math.abs(previousLabel.y - labelY) >= 0.75) {
          lastLabelPositions.set(record.project.id, { x: labelX, y: labelY })
          label.style.setProperty('--label-x', `${labelX.toFixed(1)}px`)
          label.style.setProperty('--label-y', `${labelY.toFixed(1)}px`)
        }
        label.dataset.active = active ? 'true' : 'false'
      }

      if (engineAudioGain && audioContext) {
        engineAudioLevel += (enginePowerLevel - engineAudioLevel) * 0.04
        engineAudioGain.gain.value = engineAudioLevel * 0.09
      }

      composer.render()
      // Screenshot: capturar justo después del render en el mismo task,
      // así el buffer WebGL aún es válido sin preserveDrawingBuffer.
      if (screenshotRequested) {
        screenshotRequested = false
        try {
          const url = renderer.domElement.toDataURL('image/png')
          window.dispatchEvent(new CustomEvent('space-screenshot-ready', { detail: { url } }))
        } catch {
          window.dispatchEvent(new CustomEvent('space-screenshot-ready', { detail: { url: null } }))
        }
      }
      animationFrame = requestAnimationFrame(frame)
    }

    const start = () => {
      if (!animationFrame && pageVisible) {
        lastFrameTime = 0
        animationFrame = requestAnimationFrame(frame)
      }
    }
    const handlePointerMove = (event: PointerEvent) => {
      pointerTarget.set(
        (event.clientX / viewportWidth) * 2 - 1,
        (event.clientY / viewportHeight) * 2 - 1,
      )
      const now = performance.now()
      if (now < hoverCheckAt) return
      hoverCheckAt = now + 90
      if (transitionProgress < 0.27 || activeStation) {
        hoveredStation = null
        return
      }
      const bounds = canvas.getBoundingClientRect()
      clickPointer.set(
        ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1,
        -((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 + 1,
      )
      scene.updateMatrixWorld(true)
      raycaster.setFromCamera(clickPointer, camera)
      const [intersection] = raycaster.intersectObjects(
        projectStations.filter((record) => record.bundle.group.visible).map((record) => record.bundle.group),
        true,
      )
      hoveredStation = intersection ? findStationForObject(intersection.object) ?? null : null
    }
    const handlePointerLeave = () => {
      pointerTarget.set(0, 0)
      hoveredStation = null
    }
    // Drag táctil: un dedo actualiza parallax sin bloquear scroll (passive).
    // Pinch con dos dedos hace dolly de cámara 6–14.
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        const touch = event.touches[0]
        pointerTarget.set(
          (touch.clientX / viewportWidth) * 2 - 1,
          (touch.clientY / viewportHeight) * 2 - 1,
        )
      } else if (event.touches.length === 2) {
        const dx = event.touches[0].clientX - event.touches[1].clientX
        const dy = event.touches[0].clientY - event.touches[1].clientY
        const dist = Math.hypot(dx, dy)
        if (pinchStartDist > 0 && dist > 0) {
          zoomTarget = clamp((pinchStartZoom * pinchStartDist) / dist, 6, 14)
        }
      }
    }
    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const dx = event.touches[0].clientX - event.touches[1].clientX
        const dy = event.touches[0].clientY - event.touches[1].clientY
        pinchStartDist = Math.hypot(dx, dy)
        pinchStartZoom = zoomTarget
      }
    }
    const handleTouchEnd = (event: TouchEvent) => {
      if (event.touches.length < 2) pinchStartDist = 0
      if (event.touches.length === 0) pointerTarget.set(0, 0)
    }
    const handleWheelZoom = (event: WheelEvent) => {
      if (!event.ctrlKey) return
      event.preventDefault()
      zoomTarget = clamp(zoomTarget + Math.sign(event.deltaY) * 0.6, 6, 14)
    }
    const findStationForObject = (object: THREE.Object3D) => {
      let cursor: THREE.Object3D | null = object
      while (cursor) {
        const record = projectStations.find((candidate) => candidate.bundle.group === cursor)
        if (record) return record
        cursor = cursor.parent
      }
      return undefined
    }
    const handleStationActivate = (event: PointerEvent) => {
      if (transitionProgress < 0.27 || !projectStations.some((record) => record.bundle.group.visible)) return
      if (event.target instanceof Element && event.target.closest('[data-project-screen]')) return

      const bounds = canvas.getBoundingClientRect()
      clickPointer.set(
        ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * 2 - 1,
        -((event.clientY - bounds.top) / Math.max(1, bounds.height)) * 2 + 1,
      )
      scene.updateMatrixWorld(true)
      raycaster.setFromCamera(clickPointer, camera)
      const [intersection] = raycaster.intersectObjects(
        projectStations.filter((record) => record.bundle.group.visible).map((record) => record.bundle.group),
        true,
      )
      if (!intersection) return
      const record = findStationForObject(intersection.object)
      if (!record) return

      const isMonitor = intersection.object === record.bundle.screenMesh
      const { uv } = intersection
      if ((record.mode === 'overview' || record.mode === 'details') && isMonitor && uv) {
        if (uv.x > 0.88 && uv.y > 0.78) {
          closeStationConsole(record)
          return
        }
      }
      if (record.mode === 'details') {
        if (!isMonitor || !uv) return
        if (uv.x > 0.04 && uv.x < 0.55 && uv.y < 0.2) {
          window.open(record.project.url, '_blank', 'noopener,noreferrer')
        }
        return
      }

      window.dispatchEvent(new CustomEvent('space-project-open', { detail: { projectId: record.project.id } }))
      playUiSound('connect')
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeStationConsole()
    }
    const handleVisibility = () => {
      pageVisible = !document.hidden
      if (pageVisible) start()
      else stop()
    }
    const handleContextLost = (event: Event) => {
      event.preventDefault()
      stop()
      unlockScroll()
      setMode('fallback')
    }

    let screenshotRequested = false
    const handleScreenshotRequest = () => {
      screenshotRequested = true
    }

    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(document.documentElement)
    experience.addEventListener('pointermove', handlePointerMove)
    experience.addEventListener('pointerleave', handlePointerLeave)
    experience.addEventListener('pointerup', handleStationActivate)
    experience.addEventListener('pointerdown', handleAudioGesture)
    experience.addEventListener('pointerdown', attachGyroscope, { once: true })
    experience.addEventListener('touchstart', handleTouchStart, { passive: true })
    experience.addEventListener('touchmove', handleTouchMove, { passive: true })
    experience.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('wheel', handleWheelZoom, { passive: false })
    window.addEventListener('space-project-open', handleProjectConsoleOpen)
    window.addEventListener('space-project-close', handleProjectConsoleClose)
    window.addEventListener('space-audio-toggle', handleAudioToggle)
    window.addEventListener('space-screenshot', handleScreenshotRequest)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keydown', handleAudioGesture)
    canvas.addEventListener('webglcontextlost', handleContextLost)
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('scroll', handleScroll, { passive: true })

    resize()
    for (const record of projectStations) {
      record.bundle.group.position.copy(record.start)
      record.bundle.group.scale.setScalar(record.scale * 0.42)
    }
    // --- Puerta de carga real: no revelar hasta que las texturas estén
    // decodificadas, los shaders compilados y el primer frame calentado. ---
    const waitForAssets = async () => {
      // Si no se registró ningún item (todo en cache sin pasar por el manager
      // o fallo temprano), onLoad nunca dispararía: resolvemos directo.
      if (!loadStarted) {
        assetsLoaded = assetsTotal = Math.max(assetsTotal, 1)
        updateBootHud()
        return
      }
      await Promise.race([
        assetsReady,
        new Promise((resolve) => setTimeout(resolve, 12000)),
      ])
    }
    await waitForAssets()
    if (cancelled) {
      unlockScroll()
      try {
        renderer.dispose()
      } catch {
        // dispose best-effort durante el boot
      }
      return
    }
    if (texturesFailed) {
      unlockScroll()
      stop()
      setMode('fallback')
      try {
        pmremGenerator.dispose()
        composer.dispose()
        renderer.dispose()
      } catch {
        // cleanup best-effort
      }
      return
    }
    try {
      // Compila todos los programas/shaders DURANTE la pantalla de carga,
      // no en el primer scroll (esa compilación era el tirón principal).
      await reportBoot('COMPILING SHADERS', 0.88)
      renderer.compile(scene, camera)
      // Warmup: 2 frames reales (con bloom) para calentar PSOs, LUTs del
      // tone mapping y el pipeline del composer antes de revelar.
      await reportBoot('WARMING RENDERER', 0.94)
      updateTransition(0, performance.now())
      renderer.clear()
      composer.render()
      updateTransition(0, performance.now() + 16)
      renderer.clear()
      composer.render()
      await reportBoot('READY', 1)
    } catch {
      unlockScroll()
      stop()
      setMode('fallback')
      return
    }
    if (cancelled || disposed) {
      unlockScroll()
      return
    }
    // Scroll desbloqueado + medición fresca: el layout ya es el final.
    unlockScroll()
    scrollYPosition = window.scrollY
    lastRenderedScrollY = scrollYPosition
    transitionTarget = calculateMissionProgress(
      missionDocTop - scrollYPosition,
      missionHeight,
      viewportHeight,
    )
    transitionProgress = transitionTarget
    updateTransition(transitionProgress, performance.now())
    measureMission()
    modeFrame = requestAnimationFrame(() => {
      if (disposed) return
      setMode('webgl')
    })
    start()

    const buildCleanup = () => {
      disposed = true
      stop()
      unlockScroll()
      for (const timerId of linkTimers.values()) window.clearTimeout(timerId)
      linkTimers.clear()
      cancelAnimationFrame(modeFrame)
      resizeObserver.disconnect()
      experience.removeEventListener('pointermove', handlePointerMove)
      experience.removeEventListener('pointerleave', handlePointerLeave)
      experience.removeEventListener('pointerup', handleStationActivate)
      experience.removeEventListener('pointerdown', handleAudioGesture)
      experience.removeEventListener('pointerdown', attachGyroscope)
      experience.removeEventListener('touchstart', handleTouchStart)
      experience.removeEventListener('touchmove', handleTouchMove)
      experience.removeEventListener('touchend', handleTouchEnd)
      window.removeEventListener('wheel', handleWheelZoom)
      window.removeEventListener('space-project-open', handleProjectConsoleOpen)
      window.removeEventListener('space-project-close', handleProjectConsoleClose)
      window.removeEventListener('space-audio-toggle', handleAudioToggle)
      window.removeEventListener('space-screenshot', handleScreenshotRequest)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keydown', handleAudioGesture)
      window.removeEventListener('deviceorientation', handleDeviceOrientation)
      canvas.removeEventListener('webglcontextlost', handleContextLost)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('scroll', handleScroll)
      const disposedMaterials = new Set<THREE.Material>()
      for (const renderedScene of [scene]) {
        renderedScene.traverse((object) => {
          const renderable = object as THREE.Mesh | THREE.Points | THREE.Sprite
          if ('geometry' in renderable && renderable.geometry) renderable.geometry.dispose()
          if ('material' in renderable && renderable.material) {
            const materials = Array.isArray(renderable.material) ? renderable.material : [renderable.material]
            for (const material of materials) {
              if (disposedMaterials.has(material)) continue
              disposedMaterials.add(material)
              disposeMaterial(material)
            }
          }
        })
      }
      for (const record of projectStations) {
        record.bundle.solarTexture.dispose()
        record.bundle.standbyScreenTexture.dispose()
        record.bundle.openScreenTexture?.dispose()
        record.bundle.detailsScreenTexture?.dispose()
      }
      environmentTexture.dispose()
      pmremGenerator.dispose()
      composer.dispose()
      renderer.dispose()
    }
    if (cancelled) {
      buildCleanup()
      return
    }
    cleanupFn = buildCleanup
    }

    void boot()

    return () => {
      cancelled = true
      cleanupFn?.()
    }
    // Refs y setMode estables: boot una sola vez por mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
