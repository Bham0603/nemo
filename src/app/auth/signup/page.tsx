"use client";

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || !trimmedEmail || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: {
            display_name: trimmedName,
            role: "Researcher",
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // If email confirmation is required, Supabase returns user with unconfirmed session
      if (data?.user && !data.session) {
        setSuccessMessage(
          "Account created! Please check your email inbox to confirm your address before logging in."
        );
        setLoading(false);
        return;
      }

      // If session exists immediately (e.g. auto-confirm enabled in Supabase)
      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-[18px] font-semibold tracking-[-0.015em] text-ink">
          Create your account
        </h1>
        <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
          Start collecting, connecting, and recalling knowledge.
        </p>
      </div>

      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-[12px] text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-[12px] text-emerald-200">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            <div className="space-y-1">
              <p className="font-medium text-emerald-300">Check your email</p>
              <p className="leading-relaxed text-emerald-200/90">
                {successMessage}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-1.5 font-medium text-emerald-300 underline underline-offset-4 hover:text-white"
            >
              Return to login <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      )}

      {!successMessage && (
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-muted">
              Display name
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition focus-within:border-white/25">
              <User className="h-4 w-4 text-faint" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Alex Chen"
                className="w-full bg-transparent text-[13px] text-ink placeholder:text-faint focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-muted">
              Email address
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition focus-within:border-white/25">
              <Mail className="h-4 w-4 text-faint" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@recall.app"
                className="w-full bg-transparent text-[13px] text-ink placeholder:text-faint focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-muted">
              Password
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition focus-within:border-white/25">
              <Lock className="h-4 w-4 text-faint" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full bg-transparent text-[13px] text-ink placeholder:text-faint focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="text-faint transition hover:text-ink"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11.5px] font-medium text-muted">
              Confirm password
            </label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 transition focus-within:border-white/25">
              <Lock className="h-4 w-4 text-faint" />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="w-full bg-transparent text-[13px] text-ink placeholder:text-faint focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-white py-2.5 text-[13px] font-semibold text-black shadow-[0_0_24px_-4px_rgba(255,255,255,0.4)] transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black border-t-transparent" />
                Creating account…
              </>
            ) : (
              <>
                Create account <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>
      )}

      <div className="mt-5 border-t border-white/[0.06] pt-4 text-center">
        <p className="text-[12px] text-faint">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="font-medium text-ink underline underline-offset-4 transition hover:text-white"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

