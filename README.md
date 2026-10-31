# RECALL — Your Personal AI Second Brain

> A premium AI-powered knowledge management workspace to organize documents, notes, PDFs, and links, enabling intelligent synthesis and question-answering with AI and RAG.

---

## ⚡ Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/) (Strict mode)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (Dark-mode first architecture)
- **Typography:** [Geist](https://vercel.com/font) via `next/font`
- **Icons:** [Lucide React](https://lucide.dev/)
- **Linting & Code Quality:** [ESLint](https://eslint.org/) (Flat config with `eslint-config-next`)
- **Package Manager:** [npm](https://www.npmjs.com/)

---

## 📁 Project Architecture

The codebase follows a modular, scalable architecture structured for a multi-column workspace:

```text
recall/
├── public/
│   └── images/              # Static media assets and brand imagery
├── src/
│   ├── app/                 # Next.js App Router (pages, layouts, globals.css)
│   ├── components/
│   │   ├── ui/              # Reusable atomic UI components (buttons, dialogs, inputs)
│   │   ├── layout/          # Multi-column workspace frame, panels, header, sidebar
│   │   ├── dashboard/       # Overview, recents, knowledge health, activity widgets
│   │   ├── library/         # Documents, notes, link cards, collections, upload views
│   │   └── chat/            # AI assistant dialogue, citations, reasoning streams
│   ├── hooks/               # Custom reusable React hooks
│   ├── lib/                 # Core utilities and helper functions (e.g. cn)
│   ├── types/               # TypeScript domain interfaces and type definitions
│   └── config/              # Application constants, site metadata, theme configs
├── eslint.config.mjs        # ESLint flat configuration
├── next.config.ts           # Next.js build configuration
├── package.json             # Project dependencies and npm scripts
├── tsconfig.json            # Strict TypeScript configuration with `@/*` path aliases
└── README.md
```

---

## 🎨 Visual Identity & Styling System

RECALL is built with a dark-mode-first aesthetic inspired by modern pro-grade knowledge workspaces:

- **Surfaces:** Near-black (`#090A0F`) and charcoal tones with tiered surface elevations (`#0E111A`, `#131722`, `#1E2436`).
- **Accents:** Violet & purple accents (`#8B5CF6`, `#7C3AED`) with glow and subtle tinted backdrops.
- **Borders:** Minimal, hairline borders (`rgba(255, 255, 255, 0.05-0.08)`).
- **Typography:** Geist font family with high-legibility typographic scale.
- **Tokens:** Defined through CSS variables in `src/app/globals.css` and mapped to Tailwind design utilities.

---

## 🚀 Getting Started

### Prerequisites

- **Node.js:** `v20+` (Tested on `v24`)
- **npm:** `v10+`

### Installation

```bash
npm install
```

### Development Server

Run the development server with Turbopack:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the initial foundation.

### Production Build

```bash
npm run build
```

### Type Checking & Linting

```bash
# Run ESLint checks
npm run lint

# Run TypeScript type check
npx tsc --noEmit
```

---

## 🔒 Foundation Phase Rules

During Phase 1 (Foundation Setup):
- Minimal dependencies only.
- Strict architecture separation.
- Ready for future Supabase integration, authentication, vector embeddings, and RAG pipelines in subsequent phases upon explicit approval.
