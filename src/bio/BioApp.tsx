import { cloneElement, isValidElement, useCallback, useEffect, useState, type ReactElement, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { DesignProvider } from "@/components/design-provider";
import { VisitorProvider } from "@/context/VisitorContext";
import { CommandPalette } from "@/components/command-palette";
import { ContentProvider } from "@/components/content-provider";
import { Konami } from "@/components/konami";
import { MainLayout } from "./MainLayout";

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.replace("#", "");
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth" });
        }, 100);
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

type PaletteProps = { onOpenPalette?: () => void };

export function BioApp({ page }: { page?: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const openPalette = useCallback(() => setPaletteOpen(true), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Scrollbar y overflow del template — solo mientras el bio está montado
  useEffect(() => {
    document.documentElement.classList.add("bio-active");
    return () => {
      document.documentElement.classList.remove("bio-active");
    };
  }, []);

  // Inyecta el abridor de la paleta en la página activa para que el
  // side-nav y el menú mobile puedan usarlo en cualquier ruta.
  const content = page
    ? isValidElement(page)
      ? cloneElement(page as ReactElement<PaletteProps>, { onOpenPalette: openPalette })
      : page
    : <MainLayout onOpenPalette={openPalette} />;

  return (
    <DesignProvider>
      <ThemeProvider>
        <VisitorProvider>
        <ContentProvider>
        <ScrollToTop />
        <Konami />
        <div id="bio-root">
          <main className="relative z-10">
            {content}
          </main>

          <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
        </div>
        </ContentProvider>
        </VisitorProvider>
      </ThemeProvider>
    </DesignProvider>
  );
}
