/**
 * Public origin of the app. Behind Railway's proxy `request.url` can carry the internal
 * host, so prefer APP_URL, then the forwarded headers, then the request itself.
 */
export function publicOrigin(request: Request): string {
  if (process.env.APP_URL) return new URL(process.env.APP_URL).origin;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (host) return `${proto.split(",")[0].trim()}://${host.split(",")[0].trim()}`;
  return new URL(request.url).origin;
}
