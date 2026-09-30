import "server-only";
import { timingSafeEqual } from "node:crypto";

/** Constant-time bearer-token check for machine endpoints (cron, ingest). */
export function hasBearer(req: Request, ...secrets: (string | undefined)[]): boolean {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return false;
  return secrets.some((s) => {
    if (!s) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(s);
    return a.length === b.length && timingSafeEqual(a, b);
  });
}
