import { Link } from "react-router-dom";
import { Pencil } from "lucide-react";
import { site } from "@/config/site";
import { MinimalShell } from "@/components/minimal-shell";
import { isDraftPost, postSlug, useContent, type DraftPost } from "@/components/content-provider";
import type { ContentPost } from "@/data/content";
import { formatPostDate } from "@/lib/dates";
import { readingTime } from "@/lib/markdown";

type Row = {
  id: string;
  title: string;
  summary: string;
  date: string;
  minutes: string;
  href: string | null;
  external: boolean;
  draft: boolean;
};

function toRow(post: ContentPost | DraftPost): Row {
  const href = post.externalUrl
    ? post.externalUrl
    : post.body
      ? `/writing/${postSlug(post)}`
      : null;
  return {
    id: post.id,
    title: post.title,
    summary: post.summary,
    date: post.date,
    minutes: post.readingTime ?? readingTime(post.body ?? ""),
    href,
    external: Boolean(post.externalUrl),
    draft: isDraftPost(post),
  };
}

export function MinimalWriting({
  onOpenPalette,
}: {
  onOpenPalette?: () => void;
}) {
  const { posts } = useContent();
  // Los posts externos del config se listan como hasta ahora; los nuevos, con
  // markdown propio, se ordenan por fecha.
  const external = site.writing.map((post) => ({
    id: post.url,
    title: post.title,
    summary: post.summary,
    date: post.date,
    minutes: post.readingTime ?? "",
    href: post.url,
    external: true,
    draft: false,
  }));
  const local = posts.map(toRow).sort((a, b) => (a.date < b.date ? 1 : -1));
  const rows = [...external, ...local];

  return (
    <MinimalShell onOpenPalette={onOpenPalette}>
      <section className="lv-section lv-section--home">
        <div className="lv-container">
          <div className="lv-stack">
            <h1 className="lv-page-title">Writing</h1>

            {rows.length > 0 ? (
              <div>
                {rows.map((row) => {
                  const inner = (
                    <div className="lv-proj-body">
                      <span className="lv-post-row">
                        <span className="lv-proj-title">
                          {row.title}
                          {row.draft && (
                            <span className="lv-draft-tag">
                              <Pencil aria-hidden />
                              borrador
                            </span>
                          )}
                        </span>
                        {row.date && <time dateTime={row.date}>{formatPostDate(row.date)}</time>}
                      </span>
                      <span className="lv-proj-desc lv-clamp">
                        {row.summary}
                        {row.minutes ? ` · ${row.minutes}` : ""}
                      </span>
                    </div>
                  );

                  if (!row.href) {
                    return (
                      <div key={row.id} className="lv-proj">
                        {inner}
                      </div>
                    );
                  }

                  return row.external ? (
                    <a
                      key={row.id}
                      href={row.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="lv-proj"
                    >
                      {inner}
                    </a>
                  ) : (
                    <Link key={row.id} to={row.href} className="lv-proj">
                      {inner}
                    </Link>
                  );
                })}
              </div>
            ) : (
              <p className="lv-p">
                No posts yet. Podés escribir el primero en{" "}
                <Link to="/studio" className="lv-link">
                  /studio
                </Link>{" "}
                y exportarlo al repo.
              </p>
            )}
          </div>
        </div>
      </section>
    </MinimalShell>
  );
}
