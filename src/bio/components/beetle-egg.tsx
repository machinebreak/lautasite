import { useEffect, useRef } from "react";

const COLORS: Record<string, string> = {
  k: "#2e1a0b",
  w: "#f58220",
  s: "#b8500f",
  g: "#ffd07a",
  e: "#2e1a0b",
};

/** El dorso: lo que se ve de cualquier lado mientras va derecho. */
const BODY: string[] = [
  "........k...k........",
  ".........kkk.........",
  ".........kwk.........",
  ".........kwk.........",
  "........kwwwk........",
  ".......kwwwwwk.......",
  "......kwwewewwk......",
  "......kwwwwwwwk......",
  ".....kkwwwwwwwkk.....",
  "....kwwwwwwwwwwwk....",
  "...kwwwwwwwwwwwwwk...",
  "...kwwssswwwssswwk...",
  "..kwwwwwwwwwwwwwwwk..",
  "..kwwwssswwwssswwwk..",
  "..kwwwwwwwwwwwwwwwk..",
  "..kwwwwwgggggwwwwwk..",
  "..kwwwwwwwwwwwwwwwk..",
  "..kwwwssswwwssswwwk..",
  "...kwwwwwwwwwwwwwk...",
  "...kwwwwwwwwwwwwwk...",
  "....kwwwwwwwwwwwk....",
  ".....kkwwwwwwwkk.....",
  ".......kkkkkkk.......",
];

/** Paleta de la cara de abajo: panza clara y bandas de los segmentos. */
const BELLY_COLORS: Record<string, string> = {
  k: "#2e1a0b",
  v: "#f6cd97",
  d: "#d59a5f",
  m: "#6b3a12",
};

/**
 * La misma silueta vista desde abajo. Girar el sprite dorsal 180° no
 *servía de nada porque se ve casi igual: hace falta este segundo dibujo,
 * con la panza en crema y las patas emergingiendo por encima, para que se
 * lea de verdad que el bicho va bocabajo.
 */
const BELLY: string[] = [
  "........k...k........",
  ".........kkk.........",
  ".........kmk.........",
  ".........kmk.........",
  "........kvvvk........",
  ".......kvvvvvk.......",
  "......kvvvmvvmk......",
  "......kvvvvvvvk......",
  ".....kkvvvvvvvkk.....",
  "....kvvvvvvvvvvvk....",
  "...kvvvvvvvvvvvvvk...",
  "...kvvdddvvvdddvvk...",
  "..kvvvvvvvvvvvvvvvvk..",
  "..kvvvdddvvvdddvvvk..",
  "..kvvvvvvvvvvvvvvvvk..",
  "..kvvvvvdddddvvvvvk..",
  "..kvvvvvvvvvvvvvvvvk..",
  "..kvvvdddvvvdddvvvk..",
  "...kvvvvvvvvvvvvvk...",
  "...kvvvvvvvvvvvvvk...",
  "....kvvvvvvvvvvvk....",
  ".....kkvvvvvvvkk.....",
  ".......kkkkkkk.......",
];

type Rect = { x: number; y: number; fill: string };

function explode(rows: string[], palette: Record<string, string>): Rect[] {
  const out: Rect[] = [];
  rows.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === ".") return;
      out.push({ x, y, fill: palette[ch] ?? "#ffffff" });
    });
  });
  return out;
}

const BODY_RECTS = explode(BODY, COLORS);
const BELLY_RECTS = explode(BELLY, BELLY_COLORS);

type Leg = [number, number, number, number];

/** [ancla x, ancla y, punta adelantada x/y, punta atrasada x/y] */
const LEG_ANCHORS: [number, number, number, number, number, number][] = [
  [4, 9.5, 0.5, 5.5, 1.5, 13.5],
  [2, 13.5, -2, 16, -2, 11],
  [2, 17.5, -0.5, 14, 0.5, 21],
  [17, 9.5, 20.5, 13.5, 19.5, 5.5],
  [19, 13.5, 23, 11, 23, 16],
  [19, 17.5, 22.5, 21, 22.5, 14],
];

/**
 * Trípode alterno, como el de cualquier insecto: las patas 1-3-5 y las
 * 2-4-6 van en grupos de tres, y un grupoForward mientras el otro
 * retrocede. La versión anterior movía las seis a la vez, que es lo que
 * la hacía parecer de juguete.
 */
const LEG_TRIPOD = [0, 1, 0, 1, 0, 1];
const GAIT_FRAMES = 6;

/** Posición de un trípode en un fotograma: 0 = atrás, 1 = adelante. */
function tripodAt(frame: number) {
  return 0.5 - 0.5 * Math.cos((2 * Math.PI * frame) / GAIT_FRAMES);
}

const LEGS: Leg[][] = Array.from({ length: GAIT_FRAMES }, (_, f) => {
  const phase = tripodAt(f);
  return LEG_ANCHORS.map(([ax, ay, fx, fy, bx, by], i) => {
    const t = LEG_TRIPOD[i] === 0 ? phase : 1 - phase;
    return [ax, ay, bx + (fx - bx) * t, by + (fy - by) * t];
  });
});

/** El cuerpo sube mientras una pata está en el aire y baja aloyen contacto. */
const BOB = LEGS.map((_, f) => {
  const p = tripodAt(f);
  return p > 0.08 && p < 0.92 ? -0.5 : 0.35;
});

function legPath(frame: number) {
  return LEGS[frame].map(([x1, y1, x2, y2]) => `M${x1} ${y1}L${x2} ${y2}`).join("");
}

const LEG_COLOR = "#4a2c10";
/** Más clara: las patas tienen que leerse ENCIMA de la panza crema. */
const BELLY_LEG_COLOR = "#8f5f28";


function Pixels({ rects }: { rects: Rect[] }) {
  return (
    <>
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={1.01} height={1.01} fill={r.fill} />
      ))}
    </>
  );
}

/**
 * El escarabajo, montado en dos capas apiladas y con las dos caras
 * —dorso y panza— una encima de otra. `data-belly="on"` en la raíz hace
 * que CSS esconda el dorso y muestre la panza, que es el momento en que el
 * bicho va de cabeza por debajo del texto. `legRefs` apunta a los seis
 * fotogramas del paso para que las dos capas se muevan al mismo compás.
 */
function BeetleArt({
  bodyRef,
  legRefs,
}: {
  bodyRef?: (el: SVGGElement | null) => void;
  legRefs: (i: number, el: SVGPathElement | null) => void;
}) {
  return (
    <svg viewBox="-3 -1 27 25" aria-hidden="true">
      <g ref={bodyRef}>
        <g className="lv-beetle-back">
          <Pixels rects={BODY_RECTS} />
        </g>
        <g className="lv-beetle-belly">
          <Pixels rects={BELLY_RECTS} />
        </g>
      </g>
      <g className="lv-beetle-back">
        {LEGS.map((_, i) => (
          <path
            key={i}
            d={legPath(i)}
            stroke={LEG_COLOR}
            strokeWidth={1}
            fill="none"
            shapeRendering="crispEdges"
            ref={(el) => {
              legRefs(i, el);
            }}
            style={i === 1 ? undefined : { display: "none" }}
          />
        ))}
      </g>
      <g className="lv-beetle-belly">
        {LEGS.map((_, i) => (
          <path
            key={i}
            d={legPath(i)}
            stroke={BELLY_LEG_COLOR}
            strokeWidth={1}
            fill="none"
            shapeRendering="crispEdges"
            ref={(el) => {
              legRefs(i + GAIT_FRAMES, el);
            }}
            style={i === 1 ? undefined : { display: "none" }}
          />
        ))}
      </g>
    </svg>
  );
}

export function MiniBeetle() {
  return (
    <svg
      viewBox="-3 -1 27 25"
      width="18"
      height="18"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <Pixels rects={BODY_RECTS} />
      <path
        d={legPath(0)}
        stroke={LEG_COLOR}
        strokeWidth={1}
        fill="none"
        shapeRendering="crispEdges"
      />
    </svg>
  );
}

type Pt = { x: number; y: number };

/**
 * Un paso ya no guarda coordenadas: guarda a QUÉ elemento apunta. La
 * posición se vuelve a leer del DOM en cada frame, así que el scroll no
 * descuadra el paseo — si la descripción se va tres pantallas más arriba,
 * el escarabajo sigue yendo a por ella en vez de dar vueltas en el vacío.
 */
type Step =
  | { kind: "roam"; x: number; docY: number }
  /** Colarse por debajo del renglón `line` del elemento. */
  | { kind: "duck"; el: Element; line: number; crossed: boolean; from: number }
  /** Meterse por el borde inferior de una tarjeta y desaparecer. */
  | { kind: "dive"; el: Element };

const DUCK_SELECTORS =
  ".lv-p, .lv-name, .lv-page-title, .lv-proj, .lv-exp, .lv-contact-row, .lv-more, .lv-link";
const DIVE_SELECTORS = ".lv-space-card, .lv-photos-card";
const ANY_SELECTORS = `${DUCK_SELECTORS}, ${DIVE_SELECTORS}`;

function visible(selector: string): Element[] {
  const out: Element[] = [];
  document.querySelectorAll(selector).forEach((el) => {
    if (el.closest('[data-active="false"]')) return;
    const r = el.getBoundingClientRect();
    if (
      r.width > 40 &&
      r.height > 14 &&
      r.bottom > 70 &&
      r.top < window.innerHeight - 46
    ) {
      out.push(el);
    }
  });
  return out;
}

/**
 * Una caja por cada renglón de texto del elemento. Un `.lv-p` mide tres
 * líneas de alto: cruzarse por el centro de la caja lo deja pasar por el
 * hueco entre renglones, donde no hay nada que tapar. Con las cajas de
 * línea el caparazón sí choca contra las letras.
 */
function textLines(el: Element): DOMRect[] {
  const out: DOMRect[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    if ((node.textContent ?? "").trim()) {
      const range = document.createRange();
      range.selectNodeContents(node);
      // jsdom no implementa getClientRects: caemos a la caja del elemento.
      if (typeof range.getClientRects === "function") {
        for (const r of Array.from(range.getClientRects())) {
          if (r.width > 24 && r.height > 6) out.push(r);
        }
      }
    }
    node = walker.nextNode();
  }
  return out.length > 0 ? out : [el.getBoundingClientRect()];
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function shuffled<T>(list: T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Dónde está el paso ahora mismo. `null` = que ya no aplica, se descarta. */
function resolve(step: Step): { x: number; y: number; under: boolean } | null {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  if (step.kind === "roam") {
    return {
      x: clamp(step.x, 26, vw - 26),
      y: clamp(step.docY - window.scrollY, 70, vh - 40),
      under: false,
    };
  }

  const box =
    step.kind === "duck"
      ? textLines(step.el)[step.line]
      : step.el.getBoundingClientRect();
  if (!box) return null;
  // Solo se descarta si se fue de verdad; con un scroll a medias se sigue
  // detrás del texto en vez de abandonar el paseo.
  if (box.bottom < 24 || box.top > vh - 12) return null;

  if (step.kind === "dive") {
    return {
      x: clamp(box.left + box.width / 2, 26, vw - 26),
      y: clamp(box.bottom - 10, 70, vh - 24),
      under: true,
    };
  }

  const y = clamp(box.top + box.height / 2, 70, vh - 40);
  // Un renglón muy ancho se cruza por una ventana alrededor del centro, para
  // que el paseo por debajo no se eternice.
  const mid = box.left + box.width / 2;
  const half = Math.min(box.width + 48, 320) / 2;
  // Entra por el lado más cercano: así llega casi en línea con el renglón y
  // el volteo de abajo es un cuarto de vuelta, no una pirueta.
  if (!step.crossed) {
    const near = step.from <= mid ? mid - half - 20 : mid + half + 20;
    return { x: clamp(near, 26, vw - 26), y, under: false };
  }
  const far = step.from <= mid ? mid + half + 20 : mid - half - 20;
  return {
    x:
      step.from <= mid
        ? Math.max(step.from + 40, clamp(far, 26, vw - 26))
        : Math.min(step.from - 40, clamp(far, 26, vw - 26)),
    y,
    under: true,
  };
}

/**
 * El paseo: deambula un poco y se cuela por debajo de dos o tres renglones
 * de la página —la descripción, un botón, un título— y remata hundiéndose
 * por debajo de una tarjeta.
 */
function buildRoute(origin: Pt): Step[] {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const steps: Step[] = [];
  const marks = shuffled(visible(DUCK_SELECTORS));
  // En coordenadas de documento, que es como se comparan dos puntos de la
  // página sin que el scroll los separe.
  let lastX = origin.x;
  let lastY = origin.y + window.scrollY;

  const legs = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < legs; i++) {
    if (i > 0) {
      const margin = 48;
      let point: Step | null = null;
      for (let guard = 0; guard < 24 && !point; guard++) {
        const x = rand(margin, Math.max(margin + 1, vw - margin));
        const docY = rand(
          window.scrollY + margin + 40,
          Math.max(window.scrollY + margin + 41, window.scrollY + vh - margin),
        );
        if (Math.hypot(x - lastX, docY - lastY) > 140) point = { kind: "roam", x, docY };
      }
      if (point) {
        steps.push(point);
        lastX = point.x;
        lastY = point.docY;
      }
    }

    const el = marks[i];
    if (!el) continue;
    const lines = textLines(el);
    if (!lines.length) continue;
    // El renglón 0 suele ser el título, así que se visita más a menudo.
    const line =
      lines.length > 1 && Math.random() < 0.35
        ? 1 + Math.floor(Math.random() * (lines.length - 1))
        : 0;
    steps.push({ kind: "duck", el, line, crossed: false, from: origin.x });
    const box = lines[line];
    lastX = box.left + box.width / 2;
    lastY = box.top + box.height / 2 + window.scrollY;
  }

  const dives = visible(DIVE_SELECTORS);
  const pool = dives.length ? dives : visible(ANY_SELECTORS);
  const card = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  if (card) steps.push({ kind: "dive", el: card });
  return steps;
}

/** Suavizado exponencial independiente del framerate. */
function ease(current: number, target: number, tau: number, dt: number) {
  return current + (target - current) * (1 - Math.exp(-dt / tau));
}

/** Diferencia angular más corta, en grados. */
function shortest(from: number, to: number) {
  return ((to - from + 540) % 360) - 180;
}

/** Radios de vaivén por píxel recorrido: un ciclo completo cada ~96 px. */
const WOBBLE_PER_PX = (Math.PI * 2) / 96;
/** Cuánto se sale de la recta, en px. */
const WOBBLE_AMP = 6;
/** Píxeles que avanza por fotograma de patas: una zancada corta y creíble. */
const STEP_PX = 8;
/** Volteretas por debajo del texto: una cada ~85 px, y ±32° de rocking. */
const ROCK_PER_PX = (Math.PI * 2) / 85;
const ROCK_DEG = 32;

export function BeetleEgg({
  origin,
  onDone,
}: {
  origin: Pt;
  onDone: () => void;
}) {
  const rootRef = useRef<HTMLButtonElement>(null);
  const rotRef = useRef<HTMLSpanElement>(null);
  const underRootRef = useRef<HTMLSpanElement>(null);
  const underRotRef = useRef<HTMLSpanElement>(null);
  const frontBodyRef = useRef<SVGGElement | null>(null);
  const legRefs = useRef<(SVGPathElement | null)[]>([]);
  const underLegRefs = useRef<(SVGPathElement | null)[]>([]);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);
  const fleeRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    const rot = rotRef.current;
    const underRoot = underRootRef.current;
    const underRot = underRotRef.current;
    if (!root || !rot || !underRoot || !underRot) return;

    /** Las dos caras (dorso y panza) comparten el mismo fotograma de paso. */
    const showLegs = (i: number) => {
      for (const set of [legRefs.current, underLegRefs.current]) {
        set.forEach((g, j) => {
          if (g) g.style.display = j % GAIT_FRAMES === i ? "" : "none";
        });
      }
    };

    /** `on` = mostrar la panza en vez del dorso. */
    const showBelly = (on: boolean) => {
      const v = on ? "on" : "off";
      if (root.dataset.belly !== v) root.dataset.belly = v;
      if (underRoot.dataset.belly !== v) underRoot.dataset.belly = v;
    };

    let raf = 0;
    let finished = false;
    let reduceFadeTimer = 0;
    const failsafe = window.setTimeout(() => doneRef.current(), 30000);
    const finish = () => {
      if (finished) return;
      finished = true;
      cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
      doneRef.current();
    };

    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      root.style.transform = `translate3d(${origin.x}px, ${origin.y}px, 0)`;
      showLegs(1);
      const t1 = window.setTimeout(() => {
        root.style.transition = "opacity 500ms ease-out";
        root.style.opacity = "0";
        reduceFadeTimer = window.setTimeout(finish, 550);
      }, 900);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(reduceFadeTimer);
        window.clearTimeout(failsafe);
      };
    }

    const route = buildRoute(origin);
    const pos = { ...origin };
    const SPEED = 175;
    let leg = 0;
    let legTimer = 0;
    let legNext = STEP_PX;
    let bob = 0;
    let squash = 1;
    let scale = 0;
    let wait = 0;
    let hiding = false;
    let under = 0;
    let shownUnder = -1;
    let underFlagged = false;
    /** Rumbo real del último desplazamiento, en grados. */
    let moveAngle = 0;
    let heading = 90;
    let drawnX = pos.x;
    let drawnY = pos.y;
    let prevX = pos.x;
    let prevY = pos.y;
    let wobble = rand(0, Math.PI * 2);
    let rock = rand(0, Math.PI * 2);
    let pace = rand(0, Math.PI * 2);
    let last = performance.now();

    /**
     * Un solo pose para las dos capas: patas y caparazón nunca se desalinean.
     * `squash` aplasta el sprite en X para que se vea DE CANTO a mitad del
     * volteo; sin eso, girar 180° una silueta casi redonda no se lee como
     * volteo sino como un cambio de color.
     */
    const pose = (x: number, y: number, ang: number, sc: number, squash = 1) => {
      const t = `translate3d(${x}px, ${y}px, 0)`;
      const r = `rotate(${ang}deg) scale(${sc * squash}, ${sc})`;
      root.style.transform = t;
      rot.style.transform = r;
      underRoot.style.transform = t;
      underRot.style.transform = r;
    };

    /**
     * Reparte el caparazón entre la capa de atrás y la de delante. De la cara
     * (dorso/panza) se encarga `showBelly`, que mira el rumbo real.
     */
    const paintUnder = (amt: number) => {
      const q = Math.round(amt * 100) / 100;
      if (q === shownUnder) return;
      shownUnder = q;
      underRoot.style.opacity = `${q * 0.92}`;
      if (frontBodyRef.current) frontBodyRef.current.style.opacity = `${1 - q}`;
      const flagged = q > 0.5;
      if (flagged !== underFlagged) {
        underFlagged = flagged;
        root.dataset.under = flagged ? "true" : "false";
      }
    };

    root.dataset.under = "false";
    pose(drawnX, drawnY, heading, 0);
    showLegs(0);
    showBelly(false);
    paintUnder(0);

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (scale < 1 && !hiding) {
        scale = Math.min(1, scale + dt / 0.22);
        pose(drawnX, drawnY, heading, scale);
        raf = requestAnimationFrame(tick);
        return;
      }

      if (hiding) {
        if (wait > 0) {
          wait -= dt;
          raf = requestAnimationFrame(tick);
          return;
        }
        scale -= dt / 0.32;
        if (scale <= 0) {
          console.log(
            "%cthe beetle found a hiding spot.",
            "font-family:monospace;font-size:11px;color:#888;",
          );
          finish();
          return;
        }
        const s = Math.max(0, scale);
        pose(drawnX, drawnY + bob, heading, s, squash);
        const o = Math.max(0, Math.min(1, s * 1.5));
        root.style.opacity = `${o}`;
        underRoot.style.opacity = `${under * 0.92 * s}`;
        raf = requestAnimationFrame(tick);
        return;
      }

      if (fleeRef.current || route.length === 0) {
        hiding = true;
        wait = 0.12;
        raf = requestAnimationFrame(tick);
        return;
      }

      const step = route[0];
      const t = resolve(step);
      if (!t) {
        // El objetivo se fue de pantalla o dejó de existir: se descarta y
        // sigue con el siguiente, en vez de quedarse persiguiendo el vacío.
        route.shift();
        raf = requestAnimationFrame(tick);
        return;
      }
      const dx = t.x - pos.x;
      const dy = t.y - pos.y;
      const d = Math.hypot(dx, dy);
      if (d < 5) {
        if (step.kind === "duck" && !step.crossed) {
          // Llegó al borde del renglón: a partir de aquí lo cruza por debajo.
          step.crossed = true;
          step.from = pos.x;
        } else {
          route.shift();
        }
        if (route.length === 0) {
          hiding = true;
          wait = 0.28;
        }
        raf = requestAnimationFrame(tick);
        return;
      }

      // Se da la vuelta: un cuarto de vuelta, no media — media lo dejaría
      // caminando de espaldas en vez de de cabeza. Va deliberadamente lento
      // para que el volteo se lea de un vistazo.
      under = ease(under, t.under ? 1 : 0, 0.19, dt);

      pace += dt * 2.1;
      const speed =
        SPEED * (1 - 0.28 * under) * (1 + 0.14 * Math.sin(pace));
      const along = Math.min(d, speed * dt);
      const ux = dx / d;
      const uy = dy / d;
      pos.x += ux * along;
      pos.y += uy * along;

      // Un vaivén suave sobre la recta: los bichos no andan en línea recta.
      wobble += along * WOBBLE_PER_PX;
      const sway = Math.sin(wobble) * WOBBLE_AMP * (1 - 0.6 * under);
      drawnX = pos.x - uy * sway;
      drawnY = pos.y + ux * sway;

      // El rumbo sale del desplazamiento de verdad, así que la concha se
      // ladea con el vaivén en vez de ir clavada en la recta del waypoint.
      if (drawnX !== prevX || drawnY !== prevY) {
        moveAngle =
          (Math.atan2(drawnY - prevY, drawnX - prevX) * 180) / Math.PI;
        prevX = drawnX;
        prevY = drawnY;
      }
      // Por debajo no va derecho: le cuesta el paso y da varias vueltas
      // mientras se arrastra por la línea de texto.
      rock += along * ROCK_PER_PX;
      const flip = Math.sin(rock) * ROCK_DEG * under;
      // Por debajo no avanza derecho: se queda de cabeza —180° fijos, no un
      // cuarto de vuelta sobre el rumbo, que yendo a la izquierda lo dejaría
      // de cabeza ARRIBA— y da varias vueltas mientras patalea.
      // El cruce va a lo largo del renglón, o sea en horizontal: si el rumbo
      // real ya lo está se respeta y si no se fuerza, porque mantener el
      // rumbo de aproximación hacía que el volteo fuese una pirueta de 180°
      // en vez de un cuarto de vuelta.
      const sideways = Math.abs(moveAngle) > 90 || Math.abs(moveAngle) < -90;
      const level = Math.abs(moveAngle) < 60 || Math.abs(moveAngle) > 120;
      const walk =
        t.under && level
          ? sideways
            ? 270
            : 90
          : moveAngle + 90;
      const belly = 180 + flip;
      const want = walk + shortest(walk, belly) * under;
      heading += shortest(heading, want) * (1 - Math.exp(-dt / 0.09));

      // El aplastamiento y el cambio de cara salen del MISMO progreso del
      // volteo que mueve la pose, así van clavados: a `under` 0.5 el bicho
      // está de canto (silueta de astilla) y es justo cuando salta el dorso
      // por la panza, que es donde el corte no se nota.
      squash = 1 - 0.62 * Math.sin(Math.PI * under);
      showBelly(under >= 0.5);

      // El compás se mide en píxeles recorridos, no en reloj, así que si va
      // más lento por debajo del texto también patinea menos. Y cada pata
      // tarda un poco distinto: un insecto de verdad no hace tic-tac.
      legTimer += along;
      if (legTimer > legNext) {
        legTimer -= legNext;
        legNext = STEP_PX * rand(0.82, 1.2);
        leg = (leg + 1) % GAIT_FRAMES;
        showLegs(leg);
      }
      bob = BOB[leg] * (1 - 0.45 * under);

      paintUnder(under);
      pose(drawnX, drawnY + bob, heading, 1, squash);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") fleeRef.current = true;
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf);
      window.clearTimeout(failsafe);
    };
  }, [origin]);

  return (
    <>
      <span ref={underRootRef} className="lv-beetle-under" aria-hidden="true">
        <span ref={underRotRef} className="lv-beetle-under-rot">
          <BeetleArt
            legRefs={(i, el) => {
              underLegRefs.current[i] = el;
            }}
          />
        </span>
      </span>
      <button
        ref={rootRef}
        type="button"
        className="lv-beetle"
        onClick={() => {
          fleeRef.current = true;
        }}
        aria-label="A pixel beetle. It is scurrying around. Activate to shoo it away."
        title="shoo!"
      >
        <span ref={rotRef} className="lv-beetle-rot">
          <BeetleArt
            bodyRef={(el) => {
              frontBodyRef.current = el;
            }}
            legRefs={(i, el) => {
              legRefs.current[i] = el;
            }}
          />
        </span>
      </button>
    </>
  );
}
