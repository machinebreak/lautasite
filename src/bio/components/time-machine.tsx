import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useDesign, type SiteDesign } from "./design-provider";

const OPTIONS: Array<{
  id: SiteDesign;
  label: string;
  description: string;
  badge?: string;
  caption: string;
}> = [
  {
    id: "modern",
    label: "modern web",
    description: "clean, minimal, current",
    badge: "default",
    caption: "now · 2026",
  },
  {
    id: "retro2000",
    label: "2000 web",
    description: "teal, silver & pixels",
    caption: "august 1999",
  },
];

const INK = "#05050a";
const CASE_DARK = "#1b2130";
const CASE_MID = "#2f3850";
const CASE_LIGHT = "#4a5670";

/** El "CRT" de la máquina y las miniaturas de las tarjetas comparten estas coordenadas. */
const SCREEN = { x: 16, y: 10, w: 32, h: 18 };
const SCANLINES = Array.from(
  { length: Math.ceil(SCREEN.h / 2) },
  (_, i) => SCREEN.y + i * 2,
);

const MARQUEE: ReadonlyArray<readonly [number, number, string]> = [
  [0, 1, "#ffff00"],
  [1, 2, "#ffffff"],
  [3, 1, "#00ffff"],
  [4, 3, "#ffff00"],
  [7, 1, "#ff00ff"],
  [8, 2, "#ffffff"],
  [10, 1, "#00ff00"],
  [11, 3, "#ffffff"],
  [14, 2, "#ffff00"],
];

const HAZARD = Array.from({ length: 8 }, (_, i) => (i % 2 === 0 ? "#ffff00" : INK));

const DUST: ReadonlyArray<readonly [number, number]> = [
  [2, 5],
  [1, 34],
  [3, 44],
  [61, 6],
  [59, 38],
  [63, 24],
  [8, 1],
  [24, 0],
  [55, 2],
  [40, 47],
  [6, 46],
  [58, 45],
];

const STREAKS: ReadonlyArray<readonly [number, number, number]> = [
  [1, 10, 4],
  [0, 20, 5],
  [1, 29, 4],
  [59, 11, 4],
  [59, 21, 5],
  [60, 30, 4],
  [16, 1, 4],
  [30, 1, 3],
  [44, 1, 4],
  [12, 45, 5],
  [28, 46, 4],
  [44, 45, 5],
];

type BoxProps = {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: string;
  line?: string;
  lw?: number;
};

function Box({ x, y, w, h, fill, line, lw = 2 }: BoxProps) {
  const b = line ? lw : 0;
  return (
    <>
      {line ? <rect x={x} y={y} width={w} height={h} fill={line} /> : null}
      <rect x={x + b} y={y + b} width={w - b * 2} height={h - b * 2} fill={fill} />
    </>
  );
}

function MachineArt() {
  return (
    <svg
      viewBox="0 0 42 34"
      width="42"
      height="34"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x="8" y="3" width="24" height="5" fill="#8b8b8b" />
      <rect x="12" y="8" width="17" height="14" fill="#242424" stroke="#050505" strokeWidth="2" />
      <rect x="15" y="10" width="11" height="9" fill="#050505" />
      <rect x="8" y="21" width="27" height="8" fill="#b7b7b7" stroke="#050505" strokeWidth="2" />
      <rect x="5" y="27" width="33" height="4" fill="#777777" stroke="#050505" strokeWidth="2" />
      <rect x="2" y="17" width="7" height="4" fill="#d7d7d7" stroke="#050505" strokeWidth="2" />
      <rect x="34" y="17" width="6" height="4" fill="#d7d7d7" stroke="#050505" strokeWidth="2" />
      <rect x="29" y="12" width="5" height="9" fill="#8b8b8b" stroke="#050505" strokeWidth="2" />
      <rect x="31" y="5" width="2" height="8" fill="#050505" />
      <rect x="29" y="4" width="6" height="2" fill="#050505" />
      <rect x="8" y="31" width="5" height="3" fill="#050505" />
      <rect x="29" y="31" width="5" height="3" fill="#050505" />
      <rect x="18" y="23" width="7" height="3" fill="#050505" />
      <rect x="20" y="24" width="3" height="1" fill="#52e052" />
      <ellipse className="lv-time-machine-portal" cx="20.5" cy="14.5" rx="4" ry="5" fill="#301b73" stroke="#8f7cff" strokeWidth="1.5" />
      <rect x="19" y="12" width="2" height="5" fill="#b9a8ff" />
    </svg>
  );
}

function ModernScene() {
  return (
    <g>
      <rect x={16} y={10} width={32} height={18} fill="#0a0a0c" />
      <rect x={16} y={10} width={32} height={3} fill="#101014" />
      <rect x={16} y={13} width={32} height={1} fill="#1c1c22" />
      <rect x={18} y={11} width={1} height={1} fill="#45454f" />
      <rect x={20} y={11} width={1} height={1} fill="#45454f" />
      <rect x={22} y={11} width={1} height={1} fill="#45454f" />
      <rect x={40} y={11} width={5} height={1} fill="#2a2a32" />
      <rect x={18} y={15} width={14} height={2} fill="#f0f0f2" />
      <rect x={18} y={18} width={20} height={1} fill="#4a4a54" />
      <rect x={32} y={18} width={1} height={2} fill="#9a9aa6" className="lv-tm-cursor" />
      <rect x={18} y={21} width={24} height={1} fill="#232329" />
      <rect x={18} y={23} width={18} height={1} fill="#232329" />
      <rect x={18} y={25} width={7} height={2} fill="#1d1d22" />
      <rect x={18} y={25} width={1} height={2} fill="#6f7482" />
      <rect x={27} y={25} width={9} height={2} fill="#101014" />
      <rect x={27} y={25} width={9} height={1} fill="#232329" />
      <rect x={38} y={25} width={9} height={2} fill="#101014" />
      <rect x={38} y={25} width={9} height={1} fill="#232329" />
    </g>
  );
}

function RetroScene() {
  return (
    <g>
      <rect x={16} y={10} width={32} height={18} fill="#008080" />
      <rect x={16} y={10} width={32} height={3} fill="#000080" />
      <g className="lv-tm-marquee">
        {[0, 16, 32].map((offset) =>
          MARQUEE.map(([x, w, fill], i) => (
            <rect key={`${offset}-${i}`} x={16 + offset + x} y={12} width={w} height={1} fill={fill} />
          )),
        )}
      </g>
      <rect x={17} y={14} width={30} height={13} fill={INK} />
      <rect x={18} y={15} width={28} height={11} fill="#c0c0c0" />
      <rect x={18} y={15} width={28} height={3} fill="#000080" />
      <rect x={41} y={16} width={2} height={2} fill="#c0c0c0" />
      <rect x={43} y={16} width={2} height={2} fill="#c0c0c0" />
      <rect x={19} y={19} width={26} height={7} fill="#ffffff" />
      <rect x={21} y={20} width={13} height={2} fill="#000080" />
      <g className="lv-tm-hazard">
        {HAZARD.map((fill, i) => (
          <rect key={i} x={36 + i} y={20} width={1} height={2} fill={fill} />
        ))}
      </g>
      <rect x={21} y={23} width={10} height={1} fill="#0000ff" />
      <rect x={21} y={24} width={10} height={1} fill="#6666ff" />
      <rect x={34} y={23} width={4} height={3} fill="#c0c0c0" />
      <rect x={36} y={24} width={1} height={1} fill="#ff00ff" className="lv-tm-cursor" />
    </g>
  );
}

function EraScene({ id, active }: { id: SiteDesign; active: boolean }) {
  return (
    <g className="lv-tm-scene" data-on={active}>
      {id === "modern" ? <ModernScene /> : <RetroScene />}
    </g>
  );
}

function ScreenGlass() {
  return (
    <g>
      {SCANLINES.map((y) => (
        <rect key={y} x={SCREEN.x} y={y} width={SCREEN.w} height={1} fill="#000000" opacity="0.22" />
      ))}
      <rect x={18} y={12} width={14} height={1} fill="#ffffff" opacity="0.07" />
      <rect x={18} y={13} width={8} height={1} fill="#ffffff" opacity="0.07" />
    </g>
  );
}

function MachineScene({ era, clipId }: { era: SiteDesign; clipId: string }) {
  return (
    <svg
      className="lv-tm-art"
      viewBox="0 0 64 48"
      preserveAspectRatio="xMidYMid meet"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} />
        </clipPath>
      </defs>

      <rect x={0} y={0} width={64} height={48} fill="#05050e" />
      <rect x={0} y={0} width={64} height={40} fill="#0a0a18" />

      <g className="lv-tm-floor">
        <rect x={0} y={40} width={64} height={1} fill="#2a1e58" />
        {[42, 44, 46, 48].map((y) => (
          <rect key={`h${y}`} x={0} y={y} width={64} height={1} fill="#150d2c" />
        ))}
        {[2, 10, 18, 26, 34, 42, 50, 58].map((x) => (
          <rect key={`v${x}`} x={x} y={40} width={1} height={10} fill="#120a26" />
        ))}
      </g>

      <ellipse className="lv-tm-ring" cx={32} cy={21} rx={28} ry={22} fill="none" strokeWidth={1} />
      <ellipse
        className="lv-tm-pulse"
        cx={32}
        cy={21}
        rx={28}
        ry={22}
        fill="none"
        strokeWidth={1}
        strokeDasharray="6 6"
      />

      {DUST.map(([x, y], i) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={1}
          height={1}
          className={i % 3 === 0 ? "lv-tm-dust lv-tm-dust--blink" : "lv-tm-dust"}
          style={{ animationDelay: `${-(i * 0.41).toFixed(2)}s` }}
        />
      ))}

      {STREAKS.map(([x, y, w], i) => (
        <rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={w}
          height={1}
          className="lv-tm-streak"
          style={{ animationDelay: `${-(i * 0.29).toFixed(2)}s` }}
        />
      ))}

      <Box x={12} y={5} w={40} h={28} fill={CASE_MID} line={INK} />
      <rect x={14} y={7} width={36} height={1} fill={CASE_LIGHT} />
      <rect x={14} y={30} width={36} height={1} fill={CASE_DARK} />
      <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={SCREEN.h} fill="#05070f" />
      <rect x={SCREEN.x} y={SCREEN.y} width={SCREEN.w} height={1} fill={CASE_DARK} />
      <rect x={47} y={SCREEN.y} width={1} height={SCREEN.h} fill={CASE_DARK} />
      <rect x={18} y={29} width={3} height={2} fill={CASE_LIGHT} />
      <rect x={22} y={29} width={3} height={2} fill={CASE_LIGHT} />
      <rect x={26} y={29} width={6} height={2} fill={CASE_DARK} />
      <rect x={43} y={28} width={4} height={3} fill={CASE_LIGHT} />
      <rect x={44} y={29} width={2} height={1} fill={CASE_DARK} />
      <rect x={48} y={29} width={2} height={2} fill="#59ffa6" className="lv-tm-led" />

      <g clipPath={`url(#${clipId})`}>
        <g className="lv-tm-crt">
          <EraScene id="modern" active={era === "modern"} />
          <EraScene id="retro2000" active={era === "retro2000"} />
          <ScreenGlass />
        </g>
      </g>

      <Box x={10} y={33} w={44} h={7} fill={CASE_MID} line={INK} />
      <rect x={12} y={35} width={40} height={1} fill={CASE_LIGHT} />
      <Box x={12} y={36} w={8} h={2} fill={CASE_LIGHT} line={INK} lw={1} />
      <rect x={13} y={36} width={3} height={1} fill="#ff5a45" className="lv-tm-led" />
      <rect x={22} y={36} width={14} height={2} fill={INK} />
      <rect x={23} y={37} width={12} height={1} fill="#1a1f2c" />
      <rect x={33} y={37} width={1} height={1} fill={CASE_LIGHT} />
      {[38, 40, 42, 44].map((x) => (
        <rect key={x} x={x} y={36} width={1} height={2} fill={INK} />
      ))}
      <rect x={47} y={36} width={1} height={1} fill="#ffd257" />
      <rect x={49} y={36} width={1} height={1} fill="#59ffa6" />
      <Box x={15} y={40} w={7} h={3} fill={CASE_DARK} line={INK} lw={1} />
      <Box x={42} y={40} w={7} h={3} fill={CASE_DARK} line={INK} lw={1} />
    </svg>
  );
}

function EraSwatch({ id }: { id: SiteDesign }) {
  return (
    <svg
      className="lv-design-swatch-svg"
      viewBox={`${SCREEN.x} ${SCREEN.y} ${SCREEN.w} ${SCREEN.h}`}
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <EraScene id={id} active />
      <ScreenGlass />
    </svg>
  );
}

const EXIT_MS = 320;
const WARP_MS = 480;

function prefersReducedMotion() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function TimeMachine() {
  const { design, setDesign } = useDesign();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<SiteDesign>(design);
  const [phase, setPhase] = useState<"idle" | "leaving" | "warping">("idle");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const designRef = useRef(design);
  const timerRef = useRef(0);
  const titleId = useId();
  const clipId = `lv-tm-screen-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;

  useEffect(() => {
    designRef.current = design;
  }, [design]);

  useEffect(() => () => window.clearTimeout(timerRef.current), []);

  const close = useCallback(() => {
    window.clearTimeout(timerRef.current);
    if (prefersReducedMotion()) {
      setPhase("idle");
      setOpen(false);
      return;
    }
    setPhase("leaving");
    timerRef.current = window.setTimeout(() => {
      setPhase("idle");
      setOpen(false);
    }, EXIT_MS);
  }, []);

  // Bloquea el scroll, enfoca la opción activa y devuelve el foco al disparador
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const index = OPTIONS.findIndex((option) => option.id === designRef.current);
    optionRefs.current[index < 0 ? 0 : index]?.focus();
    return () => {
      document.body.style.overflow = prevOverflow;
      trigger?.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  const travel = useCallback(
    (id: SiteDesign) => {
      window.clearTimeout(timerRef.current);
      setDesign(id);
      if (prefersReducedMotion()) {
        setPhase("idle");
        setOpen(false);
        return;
      }
      setPhase("warping");
      timerRef.current = window.setTimeout(() => {
        setPhase("idle");
        setOpen(false);
      }, WARP_MS);
    },
    [setDesign],
  );

  const onChoicesKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (step === 0) return;
    event.preventDefault();
    const current = OPTIONS.findIndex((option) => option.id === preview);
    const next = (current + step + OPTIONS.length) % OPTIONS.length;
    setPreview(OPTIONS[next].id);
    optionRefs.current[next]?.focus();
  };

  const current = OPTIONS.find((option) => option.id === preview) ?? OPTIONS[0];

  return (
    <div className="lv-design-switcher">
      <button
        ref={triggerRef}
        type="button"
        aria-label="Open time machine design switcher"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="travel through web designs"
        onClick={() => {
          window.clearTimeout(timerRef.current);
          setPreview(designRef.current);
          setPhase("idle");
          setOpen(true);
        }}
        className="lv-time-machine"
        data-active={open}
      >
        <MachineArt />
        <span className="lv-time-machine-caret">
          <ChevronDown aria-hidden />
        </span>
      </button>

      {open && (
        <div className="lv-tm-root" data-phase={phase} data-era={preview}>
          <div className="lv-tm-backdrop" onClick={close} aria-hidden="true" />
          <div className="lv-tm-scroll">
            <div className="lv-tm-stage" role="dialog" aria-modal="true" aria-labelledby={titleId}>
              <div className="lv-tm-head">
                <span className="lv-tm-readout">
                  time machine
                  <span className="lv-tm-readout-path">
                    web://{preview === "modern" ? "2026" : "1999"}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="Close time machine"
                  onClick={close}
                  className="lv-tm-close"
                >
                  <X aria-hidden />
                </button>
              </div>

              <h2 id={titleId} className="lv-sr">
                Choose a website era
              </h2>

              <div className="lv-tm-art-wrap">
                <MachineScene era={preview} clipId={clipId} />
              </div>

              <p className="lv-tm-caption">
                <span>{current.caption}</span>
                <span className="lv-tm-caption-cursor" aria-hidden="true" />
              </p>

              <div
                className="lv-tm-choices"
                role="radiogroup"
                aria-label="Choose website design"
                onKeyDown={onChoicesKeyDown}
              >
                {OPTIONS.map((option, index) => {
                  const selected = design === option.id;
                  return (
                    <button
                      key={option.id}
                      ref={(el) => {
                        optionRefs.current[index] = el;
                      }}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => travel(option.id)}
                      onPointerMove={() => setPreview(option.id)}
                      onFocus={() => setPreview(option.id)}
                      className="lv-design-option"
                      data-selected={selected}
                      data-preview={preview === option.id}
                    >
                      <span className={`lv-design-swatch lv-design-swatch--${option.id}`}>
                        <EraSwatch id={option.id} />
                      </span>
                      <span className="lv-design-option-copy">
                        <span className="lv-design-option-title">
                          {option.label}
                          {option.badge && <small>{option.badge}</small>}
                        </span>
                        <span className="lv-design-option-description">
                          {option.description}
                        </span>
                      </span>
                      {selected && (
                        <span className="lv-design-check">
                          <Check aria-hidden />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <p className="lv-design-note">your choice is saved on this device.</p>
            </div>
          </div>
          <div className="lv-tm-flash" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
