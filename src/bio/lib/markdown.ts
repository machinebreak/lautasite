/**
 * Parser de un subconjunto de markdown, pensado para los posts de /writing y
 * para el preview del estudio. Devuelve un árbol de bloques: nunca HTML, así
 * que el renderer puede volcar los nodos con React sin `dangerouslySetInnerHTML`
 * y sin sanitizar a mano.
 *
 * Soporta: encabezados (#..######), párrafos, listas (- * + y 1.), blockquotes,
 * bloques de código con ```, separadores (---), y en línea **negrita**,
 * *cursiva*, `código` y [enlaces](url).
 */

export type Inline =
  | { kind: "text"; value: string }
  | { kind: "strong"; children: Inline[] }
  | { kind: "em"; children: Inline[] }
  | { kind: "code"; value: string }
  | { kind: "link"; href: string; children: Inline[] };

export type Block =
  | { kind: "heading"; level: number; children: Inline[] }
  | { kind: "paragraph"; children: Inline[] }
  | { kind: "list"; ordered: boolean; items: Inline[][] }
  | { kind: "quote"; children: Block[] }
  | { kind: "code"; lang?: string; value: string }
  | { kind: "rule" };

const SAFE_SCHEME = /^(https?:|mailto:|\/|#|\.\/|\.\.\/)/i;

/** Deja OutsideLink para los href que no son seguros (javascript:, data:, ...). */
export function safeHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  return SAFE_SCHEME.test(trimmed) ? trimmed : null;
}

function pushText(out: Inline[], value: string) {
  if (!value) return;
  const last = out[out.length - 1];
  if (last?.kind === "text") last.value += value;
  else out.push({ kind: "text", value });
}

/** Tokeniza los emphasis de una línea de forma recursiva pero sin backtracking. */
function parseInline(input: string): Inline[] {
  const out: Inline[] = [];
  let buffer = "";
  let i = 0;

  const flush = () => {
    pushText(out, buffer);
    buffer = "";
  };

  while (i < input.length) {
    const char = input[i];

    if (char === "\\" && i + 1 < input.length) {
      buffer += input[i + 1];
      i += 2;
      continue;
    }

    if (char === "`") {
      const end = input.indexOf("`", i + 1);
      if (end > i) {
        flush();
        out.push({ kind: "code", value: input.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    if ((char === "*" || char === "_") && input[i + 1] === char) {
      const marker = char + char;
      const end = input.indexOf(marker, i + 2);
      if (end > i) {
        flush();
        out.push({ kind: "strong", children: parseInline(input.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }

    if (char === "*" || char === "_") {
      const end = input.indexOf(char, i + 1);
      if (end > i + 1) {
        const inner = input.slice(i + 1, end);
        if (!/\s/.test(inner)) {
          flush();
          out.push({ kind: "em", children: parseInline(inner) });
          i = end + 1;
          continue;
        }
      }
    }

    if (char === "[") {
      const close = input.indexOf("]", i + 1);
      if (close > i && input[close + 1] === "(") {
        const paren = input.indexOf(")", close + 2);
        if (paren > close) {
          const href = safeHref(input.slice(close + 2, paren));
          if (href) {
            flush();
            out.push({
              kind: "link",
              href,
              children: parseInline(input.slice(i + 1, close)),
            });
            i = paren + 1;
            continue;
          }
        }
      }
    }

    buffer += char;
    i += 1;
  }

  flush();
  return out;
}

const HEADING = /^(#{1,6})\s+(.*)$/;
const RULE = /^ {0,3}([-*_])\s*(?:\1\s*){2,}$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const ORDERED = /^\s*\d+[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const FENCE = /^```\s*([\w-]*)\s*$/;

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  const paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", children: parseInline(paragraph.join(" ")) });
    paragraph.length = 0;
  };

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === "") {
      flushParagraph();
      index += 1;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      flushParagraph();
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !/^```\s*$/.test(lines[index])) {
        body.push(lines[index]);
        index += 1;
      }
      index += 1;
      blocks.push({
        kind: "code",
        lang: fence[1] || undefined,
        value: body.join("\n"),
      });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({
        kind: "heading",
        level: heading[1].length,
        children: parseInline(heading[2].trim()),
      });
      index += 1;
      continue;
    }

    if (RULE.test(line)) {
      flushParagraph();
      blocks.push({ kind: "rule" });
      index += 1;
      continue;
    }

    if (QUOTE.test(line)) {
      flushParagraph();
      const body: string[] = [];
      while (index < lines.length && QUOTE.test(lines[index])) {
        body.push(QUOTE.exec(lines[index])?.[1] ?? "");
        index += 1;
      }
      blocks.push({ kind: "quote", children: parseMarkdown(body.join("\n")) });
      continue;
    }

    const bullet = BULLET.exec(line);
    const ordered = ORDERED.exec(line);
    if (bullet || ordered) {
      flushParagraph();
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (index < lines.length) {
        const current = lines[index];
        const match = isOrdered ? ORDERED.exec(current) : BULLET.exec(current);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }
      blocks.push({
        kind: "list",
        ordered: isOrdered,
        items: items.map((item) => parseInline(item)),
      });
      continue;
    }

    paragraph.push(line.trim());
    index += 1;
  }

  flushParagraph();
  return blocks;
}

/** "3 min" a partir de 640 palabras, como el readingTime de los posts. */
export function readingTime(body: string): string {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return "1 min";
  return `${Math.max(1, Math.round(words / 220))} min`;
}

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "post"
  );
}

/** "playa-del-carl.jpg" -> "Playa del carl" (alt por defecto, editable). */
export function humanizeFilename(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
}
