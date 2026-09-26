/**
 * Procesamiento de imágenes en el navegador. No es un editor de fotos: sólo lo
 * mínimo para que lo que subas a /studio no reviente el repo — recorta al lado
 * más largo, recomprime a JPEG y guarda una miniatura aparte para la masonry.
 */

export const FULL_EDGE = 2400;
export const THUMB_EDGE = 720;
export const JPEG_QUALITY = 0.86;
export const THUMB_QUALITY = 0.78;

export type ProcessedImage = {
  full: Blob;
  thumb: Blob;
  width: number;
  height: number;
  bytes: number;
  type: string;
};

export function isImageFile(file: File | Blob): boolean {
  return file.type.startsWith("image/");
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("canvas.toBlob devolvió null"))),
      type,
      quality,
    );
  });
}

function canProcess() {
  try {
    return Boolean(document.createElement("canvas").getContext("2d"));
  } catch {
    return false;
  }
}

function loadBitmap(file: Blob): Promise<{ width: number; height: number; draw: CanvasImageSource; release: () => void }> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file).then((bitmap) => ({
      width: bitmap.width,
      height: bitmap.height,
      draw: bitmap as CanvasImageSource,
      release: () => bitmap.close(),
    }));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const timer = window.setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error("la imagen no cargó"));
    }, 10000);
    img.onload = () => {
      window.clearTimeout(timer);
      resolve({
        width: img.naturalWidth || img.width,
        height: img.naturalHeight || img.height,
        draw: img,
        release: () => URL.revokeObjectURL(url),
      });
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      reject(new Error("no se pudo decodificar la imagen"));
    };
    img.src = url;
  });
}

async function resize(
  source: CanvasImageSource,
  width: number,
  height: number,
  edge: number,
  quality: number,
): Promise<Blob> {
  const scale = Math.min(1, edge / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("sin contexto 2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvasToBlob(canvas, "image/jpeg", quality);
}

/**
 * Recorta y recomprime. Si el navegador no puede (canvas bloqueado, tests),
 * devuelve el archivo original tal cual para no perder la subida.
 */
export async function processImage(file: File): Promise<ProcessedImage> {
  const passthrough = (): ProcessedImage => ({
    full: file,
    thumb: file,
    width: 0,
    height: 0,
    bytes: file.size,
    type: file.type || "image/jpeg",
  });

  if (!canProcess()) return passthrough();

  try {
    const bitmap = await loadBitmap(file);
    try {
      const [full, thumb] = await Promise.all([
        resize(bitmap.draw, bitmap.width, bitmap.height, FULL_EDGE, JPEG_QUALITY),
        resize(bitmap.draw, bitmap.width, bitmap.height, THUMB_EDGE, THUMB_QUALITY),
      ]);
      return {
        full,
        thumb,
        width: bitmap.width,
        height: bitmap.height,
        bytes: full.size,
        type: "image/jpeg",
      };
    } finally {
      bitmap.release();
    }
  } catch {
    return passthrough();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
