import type { Source, SourceKind } from "./types";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export const kindLabel: Record<SourceKind, string> = {
  pdf: "PDF",
  docx: "DOCX",
  txt: "TXT",
  markdown: "MD",
  link: "LINK",
  note: "NOTE",
};

export const kindTint: Record<SourceKind, string> = {
  pdf: "from-white/[0.25] to-white/[0.08]",
  docx: "from-white/[0.20] to-white/[0.06]",
  txt: "from-white/[0.22] to-white/[0.07]",
  markdown: "from-white/[0.18] to-white/[0.05]",
  link: "from-white/[0.24] to-white/[0.08]",
  note: "from-white/[0.16] to-white/[0.05]",
};

export function sourceById(sources: Source[], id: string) {
  return sources.find((s) => s.id === id);
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatLongDate(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/** Renders **bold** segments from a plain string. */
export function parseBold(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((seg, i) => {
    if (seg.startsWith("**") && seg.endsWith("**")) {
      return { bold: true, text: seg.slice(2, -2), key: i };
    }
    return { bold: false, text: seg, key: i };
  });
}