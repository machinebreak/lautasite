import { useEffect } from 'react'
import { projects } from '../data/projects'

interface AudioContextWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

function playConsoleOpenSfx() {
  const AudioContextConstructor =
    window.AudioContext ?? (window as AudioContextWindow).webkitAudioContext
  if (!AudioContextConstructor) return

  try {
    const context = new AudioContextConstructor()
    const master = context.createGain()
    master.gain.setValueAtTime(0.045, context.currentTime)
    master.connect(context.destination)

    const tone = (
      frequency: number,
      delay: number,
      duration: number,
      type: OscillatorType,
      targetFrequency?: number,
    ) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const start = context.currentTime + delay
      oscillator.type = type
      oscillator.frequency.setValueAtTime(frequency, start)
      if (targetFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(targetFrequency, start + duration)
      }
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(1, start + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
      oscillator.connect(gain)
      gain.connect(master)
      oscillator.start(start)
      oscillator.stop(start + duration + 0.02)
    }

    tone(118, 0, 0.22, 'triangle', 154)
    tone(680, 0.06, 0.13, 'sine', 920)
    tone(980, 0.18, 0.2, 'sine', 1320)
    window.setTimeout(() => void context.close(), 700)
  } catch {
    // Audio is an enhancement; the console stays usable when blocked.
  }
}

export function ProjectShowcase() {
  useEffect(() => {
    window.addEventListener('space-project-open', playConsoleOpenSfx)
    return () => window.removeEventListener('space-project-open', playConsoleOpenSfx)
  }, [])

  const requestConsole = (projectId: string) => {
    window.dispatchEvent(new CustomEvent('space-project-open', { detail: { projectId } }))
  }

  return (
    <section
      id="projects"
      className="project-mission"
      aria-labelledby="project-heading"
      aria-describedby="project-instructions"
      data-project-mission
    >
      <h2 id="project-heading" className="sr-only">
        Lautaro Bertucci&apos;s projects
      </h2>
      <p id="project-instructions" className="sr-only">
        Scroll to reveal interactive 3D stations. Each station is a project terminal — click or press Enter to open the console, Escape to close.
      </p>
      {projects.map((project) => (
        <button
          key={project.id}
          className="mission-screen"
          data-project-screen={project.id}
          data-project-title={project.title}
          type="button"
          tabIndex={-1}
          aria-label={`Interact with the ${project.title} project console`}
          onClick={() => requestConsole(project.id)}
        >
          <span className="sr-only">Interact with {project.title}&apos;s transmission</span>
        </button>
      ))}
      <nav className="mission-fallback-list" aria-label="Direct links to the projects">
        {projects.map((project) => (
          <a
            key={project.id}
            className="mission-fallback-card"
            href={project.url}
            target="_blank"
            rel="noreferrer"
            aria-label={`Visit ${project.title}`}
          >
            <span className="mission-fallback-card__meta">
              Project {project.number} · {project.status}
            </span>
            <strong>{project.title}</strong>
            <span className="mission-fallback-card__description">{project.description}</span>
            <span className="mission-fallback-card__action">
              Visit project
              <span aria-hidden="true">↗</span>
            </span>
          </a>
        ))}
      </nav>
    </section>
  )
}
