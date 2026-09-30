import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const CLAUDE_MODEL = "claude-opus-5-5";

/**
 * Server-side fallback: if a request is declined by a safety classifier, the API re-runs it
 * on Anthropic's recommended fallback model instead of returning a refusal.
 */
export const FALLBACK_OPTIONS = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
} as const;

export function isClaudeConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

let client: Anthropic | null = null;
export function getClaude(): Anthropic | null {
  if (!isClaudeConfigured()) return null;
  client ??= new Anthropic();
  return client;
}
