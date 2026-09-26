import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type SiteDesign = "modern" | "retro2000";

type DesignContextValue = {
  design: SiteDesign;
  setDesign: (design: SiteDesign) => void;
};

const defaultDesignContext: DesignContextValue = {
  design: "modern",
  setDesign: () => undefined,
};
const DesignContext = createContext<DesignContextValue>(defaultDesignContext);
const STORAGE_KEY = "lauta-site-design";

function initialDesign(): SiteDesign {
  if (typeof window === "undefined") return "modern";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "retro2000" || stored === "modern" ? stored : "modern";
}

export function DesignProvider({ children }: { children: ReactNode }) {
  const [design, setDesignState] = useState<SiteDesign>(initialDesign);

  useEffect(() => {
    document.documentElement.dataset.design = design;
    window.localStorage.setItem(STORAGE_KEY, design);
  }, [design]);

  const value = useMemo(
    () => ({
      design,
      setDesign: (next: SiteDesign) => setDesignState(next),
    }),
    [design],
  );

  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export function useDesign() {
  return useContext(DesignContext);
}
