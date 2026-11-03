"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { useRecall } from "@/lib/store";
import type { Database } from "@/lib/supabase/database.types";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  signOut: () => Promise<void>;
  updateProfileData: (patch: {
    displayName?: string;
    role?: string;
    avatarUrl?: string;
  }) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isConfigured: false,
  signOut: async () => {},
  updateProfileData: async () => ({ error: null }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const configured = isSupabaseConfigured();

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(configured);

  const updateProfile = useRecall((s) => s.updateProfile);
  const profile = useRecall((s) => s.profile);

  // Synchronize Supabase user and profile to local application state
  useEffect(() => {
    if (!configured) {
      return;
    }

    let isMounted = true;

    async function loadUserSession() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          const authUser = currentSession.user;

          // Attempt to retrieve profile from public.profiles table
          const { data: dbProfile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();

          if (!isMounted) return;

          if (dbProfile) {
            const initials = dbProfile.display_name
              ? dbProfile.display_name
                  .split(" ")
                  .map((p: string) => p[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase()
              : "ME";

            updateProfile({
              displayName: dbProfile.display_name,
              email: dbProfile.email,
              role: dbProfile.role || "Researcher",
              initials: initials || "ME",
            });
          } else {
            // Profile row not found yet; fallback to user metadata
            const name =
              (authUser.user_metadata?.display_name as string) ||
              authUser.email?.split("@")[0] ||
              "Researcher";

            const initials = name
              .split(" ")
              .map((p) => p[0])
              .filter(Boolean)
              .slice(0, 2)
              .join("")
              .toUpperCase();

            updateProfile({
              displayName: name,
              email: authUser.email || profile.email,
              role: "Researcher",
              initials: initials || "ME",
            });
          }
        }
      } catch (err) {
        console.error("[RECALL] Error loading auth session:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUserSession();

    // Subscribe to auth state updates
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      if (newSession?.user) {
        const authUser = newSession.user;
        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (dbProfile) {
          const initials = dbProfile.display_name
            .split(" ")
            .map((p: string) => p[0])
            .filter(Boolean)
            .slice(0, 2)
            .join("")
            .toUpperCase();

          updateProfile({
            displayName: dbProfile.display_name,
            email: dbProfile.email,
            role: dbProfile.role || "Researcher",
            initials: initials || "ME",
          });
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [configured, supabase, updateProfile, profile.email]);

  const signOut = async () => {
    if (!configured) {
      router.push("/auth/login");
      return;
    }
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    router.push("/auth/login");
    router.refresh();
  };

  const updateProfileData = async (patch: {
    displayName?: string;
    role?: string;
    avatarUrl?: string;
  }) => {
    if (!user || !configured) {
      if (patch.displayName || patch.role) {
        updateProfile({
          ...(patch.displayName && { displayName: patch.displayName }),
          ...(patch.role && { role: patch.role }),
        });
      }
      return { error: null };
    }

    try {
      const updates: Database["public"]["Tables"]["profiles"]["Update"] = {};
      if (patch.displayName !== undefined) updates.display_name = patch.displayName;
      if (patch.role !== undefined) updates.role = patch.role;
      if (patch.avatarUrl !== undefined) updates.avatar_url = patch.avatarUrl;

      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

      if (error) throw error;

      if (patch.displayName || patch.role) {
        updateProfile({
          ...(patch.displayName && { displayName: patch.displayName }),
          ...(patch.role && { role: patch.role }),
        });
      }

      return { error: null };
    } catch (err: unknown) {
      const error =
        err instanceof Error ? err : new Error("Failed to update profile");
      return { error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: configured,
        signOut,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
