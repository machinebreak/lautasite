import raw from "./content.json";

export type ContentPhoto = {
  id: string;
  src: string;
  fullSrc?: string;
  width: number;
  height: number;
  location: string;
  alt: string;
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutter?: string;
  iso?: string;
  takenAt?: string;
};

export type ContentPost = {
  id: string;
  title: string;
  summary: string;
  /** yyyy-mm-dd */
  date: string;
  /** Markdown. Vacío si el post vive afuera. */
  body?: string;
  /** Enlace externo; tiene prioridad sobre `body`. */
  externalUrl?: string;
  readingTime?: string;
  tags?: string[];
};

export type SiteContent = {
  version: number;
  exportedAt: string;
  photos: ContentPhoto[];
  posts: ContentPost[];
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/**
 * `content.json` lo genera el estudio (/studio) y se commitea al repo, así que
 * es contenido de terceros: lo validamos campo por campo en vez de confiar.
 */
function normalizePhoto(input: unknown): ContentPhoto | null {
  if (!input || typeof input !== "object") return null;
  const photo = input as Record<string, unknown>;
  const src = asString(photo.src);
  const alt = asString(photo.alt);
  if (!src || !alt) return null;
  return {
    id: asString(photo.id, src),
    src,
    fullSrc: asString(photo.fullSrc) || undefined,
    width: asNumber(photo.width),
    height: asNumber(photo.height),
    location: asString(photo.location),
    alt,
    camera: asString(photo.camera) || undefined,
    lens: asString(photo.lens) || undefined,
    focalLength: asString(photo.focalLength) || undefined,
    aperture: asString(photo.aperture) || undefined,
    shutter: asString(photo.shutter) || undefined,
    iso: asString(photo.iso) || undefined,
    takenAt: asString(photo.takenAt) || undefined,
  };
}

function normalizePost(input: unknown): ContentPost | null {
  if (!input || typeof input !== "object") return null;
  const post = input as Record<string, unknown>;
  const title = asString(post.title);
  if (!title) return null;
  return {
    id: asString(post.id, title),
    title,
    summary: asString(post.summary),
    date: asString(post.date),
    body: asString(post.body) || undefined,
    externalUrl: asString(post.externalUrl) || undefined,
    readingTime: asString(post.readingTime) || undefined,
    tags: asArray<string>(post.tags).filter((tag) => typeof tag === "string"),
  };
}

const source = (raw ?? {}) as Partial<SiteContent>;

export const content: SiteContent = {
  version: asNumber(source.version, 1),
  exportedAt: asString(source.exportedAt),
  photos: asArray<unknown>(source.photos)
    .map(normalizePhoto)
    .filter((photo): photo is ContentPhoto => photo !== null),
  posts: asArray<unknown>(source.posts)
    .map(normalizePost)
    .filter((post): post is ContentPost => post !== null),
};

export const contentPhotos = content.photos;
export const contentPosts = content.posts;
