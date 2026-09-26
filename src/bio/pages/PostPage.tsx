import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil } from "lucide-react";
import { MinimalShell } from "@/components/minimal-shell";
import { Markdown } from "@/components/markdown";
import { isDraftPost, postSlug, useContent, type DraftPost } from "@/components/content-provider";
import type { ContentPost } from "@/data/content";
import { formatPostDate } from "@/lib/dates";
import { readingTime } from "@/lib/markdown";
import "../prose.css";

export function PostPage() {
  const { slug } = useParams();
  const { posts, ready } = useContent();
  const post = posts.find((candidate) => postSlug(candidate) === slug);

  // Los borradores se leen de IndexedDB: hasta que abre, no sabemos si existe.
  if (!ready) {
    return (
      <MinimalShell>
        <section className="lv-section lv-section--home">
          <div className="lv-container">
            <p className="lv-sr" role="status">
              Cargando el post…
            </p>
          </div>
        </section>
      </MinimalShell>
    );
  }

  if (!post || post.externalUrl) {
    return (
      <MinimalShell>
        <section className="lv-section lv-section--home">
          <div className="lv-container">
            <div className="lv-stack">
              <h1 className="lv-page-title">Post no encontrado</h1>
              <p className="lv-p">
                Ese post no existe (o todavía no lo exportaste).{" "}
                <Link to="/writing" className="lv-link">
                  Volver a writing
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </MinimalShell>
    );
  }

  const local = post as ContentPost | DraftPost;
  const draft = isDraftPost(local);
  const body = local.body ?? "";
  const minutes = ("readingTime" in local && local.readingTime) || readingTime(body);

  return (
    <MinimalShell>
      <article className="lv-section lv-section--home">
        <div className="lv-container">
          <div className="lv-stack">
            <Link to="/writing" className="lv-post-back">
              <ArrowLeft aria-hidden />
              writing
            </Link>

            <div>
              <h1 className="lv-page-title">
                {local.title}
                {draft && (
                  <span className="lv-draft-tag">
                    <Pencil aria-hidden />
                    borrador
                  </span>
                )}
              </h1>
              <p className="lv-post-meta">
                {local.date && <time dateTime={local.date}>{formatPostDate(local.date)}</time>}
                <span>·</span>
                <span>{minutes}</span>
              </p>
            </div>

            {local.summary && <p className="lv-p">{local.summary}</p>}

            {draft && (
              <p className="lv-draft-note">
                <Pencil aria-hidden />
                Esto es un borrador del estudio: lo ves vos nomás hasta que exportes el{" "}
                <code>content.json</code>.
              </p>
            )}

            <Markdown source={body} />

            {local.tags && local.tags.length > 0 && (
              <ul className="lv-post-tags">
                {local.tags.map((tag) => (
                  <li key={tag}>#{tag}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </article>
    </MinimalShell>
  );
}
