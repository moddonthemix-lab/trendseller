export const dynamic = "force-dynamic";

/** Railway health check. */
export function GET() {
  return Response.json({ ok: true });
}
