export const CATEGORIES = [
  { id: "electronics", label: "Electronics" },
  { id: "cameras", label: "Cameras" },
  { id: "audio", label: "Audio Equipment" },
  { id: "gaming", label: "Gaming" },
  { id: "toys", label: "Toys" },
  { id: "collectibles", label: "Collectibles" },
  { id: "musical", label: "Musical Equipment" },
  { id: "vintage-clothing", label: "Vintage Clothing" },
  { id: "sneakers", label: "Sneakers" },
  { id: "tools", label: "Tools" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export function categoryLabel(id: CategoryId): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export type Mode = "audio" | "camera" | "gaming";

/** One day of aggregated marketplace data for a product. */
export interface DailyMetric {
  /** ISO date, YYYY-MM-DD */
  date: string;
  avgSoldPrice: number;
  soldCount: number;
  activeCount: number;
  avgDaysToSell: number;
  /** Relative search interest (arbitrary units). */
  searchVolume: number;
}

/** A row in the Product Intelligence Database. */
export interface Product {
  id: string;
  name: string;
  brand: string;
  category: CategoryId;
  /** Finer grouping used for trend alerts, e.g. "Vintage digital cameras". */
  segment: string;
  modes: Mode[];
  upc?: string;
  /** Keywords used to match free-text local listings to this product. */
  keywords: string[];
  avgSoldPrice: number;
  highSoldPrice: number;
  lowSoldPrice: number;
  avgActivePrice: number;
  /** Current count of active listings. */
  activeListings: number;
  /** Sold listings over the last 30 days. */
  soldListings: number;
  /** Distinct sellers with an active listing. */
  sellerCount: number;
  avgShippingCost: number;
  avgDaysToSell: number;
  /** What this item typically costs at a thrift store / flea market. */
  typicalSourcePrice: number;
  /** Where this item is most often found cheaply. */
  bestSources: SourceVenue[];
  /** Up to 90 days of daily history, oldest first. */
  history: DailyMetric[];
}

export type SourceVenue =
  | "Goodwill"
  | "Thrift store"
  | "Flea market"
  | "Estate sale"
  | "Garage sale"
  | "Pawn shop"
  | "Facebook Marketplace"
  | "Craigslist"
  | "OfferUp";

export type Marketplace = "ebay" | "mercari" | "poshmark" | "facebook" | "reverb";

export interface LocalListing {
  id: string;
  source: "Facebook Marketplace" | "Craigslist" | "OfferUp" | "Nextdoor";
  title: string;
  price: number;
  url?: string;
  lat: number;
  lng: number;
  city: string;
  postedAt: string;
  /** Resolved catalog product, when the title could be matched. */
  productId?: string;
}

export type InventoryStatus = "unlisted" | "listed" | "sold";

export interface InventoryItem {
  id: string;
  name: string;
  category: CategoryId;
  productId?: string;
  purchaseDate: string;
  purchasePrice: number;
  sourceLocation: string;
  listingDate?: string;
  listPrice?: number;
  saleDate?: string;
  salePrice?: number;
  shippingCost?: number;
  fees?: number;
  marketplace?: Marketplace;
  notes?: string;
}

export type TrendDirection = "up" | "down" | "flat";

export interface Alert {
  id: string;
  kind: "deal" | "hidden-gem" | "below-market" | "rare-model" | "demand-increase";
  title: string;
  detail: string;
  productId?: string;
  listingId?: string;
  createdAt: string;
}
