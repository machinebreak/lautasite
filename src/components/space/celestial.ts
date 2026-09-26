// Fábricas de objetos celestes de la escena (estrellas, sol, planetas, anillos,
// constelación del nombre). Solo dependen de three, shipFactory y math.

import * as THREE from 'three'
import { createRadialTexture } from '../../lib/shipFactory'
import { createSeededRandom } from './math'

export interface StarFieldBundle {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>
  texture: THREE.CanvasTexture
}

export interface NameUniforms extends Record<string, THREE.IUniform> {
  uTime: { value: number }
  uScatter: { value: number }
  uOpacity: { value: number }
  uPixelRatio: { value: number }
}

export function createStarField(
  seed: number,
  count: number,
  spread: number,
  depth: number,
  size: number,
  opacity: number,
): StarFieldBundle {
  const random = createSeededRandom(seed)
  const positions: number[] = []
  const colors: number[] = []

  for (let index = 0; index < count; index += 1) {
    positions.push(
      (random() - 0.5) * spread,
      (random() - 0.5) * spread * 0.62,
      -3 - random() * depth,
    )
    const temperature = random()
    const brightness = 0.56 + random() * 0.44
    const color = temperature > 0.82
      ? new THREE.Color(0xffdfc4)
      : temperature < 0.18
        ? new THREE.Color(0xbdd3ff)
        : new THREE.Color(0xeaf1ff)
    colors.push(color.r * brightness, color.g * brightness, color.b * brightness)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  const texture = createRadialTexture('rgba(255,255,255,1)', 'rgba(210,226,255,.42)')
  const material = new THREE.PointsMaterial({
    map: texture,
    size,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    opacity,
    alphaTest: 0.015,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    // Viven en la escena principal ahora: sin niebla para mantener el look original.
    fog: false,
  })
  return { points: new THREE.Points(geometry, material), texture }
}


export function createMeteorStreakTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 24
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 256, 0)
    gradient.addColorStop(0, 'rgba(255,255,255,0)')
    gradient.addColorStop(0.72, 'rgba(214,230,255,.85)')
    gradient.addColorStop(0.92, 'rgba(255,255,255,.98)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, 256, 24)
    const fade = context.createLinearGradient(0, 0, 0, 24)
    fade.addColorStop(0, 'rgba(0,0,0,0)')
    fade.addColorStop(0.5, 'rgba(0,0,0,1)')
    fade.addColorStop(1, 'rgba(0,0,0,0)')
    context.globalCompositeOperation = 'destination-in'
    context.fillStyle = fade
    context.fillRect(0, 0, 256, 24)
  }
  return new THREE.CanvasTexture(canvas)
}

export function createCoronaRaysTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const context = canvas.getContext('2d')
  if (context) {
    const random = createSeededRandom(912)
    context.translate(128, 128)
    for (let ray = 0; ray < 96; ray += 1) {
      const angle = (ray / 96) * Math.PI * 2 + (random() - 0.5) * 0.06
      const inner = 30 + random() * 8
      const length = inner + 34 + random() * 72
      const gradient = context.createLinearGradient(
        Math.cos(angle) * inner,
        Math.sin(angle) * inner,
        Math.cos(angle) * length,
        Math.sin(angle) * length,
      )
      gradient.addColorStop(0, `rgba(255,216,132,${0.1 + random() * 0.22})`)
      gradient.addColorStop(0.4, `rgba(255,150,50,${0.05 + random() * 0.1})`)
      gradient.addColorStop(1, 'rgba(255,110,26,0)')
      context.strokeStyle = gradient
      context.lineWidth = 0.7 + random() * 2.6
      context.beginPath()
      context.moveTo(Math.cos(angle) * inner, Math.sin(angle) * inner)
      context.lineTo(Math.cos(angle) * length, Math.sin(angle) * length)
      context.stroke()
    }
  }
  return new THREE.CanvasTexture(canvas)
}

export function createSun(loadingManager?: THREE.LoadingManager) {
  const sunTexture = new THREE.TextureLoader(loadingManager).load('/space/sun.webp')
  sunTexture.colorSpace = THREE.SRGBColorSpace
  sunTexture.anisotropy = 4
  sunTexture.wrapS = THREE.RepeatWrapping

  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {
      uMap: { value: sunTexture },
      uTime: { value: 0 },
      uReveal: { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      void main() {
        vUv = uv;
        vNormalView = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vNormalView;
      uniform sampler2D uMap;
      uniform float uTime;
      uniform float uReveal;

      float hash(vec2 point) {
        return fract(sin(dot(point, vec2(127.1, 311.7))) * 43758.5453);
      }
      float valueNoise(vec2 point) {
        vec2 cell = floor(point);
        vec2 local = fract(point);
        vec2 ease = local * local * (3.0 - 2.0 * local);
        float a = hash(cell);
        float b = hash(cell + vec2(1.0, 0.0));
        float c = hash(cell + vec2(0.0, 1.0));
        float d = hash(cell + vec2(1.0, 1.0));
        return mix(mix(a, b, ease.x), mix(c, d, ease.x), ease.y);
      }
      float fbm(vec2 point) {
        float total = 0.0;
        float amplitude = 0.5;
        for (int octave = 0; octave < 3; octave++) {
          total += amplitude * valueNoise(point);
          point = point * 2.07 + vec2(19.7, 7.3);
          amplitude *= 0.55;
        }
        return total;
      }

      void main() {
        float drift = uTime * 0.000009;
        vec2 warp = vec2(
          fbm(vUv * 7.0 + vec2(drift, -drift * 0.8)),
          fbm(vUv * 7.0 + vec2(4.2, 7.9) + drift * 0.7)
        ) - 0.5;
        vec3 base = texture2D(uMap, vUv + warp * 0.016).rgb;
        float shimmer = fbm(vUv * 16.0 + warp * 2.4 - drift * 2.6);
        base *= 0.88 + shimmer * 0.3;
        base = pow(base, vec3(1.06));
        float limb = smoothstep(0.0, 0.5, max(vNormalView.z, 0.0));
        vec3 color = base * (0.3 + limb * 0.92);
        color += vec3(1.0, 0.45, 0.12) * pow(1.0 - limb, 3.6) * 0.85;
        gl_FragColor = vec4(color, uReveal);
      }
    `,
  })
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.42, 64, 48), material)
  const coronaRaysMaterial = new THREE.SpriteMaterial({
    map: createCoronaRaysTexture(),
    color: 0xffc46a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const coronaRays = new THREE.Sprite(coronaRaysMaterial)
  coronaRays.scale.set(7.6, 7.6, 1)
  coronaRays.position.z = -0.3
  const glowMaterial = new THREE.SpriteMaterial({
    map: createRadialTexture('rgba(255,214,110,.78)', 'rgba(255,96,20,.14)'),
    color: 0xffb23b,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const glow = new THREE.Sprite(glowMaterial)
  glow.scale.set(5.2, 5.2, 1)
  glow.position.z = -0.6
  const coronaMaterial = new THREE.SpriteMaterial({
    map: createRadialTexture('rgba(255,236,180,.5)', 'rgba(255,120,26,.1)'),
    color: 0xffc46a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  })
  const corona = new THREE.Sprite(coronaMaterial)
  corona.scale.set(9.5, 9.5, 1)
  corona.position.z = -0.85
  const group = new THREE.Group()
  group.add(corona, coronaRays, glow, body)
  return { group, body, material, glowMaterial, coronaMaterial, coronaRaysMaterial }
}

export function createPlanetAtmosphere(radius: number, colorInner: string, colorOuter: string, rimPower: number) {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uOpacity: { value: 0 },
      uColorA: { value: new THREE.Color(colorInner) },
      uColorB: { value: new THREE.Color(colorOuter) },
      uPower: { value: rimPower },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDirection;
      uniform float uOpacity;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uPower;
      void main() {
        float facing = max(dot(vNormalView, vViewDirection), 0.0);
        float rim = pow(1.0 - facing, uPower);
        vec3 atmosphere = mix(uColorA, uColorB, rim);
        gl_FragColor = vec4(atmosphere, rim * uOpacity);
      }
    `,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 32), material)
  mesh.renderOrder = 2
  return { mesh, material }
}

export function createSaturnDetailTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 1536
  canvas.height = 768
  const context = canvas.getContext('2d')
  if (!context) return new THREE.CanvasTexture(canvas)

  const random = createSeededRandom(771)
  for (let y = 0; y < canvas.height; y += 1) {
    const latitude = y / canvas.height
    const broad = Math.sin(latitude * Math.PI * 34) * 11
    const medium = Math.sin(latitude * Math.PI * 112 + 0.8) * 4
    const polar = Math.abs(latitude - 0.5) * 24
    const value = Math.round(128 + broad + medium + polar + (random() - 0.5) * 4)
    context.fillStyle = `rgb(${value},${value},${value})`
    context.fillRect(0, y, canvas.width, 1)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.wrapS = THREE.RepeatWrapping
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  return texture
}

export function createSaturnAtmosphere() {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uColor: { value: new THREE.Color(0xe8b885) },
      uOpacity: { value: 0.24 },
    },
    vertexShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDirection;
      void main() {
        vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDirection = normalize(-viewPosition.xyz);
        gl_Position = projectionMatrix * viewPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vNormalView;
      varying vec3 vViewDirection;
      uniform vec3 uColor;
      uniform float uOpacity;
      void main() {
        float fresnel = pow(1.0 - max(dot(vNormalView, vViewDirection), 0.0), 2.45);
        float rim = smoothstep(0.12, 0.92, fresnel);
        gl_FragColor = vec4(uColor, rim * uOpacity);
      }
    `,
  })
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1.515, 64, 48), material)
  mesh.scale.y = 0.91
  mesh.renderOrder = 2
  return { mesh, material }
}

export function createNameConstellation() {
  const width = 1200
  const height = 390
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  const geometry = new THREE.BufferGeometry()
  const uniforms: NameUniforms = {
    uTime: { value: 0 },
    uScatter: { value: 0 },
    uOpacity: { value: 1 },
    uPixelRatio: { value: 1 },
  }

  if (!context) {
    return {
      points: new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xffffff })),
      uniforms,
    }
  }

  context.fillStyle = '#fff'
  context.font = '700 148px "Geist Variable", Geist, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText('LAUTARO', width / 2, height * 0.34)
  context.fillText('BERTUCCI', width / 2, height * 0.7)

  const pixels = context.getImageData(0, 0, width, height).data
  const random = createSeededRandom(81)
  const positions: number[] = []
  const destinations: number[] = []
  const delays: number[] = []
  const sizes: number[] = []
  const step = 7

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (pixels[(y * width + x) * 4 + 3] < 140) continue
      const positionX = ((x - width / 2) / width) * 7.65
      const positionY = -((y - height / 2) / height) * 2.48
      positions.push(positionX, positionY, (random() - 0.5) * 0.08)
      destinations.push(
        (random() - 0.5) * 26,
        (random() - 0.5) * 13,
        -9 - random() * 11,
      )
      delays.push(random())
      sizes.push(0.65 + random() * 1.15)
    }
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('aDestination', new THREE.Float32BufferAttribute(destinations, 3))
  geometry.setAttribute('aDelay', new THREE.Float32BufferAttribute(delays, 1))
  geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `
      attribute vec3 aDestination;
      attribute float aDelay;
      attribute float aSize;
      uniform float uTime;
      uniform float uScatter;
      uniform float uPixelRatio;
      varying float vBrightness;
      void main() {
        float particleScatter = smoothstep(aDelay * 0.24, 0.58 + aDelay * 0.3, uScatter);
        vec3 displaced = mix(position, aDestination, particleScatter);
        displaced.xy += vec2(
          sin(uTime * 0.00032 + aSize * 8.0 + aDelay * 14.0),
          cos(uTime * 0.00029 + aSize * 6.0 + aDelay * 11.0)
        ) * mix(0.006, 0.028, particleScatter);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
        gl_PointSize = (0.85 + aSize * 1.15) * uPixelRatio * mix(1.0, 0.72, particleScatter);
        vBrightness = aSize * mix(1.0, 0.8, particleScatter);
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying float vBrightness;
      void main() {
        float distanceToCenter = length(gl_PointCoord - 0.5);
        float star = 1.0 - smoothstep(0.18, 0.5, distanceToCenter);
        vec3 color = mix(vec3(0.72, 0.82, 1.0), vec3(1.0), min(vBrightness, 1.0));
        gl_FragColor = vec4(color, star * uOpacity);
      }
    `,
  })

  return { points: new THREE.Points(geometry, material), uniforms }
}

export function createSaturnRings() {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uSunPos: { value: new THREE.Vector3(-6.3, 2.55, -10.6) },
      uPlanetPos: { value: new THREE.Vector3() },
      uPlanetRadius: { value: 1.35 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      uniform float uTime;
      uniform vec3 uSunPos;
      uniform vec3 uPlanetPos;
      uniform float uPlanetRadius;
      void main() {
        float radius = length(vUv - 0.5) * 2.0;
        float band = clamp((radius - 0.53) / 0.47, 0.0, 1.0);
        float microBands = sin(band * 910.0 + uTime * 0.000025) * 0.045;
        float broadBands = sin(band * 118.0) * 0.08 + sin(band * 37.0) * 0.045;
        float cassini = smoothstep(0.49, 0.515, band) - smoothstep(0.56, 0.585, band);
        float edge = smoothstep(0.0, 0.05, band) * (1.0 - smoothstep(0.94, 1.0, band));
        float alpha = (0.44 + microBands + broadBands - cassini * 0.34) * edge;
        vec3 color = mix(vec3(0.30,0.23,0.20), vec3(0.84,0.73,0.58), band);
        color = mix(color, vec3(0.94,0.84,0.68), smoothstep(0.08, 0.36, band) * 0.18);
        // Sombra del planeta: oscurece los puntos del anillo cuya línea hacia
        // el sol atraviesa la esfera de saturno (aprox. esférica).
        vec3 toSun = normalize(uSunPos - vWorldPos);
        vec3 toPlanet = uPlanetPos - vWorldPos;
        float along = dot(toPlanet, toSun);
        if (along > 0.0) {
          float perp = length(toPlanet - toSun * along);
          float shadow = 1.0 - smoothstep(uPlanetRadius * 0.45, uPlanetRadius * 1.05, perp);
          color *= 1.0 - shadow * 0.55;
          alpha *= 1.0 - shadow * 0.78;
        }
        gl_FragColor = vec4(color + microBands * 0.14, alpha);
      }
    `,
  })
  const mesh = new THREE.Mesh(new THREE.RingGeometry(1.72, 3.35, 192), material)
  mesh.rotation.x = -1.08
  mesh.rotation.z = -0.12
  return { mesh, material }
}

export function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  const materials = Array.isArray(material) ? material : [material]
  for (const entry of materials) {
    const textured = entry as THREE.Material & { map?: THREE.Texture; bumpMap?: THREE.Texture }
    textured.map?.dispose()
    if (textured.bumpMap && textured.bumpMap !== textured.map) textured.bumpMap.dispose()
    entry.dispose()
  }
}
