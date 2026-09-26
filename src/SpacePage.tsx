import { lazy, Suspense, useLayoutEffect } from 'react'
import { ProjectShowcase } from './components/ProjectShowcase'
import { canRunSpaceScene } from './lib/spaceCapabilities'

// Carga condicional: solo los dispositivos con WebGL, sin reduced-motion y sin
// conexión lenta descargan la escena WebGL (three.js ~150 kB gzip). El resto va
// directo a SpaceHeroLight (~1 kB) con el fallback 2D en CSS puro. El preload
// de spacePreload.ts calienta el chunk correcto en hover/timer.
const SpaceHero = lazy(() =>
  canRunSpaceScene()
    ? import('./components/SpaceHero').then((m) => ({ default: m.SpaceHero }))
    : import('./components/SpaceHeroLight').then((m) => ({
        default: m.SpaceHeroLight,
      })),
)

// Loader estilo terminal mientras vuela el chunk de la escena. En visitas con
// precarga (hover/timer) no se llega a ver; en visitas directas da feedback
// temático en lugar de un fondo negro mudo. Reutiliza .space-experience__scene
// (fixed + inset 0 + var(--surface), siempre oscuro).
function BootLoader() {
  return (
    <div className="space-experience__scene space-boot" aria-hidden="true">
      <div className="space-boot__stars" />
      <div className="space-boot__orbit" aria-hidden="true">
        <span className="space-boot__orbit-ring" />
        <span className="space-boot__orbit-sat" />
        <span className="space-boot__orbit-core" />
      </div>
      <p className="space-boot__eyebrow">LAUTA.SPACE // MISSION INIT</p>
      <p className="space-boot__percent">···</p>
      <div className="space-boot__bar space-boot__bar--indeterminate">
        <span />
      </div>
      <p className="space-boot__stage">
        <span>LOADING MODULES</span>
        <span className="space-boot__cursor" aria-hidden="true">
          ▊
        </span>
      </p>
    </div>
  )
}

// SEO por ruta: /space tiene su propio title y descripción. Se restauran los
// valores originales al salir, para que el bio recupere los de index.html.
const SPACE_TITLE = 'Lautaro Bertucci — Space Portfolio'
const SPACE_DESCRIPTION =
  'Interactive 3D space portfolio: scroll through a mini solar system to explore my projects.'
const SPACE_URL = 'https://lauta.site/space'
const SPACE_IMAGE = 'https://lauta.site/space/saturn.webp'
const SPACE_IMAGE_ALT = 'Saturn rendered in 3D from the interactive space portfolio'

function SpacePage() {
  useLayoutEffect(() => {
    // La experiencia espacial siempre es oscura, pero al salir devolvemos
    // el tema que tenía el bio (light/dark) en lugar de dejarlo forzado.
    const root = document.documentElement
    const previousTheme = root.dataset.theme
    const previousColorScheme = root.style.colorScheme

    root.dataset.theme = 'dark'
    root.style.colorScheme = 'dark'

    const previousScrollRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })

    // Metas de la ruta: actualiza (o crea) y deja un restore para el cleanup.
    const previousTitle = document.title
    document.title = SPACE_TITLE
    const metaRestores: Array<() => void> = []
    const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
      if (!el) {
        el = document.createElement('meta')
        el.setAttribute(attr, key)
        document.head.appendChild(el)
      }
      const previous = el.getAttribute('content')
      el.setAttribute('content', content)
      metaRestores.push(() => {
        if (previous === null) el.removeAttribute('content')
        else el.setAttribute('content', previous)
      })
    }
    setMeta('name', 'description', SPACE_DESCRIPTION)
    setMeta('property', 'og:title', SPACE_TITLE)
    setMeta('property', 'og:description', SPACE_DESCRIPTION)
    setMeta('property', 'og:url', SPACE_URL)
    setMeta('property', 'og:type', 'website')
    setMeta('property', 'og:image', SPACE_IMAGE)
    setMeta('property', 'og:image:alt', SPACE_IMAGE_ALT)
    setMeta('name', 'twitter:title', SPACE_TITLE)
    setMeta('name', 'twitter:description', SPACE_DESCRIPTION)
    setMeta('name', 'twitter:image', SPACE_IMAGE)
    setMeta('name', 'twitter:card', 'summary_large_image')

    // Canonical link
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    let previousCanonical: string | null = null
    let createdCanonical = false
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.setAttribute('rel', 'canonical')
      document.head.appendChild(canonical)
      createdCanonical = true
    }
    previousCanonical = canonical.getAttribute('href')
    canonical.setAttribute('href', SPACE_URL)
    metaRestores.push(() => {
      if (createdCanonical) canonical.remove()
      else if (previousCanonical === null) canonical.removeAttribute('href')
      else canonical.setAttribute('href', previousCanonical)
    })

    // JSON-LD Person + Projects
    const ldId = 'space-jsonld'
    const previousLd = document.getElementById(ldId)
    const previousLdHtml = previousLd?.textContent ?? null
    let ldEl = previousLd as HTMLScriptElement | null
    const createdLd = !ldEl
    if (!ldEl) {
      ldEl = document.createElement('script')
      ldEl.id = ldId
      ldEl.type = 'application/ld+json'
      document.head.appendChild(ldEl)
    }
    ldEl.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: SPACE_TITLE,
      description: SPACE_DESCRIPTION,
      url: SPACE_URL,
      isPartOf: { '@type': 'Person', name: 'Lautaro Bertucci', url: 'https://lauta.site/' },
    })
    metaRestores.push(() => {
      if (createdLd) ldEl!.remove()
      else if (previousLdHtml !== null) ldEl!.textContent = previousLdHtml
      else ldEl!.textContent = ''
    })

    return () => {
      if (previousTheme !== undefined) {
        root.dataset.theme = previousTheme
      } else {
        delete root.dataset.theme
      }
      root.style.colorScheme = previousColorScheme
      window.history.scrollRestoration = previousScrollRestoration
      document.title = previousTitle
      for (const restore of metaRestores) restore()
    }
  }, [])

  return (
    <main className="site-shell">
      <Suspense fallback={<BootLoader />}>
        <SpaceHero>
          <ProjectShowcase />
        </SpaceHero>
      </Suspense>
    </main>
  )
}

export default SpacePage
