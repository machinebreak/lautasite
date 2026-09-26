import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { site, type Project } from "@/config/site";
import { MinimalShell } from "@/components/minimal-shell";
import {
  DIALOG_SPRING,
  ProjectDialog,
  projectLayoutId,
  projectTitleLayoutId,
} from "@/components/project-dialog";

export function MinimalProjects({
  onOpenPalette,
}: {
  onOpenPalette?: () => void;
}) {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("search") ?? "");
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  useEffect(() => {
    const q = searchParams.get("search");
    if (q !== null) setQuery(q);
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return site.projects;
    return site.projects.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.blurb.toLowerCase().includes(q) ||
        p.stack.some((t) => t.toLowerCase().includes(q)),
    );
  }, [query]);

  return (
    <MinimalShell onOpenPalette={onOpenPalette ?? (() => undefined)}>
      <section className="lv-section lv-section--home">
        <div className="lv-container">
          <div className="lv-stack">
            <h1 className="lv-page-title">Projects</h1>

            <div className="lv-search">
              <Search aria-hidden />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search projects..."
                aria-label="Search projects"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="lv-search-clear"
                >
                  <X aria-hidden />
                </button>
              )}
            </div>

            <div>
              {filtered.map((p) => (
                <motion.button
                  key={p.title}
                  type="button"
                  layoutId={projectLayoutId(p.title)}
                  transition={DIALOG_SPRING}
                  onClick={() => setActiveProject(p)}
                  className="lv-proj"
                >
                  <div className="lv-proj-body">
                    <motion.span
                      layoutId={projectTitleLayoutId(p.title)}
                      transition={DIALOG_SPRING}
                      className="lv-proj-title"
                    >
                      {p.title}
                    </motion.span>
                    <span className="lv-proj-desc">{p.blurb}</span>
                  </div>
                </motion.button>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="lv-prose">
                <p className="lv-p">No projects match &quot;{query}&quot;.</p>
                <p>
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="lv-link lv-link-btn"
                  >
                    Clear search
                  </button>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {activeProject && (
        <ProjectDialog
          project={activeProject}
          layoutId={projectLayoutId(activeProject.title)}
          titleLayoutId={projectTitleLayoutId(activeProject.title)}
          onClose={() => setActiveProject(null)}
        />
      )}
    </MinimalShell>
  );
}
