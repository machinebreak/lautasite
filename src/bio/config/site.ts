export type Project = {
  title: string;
  blurb: string;
  story?: string;
  stack: string[];
  year: string;
  links: { live?: string; source?: string };
  featured?: boolean;
  status?: string;
  image?: string;
  categories?: ("Frontend" | "Backend" | "Fullstack")[];
};

export type Job = {
  company: string;
  role: string;
  period: string;
  blurb: string;
  url?: string;
  logo?: string;
};

export type Post = {
  title: string;
  summary: string;
  date: string;
  url: string;
  readingTime?: string;
};

// ⚠️ DATOS PLACEHOLDER — reemplazar con tu info real (buscá "TODO:")
export const site = {
  name: "Lautaro Bertucci",
  firstName: "Lautaro",
  url: "https://lauta.site",
  quote: {
    text: "Simplicity is prerequisite for reliability.",
    author: "Edsger W. Dijkstra",
  },
  profileImages: ["/machinebreak-avatar.png", "/profile-ndzq.jpg"],
  bannerImage: "/banner-images-6.jpg",
  socialBannerImage: "/banner-images-6.jpg",
  initials: "LB",
  role: "Full Stack Developer",
  location: "Argentina",
  timezone: "America/Argentina/Buenos_Aires",
  email: "lautarobertuci7@gmail.com",
  greeting: "Hey, I'm Lautaro",
  tagline: "I build web products where design, functionality, and even the smallest details matter.",
  about: [
    "I build complete web products — from the idea and design to the backend and deploy. 17, based in Argentina.",
    "I founded HardSeek, a hardware price metasearch engine, and built Futbolito and BeetBench.",
    "Learning something new every day, obsessed with details and clean code.",
  ],
  tldr: [
    "Building products.",
    "Learning technologies.",
    "Shipping constantly.",
    "Clean code always.",
  ],
  status: {
    available: true,
    availableText: "available for projects",
    nowLearning: "TODO: what are you learning",
    nowListening: "TODO: what are you listening to",
  },
  socials: {
    github: "https://github.com/machinebreak",
    twitter: "https://x.com/lautarobertucci",
    linkedin: "https://linkedin.com",
    email: "mailto:lautarobertuci7@gmail.com",
    resume: "",
    discord: "",
    medium: "",
  },
  experience: [
    {
      company: "HardSeek",
      role: "Founder",
      period: "2025 — Present",
      blurb:
        "Hardware price metasearch engine: compare components across stores from one place.",
      url: "https://hardseek.net",
    },
    {
      company: "Independent projects",
      role: "Full Stack Developer",
      period: "2024 — Present",
      blurb:
        "Design, develop and launch my own web products: HardSeek (hardware metasearch), Futbolito (football minigames) and BeetBench (game benchmarks).",
      url: "",
    },
  ] as Job[],
  building: [
    {
      company: "HardSeek",
      role: "Founder",
      period: "2025 — Present",
      blurb:
        "Hardware price metasearch engine: compare components across stores from one place.",
      url: "https://hardseek.net",
      logo: "/logos/hardseek-icon-white.png?v=2",
    },
    {
      company: "BeetBench",
      role: "Founder",
      period: "2025 — Present",
      blurb: "Benchmarks for games and FPS tracking.",
      url: "https://beetbench.com",
      logo: "/logos/beetbench-icon-white.png?v=2",
    },
  ] as Job[],
  projects: [
    {
      title: "QuasarTerm",
      blurb:
        "A modern, agent-aware terminal — AI CLI account manager, quota tracking and Mission Control for Codex, Claude and more.",
      stack: ["Electron", "React", "TypeScript", "Go"],
      year: "2026",
      links: {
        source: "https://github.com/machinebreak/quasarterm",
      },
      featured: true,
      categories: ["Fullstack"],
    },
  ] as Project[],
  skills: [
    // TODO: ajustá a tu stack real
    "TypeScript",
    "JavaScript",
    "React",
    "Node.js",
    "Three.js",
    "Vite",
    "Tailwind CSS",
    "REST APIs",
    "Git",
    "GitHub",
    "Vercel",
  ],
  writing: [] as Post[],
  github: {
    username: "machinebreak",
    contributionsLastYear: "500+",
  },
  footerNote: "Made with ❤️ in Argentina",
} as const;

export type Site = typeof site;
