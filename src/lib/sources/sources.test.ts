import { afterEach, describe, expect, it, vi } from "vitest";
import { identifyBarcode } from "./barcode";
import { discogsRelease } from "./discogs";
import { quoteToSnapshot } from "./live";
import { isIsbn } from "./openlibrary";
import { tcgdexCard } from "./tcgdex";

// Response bodies trimmed from real API calls made while building this.
const DISCOGS_RELEASE = {
  id: 721450,
  title: "The Chronic",
  artists_sort: "Dr. Dre",
  year: 1992,
  formats: [{ name: "Cassette", descriptions: ["Album"] }],
  num_for_sale: 6,
  lowest_price: 25.0,
  community: { have: 641, want: 954 },
  uri: "https://www.discogs.com/release/721450",
};

const TCGDEX_CARD = {
  id: "base1-4",
  name: "Charizard",
  set: { name: "Base Set" },
  pricing: {
    cardmarket: { updated: "2026-09-29T22:54:32.905Z", unit: "EUR", avg: 741.93, low: 100, trend: 750.57, avg1: 180, avg7: 1693.86, avg30: 815 },
    tcgplayer: { unit: "USD", updated: "2026-09-29T22:54:33.883Z", holofoil: { lowPrice: 475, midPrice: 832.49, highPrice: 3499.1, marketPrice: 944.53 } },
  },
};

function mockFetch(routes: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const key = Object.keys(routes).find((k) => url.includes(k));
      if (!key) return new Response("not found", { status: 404 });
      const body = routes[key];
      if (body instanceof Response) return body;
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("discogs", () => {
  it("maps release stats and demand ratio", async () => {
    mockFetch({ "/releases/721450": DISCOGS_RELEASE });
    const r = await discogsRelease(721450);
    expect(r).toMatchObject({ title: "Dr. Dre – The Chronic", format: "Cassette Album", numForSale: 6, lowestPrice: 25, have: 641, want: 954 });
    expect(r.demandRatio).toBeCloseTo(1.49, 2);
    expect(quoteToSnapshot(r)).toMatchObject({ lowestPrice: 25, want: 954 });
  });
});

describe("tcgdex", () => {
  it("picks the main TCGplayer printing and Cardmarket averages", async () => {
    mockFetch({ "/cards/base1-4": TCGDEX_CARD });
    const c = await tcgdexCard("base1-4");
    expect(c).toMatchObject({ name: "Charizard", set: "Base Set", marketPrice: 944.53, lowPrice: 475, avg7: 1693.86, avg30: 815 });
  });
});

describe("barcode identification", () => {
  it("recognises ISBNs", () => {
    expect(isIsbn("9780140328721")).toBe(true);
    expect(isIsbn("014032872X")).toBe(true);
    expect(isIsbn("720642442517")).toBe(false);
  });

  it("combines UPCitemdb and Discogs, listing official pressings first", async () => {
    mockFetch({
      "upcitemdb.com/prod/trial/lookup": { code: "OK", items: [{ title: "Dr. Dre The Chronic Cassette", brand: "Death Row", lowest_recorded_price: 9.99, offers: [{}] }] },
      "database/search": {
        results: [
          { id: 6132753, title: "Dr. Dre - The Chronic", format: ["Cassette", "Album", "Unofficial Release"], community: { have: 9000, want: 9000 } },
          { id: 6729786, title: "Dr. Dre - The Chronic", format: ["Cassette", "Album"], community: { have: 185, want: 617 } },
          { id: 721450, title: "Dr. Dre - The Chronic", format: ["Cassette", "Album"], community: { have: 641, want: 954 } },
        ],
      },
      "/releases/721450": DISCOGS_RELEASE,
      "/releases/6729786": { ...DISCOGS_RELEASE, id: 6729786, lowest_price: 30 },
      "/releases/6132753": { ...DISCOGS_RELEASE, id: 6132753, lowest_price: 5 },
    });
    const id = await identifyBarcode("0490013202-4");
    expect(id.product?.brand).toBe("Death Row");
    expect(id.media.map((m) => m.releaseId)).toEqual([721450, 6729786, 6132753]);
    expect(id.book).toBeNull();
    expect(id.errors).toEqual([]);
  });

  it("reports a rate-limited source instead of failing the lookup", async () => {
    mockFetch({
      "upcitemdb.com": new Response("{}", { status: 429 }),
      "database/search": { results: [] },
    });
    const id = await identifyBarcode("111122223333");
    expect(id.product).toBeNull();
    expect(id.media).toEqual([]);
    expect(id.errors.join()).toMatch(/UPCitemdb: rate limited/);
  });
});
