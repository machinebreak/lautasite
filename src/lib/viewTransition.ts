import type { NavigateFunction } from 'react-router-dom'

type ViewTransitionDocument = Document & {
  startViewTransition?: (cb: () => void | Promise<void>) => { finished: Promise<void> }
}

export function navigateWithViewTransition(
  navigate: NavigateFunction,
  to: string,
  options?: { replace?: boolean },
) {
  const doc = document as ViewTransitionDocument
  if (doc.startViewTransition) {
    doc.startViewTransition(() => {
      navigate(to, options)
    })
  } else {
    navigate(to, options)
  }
}

// Para <a> y Link onClick handlers
export function handleViewTransitionClick(
  event: React.MouseEvent<HTMLAnchorElement>,
  navigate: NavigateFunction,
  to: string,
) {
  // Dejar que el browser maneje modificadores (cmd+click, etc.)
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
  const doc = document as ViewTransitionDocument
  if (!doc.startViewTransition) return
  event.preventDefault()
  navigateWithViewTransition(navigate, to)
}
