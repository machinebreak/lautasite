import { useEffect, useRef, useState } from 'react'
import { calculateRepulsion, capVelocity } from '../lib/particlePhysics'

type IdentityScene = 'full-name' | 'blackletter-b' | 'bertucci'
type ParticleState = 'entering' | 'settled' | 'exiting'

interface ParticleNameProps {
  color: string
}

interface Particle {
  x: number
  y: number
  homeX: number
  homeY: number
  vx: number
  vy: number
  delay: number
  state: ParticleState
}

const SCENES: IdentityScene[] = ['full-name', 'blackletter-b', 'bertucci']
const FONT_STACK = '"Geist Variable", Geist, sans-serif'
const CYCLE_DURATION = 4800
const EXIT_DURATION = 680

function drawTrackedText(
  context: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  tracking: number,
) {
  const characters = [...text]
  const widths = characters.map((character) => context.measureText(character).width)
  const totalWidth =
    widths.reduce((total, characterWidth) => total + characterWidth, 0) +
    tracking * (characters.length - 1)
  let x = centerX - totalWidth / 2

  for (let index = 0; index < characters.length; index += 1) {
    context.fillText(characters[index], x, centerY)
    x += widths[index] + tracking
  }
}

function drawBlackletterB(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale = 1,
  shiftX = 0,
) {
  const unit = Math.min(width * 0.34 * scale, height * 0.56 * scale)
  const x = width / 2 - unit * 0.53 + shiftX
  const y = height / 2 - unit * 0.57

  context.save()
  context.fillStyle = '#000'
  context.strokeStyle = '#000'
  context.lineCap = 'round'
  context.lineJoin = 'round'

  // The angular spine is the gothic core of the letter.
  context.beginPath()
  context.moveTo(x + unit * 0.05, y)
  context.lineTo(x + unit * 0.27, y + unit * 0.02)
  context.lineTo(x + unit * 0.18, y + unit * 0.42)
  context.lineTo(x + unit * 0.3, y + unit * 0.84)
  context.lineTo(x + unit * 0.11, y + unit * 1.13)
  context.lineTo(x - unit * 0.07, y + unit * 1.08)
  context.lineTo(x + unit * 0.02, y + unit * 0.62)
  context.lineTo(x - unit * 0.1, y + unit * 0.22)
  context.closePath()
  context.fill()

  // Two bowed counters form a readable B without losing the calligraphic edge.
  context.beginPath()
  context.moveTo(x + unit * 0.14, y + unit * 0.1)
  context.bezierCurveTo(
    x + unit * 0.58,
    y - unit * 0.03,
    x + unit * 0.92,
    y + unit * 0.1,
    x + unit * 0.91,
    y + unit * 0.32,
  )
  context.bezierCurveTo(
    x + unit * 0.9,
    y + unit * 0.5,
    x + unit * 0.6,
    y + unit * 0.54,
    x + unit * 0.15,
    y + unit * 0.5,
  )
  context.closePath()
  context.fill()

  context.beginPath()
  context.moveTo(x + unit * 0.17, y + unit * 0.57)
  context.bezierCurveTo(
    x + unit * 0.67,
    y + unit * 0.45,
    x + unit * 1.02,
    y + unit * 0.61,
    x + unit * 0.98,
    y + unit * 0.87,
  )
  context.bezierCurveTo(
    x + unit * 0.94,
    y + unit * 1.08,
    x + unit * 0.59,
    y + unit * 1.16,
    x + unit * 0.2,
    y + unit * 1.04,
  )
  context.closePath()
  context.fill()

  context.globalCompositeOperation = 'destination-out'
  context.beginPath()
  context.moveTo(x + unit * 0.28, y + unit * 0.18)
  context.lineTo(x + unit * 0.59, y + unit * 0.15)
  context.bezierCurveTo(
    x + unit * 0.72,
    y + unit * 0.2,
    x + unit * 0.69,
    y + unit * 0.35,
    x + unit * 0.52,
    y + unit * 0.39,
  )
  context.lineTo(x + unit * 0.31, y + unit * 0.4)
  context.closePath()
  context.fill()

  context.beginPath()
  context.moveTo(x + unit * 0.33, y + unit * 0.67)
  context.lineTo(x + unit * 0.68, y + unit * 0.65)
  context.bezierCurveTo(
    x + unit * 0.82,
    y + unit * 0.7,
    x + unit * 0.8,
    y + unit * 0.88,
    x + unit * 0.62,
    y + unit * 0.91,
  )
  context.lineTo(x + unit * 0.36, y + unit * 0.91)
  context.closePath()
  context.fill()

  context.globalCompositeOperation = 'source-over'
  context.lineWidth = unit * 0.055

  // Flourishes reference the ink swashes in the supplied mark.
  context.beginPath()
  context.moveTo(x + unit * 0.06, y + unit * 0.24)
  context.bezierCurveTo(
    x - unit * 0.42,
    y + unit * 0.03,
    x - unit * 0.58,
    y + unit * 0.28,
    x - unit * 0.25,
    y + unit * 0.34,
  )
  context.stroke()

  context.beginPath()
  context.moveTo(x + unit * 0.23, y + unit * 0.57)
  context.bezierCurveTo(
    x - unit * 0.45,
    y + unit * 0.68,
    x - unit * 0.28,
    y + unit * 1.02,
    x + unit * 0.12,
    y + unit * 0.98,
  )
  context.stroke()

  context.beginPath()
  context.moveTo(x + unit * 0.25, y + unit * 0.16)
  context.bezierCurveTo(
    x + unit * 0.52,
    y - unit * 0.23,
    x + unit * 0.82,
    y - unit * 0.11,
    x + unit * 0.67,
    y + unit * 0.07,
  )
  context.stroke()

  context.restore()
}

function drawFullNameMask(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const sampleFontSize = 100
  const lines = ['LAUTARO', 'BERTUCCI']
  context.font = `720 ${sampleFontSize}px ${FONT_STACK}`
  const measuredWidth = Math.max(
    ...lines.map((line) => context.measureText(line).width),
  )
  const targetWidth = width * (width < 640 ? 0.88 : 0.76)
  const fontSize = Math.min(
    200,
    targetWidth / (measuredWidth / sampleFontSize),
    height * 0.24,
  )
  const lineDistance = fontSize * 0.87

  context.fillStyle = '#000'
  context.font = `720 ${fontSize}px ${FONT_STACK}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.fillText(lines[0], width / 2, height / 2 - lineDistance / 2)
  context.fillText(lines[1], width / 2, height / 2 + lineDistance / 2)
}

function drawSurnameMask(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  const sampleFontSize = 100
  context.font = `620 ${sampleFontSize}px ${FONT_STACK}`
  const letters = 'ERTUCCI'
  const lettersWidth = [...letters].reduce(
    (total, letter) => total + context.measureText(letter).width,
    0,
  )
  const tracking = sampleFontSize * 0.075
  const totalAtSample = lettersWidth + tracking * (letters.length - 1)
  const targetWidth = width * (width < 640 ? 0.7 : 0.55)
  const fontSize = Math.min(
    168,
    targetWidth / (totalAtSample / sampleFontSize),
    height * 0.2,
  )
  const blackletterBaseUnit = Math.min(width * 0.34, height * 0.56)
  const blackletterUnit = fontSize * 0.92
  const blackletterScale = blackletterUnit / blackletterBaseUnit
  const bWidth = blackletterUnit * 1.1
  const wordWidth =
    (lettersWidth / sampleFontSize) * fontSize +
    tracking * (fontSize / sampleFontSize) * (letters.length - 1)
  const totalWidth = bWidth + fontSize * 0.12 + wordWidth
  const startX = width / 2 - totalWidth / 2
  const centerY = height / 2

  drawBlackletterB(
    context,
    width,
    height,
    blackletterScale,
    startX + bWidth / 2 - width / 2,
  )

  context.fillStyle = '#000'
  context.font = `620 ${fontSize}px ${FONT_STACK}`
  context.textAlign = 'left'
  context.textBaseline = 'middle'
  drawTrackedText(
    context,
    letters,
    startX + bWidth + fontSize * 0.08 + wordWidth / 2,
    centerY + fontSize * 0.012,
    tracking * (fontSize / sampleFontSize),
  )
}

function drawMask(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  scene: IdentityScene,
) {
  if (scene === 'full-name') drawFullNameMask(context, width, height)
  if (scene === 'blackletter-b') drawBlackletterB(context, width, height)
  if (scene === 'bertucci') drawSurnameMask(context, width, height)
}

export function ParticleName({ color }: ParticleNameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return

    const reduceMotionQuery = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    )
    let prefersReducedMotion = reduceMotionQuery.matches
    let particles: Particle[] = []
    let animationFrame = 0
    let cycleTimer = 0
    let rebuildTimer = 0
    let entryStartedAt = performance.now()
    let sceneIndex = 0
    let hasInitialized = false
    let isTransitioning = false
    let isIntersecting = true
    let documentIsVisible = !document.hidden
    let dragging = false
    let pointerX = 0
    let pointerY = 0
    let pointerVelocityX = 0
    let pointerVelocityY = 0
    let particleSize = 1.35
    let disposed = false
    let fontIsReady = false

    const clearCycleTimer = () => {
      if (cycleTimer) {
        window.clearTimeout(cycleTimer)
        cycleTimer = 0
      }
    }

    const drawParticles = () => {
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      context.clearRect(0, 0, width, height)
      context.fillStyle = color

      for (const particle of particles) {
        context.fillRect(
          Math.round(particle.x),
          Math.round(particle.y),
          particleSize,
          particleSize,
        )
      }
    }

    const createParticles = (scene: IdentityScene, state: ParticleState) => {
      const width = Math.max(1, Math.round(canvas.clientWidth))
      const height = Math.max(1, Math.round(canvas.clientHeight))
      const mask = document.createElement('canvas')
      mask.width = width
      mask.height = height
      const maskContext = mask.getContext('2d', {
        willReadFrequently: true,
      })
      if (!maskContext) return []

      drawMask(maskContext, width, height, scene)
      const pixels = maskContext.getImageData(0, 0, width, height).data
      const grid = width < 640 ? 3 : width < 1100 ? 4 : 5
      particleSize = width < 640 ? 1.15 : 1.35
      const nextParticles: Particle[] = []

      for (let y = 0; y < height; y += grid) {
        for (let x = 0; x < width; x += grid) {
          const alpha = pixels[(y * width + x) * 4 + 3]
          if (alpha < 128) continue

          const fromTop = -(Math.random() * height * 0.5 + 44)
          const fromSide = Math.random() > 0.5 ? -width * 0.15 : width * 1.15
          const originX = Math.random() > 0.72 ? fromSide : x

          nextParticles.push({
            x: state === 'settled' ? x : originX,
            y: state === 'settled' ? y : fromTop,
            homeX: x,
            homeY: y,
            vx: 0,
            vy: 0,
            delay: state === 'entering'
              ? (1 - y / height) * 260 + Math.random() * 100
              : 0,
            state,
          })
        }
      }

      return nextParticles
    }

    const stopLoop = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame)
        animationFrame = 0
      }
    }

    const startLoop = () => {
      if (
        animationFrame ||
        !isIntersecting ||
        !documentIsVisible ||
        prefersReducedMotion
      ) {
        return
      }

      animationFrame = requestAnimationFrame(frame)
    }

    const scheduleTransition = () => {
      clearCycleTimer()
      if (
        prefersReducedMotion ||
        !isIntersecting ||
        !documentIsVisible ||
        isTransitioning
      ) {
        return
      }

      cycleTimer = window.setTimeout(() => {
        if (dragging) {
          scheduleTransition()
          return
        }

        isTransitioning = true
        const centerX = canvas.clientWidth / 2
        const centerY = canvas.clientHeight / 2

        for (const particle of particles) {
          const dx = particle.x - centerX || (Math.random() - 0.5) * 10
          const dy = particle.y - centerY || (Math.random() - 0.5) * 10
          const distance = Math.sqrt(dx * dx + dy * dy) || 1
          const speed = 11 + Math.random() * 16
          particle.vx = (dx / distance) * speed + (Math.random() - 0.5) * 5
          particle.vy = (dy / distance) * speed + (Math.random() - 0.5) * 5
          particle.state = 'exiting'
        }

        rebuildTimer = window.setTimeout(() => {
          sceneIndex = (sceneIndex + 1) % SCENES.length
          particles = createParticles(SCENES[sceneIndex], 'entering')
          entryStartedAt = performance.now()
          isTransitioning = false
          scheduleTransition()
        }, EXIT_DURATION)
      }, CYCLE_DURATION)
    }

    const frame = () => {
      animationFrame = 0
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      context.clearRect(0, 0, width, height)
      context.fillStyle = color
      const brushRadius = Math.min(74, Math.max(42, width * 0.055))
      const brushStrength = Math.min(5.4, Math.max(3.2, width * 0.004))
      const maxSpeed = Math.min(34, Math.max(22, width * 0.026))

      for (const particle of particles) {
        if (particle.state === 'exiting') {
          particle.vx *= 1.015
          particle.vy *= 1.015
          particle.x += particle.vx
          particle.y += particle.vy
        } else {
          if (particle.state === 'entering') {
            if (performance.now() - entryStartedAt < particle.delay) continue
            particle.vx += (particle.homeX - particle.x) * 0.022
            particle.vy += (particle.homeY - particle.y) * 0.022
          }

          if (particle.state === 'settled' && dragging) {
            const dx = particle.x - pointerX
            const dy = particle.y - pointerY
            const repulsion = calculateRepulsion(
              dx,
              dy,
              brushRadius,
              brushStrength,
            )
            const influence =
              Math.abs(repulsion.x) + Math.abs(repulsion.y) > 0 ? 0.46 : 0
            particle.vx += repulsion.x + pointerVelocityX * influence
            particle.vy += repulsion.y + pointerVelocityY * influence
          }

          particle.vx += (particle.homeX - particle.x) * 0.026
          particle.vy += (particle.homeY - particle.y) * 0.026
          particle.vx *= particle.state === 'entering' ? 0.81 : 0.84
          particle.vy *= particle.state === 'entering' ? 0.81 : 0.84

          const capped = capVelocity(particle.vx, particle.vy, maxSpeed)
          particle.vx = capped.x
          particle.vy = capped.y
          particle.x += particle.vx
          particle.y += particle.vy

          if (
            particle.state === 'entering' &&
            Math.abs(particle.homeX - particle.x) < 0.35 &&
            Math.abs(particle.homeY - particle.y) < 0.35
          ) {
            particle.state = 'settled'
          }
        }

        context.fillRect(
          Math.round(particle.x),
          Math.round(particle.y),
          particleSize,
          particleSize,
        )
      }

      pointerVelocityX *= 0.58
      pointerVelocityY *= 0.58

      if (isIntersecting && documentIsVisible && !prefersReducedMotion) {
        animationFrame = requestAnimationFrame(frame)
      }
    }

    const rebuild = () => {
      if (!fontIsReady) return

      const bounds = canvas.getBoundingClientRect()
      const width = Math.max(1, Math.round(bounds.width))
      const height = Math.max(1, Math.round(bounds.height))
      const pixelRatio = Math.min(2, Math.max(1, window.devicePixelRatio || 1))

      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.imageSmoothingEnabled = false

      particles = createParticles(
        SCENES[sceneIndex],
        hasInitialized || prefersReducedMotion ? 'settled' : 'entering',
      )
      entryStartedAt = performance.now()
      hasInitialized = true
      setIsReady(true)

      if (prefersReducedMotion) drawParticles()
      else {
        startLoop()
        scheduleTransition()
      }
    }

    const getPointerPosition = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      return {
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      }
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (prefersReducedMotion || isTransitioning) return
      const position = getPointerPosition(event)
      pointerX = position.x
      pointerY = position.y
      pointerVelocityX = 0
      pointerVelocityY = 0
      dragging = true
      clearCycleTimer()
      canvas.dataset.dragging = 'true'
      canvas.setPointerCapture?.(event.pointerId)
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragging || prefersReducedMotion) return
      const position = getPointerPosition(event)
      pointerVelocityX += position.x - pointerX
      pointerVelocityY += position.y - pointerY
      pointerX = position.x
      pointerY = position.y
    }

    const releasePointer = () => {
      if (!dragging) return
      dragging = false
      pointerVelocityX = 0
      pointerVelocityY = 0
      delete canvas.dataset.dragging
      scheduleTransition()
    }

    const handleVisibilityChange = () => {
      documentIsVisible = !document.hidden
      if (documentIsVisible) {
        startLoop()
        scheduleTransition()
      } else {
        clearCycleTimer()
        stopLoop()
      }
    }

    const handleMotionPreference = (event: MediaQueryListEvent) => {
      prefersReducedMotion = event.matches
      clearCycleTimer()
      window.clearTimeout(rebuildTimer)
      stopLoop()
      rebuild()
    }

    const resizeObserver = new ResizeObserver(rebuild)
    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting
        if (isIntersecting) {
          startLoop()
          scheduleTransition()
        } else {
          clearCycleTimer()
          stopLoop()
        }
      },
      { threshold: 0.02 },
    )

    canvas.addEventListener('pointerdown', handlePointerDown)
    canvas.addEventListener('pointermove', handlePointerMove)
    canvas.addEventListener('pointerup', releasePointer)
    canvas.addEventListener('pointercancel', releasePointer)
    document.addEventListener('visibilitychange', handleVisibilityChange)
    reduceMotionQuery.addEventListener('change', handleMotionPreference)
    resizeObserver.observe(canvas)
    intersectionObserver.observe(canvas)

    document.fonts.ready.then(() => {
      if (!disposed) {
        fontIsReady = true
        rebuild()
      }
    })

    return () => {
      disposed = true
      clearCycleTimer()
      window.clearTimeout(rebuildTimer)
      stopLoop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      canvas.removeEventListener('pointerdown', handlePointerDown)
      canvas.removeEventListener('pointermove', handlePointerMove)
      canvas.removeEventListener('pointerup', releasePointer)
      canvas.removeEventListener('pointercancel', releasePointer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      reduceMotionQuery.removeEventListener('change', handleMotionPreference)
    }
  }, [color])

  return (
    <div className={`particle-name${isReady ? ' is-ready' : ''}`}>
      <div className="particle-name__fallback" aria-hidden="true">
        <span>LAUTARO</span>
        <span>BERTUCCI</span>
      </div>
      <canvas
        ref={canvasRef}
        aria-label="Lautaro Bertucci's identity formed by micropixels morphing between the name, a blackletter B, and Bertucci."
      />
    </div>
  )
}
