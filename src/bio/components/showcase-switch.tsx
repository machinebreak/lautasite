import { useCallback, useState } from "react";
import { PhotosCard } from "@/components/photos-card";
import { SpaceCard } from "@/components/space-card";

const SLIDES = [
  { id: "space", label: "Show space card" },
  { id: "photos", label: "Show photos card" },
] as const;

type SlideId = (typeof SLIDES)[number]["id"];

export function ShowcaseSwitch() {
  const [active, setActive] = useState<SlideId>("space");

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const i = SLIDES.findIndex((s) => s.id === active);
      const dir = e.key === "ArrowRight" ? 1 : SLIDES.length - 1;
      setActive(SLIDES[(i + dir) % SLIDES.length].id);
    },
    [active],
  );

  return (
    <div className="lv-showcase">
      <div className="lv-showcase-stage">
        <div
          id="showcase-panel-space"
          data-active={active === "space"}
          className="lv-showcase-slide"
        >
          <SpaceCard />
        </div>
        <div
          id="showcase-panel-photos"
          data-active={active === "photos"}
          className="lv-showcase-slide"
        >
          <PhotosCard />
        </div>
      </div>
      <div
        role="tablist"
        aria-label="Choose showcase card"
        className="lv-showcase-dots"
        onKeyDown={onKeyDown}
      >
        {SLIDES.map((slide) => (
          <button
            key={slide.id}
            type="button"
            role="tab"
            aria-selected={active === slide.id}
            aria-controls={`showcase-panel-${slide.id}`}
            aria-label={slide.label}
            data-active={active === slide.id}
            onClick={() => setActive(slide.id)}
            className="lv-showcase-dot"
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
    </div>
  );
}
