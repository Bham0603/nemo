import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "./env";

/**
 * Updates the user session and enforces route protection.
 * Follows the official Supabase SSR pattern with Next.js 16 proxy convention.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  // If Supabase environment variables are not yet configured,
  // allow the application to render in local demo mode so builds succeed.
  if (!isSupabaseConfigured()) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Avoid using getSession() here as it can be spoofed.
  // getUser() sends a request to the Supabase Auth server to revalidate the token.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isAuthRoute = pathname.startsWith("/auth");
  const isAuthCallback = pathname.startsWith("/auth/callback");
  const isPasswordResetPage = pathname.startsWith("/auth/reset-password");
  const isApiRoute = pathname.startsWith("/api");

  // Allow auth callback to complete PKCE exchange without redirect
  if (isAuthCallback) {
    return supabaseResponse;
  }

  // API routes must NEVER return HTML redirects.
  // Return a clean JSON 401 error if unauthenticated.
  if (isApiRoute) {
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in to access this resource." },
        { status: 401 }
      );
    }
    return supabaseResponse;
  }

  // Unauthenticated user trying to access protected workspace routes
  if (!user && !isAuthRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/login";
    return NextResponse.redirect(redirectUrl);
  }

  // Authenticated user trying to access public auth pages (login, signup, forgot-password)
  // Note: Allow access to /auth/reset-password so recovery flow can finish
  if (user && isAuthRoute && !isPasswordResetPage) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

