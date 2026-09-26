import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Aperture,
  Camera,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Focus,
  Gauge,
  MapPin,
  Menu,
  Pencil,
  Search,
  Timer,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { isDraftPhoto, photoFull, photoThumb, useContent } from "@/components/content-provider";
import "../photos.css";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Writing", to: "/writing" },
  { label: "Photos", to: "/photos" },
];

/**
 * Cuántas columnas usa el masonry. `columns` de CSS reparte por altura y con
 * pocas fotos deja huecos o agranda las fotos más de su resolución: 1 foto → 1
 * columna, 2/3/4 → una fila cada una, de ahí en adelante 3. Los media queries
 * de photos.css pisan esto en mobile y tablet.
 */
function columnsFor(count: number) {
  if (count <= 4) return count;
  return 3;
}

function MetadataRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className="lv-ph-lightbox-detail">
      <dt>
        {icon}
        <span>{label}</span>
      </dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}

export function MinimalPhotos({
  onOpenPalette,
}: {
  onOpenPalette?: () => void;
}) {
  const openPalette = onOpenPalette ?? (() => undefined);
  const { photos, draftPhotos } = useContent();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const touchStartX = useRef<number | null>(null);

  const closeLightbox = useCallback(() => {
    setActiveIndex(null);
    setZoomed(false);
  }, []);

  const step = useCallback(
    (direction: 1 | -1) => {
      setZoomed(false);
      setActiveIndex((previous) =>
        previous === null
          ? previous
          : (previous + direction + photos.length) % photos.length,
      );
    },
    [photos.length],
  );

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeLightbox();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 20);
    const nextPhoto = photos[(activeIndex + 1) % photos.length];
    const preload = new Image();
    preload.src = photoFull(nextPhoto);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeIndex, closeLightbox, step, photos]);

  const active = activeIndex !== null ? photos[activeIndex] : null;

  return (
    <div className="lv-photos">
      <a href="#main-content" className="lv-sr lv-skip">
        Skip to content
      </a>

      <nav aria-label="Main navigation" className="lv-ph-nav">
        <div className="lv-ph-nav-inner">
          <div className="lv-ph-nav-row">
            <div className="lv-ph-pill">
              {NAV_LINKS.map((link) => (
                <div key={link.to}>
                  <Link
                    to={link.to}
                    data-active={link.to === "/photos"}
                    aria-current={link.to === "/photos" ? "location" : undefined}
                    className="lv-ph-link"
                  >
                    {link.label}
                  </Link>
                </div>
              ))}
            </div>
            <button
              type="button"
              aria-label="Open command palette"
              onClick={openPalette}
              className="lv-ph-search"
            >
              <Search aria-hidden />
            </button>
            <button
              type="button"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="lv-ph-search lv-ph-burger lv-ph-menu-btn"
            >
              {menuOpen ? <X aria-hidden /> : <Menu aria-hidden />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="lv-ph-menu-panel">
            <nav aria-label="Mobile" className="lv-ph-menu-nav">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  data-active={link.to === "/photos"}
                  onClick={() => setMenuOpen(false)}
                  className="lv-ph-menu-link"
                >
                  {link.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  openPalette();
                }}
                className="lv-ph-menu-link"
              >
                Search
              </button>
            </nav>
          </div>
        )}
      </nav>

      <main id="main-content" tabIndex={-1} className="lv-ph-main">
        <h1 className="sr-only">Photos</h1>

        {draftPhotos.length > 0 && (
          <p className="lv-ph-drafts">
            <Pencil aria-hidden />
            {draftPhotos.length} foto{draftPhotos.length > 1 ? "s" : ""} en borrador (sólo las ves
            vos). <Link to="/studio">Abrir el studio</Link>
          </p>
        )}

        <div className="lv-ph-wrap">
          {photos.length > 0 ? (
            <div className="lv-ph-grid" data-columns={columnsFor(photos.length)}>
              {photos.map((photo, index) => {
                const draft = isDraftPhoto(photo);
                return (
                  <button
                    key={photo.id}
                    type="button"
                    aria-label={`Open photo ${index + 1}, ${photo.location || photo.alt}`}
                    onClick={() => setActiveIndex(index)}
                    className="lv-ph-item"
                    data-draft={draft}
                  >
                    <span className="lv-ph-frame">
                      <img
                        src={photoThumb(photo)}
                        alt={photo.alt}
                        width={photo.width || undefined}
                        height={photo.height || undefined}
                        loading={index < 3 ? "eager" : "lazy"}
                        fetchPriority={index < 3 ? "high" : "auto"}
                        decoding="async"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1800px) 33vw, 600px"
                      />
                      {draft && (
                        <span className="lv-ph-draft-badge">
                          <Pencil aria-hidden />
                          borrador
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="lv-ph-empty">
              <svg viewBox="0 0 48 40" width="72" height="60" aria-hidden="true">
                <rect x="6" y="8" width="36" height="26" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="14" y="16" width="20" height="12" fill="currentColor" opacity="0.25" />
                <circle cx="18" cy="14" r="2" fill="currentColor" />
                <path d="M6 28 L18 18 L26 25 L32 20 L42 28" fill="none" stroke="currentColor" strokeWidth="2" />
                <rect x="16" y="36" width="16" height="2" fill="currentColor" opacity="0.5" />
              </svg>
              <h2>Todavía no hay fotos</h2>
              <p>
                La galería se arma sola: subí tus imágenes en{" "}
                <Link to="/studio" className="lv-link">
                  /studio
                </Link>
                , exportá el <code>content.json</code> al repo y quedan publicadas acá.
              </p>
            </div>
          )}
        </div>
      </main>

      {active && activeIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Photo ${activeIndex + 1}, ${active.location || active.alt}`}
          className="lv-ph-lightbox"
          onClick={closeLightbox}
        >
          <button
            ref={closeButtonRef}
            type="button"
            aria-label="Close photo"
            onClick={closeLightbox}
            className="lv-ph-lightbox-close"
          >
            <X aria-hidden />
          </button>

          <button
            type="button"
            aria-label="Previous photo"
            onClick={(event) => {
              event.stopPropagation();
              step(-1);
            }}
            className="lv-ph-lightbox-arrow lv-ph-lightbox-arrow--prev"
          >
            <ChevronLeft aria-hidden />
          </button>

          <div
            className="lv-ph-lightbox-stage"
            data-zoomed={zoomed}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const endX = event.changedTouches[0]?.clientX;
              if (touchStartX.current === null || endX === undefined) return;
              const distance = endX - touchStartX.current;
              if (Math.abs(distance) > 50) step(distance > 0 ? -1 : 1);
              touchStartX.current = null;
            }}
          >
            <figure className="lv-ph-lightbox-figure">
              <img
                src={photoFull(active)}
                alt={active.alt}
                width={active.width || undefined}
                height={active.height || undefined}
                draggable={false}
              />
            </figure>
            <button
              type="button"
              aria-label={zoomed ? "Zoom out photo" : "Zoom in photo"}
              onClick={() => setZoomed((current) => !current)}
              className="lv-ph-lightbox-zoom"
            >
              {zoomed ? <ZoomOut aria-hidden /> : <ZoomIn aria-hidden />}
              <span>{zoomed ? "fit" : "100%"}</span>
            </button>
          </div>

          <aside
            className="lv-ph-lightbox-details"
            onClick={(event) => event.stopPropagation()}
          >
            <dl>
              <MetadataRow icon={<Camera aria-hidden />} label="Camera" value={active.camera} />
              <MetadataRow icon={<Focus aria-hidden />} label="Lens" value={active.lens} />
              <MetadataRow
                icon={<span className="lv-ph-lightbox-glyph">↔</span>}
                label="Focal length"
                value={active.focalLength}
              />
              <MetadataRow icon={<Aperture aria-hidden />} label="Aperture" value={active.aperture} />
              <MetadataRow icon={<Timer aria-hidden />} label="Shutter" value={active.shutter} />
              <MetadataRow icon={<Gauge aria-hidden />} label="ISO" value={active.iso} />
              <MetadataRow
                icon={<CalendarDays aria-hidden />}
                label="Date"
                value={active.takenAt}
              />
              <MetadataRow icon={<MapPin aria-hidden />} label="Location" value={active.location} />
            </dl>
            <div className="lv-ph-lightbox-count">
              {activeIndex + 1} / {photos.length}
            </div>
          </aside>

          <button
            type="button"
            aria-label="Next photo"
            onClick={(event) => {
              event.stopPropagation();
              step(1);
            }}
            className="lv-ph-lightbox-arrow lv-ph-lightbox-arrow--next"
          >
            <ChevronRight aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
