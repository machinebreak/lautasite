import { describe, expect, it } from "vitest";
import { humanizeFilename, parseMarkdown, readingTime, safeHref, slugify } from "./markdown";

describe("parseMarkdown", () => {
  it("parses headings, paragraphs and inline marks", () => {
    const blocks = parseMarkdown("# Hola\n\nUn **negrita**, *cursiva* y `codigo`.\n\nOtro parrafo.");
    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toMatchObject({ kind: "heading", level: 1 });
    expect(blocks[1]).toMatchObject({ kind: "paragraph" });
    expect(blocks[2]).toMatchObject({ kind: "paragraph" });

    const inline = blocks[1].kind === "paragraph" ? blocks[1].children : [];
    expect(inline.map((node) => node.kind)).toEqual([
      "text",
      "strong",
      "text",
      "em",
      "text",
      "code",
      "text",
    ]);
  });

  it("shifts headings down one level so the page keeps its own h1", () => {
    const [heading] = parseMarkdown("## Subtitulo");
    expect(heading).toMatchObject({ kind: "heading", level: 2 });
  });

  it("parses ordered and unordered lists", () => {
    const [list] = parseMarkdown("- uno\n- dos");
    expect(list).toMatchObject({ kind: "list", ordered: false });
    expect(list?.kind === "list" && list.items).toHaveLength(2);

    const [ordered] = parseMarkdown("1. primero\n2. segundo");
    expect(ordered).toMatchObject({ kind: "list", ordered: true });
  });

  it("parses fenced code with the language and keeps the body raw", () => {
    const [code] = parseMarkdown("```ts\nconst a = **1**;\n```");
    expect(code).toEqual({ kind: "code", lang: "ts", value: "const a = **1**;" });
  });

  it("parses quotes and rules", () => {
    expect(parseMarkdown("> cita")[0]).toMatchObject({ kind: "quote" });
    expect(parseMarkdown("---")[0]).toEqual({ kind: "rule" });
  });

  it("only keeps safe links", () => {
    const [paragraph] = parseMarkdown("[ok](https://lauta.site) [malo](javascript:alert(1))");
    const links =
      paragraph?.kind === "paragraph"
        ? paragraph.children.filter((node) => node.kind === "link")
        : [];
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ kind: "link", href: "https://lauta.site" });
  });

  it("does not treat html as markup", () => {
    const [paragraph] = parseMarkdown("<img src=x onerror=alert(1)>");
    expect(paragraph).toMatchObject({ kind: "paragraph" });
    const [node] = paragraph?.kind === "paragraph" ? paragraph.children : [];
    expect(node).toEqual({ kind: "text", value: "<img src=x onerror=alert(1)>" });
  });

  it("handles empty input", () => {
    expect(parseMarkdown("")).toEqual([]);
    expect(parseMarkdown("   \n\n  ")).toEqual([]);
  });
});

describe("helpers", () => {
  it("safeHref only allows web schemes and relatives", () => {
    expect(safeHref("https://lauta.site")).toBe("https://lauta.site");
    expect(safeHref("mailto:a@b.com")).toBe("mailto:a@b.com");
    expect(safeHref("/photos")).toBe("/photos");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,x")).toBeNull();
  });

  it("slugify keeps ascii slugs", () => {
    expect(slugify("Cómo hacer un shader")).toBe("como-hacer-un-shader");
    expect(slugify("!!!")).toBe("post");
  });

  it("readingTime rounds to minutes and never returns 0", () => {
    expect(readingTime("")).toBe("1 min");
    expect(readingTime("palabra ".repeat(300))).toBe("1 min");
    expect(readingTime("palabra ".repeat(1000))).toBe("5 min");
  });

  it("humanizeFilename makes a usable alt", () => {
    expect(humanizeFilename("playa-del-carl.JPG")).toBe("Playa del carl");
    expect(humanizeFilename("cielo_estrellado.png")).toBe("Cielo estrellado");
  });
});
