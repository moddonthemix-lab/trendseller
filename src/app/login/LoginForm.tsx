"use client";
import { useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const db = getSupabaseBrowserClient();

  if (!db) return <p className="text-sm text-muted">Supabase isn&apos;t configured, so the app is running in open local mode — no sign-in needed.</p>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await db!.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
    });
    if (error) {
      setState("error");
      setMessage(error.message);
    } else setState("sent");
  }

  if (state === "sent") return <p className="text-sm">Check {email} for a sign-in link.</p>;
  return (
    <form onSubmit={submit} className="space-y-3">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full rounded-xl border border-line bg-panel-2 px-3 py-3" />
      <button disabled={state === "sending"} className="w-full rounded-xl bg-accent py-3 font-semibold text-accent-ink disabled:opacity-50">
        {state === "sending" ? "Sending…" : "Email me a sign-in link"}
      </button>
      {state === "error" && <p className="text-sm text-bad">{message}</p>}
    </form>
  );
}
