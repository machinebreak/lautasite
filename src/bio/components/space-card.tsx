import { Link } from "react-router-dom";
import { preloadSpacePage } from "../../lib/spacePreload";

const OUTLINE = "#252a34";
const SUIT = "#f7f9fc";
const SHADE = "#d9e0ea";

function ArgentineFlag() {
  return (
    <g>
      <path d="M112 28 L92 158" stroke={OUTLINE} strokeWidth="5" strokeLinecap="round" />
      <path d="M112 31 L112 156" stroke="#aeb7c2" strokeWidth="2" strokeLinecap="round" />
      <path d="M113 30 Q125 34 137 30 Q143 28 150 31 L150 54 Q141 57 134 53 Q124 57 113 53 Z" fill="#75b9e5" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M113 38 Q124 42 135 38 Q143 40 150 37 L150 43 Q141 46 133 42 Q124 46 113 42 Z" fill="#ffffff" />
      <path d="M113 49 Q124 53 135 49 Q143 51 150 48 L150 51 Q141 54 133 50 Q124 54 113 50 Z" fill="#ffffff" />
      <circle cx="119" cy="41" r="2.1" fill="#f4c542" stroke={OUTLINE} strokeWidth="0.7" />
      <path d="M88 158 L97 156 L101 160 L90 162 Z" fill="#c6cfda" stroke={OUTLINE} strokeWidth="1.7" strokeLinejoin="round" />
    </g>
  );
}

function Astronaut() {
  return (
    <svg viewBox="0 0 155 170" width="95" height="104" aria-hidden="true">
      <defs>
        <clipPath id="flag-clip">
          <path d="M113 30 Q125 34 137 30 Q143 28 150 31 L150 54 Q141 57 134 53 Q124 57 113 53 Z" />
        </clipPath>
      </defs>
      <ellipse cx="53" cy="159" rx="39" ry="6" fill={OUTLINE} opacity="0.18" />
      <ArgentineFlag />

      <rect x="18" y="68" width="23" height="64" rx="11" fill={SHADE} stroke={OUTLINE} strokeWidth="3" />
      <rect x="21" y="79" width="7" height="34" rx="3.5" fill="#aeb8c5" stroke={OUTLINE} strokeWidth="2" />
      <line x1="28" y1="68" x2="28" y2="49" stroke={OUTLINE} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="28" cy="46" r="4" fill="#ff6464" stroke={OUTLINE} strokeWidth="2" className="lv-astro-beacon" />

      <rect x="38" y="116" width="16" height="33" rx="8" fill={SUIT} stroke={OUTLINE} strokeWidth="3" />
      <rect x="64" y="116" width="16" height="33" rx="8" fill={SUIT} stroke={OUTLINE} strokeWidth="3" />
      <path d="M40 135 H52 M66 135 H78" stroke={SHADE} strokeWidth="3" />
      <path d="M35 145 Q46 141 56 145 L58 157 Q46 161 34 157 Z" fill="#aeb7c4" stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M62 145 Q73 141 84 145 L85 157 Q72 161 61 157 Z" fill="#aeb7c4" stroke={OUTLINE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M36 154 H55 M64 154 H83" stroke={OUTLINE} strokeWidth="1.8" strokeLinecap="round" />

      <path d="M31 77 Q22 96 27 117" fill="none" stroke={OUTLINE} strokeWidth="18" strokeLinecap="round" />
      <path d="M31 77 Q22 96 27 117" fill="none" stroke={SUIT} strokeWidth="13" strokeLinecap="round" />
      <circle cx="27" cy="118" r="8.5" fill="#cbd3df" stroke={OUTLINE} strokeWidth="3" />
      <path d="M76 77 Q91 76 102 83" fill="none" stroke={OUTLINE} strokeWidth="19" strokeLinecap="round" />
      <path d="M76 77 Q91 76 102 83" fill="none" stroke={SUIT} strokeWidth="13" strokeLinecap="round" />
      <circle cx="103" cy="83" r="8" fill="#cbd3df" stroke={OUTLINE} strokeWidth="3" />
      <path d="M100 79 L107 87 M99 87 L107 79" stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" />

      <rect x="31" y="65" width="52" height="64" rx="21" fill={SUIT} stroke={OUTLINE} strokeWidth="3.2" />
      <path d="M36 91 Q57 84 78 91 L78 113 Q57 119 36 113 Z" fill={SHADE} stroke={OUTLINE} strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="46" y="94" width="20" height="18" rx="5" fill="#aeb9c8" stroke={OUTLINE} strokeWidth="2" />
      <circle cx="52" cy="100" r="2" fill="#ff9d52" />
      <circle cx="60" cy="100" r="2" fill="#79b8ff" />
      <path d="M51 107 H61" stroke={OUTLINE} strokeWidth="1.6" strokeLinecap="round" />
      <rect x="42" y="70" width="8" height="10" rx="3" fill="#ff9d52" stroke={OUTLINE} strokeWidth="1.8" />
      <circle cx="73" cy="74" r="4" fill="#ff6464" stroke={OUTLINE} strokeWidth="1.8" />

      <circle cx="55" cy="43" r="28" fill={SUIT} stroke={OUTLINE} strokeWidth="3.2" />
      <path d="M35 29 Q44 20 56 20" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      <circle cx="55" cy="45" r="18" fill="#283349" stroke={OUTLINE} strokeWidth="2.6" />
      <path d="M44 37 Q52 30 62 35" fill="none" stroke="#8fc5ff" strokeWidth="3.2" strokeLinecap="round" opacity="0.9" />
      <ellipse cx="48" cy="38" rx="4" ry="2.5" fill="#ffffff" opacity="0.85" transform="rotate(-22 48 38)" />
      <path d="M67 39 L70 51" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.35" />
      <g clipPath="url(#flag-clip)">
        <path d="M110 10 L152 16 L109 23 Z" fill="#ffffff" opacity="0.12" />
      </g>
    </svg>
  );
}

function Moon() {
  return (
    <svg className="lv-moon-art" viewBox="0 0 600 100" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="moon-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.42" stopColor="#f1f4f7" />
          <stop offset="1" stopColor="#dce2e9" />
        </linearGradient>
        <radialGradient id="crater-fill" cx="0.46" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#e8edf3" />
          <stop offset="0.72" stopColor="#cbd3dd" />
          <stop offset="1" stopColor="#b8c2ce" />
        </radialGradient>
        <linearGradient id="crater-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.48" stopColor="#e3e8ee" />
          <stop offset="1" stopColor="#b9c3cf" />
        </linearGradient>
      </defs>

      <path d="M0 13 H600 V100 H0 Z" fill="url(#moon-fill)" stroke={OUTLINE} strokeWidth="3" />
      <path d="M4 17 H596" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.95" />
      <path d="M16 88 C94 80 154 92 232 84 C319 75 386 91 468 82 C520 76 562 81 592 78" fill="none" stroke="#c8d0da" strokeWidth="1.5" opacity="0.55" />

      <g>
        <path d="M43 57 C46 46 62 38 80 39 C99 39 113 47 114 57 C114 68 94 74 73 72 C53 71 40 66 43 57 Z" fill="url(#crater-rim)" stroke={OUTLINE} strokeWidth="2.2" />
        <path d="M50 57 C53 49 65 44 79 45 C93 45 105 50 106 57 C106 64 91 68 74 67 C58 67 48 63 50 57 Z" fill="url(#crater-fill)" />
        <path d="M52 54 C60 46 79 43 96 49" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" opacity="0.9" />
        <path d="M52 62 C66 69 91 68 104 61" fill="none" stroke="#aeb9c6" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
        <path d="M61 52 C70 49 83 49 91 52 C82 54 70 55 61 52 Z" fill="#b5c0cc" opacity="0.45" />
      </g>

      <g>
        <path d="M241 68 C245 54 267 45 291 46 C316 46 337 56 339 69 C340 82 314 90 285 89 C258 89 237 80 241 68 Z" fill="url(#crater-rim)" stroke={OUTLINE} strokeWidth="2.4" />
        <path d="M250 68 C254 58 271 52 291 52 C312 52 329 59 330 69 C330 78 309 84 286 83 C264 83 247 77 250 68 Z" fill="url(#crater-fill)" />
        <path d="M253 64 C263 55 287 51 309 57" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" opacity="0.92" />
        <path d="M251 73 C268 82 307 82 328 72" fill="none" stroke="#a9b4c1" strokeWidth="2.1" strokeLinecap="round" opacity="0.85" />
        <path d="M269 62 C282 58 302 58 315 64 C302 68 282 68 269 62 Z" fill="#aeb9c6" opacity="0.4" />
        <path d="M280 74 C289 71 301 72 307 76" fill="none" stroke="#c0c9d3" strokeWidth="1.4" strokeLinecap="round" />
      </g>

      <g>
        <path d="M459 49 C462 40 475 34 490 35 C506 35 518 41 519 50 C519 59 504 64 488 63 C471 63 456 57 459 49 Z" fill="url(#crater-rim)" stroke={OUTLINE} strokeWidth="2.1" />
        <path d="M466 49 C468 43 479 39 491 40 C503 40 512 44 512 50 C512 56 500 59 488 59 C475 59 464 54 466 49 Z" fill="url(#crater-fill)" />
        <path d="M468 47 C477 40 496 39 507 46" fill="none" stroke="#ffffff" strokeWidth="2.1" strokeLinecap="round" />
        <path d="M467 54 C480 60 501 59 511 53" fill="none" stroke="#aeb9c6" strokeWidth="1.8" strokeLinecap="round" />
      </g>

      <g fill="#c5ced8" stroke={OUTLINE} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M148 70 L155 63 L163 65 L166 72 L158 77 L150 75 Z" />
        <path d="M371 40 L377 35 L384 38 L383 45 L376 47 L370 44 Z" />
        <path d="M407 78 L414 72 L422 75 L423 82 L416 86 L408 83 Z" />
        <path d="M548 72 L554 66 L562 68 L564 75 L557 80 L549 77 Z" />
      </g>
      <g fill="#f7f9fb" stroke={OUTLINE} strokeWidth="1.3">
        <path d="M188 45 L193 40 L199 43 L198 49 L192 51 L187 48 Z" />
        <path d="M350 86 L355 81 L361 84 L360 90 L354 92 L349 89 Z" />
        <path d="M432 29 L436 25 L441 28 L440 33 L435 35 L431 32 Z" />
        <path d="M129 87 L133 83 L138 86 L137 91 L132 93 L128 90 Z" />
        <path d="M576 40 L580 36 L585 39 L584 44 L579 46 L575 43 Z" />
      </g>
      <g fill="#aeb9c6" opacity="0.7">
        <circle cx="34" cy="83" r="1.8" />
        <circle cx="119" cy="92" r="1.5" />
        <circle cx="178" cy="86" r="1.6" />
        <circle cx="226" cy="91" r="1.4" />
        <circle cx="342" cy="91" r="1.7" />
        <circle cx="389" cy="88" r="1.4" />
        <circle cx="449" cy="89" r="1.6" />
        <circle cx="527" cy="91" r="1.5" />
        <circle cx="591" cy="84" r="1.7" />
      </g>
    </svg>
  );
}

export function SpaceCard() {
  return (
    <section aria-label="Go to space" className="lv-section lv-space-section">
      <div className="lv-container">
        <p className="lv-space-note">
          <span>click to go to space</span>
          <svg viewBox="0 0 60 36" width="56" height="34" aria-hidden="true">
            <path d="M6 5 C 24 6, 42 12, 47 29" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M41 23 L47.5 30.5 L52 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </p>
        <Link
          to="/space"
          onMouseEnter={preloadSpacePage}
          onFocus={preloadSpacePage}
          className="lv-space-card"
          aria-label="Go to space — interactive 3D portfolio"
        >
          <div className="lv-space-sky" aria-hidden="true">
            <div className="lv-space-haze" />
            <div className="lv-stars lv-stars--far" />
            <div className="lv-stars lv-stars--mid" />
            <div className="lv-stars lv-stars--near" />
            <span className="lv-shooting-star" />
          </div>
          <div className="lv-space-moon" aria-hidden="true"><Moon /></div>
          <div className="lv-space-astro" aria-hidden="true"><Astronaut /></div>
        </Link>
      </div>
    </section>
  );
}
