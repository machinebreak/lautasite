export function calculateMissionProgress(top: number, height: number, viewportHeight: number) {
  const transitionDistance = Math.max(
    viewportHeight,
    Math.min(height, viewportHeight * 1.35),
  )
  const progress = (viewportHeight - top) / transitionDistance
  return Math.min(1, Math.max(0, progress))
}
