export function SpaceFallback() {
  return (
    <div className="space-experience__fallback">
      <div className="space-experience__fallback-stars" />
      <div className="space-experience__fallback-saturn">
        <span />
      </div>
      <div className="space-experience__fallback-planets">
        <span className="space-experience__fallback-planet space-experience__fallback-planet--sun" />
        <span className="space-experience__fallback-planet space-experience__fallback-planet--moon" />
        <span className="space-experience__fallback-planet space-experience__fallback-planet--earth" />
        <span className="space-experience__fallback-planet space-experience__fallback-planet--venus" />
        <span className="space-experience__fallback-planet space-experience__fallback-planet--mars" />
      </div>
      <div className="space-experience__fallback-station">
        <span className="space-experience__fallback-panel space-experience__fallback-panel--left" />
        <span className="space-experience__fallback-panel space-experience__fallback-panel--right" />
      </div>
    </div>
  )
}
