import { Link } from "react-router-dom";
import { photoThumb, useContent } from "@/components/content-provider";

export function PhotosCard() {
  const { photos } = useContent();
  const preview = photos.slice(0, 3);

  return (
    <section aria-label="Go to photos" className="lv-section lv-photos-section">
      <div className="lv-container">
        {preview.length > 0 ? (
          <>
            <p className="lv-photos-note">
              <span>click to see photos</span>
              <svg viewBox="0 0 60 36" width="56" height="34" aria-hidden="true">
                <path d="M6 5 C 24 6, 42 12, 47 29" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M41 23 L47.5 30.5 L52 22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </p>
            <Link
              to="/photos"
              className="lv-photos-card"
              aria-label="Go to photos — photo gallery"
            >
              {preview.map((photo) => (
                <img
                  key={photo.id}
                  src={photoThumb(photo)}
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </Link>
          </>
        ) : (
          <>
            <p className="lv-photos-note">
              <span>no photos yet — armá la galería en /studio</span>
            </p>
            <Link
              to="/studio"
              className="lv-photos-card lv-photos-card--empty"
              aria-label="Open the studio to add photos"
            >
              <span className="lv-photos-card-empty">
                <svg viewBox="0 0 48 40" width="64" height="54" aria-hidden="true">
                  <rect x="6" y="8" width="36" height="26" fill="none" stroke="currentColor" strokeWidth="2" />
                  <path d="M6 28 L18 18 L26 25 L32 20 L42 28" fill="none" stroke="currentColor" strokeWidth="2" />
                  <circle cx="18" cy="14" r="2" fill="currentColor" />
                  <path d="M20 20 h8 v8 h-8 z" fill="currentColor" opacity="0.3" />
                </svg>
              </span>
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
