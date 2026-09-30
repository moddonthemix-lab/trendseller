import { hasBearer } from "@/lib/auth";
import { loadMarketFromSupabase } from "@/lib/data/repository";
import { sampleProducts, todayUtc } from "@/lib/data/sample";
import { hasLiveSources, liveMarketData, quoteToSnapshot } from "@/lib/sources/live";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// Discogs allows 25 requests/minute without a token; space products out to stay under it.
const DELAY_MS = process.env.DISCOGS_TOKEN ? 1_100 : 2_600;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Daily free-source collector. For every product linked to Discogs / TCGdex / Scryfall,
 * fetch today's numbers and store them in `external_snapshots` (one row per product/source/day).
 * Without Supabase it runs as a dry run and just returns what it fetched.
 */
export async function GET(req: Request) {
  if (!hasBearer(req, process.env.CRON_SECRET)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = createSupabaseAdminClient();
  const products = ((db && (await loadMarketFromSupabase(db).catch(() => null))?.products) || sampleProducts()).filter(hasLiveSources);
  const date = todayUtc().toISOString().slice(0, 10);

  const rows: { product_id: string; source: string; date: string; data: Record<string, unknown> }[] = [];
  const errors: string[] = [];
  for (const [i, p] of products.entries()) {
    if (i > 0 && p.refs?.discogsReleaseId) await sleep(DELAY_MS);
    const { quotes, errors: errs } = await liveMarketData(p);
    for (const q of quotes) rows.push({ product_id: p.id, source: q.source, date, data: quoteToSnapshot(q) });
    errors.push(...errs.map((e) => `${p.id}: ${e}`));
  }

  let stored = 0;
  if (db && rows.length) {
    const { error } = await db.from("external_snapshots").upsert(rows);
    if (error) errors.push(`store: ${error.message}`);
    else stored = rows.length;
  }

  return Response.json({ ok: true, date, products: products.length, snapshots: rows.length, stored, dryRun: !db, errors, ...(!db && { rows }) });
}
