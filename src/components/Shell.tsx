"use client";

import { Brain, Menu, Search } from "lucide-react";
import { ChatThread } from "@/components/ChatThread";
import { CommandPalette } from "@/components/CommandPalette";
import { Composer } from "@/components/Composer";
import { ConnectionsView } from "@/components/ConnectionsView";
import { ContextPanel } from "@/components/ContextPanel";
import {
  EmailView,
  MeetingView,
  ResearchView,
} from "@/components/IntegrationsView";
import { LibraryView } from "@/components/LibraryView";
import { MemoryView } from "@/components/MemoryView";
import { NotesView } from "@/components/NotesView";
import { SearchView } from "@/components/SearchView";
import { SettingsView } from "@/components/SettingsView";
import { Sidebar } from "@/components/Sidebar";
import { SpaceBackground } from "@/components/SpaceBackground";
import { useRecall } from "@/lib/store";

export function Shell() {
  const view = useRecall((s) => s.view);
  const profile = useRecall((s) => s.profile);
  const toggleMobileNav = useRecall((s) => s.toggleMobileNav);
  const setCommandOpen = useRecall((s) => s.setCommandOpen);
  const setView = useRecall((s) => s.setView);

  return (
    <div className="relative h-screen w-full overflow-hidden" suppressHydrationWarning>
      <SpaceBackground />

      {/* full-bleed: no outer padding, no max-width, no rounded frame */}
      <div className="relative z-10 flex h-screen w-full flex-col md:flex-row">
        {/* Mobile top bar */}
        <div className="flex h-12 w-full shrink-0 items-center justify-between border-b border-white/[0.06] bg-black/40 px-4 backdrop-blur-xl md:hidden">
          <button
            onClick={toggleMobileNav}
            aria-label="Toggle navigation menu"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-ink transition hover:border-white/20 hover:bg-white/[0.08]"
          >
            <Menu className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-white text-black shadow-sm">
              <Brain className="h-3.5 w-3.5" />
            </div>
            <span className="text-[14px] font-semibold tracking-[-0.01em]">
              Recall
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCommandOpen(true)}
              aria-label="Open search"
              className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-faint transition hover:border-white/20 hover:text-ink"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setView("settings")}
              aria-label="Open settings"
              className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-white/25 to-white/10 text-[10px] font-semibold text-ink transition hover:ring-2 hover:ring-white/20"
            >
              {profile.initials}
            </button>
          </div>
        </div>

        <Sidebar />

        <div className="relative flex min-h-0 min-w-0 flex-1">
          {view === "chats" && (
            <>
              <ContextPanel />
              <main className="relative flex min-w-0 flex-1 flex-col bg-black/28">
                <ChatThread />
                <Composer />
              </main>
            </>
          )}

          {view === "library" && (
            <main className="relative flex min-w-0 flex-1 flex-col bg-black/28">
              <LibraryView />
            </main>
          )}

          {view === "search" && (
            <main className="relative flex min-w-0 flex-1 flex-col bg-black/28">
              <SearchView />
            </main>
          )}

          {view === "connections" && (
            <main className="relative flex min-w-0 flex-1 flex-col bg-black/28">
              <ConnectionsView />
            </main>
          )}

          {view === "notes" && (
            <main className="relative flex min-w-0 flex-1 flex-col bg-black/28">
              <NotesView />
            </main>
          )}

          {view === "memory" && (
            <main className="relative flex min-w-0 flex-1 flex-col bg-black/28">
              <MemoryView />
            </main>
          )}

          {view === "settings" && (
            <main className="relative flex min-w-0 flex-1 flex-col bg-black/28">
              <SettingsView />
            </main>
          )}

          {view === "email" && (
            <main className="relative flex min-w-0 flex-1 flex-col bg-black/28">
              <EmailView />
            </main>
          )}

          {view === "research" && (
            <main className="relative flex min-w-0 flex-1 flex-col bg-black/28">
              <ResearchView />
            </main>
          )}

          {view === "meeting" && (
            <main className="relative flex min-w-0 flex-1 flex-col bg-black/28">
              <MeetingView />
            </main>
          )}
        </div>
      </div>

      <CommandPalette />
    </div>
  );
}
