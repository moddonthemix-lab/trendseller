// Runs as a Railway cron service: calls the web app's deal detector, then exits.
// Needs APP_URL (e.g. https://reseller-edge.up.railway.app) and CRON_SECRET.
const appUrl = process.env.APP_URL;
const secret = process.env.CRON_SECRET;
if (!appUrl || !secret) {
  console.error("APP_URL and CRON_SECRET must be set");
  process.exit(1);
}

const res = await fetch(new URL("/api/cron/deals", appUrl), {
  headers: { Authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(120_000),
});
console.log(res.status, await res.text());
process.exit(res.ok ? 0 : 1);
