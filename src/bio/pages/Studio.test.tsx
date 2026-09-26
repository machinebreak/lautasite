import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContentProvider } from "@/components/content-provider";
import { DesignProvider } from "@/components/design-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { getContentDriver } from "@/lib/content-store";
import { Studio } from "./Studio";
import { MinimalWriting } from "./MinimalWriting";
import { PostPage } from "./PostPage";

function Providers({ children, path = "/studio" }: { children: React.ReactNode; path?: string }) {
  return (
    <MemoryRouter initialEntries={[path]}>
      <DesignProvider>
        <ThemeProvider>
          <ContentProvider>{children}</ContentProvider>
        </ThemeProvider>
      </DesignProvider>
    </MemoryRouter>
  );
}

async function writePost(title: string, body: string) {
  fireEvent.change(screen.getByLabelText("Título"), { target: { value: title } });
  fireEvent.change(screen.getByLabelText("Markdown"), { target: { value: body } });
  fireEvent.click(screen.getByRole("button", { name: /^guardar (post| cambios)$/i }));
  await waitFor(() => expect(screen.getByText(/Guardado/)).toBeInTheDocument());
}

async function renderStudio() {
  render(
    <Providers>
      <Studio />
    </Providers>,
  );
  await screen.findByRole("heading", { name: "Studio", level: 1 });
  fireEvent.click(screen.getByRole("tab", { name: /writing/i }));
}

const jpeg = (name: string) => new File([new Uint8Array([1, 2, 3])], name, { type: "image/jpeg" });

describe("studio", () => {
  beforeEach(async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline"))));
    vi.spyOn(window, "scrollTo").mockImplementation(() => undefined);
    // El driver es un singleton en memoria: cada test arranca limpio.
    const driver = await getContentDriver();
    await driver.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("writes a post, previews the markdown and lists it as a draft", async () => {
    await renderStudio();

    await writePost("Shaders que no salen negros", "Un **detalle** mínimo.\n\n- uno\n- dos");

    // El markdown se ve renderizado mientras se escribe.
    expect(
      screen.getByText(/mínimo/, { selector: ".lv-studio-compose-preview p" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("detalle", { selector: ".lv-studio-compose-preview strong" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("uno", { selector: ".lv-studio-compose-preview li" }),
    ).toBeInTheDocument();
    // Y el borrador aparece en la lista lateral.
    expect(screen.getAllByText("Shaders que no salen negros").length).toBeGreaterThan(0);
  });

  it("does not turn markdown into html or unsafe links", async () => {
    await renderStudio();

    await writePost("XSS", "# Titulo\n\n[click](javascript:alert(1))\n\n<img src=x>");

    expect(screen.queryByRole("link", { name: "click" })).not.toBeInTheDocument();
    expect(
      screen.getByText(/javascript:alert/, { selector: ".lv-studio-compose-preview p" }),
    ).toBeInTheDocument();
    expect(document.querySelector("img[src='x']")).toBeNull();
  });

  it("drops non image files and keeps the count honest", async () => {
    render(
      <Providers>
        <Studio />
      </Providers>,
    );
    await screen.findByRole("heading", { name: "Studio", level: 1 });

    fireEvent.change(screen.getByLabelText("Elegir fotos de tu dispositivo"), {
      target: { files: [jpeg("costa.jpg"), new File(["nope"], "notas.txt", { type: "text/plain" })] },
    });

    await waitFor(() => expect(screen.getByText(/1 foto lista/)).toBeInTheDocument());
    expect(screen.getByText(/no eran imágenes/)).toBeInTheDocument();
    // El alt por defecto sale del nombre del archivo.
    expect(screen.getByDisplayValue("Costa")).toBeInTheDocument();
  });

  it("edits the caption of a photo", async () => {
    render(
      <Providers>
        <Studio />
      </Providers>,
    );
    await screen.findByRole("heading", { name: "Studio", level: 1 });

    fireEvent.change(screen.getByLabelText("Elegir fotos de tu dispositivo"), {
      target: { files: [jpeg("costa.jpg")] },
    });
    await waitFor(() => expect(screen.getByDisplayValue("Costa")).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText("Lugar"), {
      target: { value: "Mar del Plata, Argentina" },
    });

    await waitFor(() =>
      expect(screen.getByDisplayValue("Mar del Plata, Argentina")).toBeInTheDocument(),
    );
  });

  it("exports a zip with content.json and the photos", async () => {
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:studio");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    let downloadName = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloadName = this.download;
    });

    render(
      <Providers>
        <Studio />
      </Providers>,
    );
    await screen.findByRole("heading", { name: "Studio", level: 1 });

    fireEvent.change(screen.getByLabelText("Elegir fotos de tu dispositivo"), {
      target: { files: [jpeg("costa.jpg")] },
    });
    await waitFor(() => expect(screen.getByText(/1 foto lista/)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /exportar contenido/i }));

    await waitFor(() => expect(downloadName).not.toBe(""));
    expect(downloadName).toBe("lauta-content.zip");

    const zips = createObjectURL.mock.calls
      .map(([blob]) => blob as Blob)
      .filter((blob) => blob.type === "application/zip");
    expect(zips).toHaveLength(1);
    const head = new Uint8Array(await zips[0].slice(0, 4).arrayBuffer());
    expect(Array.from(head)).toEqual([0x50, 0x4b, 0x03, 0x04]);
  });

  it("imports a previous content.json", async () => {
    render(
      <Providers>
        <Studio />
      </Providers>,
    );
    await screen.findByRole("heading", { name: "Studio", level: 1 });

    const json = JSON.stringify({
      version: 1,
      photos: [],
      posts: [{ id: "post-x", title: "Importado", summary: "s", date: "2026-03-01", body: "cuerpo" }],
    });
    fireEvent.change(screen.getByLabelText("Elegir un content.json para importar"), {
      target: { files: [new File([json], "content.json", { type: "application/json" })] },
    });

    await waitFor(() => expect(screen.getByText(/Importado: 0 foto\(s\), 1 post/)).toBeInTheDocument());
  });

  it("lists a draft in /writing and opens it in /writing/:slug", async () => {
    await renderStudio();
    await writePost("Notas de un shader", "Cuerpo del post con **negrita**.");
    cleanup();

    render(
      <Providers path="/writing">
        <MinimalWriting />
      </Providers>,
    );
    const row = await screen.findByRole("link", { name: /Notas de un shader/ });
    expect(row).toHaveAttribute("href", "/writing/notas-de-un-shader");
    expect(screen.getAllByText(/borrador/).length).toBeGreaterThan(0);
    cleanup();

    render(
      <Providers path="/writing/notas-de-un-shader">
        <Routes>
          <Route path="/writing/:slug" element={<PostPage />} />
        </Routes>
      </Providers>,
    );
    expect(
      await screen.findByRole("heading", { name: /Notas de un shader/, level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByText("negrita").tagName).toBe("STRONG");
  });

  it("shows a friendly page when the slug does not exist", async () => {
    render(
      <Providers path="/writing/no-existe">
        <Routes>
          <Route path="/writing/:slug" element={<PostPage />} />
        </Routes>
      </Providers>,
    );
    expect(
      await screen.findByRole("heading", { name: /no encontrado/i, level: 1 }),
    ).toBeInTheDocument();
  });
});
