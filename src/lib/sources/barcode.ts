import "server-only";
import { bookByIsbn, isIsbn, type Book } from "./openlibrary";
import { discogsByBarcode, discogsRelease, type DiscogsMatch, type DiscogsRelease } from "./discogs";
import { settle } from "./http";
import { lookupUpc, type UpcProduct } from "./upcitemdb";

export interface BarcodeIdentification {
  code: string;
  product: UpcProduct | null;
  /**
   * Discogs pressings sharing this barcode (records, CDs, cassettes), official releases first.
   * One barcode often covers many pressings worth wildly different amounts, so we return several.
   */
  media: DiscogsRelease[];
  book: Book | null;
  /** Sources that failed (rate limit, timeout) — shown so a miss isn't mistaken for "unknown item". */
  errors: string[];
}

/** Identify any barcode across the free sources, in parallel. */
export async function identifyBarcode(code: string): Promise<BarcodeIdentification> {
  const digits = code.replace(/[^\dX]/gi, "").toUpperCase();
  const [upc, media, book] = await Promise.all([
    isIsbn(digits) && digits.length === 10 ? Promise.resolve({ value: null }) : settle(() => lookupUpc(digits)),
    settle(async () => {
      const matches = await discogsByBarcode(digits);
      const unofficial = (m: DiscogsMatch) => /unofficial/i.test(m.format ?? "");
      const ranked = [...matches].sort((a, b) => Number(unofficial(a)) - Number(unofficial(b)) || b.have + b.want - (a.have + a.want));
      // 3 release lookups + 1 search stays well inside Discogs' 25 requests/minute.
      const releases = await Promise.all(ranked.slice(0, 3).map((m) => discogsRelease(m.releaseId)));
      return releases;
    }),
    isIsbn(digits) ? settle(() => bookByIsbn(digits)) : Promise.resolve({ value: null }),
  ]);
  return {
    code: digits,
    product: upc.value,
    media: media.value ?? [],
    book: book.value,
    errors: [upc, media, book].flatMap((r) => ("error" in r && r.error ? [r.error] : [])),
  };
}
