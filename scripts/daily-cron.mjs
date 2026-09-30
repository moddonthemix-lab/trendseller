// Railway cron service: runs the daily jobs on the web app, then exits.
//   1. /api/cron/collect — pull today's numbers from the free data sources
//   2. /api/cron/deals   — detect deals and send notifications
// Needs APP_URL (e.g. https://reseller-edge.up.railway.app) and CRON_SECRET.
const appUrl = process.env.APP_URL;
const secret = process.env.CRON_SECRET;
if (!appUrl || !secret) {
  console.error("APP_URL and CRON_SECRET must be set");
  process.exit(1);
}

let failed = false;
for (const path of ["/api/cron/collect", "/api/cron/deals"]) {
  try {
    const res = await fetch(new URL(path, appUrl), {
      headers: { Authorization: `Bearer ${secret}` },
      signal: AbortSignal.timeout(300_000),
    });
    const body = await res.text();
    console.log(path, res.status, body.slice(0, 2000));
    if (!res.ok) failed = true;
  } catch (err) {
    console.error(path, "failed:", err);
    failed = true;
  }
}
process.exit(failed ? 1 : 0);
