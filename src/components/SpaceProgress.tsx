import { useEffect, useRef, useState } from 'react'
import { calculateMissionProgress } from '../lib/spaceProgress'

export function SpaceProgress() {
  const barRef = useRef<HTMLDivElement>(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const mission = document.querySelector<HTMLElement>('[data-project-mission]')
    if (!mission) return

    let missionDocTop = 0
    let missionHeight = 1
    let viewportHeight = window.innerHeight
    let ticking = false
    let scrollY = window.scrollY

    const measure = () => {
      const bounds = mission.getBoundingClientRect()
      missionDocTop = bounds.top + window.scrollY
      missionHeight = Math.max(1, bounds.height)
      viewportHeight = window.innerHeight
    }

    const update = () => {
      ticking = false
      const p = calculateMissionProgress(
        missionDocTop - scrollY,
        missionHeight,
        viewportHeight,
      )
      // Re-render de React solo si cambió lo suficiente: la barra se mueve por
      // ref (sin renders) y los dots solo cambian en 3 umbrales. Antes se hacía
      // setState en cada frame de scroll = renders inútiles durante el scroll.
      setProgress((previous) => (Math.abs(previous - p) > 0.002 ? p : previous))
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${p})`
      }
    }

    const onScroll = () => {
      scrollY = window.scrollY
      if (!ticking) {
        ticking = true
        requestAnimationFrame(update)
      }
    }

    const onResize = () => {
      measure()
      onScroll()
    }

    measure()
    update()

    let ro: ResizeObserver | null = null
    try {
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(onResize)
        ro.observe(document.documentElement)
      }
    } catch {
      ro = null
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    return () => {
      ro?.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const scrollToProgress = (target: number) => {
    const mission = document.querySelector<HTMLElement>('[data-project-mission]')
    if (!mission) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const bounds = mission.getBoundingClientRect()
    const missionDocTop = bounds.top + window.scrollY
    const missionHeight = Math.max(1, bounds.height)
    const viewportHeight = window.innerHeight
    const transitionDistance = Math.max(
      viewportHeight,
      Math.min(missionHeight, viewportHeight * 1.35),
    )
    if (target <= 0.01) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const top = missionDocTop - viewportHeight + target * transitionDistance
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
  }

  const dots = [
    { label: 'Launch', p: 0 },
    { label: 'Stations', p: 0.32 },
    { label: 'Projects', p: 1 },
  ]

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      if (event.key === '1') scrollToProgress(0)
      else if (event.key === '2') scrollToProgress(0.32)
      else if (event.key === '3') scrollToProgress(1)
      else if (event.key === 'Home') {
        event.preventDefault()
        scrollToProgress(0)
      } else if (event.key === 'End') {
        event.preventDefault()
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <>
      <div
        className="space-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="Mission progress"
        aria-hidden="false"
      >
        <div ref={barRef} className="space-progress__bar" style={{ transform: 'scaleX(0)' }} />
      </div>
      <nav className="space-dots" aria-label="Mission sections">
        {dots.map((dot) => {
          const active =
            (dot.p === 0 && progress < 0.16) ||
            (dot.p === 0.32 && progress >= 0.16 && progress < 0.78) ||
            (dot.p === 1 && progress >= 0.78)
          return (
            <button
              key={dot.label}
              type="button"
              className="space-dots__dot"
              data-active={active}
              aria-label={`Go to ${dot.label}`}
              aria-current={active ? 'true' : undefined}
              onClick={() => scrollToProgress(dot.p)}
            >
              <span />
            </button>
          )
        })}
      </nav>
    </>
  )
}
