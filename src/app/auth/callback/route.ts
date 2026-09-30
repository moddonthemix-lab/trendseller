import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/** Magic-link landing: exchange the code for a session, enforce the single-owner allowlist. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/";
  const db = await createSupabaseServerClient();
  if (!db || !code) return NextResponse.redirect(new URL("/login?error=1", url.origin));

  const { data, error } = await db.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL("/login?error=1", url.origin));

  const allowed = (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length && !allowed.includes(data.user.email?.toLowerCase() ?? "")) {
    await db.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=forbidden", url.origin));
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
