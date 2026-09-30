import { hasBearer } from "@/lib/auth";
import { homeLocation, loadMarketFromSupabase } from "@/lib/data/repository";
import { sampleMarket } from "@/lib/data/sample";
import { dealToAlert, detectDeals } from "@/lib/scoring/deals";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 120;

/**
 * AI Deal Detector job. The Railway cron service (scripts/daily-cron.mjs) calls this
 * with `Authorization: Bearer $CRON_SECRET`.
 * New deals are stored in `alerts` (for ALERT_USER_ID) and pushed to DEAL_WEBHOOK_URL.
 */
export async function GET(req: Request) {
  if (!hasBearer(req, process.env.CRON_SECRET)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const home = homeLocation();
  const db = createSupabaseAdminClient();
  const market = (db && (await loadMarketFromSupabase(db).catch(() => null))) || sampleMarket(new Date(), home);
  const deals = detectDeals(market.localListings, market.products, { home, maxDistance: 60 });
  let alerts = deals.map((d) => dealToAlert(d));

  const userId = process.env.ALERT_USER_ID;
  if (db && userId && alerts.length) {
    const { data: existing } = await db.from("alerts").select("id").eq("user_id", userId).in("id", alerts.map((a) => a.id));
    const seen = new Set((existing ?? []).map((r: { id: string }) => r.id));
    alerts = alerts.filter((a) => !seen.has(a.id));
    if (alerts.length) {
      const { error } = await db.from("alerts").insert(
        alerts.map((a) => ({ id: a.id, user_id: userId, kind: a.kind, title: a.title, detail: a.detail, product_id: a.productId ?? null, listing_id: a.listingId ?? null, created_at: a.createdAt })),
      );
      if (error) console.error("alert insert failed", error);
    }
  }

  const webhook = process.env.DEAL_WEBHOOK_URL;
  let notified = 0;
  if (webhook && alerts.length) {
    const text = alerts
      .slice(0, 10)
      .map((a) => `🔥 ${a.title}\n${a.detail}`)
      .join("\n\n");
    // `content` = Discord, `text` = Slack; ntfy.sh accepts a plain-text body.
    const isNtfy = /ntfy/.test(webhook);
    const res = await fetch(webhook, {
      method: "POST",
      headers: isNtfy ? { Title: `${alerts.length} new sourcing deal(s)`, Tags: "moneybag" } : { "Content-Type": "application/json" },
      body: isNtfy ? text : JSON.stringify({ text, content: text.slice(0, 1900) }),
    }).catch((e) => (console.error("webhook failed", e), null));
    if (res?.ok) notified = Math.min(10, alerts.length);
  }

  return Response.json({ ok: true, deals: deals.length, newAlerts: alerts.length, notified });
}
