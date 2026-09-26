import { useCallback, useEffect, useId, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpRight, Expand, GitFork, Star, X } from "lucide-react";
import type { Project } from "@/config/site";

export const DIALOG_SPRING = {
  type: "spring",
  duration: 0.45,
  bounce: 0.15,
} as const;

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export function projectLayoutId(title: string) {
  return `project-card-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function projectTitleLayoutId(title: string) {
  return `project-title-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

type RepoStats = { stars: number; forks: number };
const statsCache = new Map<string, RepoStats | null>();

function parseRepo(source: string | undefined): string | null {
  if (!source) return null;
  const m = source.match(/github\.com\/([^/]+\/[^/?#]+)/i);
  return m ? m[1].replace(/\.git$/i, "") : null;
}

function useRepoStats(source: string | undefined): RepoStats | null {
  const [stats, setStats] = useState<RepoStats | null>(null);

  useEffect(() => {
    const repo = parseRepo(source);
    if (!repo) {
      setStats(null);
      return;
    }
    if (statsCache.has(repo)) {
      setStats(statsCache.get(repo) ?? null);
      return;
    }
    let alive = true;
    fetch(`https://api.github.com/repos/${repo}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!alive || !j) return;
        const s = {
          stars: j.stargazers_count ?? 0,
          forks: j.forks_count ?? 0,
        };
        statsCache.set(repo, s);
        setStats(s);
      })
      .catch(() => {
        statsCache.set(repo, null);
      });
    return () => {
      alive = false;
    };
  }, [source]);

  return stats;
}

export function ProjectDialog({
  project,
  layoutId,
  titleLayoutId,
  onClose,
}: {
  project: Project;
  layoutId?: string;
  titleLayoutId?: string;
  onClose: () => void;
}) {
  const [lightbox, setLightbox] = useState(false);
  const stats = useRepoStats(project.links.source);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const requestClose = useCallback(() => onCloseRef.current(), []);

  // ESC: cierra el lightbox primero, si no el diálogo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (lightbox) setLightbox(false);
      else requestClose();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [lightbox, requestClose]);

  // Bloquea el scroll y enfoca el botón de cierre al abrir
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <motion.div className="lv-dialog-root">
      <motion.div
        className="lv-dialog-overlay"
        onClick={requestClose}
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, ease: EASE_OUT }}
      />
      <div className="lv-dialog-scroll">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="lv-dialog"
          layoutId={layoutId}
          transition={DIALOG_SPRING}
          style={{ borderRadius: 16 }}
        >
          <div className="lv-dialog-head">
            <motion.h2
              id={titleId}
              className="lv-dialog-title"
              layoutId={titleLayoutId}
              transition={DIALOG_SPRING}
            >
              {project.title}
            </motion.h2>
            <button
              ref={closeRef}
              type="button"
              aria-label="Close dialog"
              onClick={requestClose}
              className="lv-dialog-close"
            >
              <X aria-hidden />
            </button>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, delay: 0.1, ease: EASE_OUT }}
          >
            <p className="lv-dialog-desc">{project.blurb}</p>

            {project.image && (
              <div className="lv-dialog-frame">
                <img src={project.image} alt={`${project.title} screenshot`} />
                <button
                  type="button"
                  aria-label="Expand screenshot"
                  onClick={() => setLightbox(true)}
                  className="lv-dialog-expand"
                >
                  <Expand aria-hidden />
                </button>
              </div>
            )}

            <div className="lv-dialog-foot">
              <div className="lv-dialog-links">
                {project.links.source && (
                  <a
                    href={project.links.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lv-link"
                  >
                    Source <ArrowUpRight aria-hidden />
                  </a>
                )}
                {project.links.live && (
                  <a
                    href={project.links.live}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="lv-link"
                  >
                    Live <ArrowUpRight aria-hidden />
                  </a>
                )}
              </div>
              {stats && (
                <div className="lv-dialog-stats">
                  <span>
                    <Star aria-hidden /> {formatCount(stats.stars)}
                  </span>
                  <span>
                    <GitFork aria-hidden /> {formatCount(stats.forks)}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {lightbox && project.image && (
        <div
          className="lv-lightbox"
          onClick={() => setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${project.title} screenshot expanded`}
        >
          <img src={project.image} alt={`${project.title} screenshot`} />
        </div>
      )}
    </motion.div>
  );
}
