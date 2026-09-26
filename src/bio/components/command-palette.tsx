import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, Compass, Copy, Globe, Image, Mail, Moon, Pencil, Search, Sun, Terminal, X } from "lucide-react";
import { site } from "@/config/site";
import { useTheme } from "./theme-provider";
import { useContent } from "./content-provider";

type PaletteCategory = "pages" | "sections" | "projects" | "actions";

type PaletteItem = {
  id: string;
  category: PaletteCategory;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  action: () => void;
};

const CATEGORY_LABELS: Record<PaletteCategory, string> = {
  pages: "Pages",
  sections: "Sections",
  projects: "Projects",
  actions: "Actions",
};

export function CommandPalette({
  open,
  isOpen,
  onClose,
  setIsOpen,
}: {
  open?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  setIsOpen?: (open: boolean) => void;
}) {
  const activeOpen = open ?? isOpen ?? false;
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const { draftPhotos, draftPosts } = useContent();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // El studio es una herramienta del owner: en prod sólo aparece si este
  // navegador tiene borradores (o sea, si es el tuyo).
  const showStudio = import.meta.env.DEV || draftPhotos.length + draftPosts.length > 0;

  const handleClose = useCallback(() => {
    onClose?.();
    setIsOpen?.(false);
  }, [onClose, setIsOpen]);

  const navigateWithTransition = useCallback((to: string) => {
    const doc = document as Document & { startViewTransition?: (callback: () => void) => void };
    if (doc.startViewTransition) {
      doc.startViewTransition(() => navigate(to, { viewTransition: true } as never));
    } else {
      navigate(to);
    }
  }, [navigate]);

  useEffect(() => {
    if (!activeOpen) return;
    setQuery("");
    setSelectedIndex(0);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 50);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
    };
  }, [activeOpen]);

  const handleCopyEmail = useCallback(() => {
    void navigator.clipboard.writeText(site.email).catch(() => undefined);
    setCopied(true);
    window.setTimeout(() => {
      setCopied(false);
      handleClose();
    }, 700);
  }, [handleClose]);

  const items = useMemo<PaletteItem[]>(() => [
    {
      id: "nav-home",
      category: "pages",
      title: "Home",
      icon: <Compass size={17} />,
      action: () => {
        navigateWithTransition("/");
        handleClose();
      },
    },
    {
      id: "nav-photos",
      category: "pages",
      title: "Photos",
      subtitle: "Photo gallery",
      icon: <Image size={17} />,
      action: () => {
        navigateWithTransition("/photos");
        handleClose();
      },
    },
    {
      id: "nav-projects",
      category: "sections",
      title: "Projects",
      icon: <Globe size={17} />,
      action: () => {
        navigateWithTransition("/projects");
        handleClose();
      },
    },
    {
      id: "nav-experience",
      category: "sections",
      title: "Experience",
      icon: <Terminal size={17} />,
      action: () => {
        navigateWithTransition("/experience");
        handleClose();
      },
    },
    {
      id: "nav-contact",
      category: "sections",
      title: "Contact",
      icon: <Mail size={17} />,
      action: () => {
        navigateWithTransition("/contact");
        handleClose();
      },
    },
    {
      id: "nav-writing",
      category: "sections",
      title: "Writing",
      icon: <BookOpen size={17} />,
      action: () => {
        navigateWithTransition("/writing");
        handleClose();
      },
    },
    ...site.projects.map((project) => ({
      id: `project-${project.title.toLowerCase()}`,
      category: "projects" as const,
      title: project.title,
      subtitle: project.blurb,
      icon: <Globe size={17} />,
      action: () => {
        navigateWithTransition(`/projects?search=${encodeURIComponent(project.title)}`);
        handleClose();
      },
    })),
    {
      id: "action-theme",
      category: "actions",
      title: theme === "dark" ? "Switch to light theme" : "Switch to dark theme",
      icon: theme === "dark" ? <Sun size={17} /> : <Moon size={17} />,
      action: () => {
        toggleTheme();
        handleClose();
      },
    },
    {
      id: "action-copy-email",
      category: "actions",
      title: copied ? "Email copied" : "Copy email address",
      subtitle: site.email,
      icon: copied ? <Check size={17} /> : <Copy size={17} />,
      action: handleCopyEmail,
    },
    ...(showStudio
      ? [
          {
            id: "nav-studio",
            category: "actions" as const,
            title: "Open the studio",
            subtitle: "Upload photos & write posts",
            icon: <Pencil size={17} />,
            action: () => {
              navigateWithTransition("/studio");
              handleClose();
            },
          },
        ]
      : []),
  ], [copied, handleClose, handleCopyEmail, navigateWithTransition, showStudio, theme, toggleTheme]);

  const filteredItems = useMemo(() => {
    const term = query.toLowerCase().trim();
    if (!term) return items;
    return items.filter((item) =>
      item.title.toLowerCase().includes(term) ||
      item.subtitle?.toLowerCase().includes(term) ||
      item.category.toLowerCase().includes(term),
    );
  }, [items, query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!activeOpen) return;

      if (event.key === "Escape") {
        event.preventDefault();
        handleClose();
        return;
      }

      if (filteredItems.length === 0) return;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((previous) => (previous + 1) % filteredItems.length);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((previous) => (previous - 1 + filteredItems.length) % filteredItems.length);
      } else if (event.key === "Enter") {
        event.preventDefault();
        filteredItems[selectedIndex]?.action();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeOpen, filteredItems, handleClose, selectedIndex]);

  useEffect(() => {
    const activeElement = listRef.current?.querySelector("[data-active='true']");
    activeElement?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const groupedItems = filteredItems.reduce<Partial<Record<PaletteCategory, PaletteItem[]>>>((groups, item) => {
    groups[item.category] ??= [];
    groups[item.category]?.push(item);
    return groups;
  }, {});

  return (
    <AnimatePresence>
      {activeOpen && (
        <div className="lv-palette-root">
          <motion.div
            className="lv-palette-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            aria-hidden="true"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="lv-palette"
            initial={{ opacity: 0, scale: 0.98, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -6 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="lv-palette-search">
              <div className="lv-palette-field">
                <Search aria-hidden="true" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setSelectedIndex(0);
                  }}
                  placeholder="Search pages, projects, actions..."
                  aria-label="Search pages, projects, actions"
                />
              </div>
              <button type="button" onClick={handleClose} aria-label="Close command palette" className="lv-palette-close">
                <X aria-hidden="true" />
              </button>
            </div>

            <div ref={listRef} className="lv-palette-list">
              {filteredItems.length === 0 ? (
                <div className="lv-palette-empty">No results for &quot;{query}&quot;</div>
              ) : (
                Object.entries(groupedItems).map(([category, categoryItems]) => (
                  <section key={category} className="lv-palette-group">
                    <h4>{CATEGORY_LABELS[category as PaletteCategory]}</h4>
                    <div className="lv-palette-items">
                      {categoryItems?.map((item) => {
                        const itemIndex = filteredItems.indexOf(item);
                        const isActive = itemIndex === selectedIndex;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            data-active={isActive}
                            onClick={item.action}
                            onMouseEnter={() => setSelectedIndex(itemIndex)}
                            className="lv-palette-item"
                          >
                            <span className="lv-palette-item-icon">{item.icon}</span>
                            <span className="lv-palette-item-copy">
                              <strong>{item.title}</strong>
                              {item.subtitle && (category === "projects" || category === "actions") && (
                                <small>{item.subtitle}</small>
                              )}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))
              )}
            </div>

            <footer className="lv-palette-footer">
              <div>
                <span><kbd>↕</kbd> navigate</span>
                <span><kbd>↵</kbd> select</span>
                <span><kbd>esc</kbd> close</span>
              </div>
              <kbd>Ctrl K</kbd>
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
