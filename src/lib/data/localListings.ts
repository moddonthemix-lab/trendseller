import type { LocalListing } from "@/lib/domain/types";

/** Default "home" used for distance math when HOME_LAT/HOME_LNG aren't set (downtown LA). */
export const DEFAULT_HOME = { lat: 34.0522, lng: -118.2437 };

type Seed = [source: LocalListing["source"], title: string, price: number, dLat: number, dLng: number, city: string, hoursAgo: number];

const SEEDS: Seed[] = [
  ["Facebook Marketplace", "Old Sony Walkman cassette player WM-FX195 works", 20, 0.03, -0.02, "Echo Park", 3],
  ["Craigslist", "Yamaha NS-10 studio monitors pair - NS10M", 300, 0.12, 0.1, "Glendale", 20],
  ["OfferUp", "Canon Powershot SD1000 digital camera w/ charger", 25, -0.05, 0.04, "Boyle Heights", 6],
  ["Facebook Marketplace", "Yamaha MG10XU mixer barely used", 90, 0.2, -0.15, "Burbank", 10],
  ["Craigslist", "Roland TR 626 drum machine vintage 80s", 150, -0.1, -0.2, "Culver City", 30],
  ["Facebook Marketplace", "Nintendo DS Lite pink with charger", 35, 0.05, 0.08, "Highland Park", 4],
  ["OfferUp", "PSP 3000 console + 4 games", 55, -0.2, 0.18, "Downey", 12],
  ["Facebook Marketplace", "Lego star wars ewok village 10236 complete no box", 180, 0.3, 0.2, "Pasadena", 48],
  ["Craigslist", "Yamaha SPX90 effects rack unit", 80, 0.08, -0.3, "Hollywood", 8],
  ["Nextdoor", "Moving sale - TI 84 plus calculator", 15, 0.01, 0.01, "Silver Lake", 2],
  ["Facebook Marketplace", "Technics SL 1200 MK2 turntable", 520, 0.35, -0.3, "Van Nuys", 70],
  ["OfferUp", "Sony cyber shot DSC T99 camera silver", 30, -0.02, -0.06, "Koreatown", 5],
  ["Facebook Marketplace", "Casio SK 1 sampling keyboard toy", 40, 0.15, 0.05, "Eagle Rock", 26],
  ["Craigslist", "Shure SM7B mic", 260, 0.04, 0.25, "Montebello", 16],
  ["Facebook Marketplace", "Nike Dunk Low Panda size 10", 60, -0.08, 0.02, "West Adams", 7],
  ["OfferUp", "Game boy advance sp AGS 101 backlit", 110, 0.1, 0.35, "West Covina", 40],
  ["Facebook Marketplace", "Roland Juno 106 synth needs voice chip", 900, 0.5, 0.5, "Altadena", 90],
  ["Craigslist", "Yamaha DX7 keyboard synthesizer w/ case", 300, -0.35, 0.15, "Long Beach", 22],
  ["OfferUp", "Nikon Coolpix S3100 camera red", 18, -0.12, -0.1, "Inglewood", 9],
  ["Facebook Marketplace", "Festool TS 55 track saw w/ rail", 330, 0.25, -0.45, "Northridge", 36],
  ["Craigslist", "Carhartt Detroit jacket J97 size L", 45, 0.02, -0.08, "Los Feliz", 14],
  ["Facebook Marketplace", "KRK Rokit monitors pair", 170, -0.15, -0.25, "Palms", 18],
];

export function sampleLocalListings(now: Date, home = DEFAULT_HOME): LocalListing[] {
  return SEEDS.map(([source, title, price, dLat, dLng, city, hoursAgo], i) => ({
    id: `local-${i + 1}`,
    source,
    title,
    price,
    lat: home.lat + dLat,
    lng: home.lng + dLng,
    city,
    postedAt: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
  }));
}
