import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Check,
  Download,
  FileUp,
  Image as ImageIcon,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { MinimalShell } from "@/components/minimal-shell";
import { Markdown } from "@/components/markdown";
import { blobUrl, photoThumb, useContent, type DraftPhoto } from "@/components/content-provider";
import { formatBytes } from "@/lib/images";
import { newId } from "@/lib/content-store";
import { readingTime } from "@/lib/markdown";
import "../studio.css";

type Tab = "photos" | "writing";

const TABS: Array<{ id: Tab; label: string; hint: string }> = [
  { id: "photos", label: "Fotos", hint: "subí imágenes y escribí su pie de foto" },
  { id: "writing", label: "Writing", hint: "escribí posts en markdown" },
];

const EXIF_FIELDS = [
  { key: "camera", label: "Cámara", placeholder: "Fujifilm X-T5" },
  { key: "lens", label: "Lente", placeholder: "23mm f/1.4" },
  { key: "focalLength", label: "Focal", placeholder: "23mm" },
  { key: "aperture", label: "Apertura", placeholder: "f/1.4" },
  { key: "shutter", label: "Shutter", placeholder: "1/250s" },
  { key: "iso", label: "ISO", placeholder: "400" },
  { key: "takenAt", label: "Fecha", placeholder: "2026-01-14" },
] as const;

function Field({
  label,
  value,
  placeholder,
  onChange,
  multiline = false,
  rows = 2,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  rows?: number;
}) {
  const id = `studio-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${rows}`;
  return (
    <div className="lv-studio-field">
      <label htmlFor={id}>{label}</label>
      {multiline ? (
        <textarea
          id={id}
          value={value}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </div>
  );
}

function Dropzone({
  onFiles,
  busy,
  note,
}: {
  onFiles: (files: File[]) => void;
  busy: boolean;
  note: string;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setOver(false);
    const files = Array.from(event.dataTransfer.files ?? []);
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      className="lv-studio-drop"
      data-over={over}
      data-busy={busy}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="lv-sr"
        aria-label="Elegir fotos de tu dispositivo"
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length > 0) onFiles(files);
          event.target.value = "";
        }}
      />
      {busy ? (
        <>
          <Loader2 className="lv-studio-spin" aria-hidden />
          <p>recortando y comprimiendo…</p>
        </>
      ) : (
        <>
          <Upload aria-hidden />
          <p>
            <strong>Arrastrá tus fotos acá</strong> o{" "}
            <button type="button" className="lv-studio-link" onClick={() => inputRef.current?.click()}>
              elegilas de tu dispositivo
            </button>
            .
          </p>
          <small>{note}</small>
        </>
      )}
    </div>
  );
}

function PhotoCard({
  photo,
  onChange,
  onDelete,
}: {
  photo: DraftPhoto;
  onChange: (patch: Partial<DraftPhoto["photo"]>) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { photo: raw } = photo;

  return (
    <li className="lv-studio-photo">
      <div className="lv-studio-photo-shot">
        <img
          src={photoThumb(photo)}
          alt={photo.alt}
          width={photo.width || undefined}
          height={photo.height || undefined}
          loading="lazy"
          decoding="async"
        />
        <span className="lv-studio-photo-size">
          {photo.photo.bytes > 0 ? formatBytes(photo.photo.bytes) : "en el repo"}
        </span>
      </div>

      <div className="lv-studio-photo-fields">
        <Field
          label="Alt"
          value={photo.alt}
          placeholder="qué se ve en la foto"
          onChange={(alt) => onChange({ alt })}
        />
        <Field
          label="Lugar"
          value={photo.location}
          placeholder="Mar del Plata, Argentina"
          onChange={(location) => onChange({ location })}
        />
      </div>

      <div className="lv-studio-photo-actions">
        <button
          type="button"
          className="lv-studio-chip"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "ocultar datos" : "datos de cámara"}
        </button>
        <button
          type="button"
          className="lv-studio-chip lv-studio-chip--danger"
          onClick={onDelete}
          aria-label={`Borrar ${photo.alt || raw.name}`}
        >
          <Trash2 aria-hidden />
        </button>
      </div>

      {open && (
        <div className="lv-studio-photo-exif">
          {EXIF_FIELDS.map((field) => (
            <Field
              key={field.key}
              label={field.label}
              value={photo[field.key] ?? ""}
              placeholder={field.placeholder}
              onChange={(value) => onChange({ [field.key]: value })}
            />
          ))}
        </div>
      )}
    </li>
  );
}

function WritingTab() {
  const { draftPosts, savePost, deletePost } = useContent();
  const [activeId, setActiveId] = useState<string | null>(draftPosts[0]?.id ?? null);
  const [status, setStatus] = useState("");
  const [preview, setPreview] = useState(true);

  const active = draftPosts.find((post) => post.id === activeId) ?? null;

  const [form, setForm] = useState({
    title: "",
    summary: "",
    date: new Date().toISOString().slice(0, 10),
    tags: "",
    externalUrl: "",
    body: "",
  });

  useEffect(() => {
    if (!active) return;
    setForm({
      title: active.title,
      summary: active.summary,
      date: active.date,
      tags: active.tags.join(", "),
      externalUrl: active.externalUrl ?? "",
      body: active.body,
    });
  }, [active]);

  const dirty =
    active !== null &&
    (form.title !== active.title ||
      form.summary !== active.summary ||
      form.date !== active.date ||
      form.tags !== active.tags.join(", ") ||
      form.externalUrl !== (active.externalUrl ?? "") ||
      form.body !== active.body);

  const startNew = () => {
    setActiveId(null);
    setForm({
      title: "",
      summary: "",
      date: new Date().toISOString().slice(0, 10),
      tags: "",
      externalUrl: "",
      body: "",
    });
    setStatus("");
  };

  const onSave = async () => {
    if (!form.title.trim()) {
      setStatus("El post necesita un título.");
      return;
    }
    const id = active?.id ?? newId("post");
    await savePost({
      id,
      title: form.title.trim(),
      summary: form.summary.trim(),
      date: form.date,
      body: form.body,
      tags: form.tags.split(","),
      externalUrl: form.externalUrl.trim() || undefined,
      createdAt: active?.createdAt,
    });
    setActiveId(id);
    setStatus("Guardado en este dispositivo.");
  };

  return (
    <div className="lv-studio-writing">
      <aside className="lv-studio-writing-list">
        <div className="lv-studio-writing-head">
          <h3>Borradores</h3>
          <button type="button" className="lv-studio-chip" onClick={startNew}>
            <Plus aria-hidden />
            nuevo
          </button>
        </div>
        {draftPosts.length === 0 ? (
          <p className="lv-studio-hint">Todavía no escribiste nada. Tocá “nuevo”.</p>
        ) : (
          <ul>
            {draftPosts.map((post) => (
              <li key={post.id}>
                <button
                  type="button"
                  data-active={post.id === activeId}
                  onClick={() => setActiveId(post.id)}
                >
                  <span>{post.title}</span>
                  <small>
                    {post.date} · {readingTime(post.body)}
                  </small>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="lv-studio-writing-editor">
        <div className="lv-studio-writing-fields">
          <div className="lv-studio-field lv-studio-field--wide">
            <label htmlFor="studio-post-title">Título</label>
            <input
              id="studio-post-title"
              type="text"
              value={form.title}
              placeholder="Cómo hacer que un shader no salga negro"
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>
          <div className="lv-studio-field lv-studio-field--wide">
            <label htmlFor="studio-post-summary">Resumen</label>
            <textarea
              id="studio-post-summary"
              rows={2}
              value={form.summary}
              placeholder="Una o dos líneas para el listado de /writing."
              onChange={(event) => setForm({ ...form, summary: event.target.value })}
            />
          </div>
          <div className="lv-studio-field">
            <label htmlFor="studio-post-date">Fecha</label>
            <input
              id="studio-post-date"
              type="date"
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
          </div>
          <div className="lv-studio-field">
            <label htmlFor="studio-post-tags">Tags</label>
            <input
              id="studio-post-tags"
              type="text"
              value={form.tags}
              placeholder="glsl, three.js"
              onChange={(event) => setForm({ ...form, tags: event.target.value })}
            />
          </div>
          <div className="lv-studio-field lv-studio-field--wide">
            <label htmlFor="studio-post-url">Link externo (opcional)</label>
            <input
              id="studio-post-url"
              type="url"
              value={form.externalUrl}
              placeholder="Si lo.fill, el post se abre acá en vez de en /writing"
              onChange={(event) => setForm({ ...form, externalUrl: event.target.value })}
            />
          </div>
        </div>

        <div className="lv-studio-compose" data-preview={preview}>
          <div className="lv-studio-compose-pane">
            <div className="lv-studio-compose-head">
              <label htmlFor="studio-post-body">Markdown</label>
              <button
                type="button"
                className="lv-studio-chip"
                aria-pressed={preview}
                onClick={() => setPreview((value) => !value)}
              >
                {preview ? "ocultar preview" : "ver preview"}
              </button>
            </div>
            <textarea
              id="studio-post-body"
              className="lv-studio-body"
              value={form.body}
              spellCheck={false}
              placeholder={"# Título\n\nUn párrafo con **negrita**, `código` y [un link](https://example.com).\n\n- una lista\n- otra cosa\n\n```js\nconst hola = 'mundo';\n```"}
              onChange={(event) => setForm({ ...form, body: event.target.value })}
            />
          </div>
          {preview && (
            <div className="lv-studio-compose-pane lv-studio-compose-preview">
              <div className="lv-studio-compose-head">
                <span>Preview</span>
                <small>{readingTime(form.body)}</small>
              </div>
              {form.body.trim() ? (
                <Markdown source={form.body} />
              ) : (
                <p className="lv-studio-hint">El preview aparece acá mientras escribís.</p>
              )}
            </div>
          )}
        </div>

        <div className="lv-studio-writing-actions">
          <button
            type="button"
            className="lv-studio-btn lv-studio-btn--primary"
            onClick={onSave}
            disabled={!dirty && active !== null}
          >
            <Save aria-hidden />
            {active ? "guardar cambios" : "guardar post"}
          </button>
          {active && (
            <button
              type="button"
              className="lv-studio-btn lv-studio-btn--danger"
              onClick={() => {
                void deletePost(active.id);
                startNew();
              }}
            >
              <Trash2 aria-hidden />
              borrar post
            </button>
          )}
          <span className="lv-studio-status" role="status" aria-live="polite">
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

function PhotosTab() {
  const { draftPhotos, addPhotos, updatePhoto, deletePhoto } = useContent();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const onFiles = useCallback(
    async (files: File[]) => {
      setBusy(true);
      setStatus("");
      try {
        const { added, skipped } = await addPhotos(files);
        setStatus(
          added > 0
            ? `${added} foto${added > 1 ? "s" : ""} lista${added > 1 ? "s" : ""}${
                skipped > 0 ? ` · ${skipped} archivo(s) no eran imágenes` : ""
              }`
            : "Ningún archivo era una imagen.",
        );
      } finally {
        setBusy(false);
      }
    },
    [addPhotos],
  );

  return (
    <div className="lv-studio-photos">
      <Dropzone
        busy={busy}
        note="Se recortan a 2400px y se recomprimen a JPEG. La miniatura se genera sola."
        onFiles={(files) => void onFiles(files)}
      />

      <p className="lv-studio-status" role="status" aria-live="polite">
        {status}
      </p>

      {draftPhotos.length > 0 ? (
        <>
          <h3 className="lv-studio-subhead">
            {draftPhotos.length} foto{draftPhotos.length > 1 ? "s" : ""} en borrador
          </h3>
          <ul className="lv-studio-photo-list">
            {draftPhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onChange={(patch) => void updatePhoto(photo.id, patch)}
                onDelete={() => void deletePhoto(photo.id)}
              />
            ))}
          </ul>
        </>
      ) : (
        !busy && (
          <p className="lv-studio-hint">
            Sin fotos todavía. Cuando subas alguna aparece acá con su pie de foto.
          </p>
        )
      )}
    </div>
  );
}

function ExportBlock() {
  const { exportBundle, importContent, clearDrafts, draftPhotos, draftPosts, storageKind } =
    useContent();
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const total = draftPhotos.length + draftPosts.length;

  return (
    <section className="lv-studio-export">
      <div className="lv-studio-export-head">
        <h2>Publicar</h2>
        <p>
          {total === 0
            ? "No tenés nada en borrador todavía."
            : `${total} elemento${total > 1 ? "s" : ""} listo${total > 1 ? "s" : ""} para publicar.`}
        </p>
      </div>

      <ol className="lv-studio-steps">
        <li>
          <span>1</span>
          <p>
            Bajá <code>lauta-content.zip</code> (trae <code>content.json</code> +{" "}
            <code>photos/</code>).
          </p>
        </li>
        <li>
          <span>2</span>
          <p>
            Copiá la carpeta <code>photos/</code> dentro de <code>public/</code> y el{" "}
            <code>content.json</code> en <code>src/bio/data/</code>.
          </p>
        </li>
        <li>
          <span>3</span>
          <p>Commiteá y deployá. Borradores que no exportes no se ven.</p>
        </li>
      </ol>

      <div className="lv-studio-export-actions">
        <button
          type="button"
          className="lv-studio-btn lv-studio-btn--primary"
          onClick={() => {
            setStatus("Generando el zip…");
            void exportBundle().then(() => setStatus("Listo: revisá tus descargas."));
          }}
        >
          <Download aria-hidden />
          exportar contenido
        </button>
        <button
          type="button"
          className="lv-studio-btn"
          onClick={() => inputRef.current?.click()}
        >
          <FileUp aria-hidden />
          importar content.json
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="lv-sr"
          aria-label="Elegir un content.json para importar"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (!file) return;
            try {
              const result = await importContent(await file.text());
              setStatus(`Importado: ${result.photos} foto(s), ${result.posts} post(s).`);
            } catch {
              setStatus("No se pudo leer ese JSON.");
            }
          }}
        />
        <button
          type="button"
          className="lv-studio-btn lv-studio-btn--danger"
          onClick={() => {
            void clearDrafts();
            setStatus("Borradores vaciados.");
          }}
        >
          <X aria-hidden />
          vaciar borradores
        </button>
      </div>

      <p className="lv-studio-status" role="status" aria-live="polite">
        {status}
      </p>

      {storageKind === "memory" && (
        <p className="lv-studio-warn">
          <AlertTriangle aria-hidden />
          Tu navegador no dejó guardar los borradores (¿ventana privada?). Descargá el zip antes
          de cerrar la pestaña.
        </p>
      )}
    </section>
  );
}

export function Studio() {
  const { ready, storageKind, draftPhotos, draftPosts, photos, posts } = useContent();
  const [tab, setTab] = useState<Tab>("photos");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const summary = useMemo(
    () => `${photos.length} fotos · ${posts.length} posts`,
    [photos.length, posts.length],
  );

  const onTabKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const next = tab === "photos" ? "writing" : "photos";
    setTab(next);
    tabRefs.current[next]?.focus();
  };

  const body: ReactNode =
    tab === "photos" ? <PhotosTab /> : <WritingTab />;

  return (
    <MinimalShell hideSideNav>
      <section className="lv-section lv-studio">
        <div className="lv-container">
          <div className="lv-stack">
            <div className="lv-studio-head">
              <div>
                <p className="lv-studio-eyebrow">sólo para vos</p>
                <h1 className="lv-page-title">Studio</h1>
                <p className="lv-p">
                  Subís fotos, escribís posts y los exportás al repo. Nada de esto se publica solo:
                  hasta que commitees el <code>content.json</code>, los borradores los ves únicamente
                  vos.
                </p>
              </div>
              <p className="lv-studio-counter">
                <ImageIcon aria-hidden />
                {summary}
              </p>
            </div>

            {!ready ? (
              <p className="lv-studio-hint">Abriendo el almacén del navegador…</p>
            ) : (
              <>
                <ExportBlock />

                <div
                  className="lv-studio-tabs"
                  role="tablist"
                  aria-label="Contenido del estudio"
                  onKeyDown={onTabKeyDown}
                >
                  {TABS.map((item) => (
                    <button
                      key={item.id}
                      ref={(element) => {
                        tabRefs.current[item.id] = element;
                      }}
                      type="button"
                      role="tab"
                      id={`studio-tab-${item.id}`}
                      aria-selected={tab === item.id}
                      aria-controls={`studio-panel-${item.id}`}
                      tabIndex={tab === item.id ? 0 : -1}
                      onClick={() => setTab(item.id)}
                    >
                      {item.label}
                      <small>{item.hint}</small>
                      <span className="lv-studio-tab-count">
                        {item.id === "photos" ? draftPhotos.length : draftPosts.length}
                      </span>
                    </button>
                  ))}
                </div>

                <div
                  role="tabpanel"
                  id={`studio-panel-${tab}`}
                  aria-labelledby={`studio-tab-${tab}`}
                  className="lv-studio-panel"
                >
                  {body}
                </div>
              </>
            )}

            {ready && storageKind === "indexeddb" && (
              <p className="lv-studio-hint">
                <Check aria-hidden />
                Borradores guardados en este navegador. Exportá para publicarlos.
              </p>
            )}
          </div>
        </div>
      </section>
    </MinimalShell>
  );
}
