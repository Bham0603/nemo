"use client";

import {
  Brain,
  ChevronRight,
  Command,
  Library,
  Link2,
  LogOut,
  Mail,
  MessageSquare,
  NotebookPen,
  Search,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useRecall } from "@/lib/store";
import { useAuth } from "@/components/AuthProvider";
import type { ViewId } from "@/lib/types";

const nav: { id: ViewId; label: string; icon: typeof MessageSquare }[] = [
  { id: "chats", label: "Chats", icon: MessageSquare },
  { id: "library", label: "Library", icon: Library },
  { id: "search", label: "Semantic search", icon: Search },
  { id: "connections", label: "Connections", icon: Link2 },
  { id: "notes", label: "Daily notes", icon: NotebookPen },
  { id: "memory", label: "AI memory", icon: Brain },
  { id: "settings", label: "Settings", icon: Settings },
];

const integrations: { id: ViewId; label: string; icon: typeof Mail }[] = [
  { id: "email", label: "Email", icon: Mail },
  { id: "research", label: "Smart research", icon: Sparkles },
  { id: "meeting", label: "Meeting prep", icon: Users },
];

export function Sidebar() {
  const router = useRouter();
  const view = useRecall((s) => s.view);
  const setView = useRecall((s) => s.setView);
  const setCommandOpen = useRecall((s) => s.setCommandOpen);
  const profile = useRecall((s) => s.profile);
  const mobileNavOpen = useRecall((s) => s.mobileNavOpen);
  const setMobileNavOpen = useRecall((s) => s.setMobileNavOpen);
  const { user, signOut } = useAuth();

  const handleNav = (id: ViewId) => {
    setView(id);
    setMobileNavOpen(false);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {mobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex flex-col border-r border-white/[0.06] bg-[#090a10]/95 backdrop-blur-2xl transition-transform duration-200 md:bg-black/20",
          "fixed inset-y-0 left-0 z-50 w-[260px] md:relative md:z-auto md:w-[248px] md:shrink-0 md:translate-x-0",
          mobileNavOpen
            ? "translate-x-0 shadow-2xl shadow-black/90"
            : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <div className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-white via-white/80 to-white/40 shadow-[0_0_26px_-6px_rgba(255,255,255,0.35)]">
            <span className="absolute inset-0 -z-10 animate-halo rounded-[10px] bg-white/20 blur-lg" />
            <Brain className="h-[18px] w-[18px] text-black" strokeWidth={2.2} />
          </div>
          <span className="text-[17px] font-semibold tracking-[-0.01em]">
            Recall
          </span>
          <button
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
            className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-faint transition hover:bg-white/10 hover:text-ink md:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Global search */}
        <div className="px-3.5 pb-4">
          <button
            onClick={() => {
              setCommandOpen(true);
              setMobileNavOpen(false);
            }}
            className="glass-soft group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition hover:border-white/12"
          >
            <Search className="h-4 w-4 text-faint" strokeWidth={2} />
            <span className="flex-1 text-[13px] text-faint">Global search</span>
            <kbd className="flex items-center gap-0.5 rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-medium text-muted">
              <Command className="h-2.5 w-2.5" /> K
            </kbd>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3.5 scroll-thin">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition",
                  active
                    ? "border border-white/[0.09] bg-white/[0.07] text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                    : "border border-transparent text-muted hover:bg-white/[0.04] hover:text-ink",
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-r bg-white shadow-[0_0_10px_1px_rgba(255,255,255,0.55)]" />
                )}
                <Icon
                  className={cn(
                    "h-[17px] w-[17px] transition",
                    active ? "text-white" : "text-faint group-hover:text-muted",
                  )}
                  strokeWidth={1.9}
                />
                {item.label}
              </button>
            );
          })}

          <div className="pt-4">
            <p className="px-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.09em] text-faint">
              Integrations
            </p>
            {integrations.map((item) => {
              const Icon = item.icon;
              const active = view === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNav(item.id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] transition",
                    active
                      ? "bg-white/[0.07] text-ink"
                      : "text-muted hover:bg-white/[0.04] hover:text-ink",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-[16px] w-[16px]",
                      active ? "text-white" : "text-faint",
                    )}
                    strokeWidth={1.9}
                  />
                  {item.label}
                  <ChevronRight
                    className={cn(
                      "ml-auto h-3.5 w-3.5 text-faint transition",
                      active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </nav>

        {/* User */}
        <div className="border-t border-white/[0.06] p-3.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleNav("settings")}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1.5 py-1.5 text-left transition hover:bg-white/[0.04]"
            >
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-white/[0.25] to-white/[0.1] text-[12px] font-semibold text-ink">
                {profile.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium leading-tight">
                  {profile.displayName}
                </p>
                <p className="truncate text-[11.5px] text-faint">{profile.role}</p>
              </div>
            </button>
            {user ? (
              <button
                onClick={signOut}
                title="Sign out"
                aria-label="Sign out"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-white/10 hover:text-ink"
              >
                <LogOut className="h-4 w-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  router.push("/auth/login");
                }}
                title="Sign in"
                aria-label="Sign in"
                className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-muted transition hover:bg-white/10 hover:text-ink"
              >
                Login
              </button>
            )}
          </div>
          <button className="glass-soft mt-2 w-full rounded-xl py-2 text-[12.5px] font-medium text-ink/90 transition hover:border-white/25 hover:text-ink">
            Upgrade to pro
          </button>
        </div>
      </aside>
    </>
  );
}
