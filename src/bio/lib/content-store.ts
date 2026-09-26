/**
 * Almacén del estudio. IndexedDB cuando se puede (los borradores viven en tu
 * navegador), con un fallback en memoria para que la UI no se rompa en privada
 * o en los tests — en ese caso `kind` es "memory" y la UI avisa que no persiste.
 */

export type StudioPhoto = {
  id: string;
  name: string;
  filename: string;
  width: number;
  height: number;
  bytes: number;
  full: Blob;
  thumb: Blob;
  /**
   * Cuando la foto viene de un `content.json` ya commiteado no tenemos bytes:
   * el preview usa el archivo del repo.
   */
  linkedSrc?: string;
  linkedFull?: string;
  location: string;
  alt: string;
  camera?: string;
  lens?: string;
  focalLength?: string;
  aperture?: string;
  shutter?: string;
  iso?: string;
  takenAt?: string;
  createdAt: number;
};

export type StudioPost = {
  id: string;
  title: string;
  summary: string;
  date: string;
  body: string;
  tags: string[];
  externalUrl?: string;
  createdAt: number;
  updatedAt: number;
};

export type ContentDriver = {
  kind: "indexeddb" | "memory";
  photos: () => Promise<StudioPhoto[]>;
  savePhoto: (photo: StudioPhoto) => Promise<void>;
  removePhoto: (id: string) => Promise<void>;
  posts: () => Promise<StudioPost[]>;
  savePost: (post: StudioPost) => Promise<void>;
  removePost: (id: string) => Promise<void>;
  clear: () => Promise<void>;
};

const DB_NAME = "lauta-studio";
const DB_VERSION = 1;
const PHOTOS = "photos";
const POSTS = "posts";

export function hasIndexedDb() {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB falló"));
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(PHOTOS)) db.createObjectStore(PHOTOS, { keyPath: "id" });
      if (!db.objectStoreNames.contains(POSTS)) db.createObjectStore(POSTS, { keyPath: "id" });
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error("no se pudo abrir IndexedDB"));
    open.onblocked = () => reject(new Error("IndexedDB está bloqueado por otra pestaña"));
  });
}

function sortPhotos(photos: StudioPhoto[]) {
  return [...photos].sort((a, b) => a.createdAt - b.createdAt);
}

function sortPosts(posts: StudioPost[]) {
  return [...posts].sort((a, b) => (a.date === b.date ? b.updatedAt - a.updatedAt : a.date < b.date ? 1 : -1));
}

function createIndexedDbDriver(db: IDBDatabase): ContentDriver {
  const all = <T>(store: string) => request<T[]>(db.transaction(store).objectStore(store).getAll());
  const tx = <T>(store: string, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) =>
    new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(store, mode);
      const req = run(transaction.objectStore(store));
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error ?? new Error("IndexedDB falló"));
      transaction.onabort = () => reject(transaction.error ?? new Error("transacción abortada"));
    });

  return {
    kind: "indexeddb",
    photos: async () => sortPhotos(await all<StudioPhoto>(PHOTOS)),
    savePhoto: (photo) => tx(PHOTOS, "readwrite", (s) => s.put(photo)).then(() => undefined),
    removePhoto: (id) => tx(PHOTOS, "readwrite", (s) => s.delete(id)).then(() => undefined),
    posts: async () => sortPosts(await all<StudioPost>(POSTS)),
    savePost: (post) => tx(POSTS, "readwrite", (s) => s.put(post)).then(() => undefined),
    removePost: (id) => tx(POSTS, "readwrite", (s) => s.delete(id)).then(() => undefined),
    clear: async () => {
      await tx(PHOTOS, "readwrite", (s) => s.clear());
      await tx(POSTS, "readwrite", (s) => s.clear());
    },
  };
}

function createMemoryDriver(): ContentDriver {
  let photos: StudioPhoto[] = [];
  let posts: StudioPost[] = [];
  return {
    kind: "memory",
    photos: async () => sortPhotos(photos),
    savePhoto: async (photo) => {
      photos = [...photos.filter((p) => p.id !== photo.id), photo];
    },
    removePhoto: async (id) => {
      photos = photos.filter((p) => p.id !== id);
    },
    posts: async () => sortPosts(posts),
    savePost: async (post) => {
      posts = [...posts.filter((p) => p.id !== post.id), post];
    },
    removePost: async (id) => {
      posts = posts.filter((p) => p.id !== id);
    },
    clear: async () => {
      photos = [];
      posts = [];
    },
  };
}

export async function createContentDriver(): Promise<ContentDriver> {
  if (!hasIndexedDb()) return createMemoryDriver();
  try {
    const db = await openDatabase();
    // Modo privado: puede abrir la base pero no escribir. Lo detectamos ahora.
    await request(db.transaction(PHOTOS, "readonly").objectStore(PHOTOS).count());
    await request(db.transaction(PHOTOS, "readonly").objectStore(PHOTOS).count());
    return createIndexedDbDriver(db);
  } catch {
    return createMemoryDriver();
  }
}

let shared: Promise<ContentDriver> | null = null;

/** Una sola conexión por sesión: varias páginas del estudio la comparten. */
export function getContentDriver(): Promise<ContentDriver> {
  if (!shared) shared = createContentDriver();
  return shared;
}

export function newId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}
