"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ *
 *  Dialog
 * ------------------------------------------------------------------ */

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = "max-w-[460px]",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // move focus into the dialog so keyboard users land inside it
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={cn(
          "animate-rise relative w-full rounded-2xl border border-white/12 bg-[#0b0b0f]/95 p-5 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.95)] backdrop-blur-2xl focus:outline-none",
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold tracking-[-0.01em]">
              {title}
            </h2>
            {description && (
              <p className="mt-1 text-[12px] leading-relaxed text-muted">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-faint transition hover:bg-white/10 hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {children && <div className="mt-4">{children}</div>}
        {footer && <div className="mt-5 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Buttons
 * ------------------------------------------------------------------ */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  children,
  onClick,
  variant = "secondary",
  size = "md",
  disabled,
  className,
  type = "button",
  title,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  title?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-40";
  const sizes = {
    sm: "px-2.5 py-1 text-[11.5px]",
    md: "px-3 py-1.5 text-[12px]",
  };
  const variants: Record<ButtonVariant, string> = {
    primary: "bg-white text-black hover:bg-white/85",
    secondary:
      "border border-white/10 bg-white/[0.04] text-ink/90 hover:border-white/25 hover:bg-white/[0.09]",
    ghost: "text-muted hover:bg-white/[0.07] hover:text-ink",
    danger:
      "border border-white/10 bg-white/[0.04] text-ink/90 hover:border-red-400/40 hover:text-red-300",
  };

  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(base, sizes[size], variants[variant], className)}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 *  Dropdown (native select, styled)
 * ------------------------------------------------------------------ */

export function Dropdown<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn("relative inline-flex", className)}>
      {label && <span className="sr-only">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        aria-label={label}
        className="appearance-none rounded-lg border border-white/10 bg-white/[0.04] py-1.5 pl-2.5 pr-7 text-[11.5px] text-ink/90 transition hover:border-white/25 focus:border-white/30 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0b0b0f]">
            {o.label}
          </option>
        ))}
      </select>
      <svg
        viewBox="0 0 10 10"
        className="pointer-events-none absolute right-2 top-1/2 h-2.5 w-2.5 -translate-y-1/2 text-faint"
      >
        <path
          d="M2 4l3 3 3-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
    </label>
  );
}

/* ------------------------------------------------------------------ *
 *  Segmented control
 * ------------------------------------------------------------------ */

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-0.5",
        className,
      )}
    >
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11.5px] font-medium transition",
            value === o.value
              ? "bg-white/[0.12] text-ink"
              : "text-faint hover:text-muted",
          )}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  States
 * ------------------------------------------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      {icon && <div className="text-faint">{icon}</div>}
      <p className="text-[13px] font-medium text-ink/85">{title}</p>
      {description && (
        <p className="max-w-[360px] text-[12px] leading-relaxed text-faint">
          {description}
        </p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2.5 py-16">
      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-white/60" />
      <p className="text-[12px] text-faint">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-white/[0.05] text-[15px] text-muted">
        !
      </div>
      <p className="text-[13px] font-medium text-ink/85">{title}</p>
      {description && (
        <p className="max-w-[360px] text-[12px] leading-relaxed text-faint">
          {description}
        </p>
      )}
      {onRetry && (
        <Button size="sm" className="mt-2" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 *  Page header + breadcrumbs
 * ------------------------------------------------------------------ */

export function Breadcrumbs({ items }: { items: string[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
      {items.map((item, i) => (
        <span key={item} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-faint/50">/</span>}
          <span
            className={cn(
              "text-[10.5px] uppercase tracking-[0.08em]",
              i === items.length - 1 ? "text-muted" : "text-faint",
            )}
          >
            {item}
          </span>
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
}: {
  title: string;
  description?: string;
  breadcrumbs?: string[];
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 px-7 pb-4 pt-6">
      <div className="min-w-0">
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1 className="mt-1 text-[19px] font-semibold tracking-[-0.015em]">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 max-w-[640px] text-[12px] leading-relaxed text-faint">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

/* ------------------------------------------------------------------ *
 *  Small shared bits
 * ------------------------------------------------------------------ */

export function SectionCard({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-white/[0.07] bg-black/35 p-4 backdrop-blur-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[12.5px] font-semibold text-ink/90">{title}</h2>
          {description && (
            <p className="mt-0.5 text-[11.5px] leading-relaxed text-faint">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="shrink-0">{actions}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 shrink-0 rounded-full transition",
        checked ? "bg-white" : "bg-white/15",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full transition-all",
          checked ? "left-[18px] bg-black" : "left-0.5 bg-white/70",
        )}
      />
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "muted" | "outline";
}) {
  const tones = {
    neutral: "bg-white/[0.09] text-muted",
    muted: "bg-white/[0.05] text-faint",
    outline: "border border-white/12 text-faint",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-px text-[9.5px] font-medium uppercase tracking-wide",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
