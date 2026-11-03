import { SpaceBackground } from "@/components/SpaceBackground";
import { Brain } from "lucide-react";
import Link from "next/link";
import React from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-center p-4"
      suppressHydrationWarning
    >
      <SpaceBackground />

      <div className="relative z-10 w-full max-w-[440px]">
        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-center text-center">
          <Link
            href="/"
            className="group mb-3 flex items-center gap-2.5 transition hover:opacity-90"
          >
            <div className="relative grid h-10 w-10 place-items-center rounded-[12px] bg-gradient-to-br from-white via-white/80 to-white/40 shadow-[0_0_28px_-4px_rgba(255,255,255,0.4)]">
              <span className="absolute inset-0 -z-10 animate-halo rounded-[12px] bg-white/20 blur-lg" />
              <Brain className="h-5 w-5 text-black" strokeWidth={2.2} />
            </div>
            <span className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
              Recall
            </span>
          </Link>
          <p className="text-[12.5px] text-faint">
            Your personal AI second brain
          </p>
        </div>

        {/* Card Container */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d14]/90 p-6 shadow-2xl shadow-black/80 backdrop-blur-2xl sm:p-7">
          {children}
        </div>

        {/* Footer info */}
        <p className="mt-5 text-center text-[11px] text-faint/80">
          Protected by Supabase Authentication & Row Level Security.
        </p>
      </div>
    </div>
  );
}

