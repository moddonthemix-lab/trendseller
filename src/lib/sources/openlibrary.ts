import "server-only";
import { getJson } from "./http";

/** Open Library: identifies books by ISBN. No key. No price data. */
interface IsbnResponse {
  title: string;
  subtitle?: string;
  publish_date?: string;
  publishers?: string[];
  number_of_pages?: number;
  authors?: { key: string }[];
  covers?: number[];
  key: string;
}

export interface Book {
  source: "openlibrary";
  isbn: string;
  title: string;
  authors: string[];
  publishDate?: string;
  publisher?: string;
  cover?: string;
  url: string;
}

export const isIsbn = (code: string) => /^(97[89]\d{10}|\d{9}[\dX])$/.test(code);

export async function bookByIsbn(isbn: string): Promise<Book | null> {
  const b = await getJson<IsbnResponse>("Open Library", `https://openlibrary.org/isbn/${isbn}.json`, { ttlMs: 30 * 86_400_000 }).catch((e) => {
    if (e?.status === 404) return null;
    throw e;
  });
  if (!b) return null;
  const authors = await Promise.all(
    (b.authors ?? []).slice(0, 3).map((a) =>
      getJson<{ name: string }>("Open Library", `https://openlibrary.org${a.key}.json`, { ttlMs: 30 * 86_400_000 })
        .then((x) => x.name)
        .catch(() => null),
    ),
  );
  const cover = b.covers?.find((c) => c > 0);
  return {
    source: "openlibrary",
    isbn,
    title: b.subtitle ? `${b.title}: ${b.subtitle}` : b.title,
    authors: authors.filter((a): a is string => !!a),
    publishDate: b.publish_date,
    publisher: b.publishers?.[0],
    cover: cover ? `https://covers.openlibrary.org/b/id/${cover}-M.jpg` : undefined,
    url: `https://openlibrary.org${b.key}`,
  };
}
