import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { projects } from '../data/projects'
import { SpaceFallback } from './SpaceFallback'
import { SpaceProgress } from './SpaceProgress'

// Versión liviana de SpaceHero para dispositivos sin WebGL, con
// prefers-reduced-motion o conexión lenta/saveData: replica el árbol de
// fallback 2D (CSS puro, sin canvas) para que esos usuarios nunca descarguen
// el chunk de three.js. El markup espeja el render de SpaceHero en modo
// 'fallback' — si cambia ahí, cambiar acá.
export function SpaceHeroLight({ children }: { children?: ReactNode }) {
  return (
    <div className="space-experience space-experience--fallback">
      <div className="space-experience__scene" aria-hidden="true">
        <SpaceFallback />
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
        <Link viewTransition className="space-terminal-button" to="/">
          [ main page ]
        </Link>
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
