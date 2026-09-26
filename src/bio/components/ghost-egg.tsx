import { useEffect, useRef, useState } from "react";

function GhostArt() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="56"
      height="56"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="6" y="0" width="4" height="1" fill="currentColor" />
      <rect x="4" y="1" width="8" height="1" fill="currentColor" />
      <rect x="3" y="2" width="10" height="8" fill="currentColor" />
      <rect x="3" y="10" width="2" height="1" fill="currentColor" />
      <rect x="7" y="10" width="2" height="1" fill="currentColor" />
      <rect x="11" y="10" width="2" height="1" fill="currentColor" />
      <rect x="3" y="11" width="1" height="1" fill="currentColor" />
      <rect x="7" y="11" width="1" height="1" fill="currentColor" />
      <rect x="11" y="11" width="1" height="1" fill="currentColor" />
      <rect x="5" y="4" width="2" height="2" fill="var(--lv-bg)" />
      <rect x="9" y="4" width="2" height="2" fill="var(--lv-bg)" />
    </svg>
  );
}

function MiniLock() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="16"
      height="16"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="5" y="1" width="6" height="1" fill="currentColor" />
      <rect x="4" y="2" width="1" height="4" fill="currentColor" />
      <rect x="11" y="2" width="1" height="4" fill="currentColor" />
      <rect x="2" y="6" width="12" height="1" fill="currentColor" />
      <rect x="1" y="7" width="14" height="7" fill="currentColor" />
      <rect x="3" y="15" width="10" height="1" fill="currentColor" />
    </svg>
  );
}

export function GhostEgg({ onDismiss }: { onDismiss: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const pos = useRef({ x: -200, y: -200 });
  const target = useRef({ x: -200, y: -200 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const startX = Math.max(24, window.innerWidth / 2 - 28);
    const startY = Math.max(24, window.innerHeight - 200);
    pos.current = { x: startX, y: startY };
    target.current = { x: startX, y: startY };
    setReady(true);

    const onMove = (e: PointerEvent) => {
      target.current = { x: e.clientX + 24, y: e.clientY + 24 };
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("keydown", onKey);

    let raf = 0;
    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.08;
      pos.current.y += (target.current.y - pos.current.y) * 0.08;
      if (ref.current) {
        ref.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
    };
  }, [onDismiss]);

  return (
    <button
      ref={ref}
      type="button"
      className="lv-ghost"
      style={{ opacity: ready ? 1 : 0 }}
      onClick={onDismiss}
      aria-label="A pixel ghost. It is watching you. Activate to dismiss."
      title="it sees you."
    >
      <span className="lv-ghost-inner">
        <GhostArt />
        <span className="lv-ghost-lock">
          <MiniLock />
        </span>
      </span>
    </button>
  );
}
