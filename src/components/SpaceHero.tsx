import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { projects } from '../data/projects'
import { canUseWebGL } from '../lib/spaceCapabilities'
import { playUiSound } from './space/uiSound'
import { SpaceFallback } from './SpaceFallback'
import { SpaceProgress } from './SpaceProgress'
import { useSpaceExperience } from './space/useSpaceExperience'

type SpaceHeroMode = 'detecting' | 'fallback' | 'webgl'

interface SpaceHeroProps {
  children?: ReactNode
}

function detectInitialMode(): SpaceHeroMode {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'fallback'
  } catch {
    return 'fallback'
  }
  return canUseWebGL() ? 'detecting' : 'fallback'
}


const AUDIO_KEY = 'space-audio-muted'
const VISITED_KEY = 'space-visited'

function readMutedPreference(): boolean {
  try {
    return localStorage.getItem(AUDIO_KEY) === '1'
  } catch {
    return false
  }
}

export function SpaceHero({ children }: SpaceHeroProps) {
  const experienceRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [mode, setMode] = useState<SpaceHeroMode>(detectInitialMode)
  const [audioMuted, setAudioMuted] = useState(readMutedPreference)
  const audioMutedRef = useRef(audioMuted)

  const toggleAudio = () => {
    const next = !audioMuted
    audioMutedRef.current = next
    setAudioMuted(next)
    try {
      localStorage.setItem(AUDIO_KEY, next ? '1' : '0')
    } catch {
      // storage opcional
    }
    window.dispatchEvent(new CustomEvent('space-audio-toggle', { detail: { muted: next } }))
    playUiSound(next ? 'toggle-on' : 'toggle-off')
  }

  const handleMainPageClick = () => {
    playUiSound('navigate')
  }

  useSpaceExperience(experienceRef, canvasRef, setMode, audioMutedRef)

  // Marcar visita para mostrar hint pulsante solo la primera vez
  useEffect(() => {
    try {
      if (!localStorage.getItem(VISITED_KEY)) {
        localStorage.setItem(VISITED_KEY, '1')
        experienceRef.current?.setAttribute('data-first-visit', 'true')
      }
    } catch {
      // storage opcional
    }
  }, [])

  return (
    <div ref={experienceRef} className={`space-experience space-experience--${mode}`}>
      <div className="space-experience__scene" aria-hidden="true">
        <canvas ref={canvasRef} className="space-experience__canvas" />
        {mode === 'detecting' && (
          <div className="space-experience__hud">
            <div className="space-boot" role="status" aria-label="Loading space experience">
              <div className="space-boot__stars" />
              <div className="space-boot__orbit" aria-hidden="true">
                <span className="space-boot__orbit-ring" />
                <span className="space-boot__orbit-sat" />
                <span className="space-boot__orbit-core" />
              </div>
              <p className="space-boot__eyebrow">LAUTA.SPACE // MISSION INIT</p>
              <p className="space-boot__percent" data-boot-percent>
                0%
              </p>
              <div className="space-boot__bar">
                <span />
              </div>
              <p className="space-boot__stage">
                <span data-boot-stage>LOADING TEXTURES</span>
                <span className="space-boot__cursor" aria-hidden="true">
                  ▊
                </span>
              </p>
            </div>
          </div>
        )}
        {mode === 'fallback' && <SpaceFallback />}
        <div className="space-experience__labels" aria-hidden="true">
          {projects.map((project) => (
            <span key={project.id} className="space-label" data-space-label={project.id}>
              <span className="space-label__terminal">TERMINAL / {project.number}</span>
              <strong>{project.title.toUpperCase()}</strong>
              <span className="space-label__hint">CLICK TO CONNECT</span>
            </span>
          ))}
        </div>
      </div>

      <nav className="space-overlay-nav" aria-label="Space navigation">
        <Link viewTransition className="space-terminal-button" to="/" onClick={handleMainPageClick}>
          [ main page ]
        </Link>
        {mode === 'webgl' && (
          <button
            type="button"
            className="space-terminal-button"
            data-muted={audioMuted}
            aria-pressed={audioMuted}
            onClick={toggleAudio}
          >
            [ sound {audioMuted ? 'off' : 'on'} ]
          </button>
        )}
      </nav>

      <SpaceProgress />

      <section id="top" className="space-hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="space-hero__star-name" aria-label="Lautaro Bertucci">
          <span>LAUTARO</span>
          <span>BERTUCCI</span>
        </h1>
        <a
          className="space-hero__scroll-cue"
          href="#projects"
          aria-label="View projects"
          onClick={(event) => {
            event.preventDefault()
            document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
        >
          <span aria-hidden="true" />
        </a>
      </section>

      {children}
    </div>
  )
}
