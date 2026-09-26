import { useCallback, useState, type MouseEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Menu, Moon, Search, Sun, X } from "lucide-react";
import { site } from "@/config/site";
import { useTheme } from "@/components/theme-provider";
import { TimeMachine } from "@/components/time-machine";
import { BeetleEgg, MiniBeetle } from "@/components/beetle-egg";

const MENU_LINKS = [
  { label: "Home", to: "/" },
  { label: "Projects", to: "/projects" },
  { label: "Experience", to: "/experience" },
  { label: "Writing", to: "/writing" },
  { label: "Photos", to: "/photos" },
  { label: "Contact", to: "/contact" },
];

export function MinimalShell({
  children,
  onOpenPalette,
  hideSideNav = false,
}: {
  children: ReactNode;
  onOpenPalette?: () => void;
  /** El studio es una mesa de trabajo: usa el ancho completo. */
  hideSideNav?: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const [menuOpen, setMenuOpen] = useState(false);
  const [beetle, setBeetle] = useState<{ x: number; y: number } | null>(null);
  const openPalette = onOpenPalette ?? (() => undefined);

  const dismissBeetle = useCallback(() => setBeetle(null), []);
  const spawnBeetle = useCallback((e: MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setBeetle((prev) => {
      if (prev) return prev;
      console.log(
        "%c*skitter skitter*",
        "font-family:monospace;font-size:12px;",
      );
      return {
        x: rect.left + rect.width / 2 - 21,
        y: rect.top + rect.height / 2 - 20,
      };
    });
  }, []);

  return (
    <div className="lv-home">
      <a href="#main-content" className="lv-sr lv-skip">
        Skip to content
      </a>

      {/* Mobile top bar */}
      <header className="lv-topbar">
        <div className="lv-topbar-inner">
          <div className="lv-topbar-row">
            <button
              type="button"
              aria-label="Open command palette"
              onClick={openPalette}
              className="lv-icon-btn lv-icon-btn--search"
            >
              <Search />
            </button>
            <button
              type="button"
              aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="lv-icon-btn lv-burger"
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="lv-menu-panel">
            <nav aria-label="Mobile" className="lv-menu-nav">
              {MENU_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  onClick={() => setMenuOpen(false)}
                  className="lv-menu-link"
                >
                  {l.label}
                </Link>
              ))}
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  openPalette();
                }}
                className="lv-menu-link"
              >
                Search
              </button>
            </nav>
          </div>
        )}
      </header>

      {!hideSideNav && (
        <nav aria-label="Pages" className="lv-side">
          <Link to="/projects" className="lv-side-link">
            Projects
          </Link>
          <Link to="/photos" className="lv-side-link">
            Photos
          </Link>
          <button
            type="button"
            aria-label="Open command palette"
            onClick={openPalette}
            className="lv-kbd-btn"
          >
            <kbd className="lv-kbd">⌘ K</kbd>
          </button>
        </nav>
      )}

      <main id="main-content" tabIndex={-1}>
        {children}
      </main>

      <div className="lv-container">
        <footer className="lv-footer">
          <div className="lv-foot-left">
            <TimeMachine />
            <button
              type="button"
              aria-label="A tiny pixel beetle. It is hiding. Activate to let it out."
              title="something scurries..."
              onClick={spawnBeetle}
              className="lv-lock"
            >
              <MiniBeetle />
            </button>
            <p className="lv-copyright">
              © {new Date().getFullYear()} {site.name}
            </p>
          </div>
          <div className="lv-foot-right">
            <button
              type="button"
              aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
              onClick={toggleTheme}
              className="lv-theme-btn"
            >
              {dark ? <Sun /> : <Moon />}
            </button>
          </div>
        </footer>
      </div>

      {beetle && <BeetleEgg origin={beetle} onDone={dismissBeetle} />}
    </div>
  );
}
