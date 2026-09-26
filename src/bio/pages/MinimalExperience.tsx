import { useState } from "react";
import { motion } from "framer-motion";
import { site, type Project } from "@/config/site";
import { MinimalShell } from "@/components/minimal-shell";
import {
  DIALOG_SPRING,
  ProjectDialog,
  projectLayoutId,
  projectTitleLayoutId,
} from "@/components/project-dialog";

export function MinimalExperience({
  onOpenPalette,
}: {
  onOpenPalette?: () => void;
}) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  return (
    <MinimalShell onOpenPalette={onOpenPalette ?? (() => undefined)}>
      <section className="lv-section lv-section--home">
        <div className="lv-container">
          <div className="lv-stack">
            <h1 className="lv-page-title">Experience</h1>

            <div className="lv-exp-full">
              {site.experience.map((job) => {
                const row = (
                  <>
                    <span className="lv-exp-main">
                      <span className="lv-exp-name">{job.company}</span>
                      <span className="lv-exp-role">{job.role}</span>
                    </span>
                    <span className="lv-exp-date">{job.period}</span>
                    <span className="lv-exp-role-mobile">{job.role}</span>
                  </>
                );
                return (
                  <div key={`${job.company}-${job.role}`}>
                    {job.url ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="lv-exp lv-exp--link"
                      >
                        {row}
                      </a>
                    ) : (
                      <div className="lv-exp">{row}</div>
                    )}
                    <p className="lv-exp-blurb">{job.blurb}</p>
                  </div>
                );
              })}
            </div>

            <h2 className="lv-h2" style={{ marginTop: "2.5rem" }}>
              Building
            </h2>

            <div className="lv-exp-full">
              {site.building.map((job) => {
                const row = (
                  <>
                    <span className="lv-exp-main">
                      {job.logo && (
                        <img
                          src={job.logo}
                          alt={`${job.company} logo`}
                          className="lv-brand-logo"
                        />
                      )}
                      <motion.span
                        layoutId={projectTitleLayoutId(job.company)}
                        transition={DIALOG_SPRING}
                        className="lv-exp-name"
                      >
                        {job.company}
                      </motion.span>
                      <span className="lv-exp-role">{job.role}</span>
                    </span>
                    <span className="lv-exp-date">{job.period}</span>
                    <span className="lv-exp-role-mobile">{job.role}</span>
                  </>
                );
                return (
                  <div key={`${job.company}-${job.role}`}>
                    <motion.button
                      type="button"
                      layoutId={projectLayoutId(job.company)}
                      transition={DIALOG_SPRING}
                      onClick={() =>
                        setActiveProject({
                          title: job.company,
                          blurb: job.blurb,
                          stack: [],
                          year: job.period,
                          links: { live: job.url || undefined },
                        })
                      }
                      className="lv-exp lv-exp--link"
                    >
                      {row}
                    </motion.button>
                    <p className="lv-exp-blurb">{job.blurb}</p>
                  </div>
                );
              })}
            </div>
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
