import "server-only";

/** Identifies us to public APIs (Discogs and Scryfall require a User-Agent). */
export const USER_AGENT = "ResellerEdge/0.1 (+https://github.com/moddonthemix-lab/trendseller)";

export class SourceError extends Error {
  constructor(
    public source: string,
    public status: number,
    message: string,
  ) {
    super(`${source}: ${message}`);
  }
}

const cache = new Map<string, { at: number; value: unknown }>();
const MAX_CACHE = 500;

/**
 * GET JSON with a timeout and an in-memory cache. The free tiers here are rate limited
 * (UPCitemdb: 100/day, Discogs: 25/min), so repeat lookups within `ttlMs` are served locally.
 */
export async function getJson<T>(source: string, url: string, opts: { ttlMs?: number; headers?: Record<string, string>; timeoutMs?: number } = {}): Promise<T> {
  const ttl = opts.ttlMs ?? 6 * 3_600_000;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < ttl) return hit.value as T;

  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...opts.headers },
    signal: AbortSignal.timeout(opts.timeoutMs ?? 10_000),
    cache: "no-store",
  });
  if (res.status === 404) throw new SourceError(source, 404, "not found");
  if (res.status === 429) throw new SourceError(source, 429, "rate limited");
  if (!res.ok) throw new SourceError(source, res.status, `HTTP ${res.status}`);
  const value = (await res.json()) as T;

  if (cache.size >= MAX_CACHE) cache.delete(cache.keys().next().value!);
  cache.set(url, { at: Date.now(), value });
  return value;
}

/** Runs a lookup and turns any failure into `null` plus a note, so one source never breaks a page. */
export async function settle<T>(fn: () => Promise<T>): Promise<{ value: T | null; error?: string }> {
  try {
    return { value: await fn() };
  } catch (err) {
    return { value: null, error: err instanceof Error ? err.message : String(err) };
  }
}
