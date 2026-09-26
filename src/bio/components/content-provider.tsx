import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { contentPhotos, contentPosts, type ContentPhoto, type ContentPost } from "@/data/content";
import {
  getContentDriver,
  newId,
  type ContentDriver,
  type StudioPhoto,
  type StudioPost,
} from "@/lib/content-store";
import { isImageFile, processImage } from "@/lib/images";
import { humanizeFilename, readingTime, slugify } from "@/lib/markdown";
import { createZip, downloadBlob, textToBytes } from "@/lib/zip";

export type DraftPhoto = {
  id: string;
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
  draft: true;
  photo: StudioPhoto;
};

export type DraftPost = {
  id: string;
  title: string;
  summary: string;
  date: string;
  body: string;
  tags: string[];
  externalUrl?: string;
  draft: true;
  updatedAt: number;
  createdAt: number;
  readingTime: string;
};

type ContentContextValue = {
  ready: boolean;
  storageKind: "indexeddb" | "memory" | null;
  /** Fotos de content.json (publicadas en el repo) + las del estudio. */
  photos: Array<ContentPhoto | DraftPhoto>;
  posts: Array<ContentPost | DraftPost>;
  draftPhotos: DraftPhoto[];
  draftPosts: DraftPost[];
  addPhotos: (files: File[]) => Promise<{ added: number; skipped: number }>;
  updatePhoto: (id: string, patch: Partial<StudioPhoto>) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  savePost: (post: Omit<StudioPost, "createdAt" | "updatedAt"> & { createdAt?: number }) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  exportBundle: () => Promise<void>;
  importContent: (text: string) => Promise<{ photos: number; posts: number }>;
  clearDrafts: () => Promise<void>;
};

const ContentContext = createContext<ContentContextValue | null>(null);

function toDraftPhoto(photo: StudioPhoto): DraftPhoto {
  return {
    id: photo.id,
    width: photo.width,
    height: photo.height,
    location: photo.location,
    alt: photo.alt,
    camera: photo.camera,
    lens: photo.lens,
    focalLength: photo.focalLength,
    aperture: photo.aperture,
    shutter: photo.shutter,
    iso: photo.iso,
    takenAt: photo.takenAt,
    draft: true,
    photo,
  };
}

function toDraftPost(post: StudioPost): DraftPost {
  return {
    id: post.id,
    title: post.title,
    summary: post.summary,
    date: post.date,
    body: post.body,
    tags: post.tags,
    externalUrl: post.externalUrl,
    draft: true,
    updatedAt: post.updatedAt,
    createdAt: post.createdAt,
    readingTime: readingTime(post.body),
  };
}

/** content.json -> StudioPhoto, para pegar un export previo. */
function photoFromContent(photo: ContentPhoto, createdAt: number): Omit<StudioPhoto, "full" | "thumb"> & {
  full?: Blob;
  thumb?: Blob;
} {
  return {
    id: photo.id,
    name: (photo.fullSrc ?? photo.src).split("/").pop() ?? photo.id,
    filename: (photo.fullSrc ?? photo.src).split("/").pop() ?? `${photo.id}.jpg`,
    width: photo.width,
    height: photo.height,
    bytes: 0,
    linkedSrc: photo.src,
    linkedFull: photo.fullSrc ?? photo.src,
    location: photo.location,
    alt: photo.alt,
    camera: photo.camera,
    lens: photo.lens,
    focalLength: photo.focalLength,
    aperture: photo.aperture,
    shutter: photo.shutter,
    iso: photo.iso,
    takenAt: photo.takenAt,
    createdAt,
  };
}

/** ¿La foto tiene una miniatura propia para la grilla, o es el mismo archivo? */
function hasSeparateThumb(photo: StudioPhoto) {
  return photo.thumb.size > 0 && photo.full.size > 0 && photo.thumb !== photo.full;
}

function thumbFilename(filename: string) {
  return filename.replace(/\.[a-z0-9]+$/i, "-sm.jpg");
}

export function ContentProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [storageKind, setStorageKind] = useState<ContentContextValue["storageKind"]>(null);
  const [photos, setPhotos] = useState<StudioPhoto[]>([]);
  const [posts, setPosts] = useState<StudioPost[]>([]);
  const driverRef = useRef<ContentDriver | null>(null);
  const mountedRef = useRef(true);
  const photosRef = useRef<StudioPhoto[]>([]);
  const pendingRef = useRef<Record<string, number>>({});

  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  useEffect(
    () => () => {
      for (const timer of Object.values(pendingRef.current)) window.clearTimeout(timer);
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    void getContentDriver().then(async (driver) => {
      driverRef.current = driver;
      const [storedPhotos, storedPosts] = await Promise.all([driver.photos(), driver.posts()]);
      if (!mountedRef.current) return;
      setStorageKind(driver.kind);
      setPhotos(storedPhotos);
      setPosts(storedPosts);
      setReady(true);
    });
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const driver = () => {
    if (!driverRef.current) throw new Error("el estudio todavía no está listo");
    return driverRef.current;
  };

  const addPhotos = useCallback(async (files: File[]) => {
    const store = driver();
    const images = files.filter(isImageFile);
    let added = 0;
    for (const file of images) {
      const processed = await processImage(file);
      const id = newId("photo");
      const base = file.name.replace(/\.[a-z0-9]+$/i, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
      await store.savePhoto({
        id,
        name: file.name,
        filename: `${base || id}.jpg`,
        width: processed.width,
        height: processed.height,
        bytes: processed.bytes,
        full: processed.full,
        thumb: processed.thumb,
        location: "",
        alt: humanizeFilename(file.name),
        createdAt: Date.now() + added,
      });
      added += 1;
    }
    setPhotos(await store.photos());
    return { added, skipped: files.length - images.length };
  }, []);

  const updatePhoto = useCallback(async (id: string, patch: Partial<StudioPhoto>) => {
    // Escritura debounced: teclear en un campo no puede escribir 40 veces en IndexedDB.
    setPhotos((current) => {
      const next = current.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo));
      photosRef.current = next;
      return next;
    });
    window.clearTimeout(pendingRef.current[id]);
    pendingRef.current[id] = window.setTimeout(() => {
      delete pendingRef.current[id];
      const photo = photosRef.current.find((candidate) => candidate.id === id);
      if (photo) void driverRef.current?.savePhoto(photo);
    }, 350);
  }, []);

  /** Escribe de una las fotos con cambios pendientes (se llama al exportar). */
  const flushPhotos = useCallback(async () => {
    for (const [id, timer] of Object.entries(pendingRef.current)) {
      window.clearTimeout(timer);
      delete pendingRef.current[id];
      const photo = photosRef.current.find((candidate) => candidate.id === id);
      if (photo) await driverRef.current?.savePhoto(photo);
    }
  }, []);

  const deletePhoto = useCallback(async (id: string) => {
    const store = driver();
    await store.removePhoto(id);
    setPhotos(await store.photos());
  }, []);

  const savePost = useCallback(
    async (post: Omit<StudioPost, "createdAt" | "updatedAt"> & { createdAt?: number }) => {
      const store = driver();
      const now = Date.now();
      await store.savePost({
        ...post,
        tags: post.tags.map((tag) => tag.trim()).filter(Boolean),
        createdAt: post.createdAt ?? now,
        updatedAt: now,
      });
      setPosts(await store.posts());
    },
    [],
  );

  const deletePost = useCallback(async (id: string) => {
    const store = driver();
    await store.removePost(id);
    setPosts(await store.posts());
  }, []);

  const exportBundle = useCallback(async () => {
    const store = driver();
    await flushPhotos();
    const [storedPhotos, storedPosts] = await Promise.all([store.photos(), store.posts()]);

    const exportedPhotos = storedPhotos.map((photo) => {
      const meta = {
        id: photo.id,
        width: photo.width,
        height: photo.height,
        location: photo.location,
        alt: photo.alt,
        ...(photo.camera ? { camera: photo.camera } : {}),
        ...(photo.lens ? { lens: photo.lens } : {}),
        ...(photo.focalLength ? { focalLength: photo.focalLength } : {}),
        ...(photo.aperture ? { aperture: photo.aperture } : {}),
        ...(photo.shutter ? { shutter: photo.shutter } : {}),
        ...(photo.iso ? { iso: photo.iso } : {}),
        ...(photo.takenAt ? { takenAt: photo.takenAt } : {}),
      };
      return hasSeparateThumb(photo)
        ? {
            ...meta,
            src: `/photos/${thumbFilename(photo.filename)}`,
            fullSrc: `/photos/${photo.filename}`,
          }
        : { ...meta, src: `/photos/${photo.filename}` };
    });

    const exportedPosts = storedPosts
      .map((post) => ({
        id: post.id,
        title: post.title,
        summary: post.summary,
        date: post.date,
        body: post.body,
        ...(post.externalUrl ? { externalUrl: post.externalUrl } : {}),
        readingTime: readingTime(post.body),
        tags: post.tags,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    const json = `${JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        photos: exportedPhotos,
        posts: exportedPosts,
      },
      null,
      2,
    )}\n`;

    const files: Array<{ name: string; data: Uint8Array<ArrayBuffer> }> = [
      { name: "content.json", data: textToBytes(json) },
    ];
    for (const photo of storedPhotos) {
      files.push({
        name: `photos/${photo.filename}`,
        data: new Uint8Array(await photo.full.arrayBuffer()),
      });
      if (hasSeparateThumb(photo)) {
        files.push({
          name: `photos/${thumbFilename(photo.filename)}`,
          data: new Uint8Array(await photo.thumb.arrayBuffer()),
        });
      }
    }

    downloadBlob(createZip(files), "lauta-content.zip");
  }, [flushPhotos]);

  const importContent = useCallback(async (text: string) => {
    const store = driver();
    const parsed = JSON.parse(text) as {
      photos?: ContentPhoto[];
      posts?: ContentPost[];
    };
    let photoCount = 0;
    for (const photo of parsed.photos ?? []) {
      const base = photoFromContent(photo, Date.now() + photoCount);
      await store.savePhoto({
        ...base,
        full: base.full ?? new Blob([], { type: "image/jpeg" }),
        thumb: base.thumb ?? new Blob([], { type: "image/jpeg" }),
      });
      photoCount += 1;
    }
    const existing = await store.posts();
    let postCount = 0;
    for (const post of parsed.posts ?? []) {
      const previous = existing.find((candidate) => candidate.id === post.id);
      await store.savePost({
        id: post.id || newId("post"),
        title: post.title,
        summary: post.summary ?? "",
        date: post.date ?? new Date().toISOString().slice(0, 10),
        body: post.body ?? "",
        tags: post.tags ?? [],
        externalUrl: post.externalUrl,
        createdAt: previous?.createdAt ?? Date.now() + postCount,
        updatedAt: Date.now(),
      });
      postCount += 1;
    }
    const [storedPhotos, storedPosts] = await Promise.all([store.photos(), store.posts()]);
    setPhotos(storedPhotos);
    setPosts(storedPosts);
    return { photos: photoCount, posts: postCount };
  }, []);

  const clearDrafts = useCallback(async () => {
    const store = driver();
    await store.clear();
    setPhotos([]);
    setPosts([]);
  }, []);

  const value = useMemo<ContentContextValue>(() => {
    const draftPhotos = photos.map(toDraftPhoto);
    const draftPosts = posts.map(toDraftPost);
    return {
      ready,
      storageKind,
      photos: [...contentPhotos, ...draftPhotos],
      posts: [...contentPosts, ...draftPosts],
      draftPhotos,
      draftPosts,
      addPhotos,
      updatePhoto,
      deletePhoto,
      savePost,
      deletePost,
      exportBundle,
      importContent,
      clearDrafts,
    };
  }, [
    ready,
    storageKind,
    photos,
    posts,
    addPhotos,
    updatePhoto,
    deletePhoto,
    savePost,
    deletePost,
    exportBundle,
    importContent,
    clearDrafts,
  ]);

  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export function useContent(): ContentContextValue {
  const context = useContext(ContentContext);
  if (!context) throw new Error("useContent necesita <ContentProvider>");
  return context;
}

/** URL de un blob del estudio, cacheada para no recrearla en cada render. */
const objectUrls = new Map<Blob, string>();

export function blobUrl(blob: Blob): string {
  const existing = objectUrls.get(blob);
  if (existing) return existing;
  const url = URL.createObjectURL(blob);
  objectUrls.set(blob, url);
  return url;
}

export function releaseObjectUrls() {
  for (const url of objectUrls.values()) URL.revokeObjectURL(url);
  objectUrls.clear();
}

export function isDraft(item: { draft?: boolean }): item is DraftPhoto | DraftPost {
  return item.draft === true;
}

export function postSlug(post: ContentPost | DraftPost): string {
  return slugify(post.title);
}

/** Miniatura para la masonry: la del estudio es un blob, la publicada un path. */
export function photoThumb(photo: ContentPhoto | DraftPhoto): string {
  if (!isDraftPhoto(photo)) return photo.src;
  return photo.photo.linkedSrc ?? blobUrl(photo.photo.thumb);
}

/** Versión grande para el lightbox. */
export function photoFull(photo: ContentPhoto | DraftPhoto): string {
  if (!isDraftPhoto(photo)) return photo.fullSrc ?? photo.src;
  return photo.photo.linkedFull ?? blobUrl(photo.photo.full);
}

export function isDraftPhoto(item: ContentPhoto | DraftPost | DraftPhoto): item is DraftPhoto {
  return (item as DraftPhoto).draft === true;
}

export function isDraftPost(item: ContentPost | DraftPost | DraftPhoto): item is DraftPost {
  return (item as DraftPost).draft === true;
}
