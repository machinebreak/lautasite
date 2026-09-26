import { useState, type CSSProperties } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { site, type Project } from "@/config/site";
import { MinimalShell } from "@/components/minimal-shell";
import { CopyEmail } from "@/components/copy-email";
import {
  DIALOG_SPRING,
  ProjectDialog,
  projectLayoutId,
  projectTitleLayoutId,
} from "@/components/project-dialog";
import { ShowcaseSwitch } from "@/components/showcase-switch";
import "./lv-home.css";

const NAME = "Lautaro Bertucci";

function PixelName() {
  let letter = 0;
  return (
    <h1 aria-label={NAME} className="lv-name">
      <span className="lv-name-inner">
        {NAME.split("").map((ch, i) =>
          ch === " " ? (
            <span key={i}> </span>
          ) : (
            <span
              key={i}
              className="lv-l"
              style={{ "--i": letter++ } as CSSProperties}
            >
              {ch}
            </span>
          ),
        )}
      </span>
    </h1>
  );
}

export function MainLayout({ onOpenPalette }: { onOpenPalette: () => void }) {
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  const hardseek =
    site.building.find((building) => building.company === "HardSeek") ?? site.building[0];
  const beetbench = site.building.find((building) => building.company === "BeetBench");

  return (
    <MinimalShell onOpenPalette={onOpenPalette}>
      {/* Home */}
      <section id="home" className="lv-section lv-section--home">
        <div className="lv-container">
          <div className="lv-stack">
            <PixelName />
            <div className="lv-prose">
              <p className="lv-p">
                i build ai developer tools and practical web products. 17,
                based in {site.location.toLowerCase()}.
              </p>
              <p className="lv-p">
                building some things like{" "}
                <a
                  href={beetbench?.url ?? "https://beetbench.com"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lv-link lv-nowrap"
                >
                  beetbench
                </a>{" "}
                and{" "}
                <a
                  href={hardseek?.url ?? "https://hardseek.net"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lv-link lv-nowrap"
                >
                  hardseek
                </a>
                .{" "}
                <a href="#building" className="lv-link lv-nowrap">
                  see more here
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Experience */}
      <section id="experience" className="lv-section">
        <div className="lv-container">
          <h2 className="lv-h2">Experience</h2>
          <div className="lv-exp-list">
            {site.experience.map((job) => {
              const inner = (
                <>
                  <span className="lv-exp-main">
                    <span className="lv-exp-name">{job.company}</span>
                    <span className="lv-exp-role">{job.role}</span>
                  </span>
                  <span className="lv-exp-date">{job.period}</span>
                  <span className="lv-exp-role-mobile">{job.role}</span>
                </>
              );
              return job.url ? (
                <a
                  key={`${job.company}-${job.role}`}
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lv-exp lv-exp--link"
                >
                  {inner}
                </a>
              ) : (
                <div key={`${job.company}-${job.role}`} className="lv-exp">
                  {inner}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Building */}
      <section id="building" className="lv-section">
        <div className="lv-container">
          <h2 className="lv-h2">Building</h2>
          <div className="lv-exp-list">
            {site.building.map((job) => {
              const inner = (
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
                <motion.button
                  key={`${job.company}-${job.role}`}
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
                  {inner}
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Projects */}
      <section id="projects" className="lv-section">
        <div className="lv-container">
          <h2 className="lv-h2">Projects</h2>
          <div>
            {site.projects.map((p) => (
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
          <div>
            <Link to="/projects" className="lv-more">
              View all projects
              <ArrowRight aria-hidden />
            </Link>
          </div>
        </div>
      </section>

      {/* Elsewhere */}
      <section id="contact" className="lv-section">
        <div className="lv-container">
          <h2 className="lv-h2">Elsewhere</h2>
          <div>
            <p className="lv-p">
              Email me at <CopyEmail />, or find me on{" "}
              <a
                href={site.socials.github}
                target="_blank"
                rel="noopener noreferrer"
                className="lv-link"
              >
                GitHub
              </a>
              ,{" "}
              <a
                href={site.socials.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="lv-link"
              >
                X
              </a>{" "}
              and{" "}
              <a
                href={site.socials.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="lv-link"
              >
                LinkedIn
              </a>
              .
            </p>
          </div>
        </div>
      </section>

      <ShowcaseSwitch />

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
