export const siteConfig = {
  name: "RECALL",
  shortName: "Recall",
  description: "Your Personal AI Second Brain. Organize knowledge, documents, notes, and links with intelligent AI search and retrieval.",
  tagline: "Your Personal AI Second Brain",
  version: "0.1.0",
  links: {
    github: "https://github.com",
    docs: "/docs",
  },
  layout: {
    sidebarWidth: "260px",
    secondaryColumnWidth: "320px",
    collapsedSidebarWidth: "64px",
  },
} as const;

export type SiteConfig = typeof siteConfig;

