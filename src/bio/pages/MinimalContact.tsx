import { ArrowUpRight } from "lucide-react";
import { site } from "@/config/site";
import { MinimalShell } from "@/components/minimal-shell";
import { CopyEmail } from "@/components/copy-email";

const ROWS = [
  { label: "GitHub", href: site.socials.github },
  { label: "X", href: site.socials.twitter },
  { label: "LinkedIn", href: site.socials.linkedin },
];

export function MinimalContact({
  onOpenPalette,
}: {
  onOpenPalette?: () => void;
}) {
  return (
    <MinimalShell onOpenPalette={onOpenPalette ?? (() => undefined)}>
      <section className="lv-section lv-section--home">
        <div className="lv-container">
          <div className="lv-stack">
            <h1 className="lv-page-title">Contact</h1>

            <p className="lv-p">
              Have an idea, a project, or just want to talk tech? Email me
              at <CopyEmail />.
            </p>

            <div>
              {ROWS.map((r) => (
                <a
                  key={r.label}
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lv-contact-row"
                >
                  <span>{r.label}</span>
                  <ArrowUpRight aria-hidden />
                </a>
              ))}
            </div>

            <p className="lv-loc">
              {site.location} · {site.email}
            </p>
          </div>
        </div>
      </section>
    </MinimalShell>
  );
}
