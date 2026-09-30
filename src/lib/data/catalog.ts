import type { CategoryId, Mode, ProductRefs, SourceVenue } from "@/lib/domain/types";

/**
 * Sample catalog used when no live data source (Supabase) is configured.
 * Prices are realistic ballparks, not live quotes. UPCs are demo values (prefix 99).
 *
 * price      current avg sold price
 * source     typical thrift/flea cost
 * drift      price change across 90 days (0.2 = +20%)
 * spike      extra price move in the last 7 days
 * soldDay    sold listings per day (current)
 * demand7    change in sold/day during the last 7 days
 * active     active listings (current)
 * supply7    change in active listings during the last 7 days
 * days       avg days to sell
 */
export interface CatalogSpec {
  id: string;
  name: string;
  brand: string;
  category: CategoryId;
  segment: string;
  modes?: Mode[];
  keywords: string[];
  price: number;
  source: number;
  drift: number;
  spike?: number;
  soldDay: number;
  demand7?: number;
  active: number;
  supply7?: number;
  sellers?: number;
  days: number;
  ship: number;
  search7?: number;
  venues: SourceVenue[];
  refs?: ProductRefs;
}

export const CATALOG: CatalogSpec[] = [
  // Electronics
  { id: "sony-wm-fx195", name: "Sony Walkman WM-FX195", brand: "Sony", category: "electronics", segment: "Portable cassette players", keywords: ["walkman", "fx195", "sony"], price: 87, source: 8, drift: 0.22, spike: 0.08, soldDay: 1.6, demand7: 0.3, active: 31, supply7: -0.2, days: 5, ship: 7, search7: 0.35, venues: ["Goodwill", "Estate sale", "Garage sale"] },
  { id: "sony-d-ej01-discman", name: "Sony Discman D-EJ01", brand: "Sony", category: "electronics", segment: "Portable cassette players", keywords: ["discman", "d ej01", "sony"], price: 64, source: 7, drift: 0.15, spike: 0.05, soldDay: 1.1, demand7: 0.15, active: 40, days: 7, ship: 7, venues: ["Goodwill", "Thrift store"] },
  { id: "ti-84-plus", name: "TI-84 Plus Graphing Calculator", brand: "Texas Instruments", category: "electronics", segment: "Graphing calculators", keywords: ["ti 84", "plus", "calculator"], price: 52, source: 6, drift: 0.12, spike: 0.1, soldDay: 9, demand7: 0.4, active: 240, supply7: -0.12, days: 4, ship: 6, search7: 0.6, venues: ["Goodwill", "Garage sale"] },
  { id: "hp-12c", name: "HP 12C Financial Calculator", brand: "HP", category: "electronics", segment: "Graphing calculators", keywords: ["hp", "12c", "calculator"], price: 38, source: 4, drift: 0.05, soldDay: 3, demand7: 0.25, active: 90, days: 6, ship: 5, venues: ["Estate sale", "Goodwill"] },
  { id: "ipod-classic-160", name: "iPod Classic 160GB (7th gen)", brand: "Apple", category: "electronics", segment: "Vintage iPods", keywords: ["ipod", "classic", "160"], price: 145, source: 25, drift: 0.18, spike: 0.04, soldDay: 4, demand7: 0.1, active: 160, days: 6, ship: 6, venues: ["Pawn shop", "Garage sale"] },
  { id: "palm-pilot-m505", name: "Palm m505 PDA", brand: "Palm", category: "electronics", segment: "Retro PDAs", keywords: ["palm", "m505"], price: 34, source: 5, drift: -0.05, soldDay: 0.4, active: 55, days: 21, ship: 6, venues: ["Goodwill"] },
  // Cameras
  { id: "canon-powershot-sd1000", name: "Canon PowerShot SD1000", brand: "Canon", category: "cameras", segment: "Vintage digital cameras", modes: ["camera"], keywords: ["powershot", "sd1000", "canon"], price: 118, source: 12, drift: 0.35, spike: 0.12, soldDay: 3.4, demand7: 0.35, active: 70, supply7: -0.18, days: 4, ship: 7, search7: 0.4, venues: ["Goodwill", "Thrift store", "Estate sale"] },
  { id: "canon-powershot-g7x", name: "Canon PowerShot G7 X Mark II", brand: "Canon", category: "cameras", segment: "Premium compacts", modes: ["camera"], keywords: ["g7 x", "canon", "mark ii"], price: 520, source: 150, drift: 0.1, soldDay: 5, active: 210, days: 5, ship: 10, venues: ["Pawn shop", "Facebook Marketplace"] },
  { id: "sony-cybershot-w800", name: "Sony Cyber-shot DSC-W800", brand: "Sony", category: "cameras", segment: "Vintage digital cameras", modes: ["camera"], keywords: ["cyber shot", "w800", "sony"], price: 96, source: 10, drift: 0.28, spike: 0.1, soldDay: 3, demand7: 0.3, active: 85, supply7: -0.1, days: 5, ship: 7, search7: 0.3, venues: ["Goodwill", "Garage sale"] },
  { id: "sony-cybershot-t99", name: "Sony Cyber-shot DSC-T99", brand: "Sony", category: "cameras", segment: "Vintage digital cameras", modes: ["camera"], keywords: ["cyber shot", "t99", "sony"], price: 104, source: 10, drift: 0.3, spike: 0.14, soldDay: 1.8, demand7: 0.25, active: 36, supply7: -0.2, days: 5, ship: 7, venues: ["Goodwill", "Estate sale"] },
  { id: "nikon-coolpix-s3100", name: "Nikon Coolpix S3100", brand: "Nikon", category: "cameras", segment: "Vintage digital cameras", modes: ["camera"], keywords: ["coolpix", "s3100", "nikon"], price: 79, source: 9, drift: 0.24, spike: 0.06, soldDay: 2.6, demand7: 0.2, active: 95, days: 6, ship: 7, venues: ["Goodwill", "Thrift store"] },
  { id: "nikon-coolpix-p900", name: "Nikon Coolpix P900", brand: "Nikon", category: "cameras", segment: "Superzoom cameras", modes: ["camera"], keywords: ["coolpix", "p900", "nikon"], price: 365, source: 90, drift: 0.04, soldDay: 1.5, active: 65, days: 8, ship: 14, venues: ["Pawn shop", "Estate sale"] },
  { id: "fujifilm-finepix-xp", name: "Fujifilm FinePix XP130", brand: "Fujifilm", category: "cameras", segment: "Vintage digital cameras", modes: ["camera"], keywords: ["finepix", "xp130", "fujifilm"], price: 88, source: 12, drift: 0.2, soldDay: 1.2, demand7: 0.1, active: 48, days: 7, ship: 7, venues: ["Goodwill", "Garage sale"] },
  { id: "fujifilm-x100v", name: "Fujifilm X100V", brand: "Fujifilm", category: "cameras", segment: "Premium compacts", modes: ["camera"], keywords: ["x100v", "fujifilm"], price: 1450, source: 700, drift: 0.02, soldDay: 3, active: 120, days: 4, ship: 18, venues: ["Facebook Marketplace", "Pawn shop"] },
  { id: "olympus-mju-ii", name: "Olympus Stylus Epic (mju-II)", brand: "Olympus", category: "cameras", segment: "Point-and-shoot film cameras", modes: ["camera"], keywords: ["olympus", "stylus epic", "mju"], price: 245, source: 15, drift: 0.12, spike: 0.03, soldDay: 1.3, active: 58, days: 5, ship: 8, venues: ["Estate sale", "Flea market"] },
  // Audio
  { id: "yamaha-mg10xu", name: "Yamaha MG10XU Mixer", brand: "Yamaha", category: "audio", segment: "Yamaha audio equipment", modes: ["audio"], keywords: ["yamaha", "mg10xu"], price: 185, source: 45, drift: 0.12, spike: 0.05, soldDay: 1.4, demand7: 0.35, active: 44, supply7: -0.15, days: 6, ship: 18, search7: 0.2, venues: ["Facebook Marketplace", "Pawn shop"] },
  { id: "yamaha-ns10m", name: "Yamaha NS-10M Studio Monitors (pair)", brand: "Yamaha", category: "audio", segment: "Yamaha audio equipment", modes: ["audio"], keywords: ["yamaha", "ns10", "ns 10"], price: 720, source: 150, drift: 0.14, spike: 0.06, soldDay: 0.5, demand7: 0.4, active: 14, supply7: -0.25, sellers: 12, days: 9, ship: 65, venues: ["Estate sale", "Craigslist"] },
  { id: "yamaha-spx90", name: "Yamaha SPX90 Multi-Effects Rack", brand: "Yamaha", category: "audio", segment: "Rack processors", modes: ["audio"], keywords: ["yamaha", "spx90"], price: 240, source: 50, drift: 0.16, spike: 0.05, soldDay: 0.35, demand7: 0.3, active: 11, sellers: 10, days: 10, ship: 25, venues: ["Pawn shop", "Craigslist"] },
  { id: "dbx-166xs", name: "dbx 166xs Compressor", brand: "dbx", category: "audio", segment: "Rack processors", modes: ["audio"], keywords: ["dbx", "166"], price: 135, source: 35, drift: 0.05, soldDay: 0.8, active: 38, days: 9, ship: 22, venues: ["Pawn shop", "Facebook Marketplace"] },
  { id: "lexicon-mx200", name: "Lexicon MX200 Reverb", brand: "Lexicon", category: "audio", segment: "Rack processors", modes: ["audio"], keywords: ["lexicon", "mx200"], price: 120, source: 30, drift: 0.08, soldDay: 0.5, active: 22, days: 11, ship: 18, venues: ["Pawn shop"] },
  { id: "shure-sm7b", name: "Shure SM7B Microphone", brand: "Shure", category: "audio", segment: "Microphones", modes: ["audio"], keywords: ["shure", "sm7b"], price: 315, source: 120, drift: 0.01, soldDay: 6, active: 180, days: 4, ship: 12, venues: ["Pawn shop", "Facebook Marketplace"] },
  { id: "electro-voice-re20", name: "Electro-Voice RE20", brand: "Electro-Voice", category: "audio", segment: "Vintage microphones", modes: ["audio"], keywords: ["electro voice", "re20"], price: 375, source: 90, drift: 0.07, soldDay: 1.2, active: 40, days: 6, ship: 14, venues: ["Estate sale", "Pawn shop"] },
  { id: "shure-55sh", name: "Shure 55SH Series II (vintage)", brand: "Shure", category: "audio", segment: "Vintage microphones", modes: ["audio"], keywords: ["shure", "55sh"], price: 110, source: 20, drift: 0.09, soldDay: 1, active: 60, days: 8, ship: 12, venues: ["Estate sale", "Flea market"] },
  { id: "krk-rokit-5", name: "KRK Rokit 5 G3 Studio Monitors (pair)", brand: "KRK", category: "audio", segment: "Studio monitors", modes: ["audio"], keywords: ["krk", "rokit"], price: 190, source: 60, drift: -0.04, soldDay: 1.5, active: 85, days: 10, ship: 35, venues: ["Facebook Marketplace", "Craigslist"] },
  { id: "technics-sl1200mk2", name: "Technics SL-1200MK2 Turntable", brand: "Technics", category: "audio", segment: "Turntables", modes: ["audio"], keywords: ["technics", "1200"], price: 690, source: 200, drift: 0.06, soldDay: 1.8, active: 75, days: 6, ship: 55, venues: ["Estate sale", "Craigslist"] },
  // Musical (synths / drum machines live here and in audio mode)
  { id: "roland-juno-106", name: "Roland Juno-106 Synthesizer", brand: "Roland", category: "musical", segment: "Vintage synthesizers", modes: ["audio"], keywords: ["roland", "juno 106", "juno"], price: 1850, source: 500, drift: 0.09, spike: 0.03, soldDay: 0.4, active: 18, sellers: 17, days: 7, ship: 85, venues: ["Estate sale", "Craigslist"] },
  { id: "korg-volca-beats", name: "Korg Volca Beats Drum Machine", brand: "Korg", category: "musical", segment: "Drum machines", modes: ["audio"], keywords: ["korg", "volca"], price: 115, source: 40, drift: 0.02, soldDay: 2, active: 70, days: 6, ship: 10, venues: ["Facebook Marketplace", "Pawn shop"] },
  { id: "roland-tr-626", name: "Roland TR-626 Rhythm Composer", brand: "Roland", category: "musical", segment: "Drum machines", modes: ["audio"], keywords: ["roland", "tr 626"], price: 420, source: 60, drift: 0.2, spike: 0.08, soldDay: 0.25, demand7: 0.5, active: 6, sellers: 6, days: 8, ship: 20, search7: 0.4, venues: ["Estate sale", "Pawn shop", "Flea market"] },
  { id: "yamaha-dx7", name: "Yamaha DX7 Synthesizer", brand: "Yamaha", category: "musical", segment: "Yamaha audio equipment", modes: ["audio"], keywords: ["yamaha", "dx7"], price: 640, source: 150, drift: 0.11, spike: 0.05, soldDay: 0.6, demand7: 0.35, active: 26, supply7: -0.15, days: 8, ship: 75, venues: ["Estate sale", "Craigslist"] },
  { id: "casio-sk-1", name: "Casio SK-1 Sampling Keyboard", brand: "Casio", category: "musical", segment: "Vintage synthesizers", modes: ["audio"], keywords: ["casio", "sk 1"], price: 145, source: 12, drift: 0.18, spike: 0.06, soldDay: 0.9, demand7: 0.2, active: 34, days: 6, ship: 16, venues: ["Goodwill", "Garage sale", "Flea market"] },
  { id: "boss-ds1", name: "Boss DS-1 Distortion Pedal", brand: "Boss", category: "musical", segment: "Guitar pedals", keywords: ["boss", "ds 1"], price: 42, source: 15, drift: 0, soldDay: 8, active: 520, days: 9, ship: 6, venues: ["Pawn shop", "Garage sale"] },
  { id: "fender-mij-strat", name: "Fender Japan Stratocaster (MIJ)", brand: "Fender", category: "musical", segment: "Guitars", keywords: ["fender", "strat", "japan"], price: 820, source: 350, drift: 0.05, soldDay: 1.5, active: 140, days: 10, ship: 60, venues: ["Pawn shop", "Craigslist"] },
  // Gaming
  { id: "gameboy-advance-sp", name: "Game Boy Advance SP (AGS-101)", brand: "Nintendo", category: "gaming", segment: "Handheld systems", modes: ["gaming"], keywords: ["game boy", "sp"], price: 165, source: 40, drift: 0.1, spike: 0.04, soldDay: 7, demand7: 0.15, active: 260, days: 4, ship: 7, venues: ["Pawn shop", "Garage sale", "Flea market"] },
  { id: "nintendo-ds-lite", name: "Nintendo DS Lite", brand: "Nintendo", category: "gaming", segment: "Handheld systems", modes: ["gaming"], keywords: ["ds lite", "nintendo"], price: 72, source: 15, drift: 0.14, spike: 0.06, soldDay: 10, demand7: 0.25, active: 380, supply7: -0.1, days: 4, ship: 7, search7: 0.3, venues: ["Goodwill", "Garage sale"] },
  { id: "psp-3000", name: "Sony PSP-3000", brand: "Sony", category: "gaming", segment: "Handheld systems", modes: ["gaming"], keywords: ["psp", "3000"], price: 118, source: 25, drift: 0.2, spike: 0.08, soldDay: 6, demand7: 0.3, active: 190, supply7: -0.15, days: 4, ship: 8, search7: 0.25, venues: ["Pawn shop", "Garage sale"] },
  { id: "n64-console", name: "Nintendo 64 Console", brand: "Nintendo", category: "gaming", segment: "Retro consoles", modes: ["gaming"], keywords: ["nintendo 64", "n64"], price: 115, source: 45, drift: 0.03, soldDay: 8, active: 420, days: 5, ship: 16, venues: ["Garage sale", "Flea market"] },
  { id: "gamecube-console", name: "Nintendo GameCube Console", brand: "Nintendo", category: "gaming", segment: "Retro consoles", modes: ["gaming"], keywords: ["gamecube"], price: 135, source: 50, drift: 0.08, soldDay: 7, demand7: 0.1, active: 310, days: 5, ship: 18, venues: ["Garage sale", "Pawn shop"] },
  { id: "ps2-slim", name: "PlayStation 2 Slim", brand: "Sony", category: "gaming", segment: "Retro consoles", modes: ["gaming"], keywords: ["ps2", "slim"], price: 88, source: 25, drift: 0.12, spike: 0.05, soldDay: 9, demand7: 0.2, active: 350, days: 5, ship: 14, venues: ["Goodwill", "Garage sale"] },
  { id: "xbox-original", name: "Original Xbox Console", brand: "Microsoft", category: "gaming", segment: "Retro consoles", modes: ["gaming"], keywords: ["xbox", "original"], price: 95, source: 30, drift: 0.1, soldDay: 4, active: 190, days: 6, ship: 22, venues: ["Goodwill", "Garage sale"] },
  { id: "pokemon-emerald", name: "Pokémon Emerald (GBA, authentic)", brand: "Nintendo", category: "gaming", segment: "Retro games", modes: ["gaming"], keywords: ["pokemon", "emerald"], price: 128, source: 30, drift: 0.07, soldDay: 12, active: 480, days: 3, ship: 5, venues: ["Flea market", "Garage sale"] },
  { id: "earthbound-snes", name: "EarthBound (SNES cartridge)", brand: "Nintendo", category: "gaming", segment: "Retro games", modes: ["gaming"], keywords: ["earthbound"], price: 230, source: 60, drift: 0.05, soldDay: 2.5, active: 150, days: 5, ship: 5, venues: ["Flea market", "Estate sale"] },
  // Toys
  { id: "lego-10236-ewok-village", name: "LEGO Star Wars Ewok Village 10236", brand: "LEGO", category: "toys", segment: "Retired LEGO sets", keywords: ["lego", "ewok", "10236"], price: 410, source: 60, drift: 0.2, spike: 0.06, soldDay: 0.8, demand7: 0.3, active: 60, supply7: -0.15, days: 7, ship: 30, search7: 0.2, venues: ["Estate sale", "Garage sale"] },
  { id: "lego-6086-black-knight", name: "LEGO Castle Black Knight's Castle 6086", brand: "LEGO", category: "toys", segment: "Retired LEGO sets", keywords: ["lego", "6086", "black knight"], price: 280, source: 40, drift: 0.26, spike: 0.08, soldDay: 0.3, demand7: 0.4, active: 20, supply7: -0.2, sellers: 18, days: 9, ship: 25, venues: ["Estate sale", "Garage sale", "Goodwill"] },
  { id: "lego-bulk-5lb", name: "LEGO Bulk Lot (5 lb)", brand: "LEGO", category: "toys", segment: "Bulk LEGO", keywords: ["lego", "lb"], price: 58, source: 20, drift: 0.02, soldDay: 12, active: 900, days: 8, ship: 15, venues: ["Goodwill", "Garage sale"] },
  { id: "furby-1998", name: "Furby (1998, working)", brand: "Tiger", category: "toys", segment: "90s toys", keywords: ["furby", "1998"], price: 72, source: 6, drift: 0.1, soldDay: 1.6, active: 140, days: 12, ship: 10, venues: ["Goodwill", "Garage sale"] },
  { id: "tamagotchi-1997", name: "Tamagotchi (1997 original)", brand: "Bandai", category: "toys", segment: "90s toys", keywords: ["tamagotchi"], price: 64, source: 5, drift: 0.16, spike: 0.1, soldDay: 1.8, demand7: 0.3, active: 110, days: 7, ship: 5, search7: 0.35, venues: ["Garage sale", "Flea market"] },
  // Collectibles
  { id: "pyrex-pink-daisy", name: "Pyrex Pink Daisy Mixing Bowl Set", brand: "Pyrex", category: "collectibles", segment: "Vintage Pyrex", keywords: ["pyrex", "daisy"], price: 145, source: 12, drift: 0.04, soldDay: 1.2, active: 120, days: 14, ship: 28, venues: ["Estate sale", "Goodwill"] },
  { id: "pokemon-base-booster-box-art", name: "Pokémon Base Set Unlimited Charizard (played)", brand: "Pokémon", category: "collectibles", segment: "Trading cards", keywords: ["charizard", "base set"], price: 340, source: 150, drift: 0.06, soldDay: 6, active: 400, days: 5, ship: 5, venues: ["Estate sale", "Flea market"], refs: { tcgdexCardId: "base1-4" } },
  { id: "mtg-rhystic-study-j22", name: "Rhystic Study (Jumpstart 2022)", brand: "Magic: The Gathering", category: "collectibles", segment: "Trading cards", keywords: ["rhystic study"], price: 68, source: 2, drift: 0.05, soldDay: 4, active: 300, days: 4, ship: 1, venues: ["Estate sale", "Garage sale"], refs: { scryfallId: "9f37c5b6-a59c-45cd-9a99-e9357fe9ea1b" } },
  { id: "nirvana-nevermind-1991-lp", name: "Nirvana – Nevermind (1991 US LP, original)", brand: "DGC", category: "collectibles", segment: "Vintage vinyl", keywords: ["nirvana", "nevermind"], price: 1150, source: 5, drift: 0.06, soldDay: 0.1, active: 11, sellers: 11, days: 18, ship: 6, venues: ["Estate sale", "Goodwill", "Flea market"], refs: { discogsReleaseId: 1813006 } },
  { id: "daft-punk-homework-1997-lp", name: "Daft Punk – Homework (1997 LP)", brand: "Virgin", category: "collectibles", segment: "Vintage vinyl", keywords: ["daft punk", "homework"], price: 48, source: 3, drift: 0.04, soldDay: 1.5, active: 125, days: 9, ship: 6, venues: ["Goodwill", "Flea market"], refs: { discogsReleaseId: 2947655 } },
  { id: "dr-dre-chronic-cassette-1992", name: "Dr. Dre – The Chronic (1992 cassette)", brand: "Death Row", category: "collectibles", segment: "Cassettes", keywords: ["chronic", "cassette"], price: 38, source: 1, drift: 0.12, spike: 0.05, soldDay: 0.4, demand7: 0.3, active: 6, sellers: 6, days: 10, ship: 5, venues: ["Goodwill", "Garage sale", "Flea market"], refs: { discogsReleaseId: 721450 } },
  { id: "hot-wheels-redline", name: "Hot Wheels Redline (1968-72, loose)", brand: "Mattel", category: "collectibles", segment: "Die-cast", keywords: ["hot wheels", "redline"], price: 48, source: 5, drift: 0.08, soldDay: 10, active: 1200, days: 10, ship: 5, venues: ["Estate sale", "Flea market", "Garage sale"] },
  // Vintage clothing
  { id: "harley-3d-emblem-tee", name: "Harley-Davidson 3D Emblem Tee (90s)", brand: "Harley-Davidson", category: "vintage-clothing", segment: "Vintage band & moto tees", keywords: ["harley", "3d emblem"], price: 95, source: 5, drift: 0.1, spike: 0.04, soldDay: 3, demand7: 0.15, active: 190, days: 8, ship: 5, venues: ["Goodwill", "Thrift store"] },
  { id: "levis-501-usa", name: "Levi's 501 Made in USA (90s)", brand: "Levi's", category: "vintage-clothing", segment: "Vintage denim", keywords: ["levis", "501", "usa"], price: 68, source: 7, drift: 0.05, soldDay: 12, active: 1400, days: 12, ship: 8, venues: ["Goodwill", "Thrift store"] },
  { id: "carhartt-detroit-jacket", name: "Carhartt Detroit Jacket (J97)", brand: "Carhartt", category: "vintage-clothing", segment: "Workwear", keywords: ["carhartt", "detroit"], price: 135, source: 15, drift: 0.12, spike: 0.05, soldDay: 5, demand7: 0.2, active: 380, days: 7, ship: 14, venues: ["Goodwill", "Thrift store"] },
  { id: "patagonia-snap-t", name: "Patagonia Synchilla Snap-T", brand: "Patagonia", category: "vintage-clothing", segment: "Outdoor fleece", keywords: ["patagonia", "snap t"], price: 62, source: 8, drift: 0.06, soldDay: 9, active: 900, days: 9, ship: 9, venues: ["Goodwill", "Thrift store"] },
  // Sneakers
  { id: "nike-dunk-low-panda", name: "Nike Dunk Low 'Panda' (used)", brand: "Nike", category: "sneakers", segment: "Nike Dunks", keywords: ["dunk", "panda"], price: 70, source: 15, drift: -0.12, soldDay: 30, active: 2600, days: 9, ship: 14, venues: ["Goodwill", "Facebook Marketplace"] },
  { id: "new-balance-990v3", name: "New Balance 990v3 (used)", brand: "New Balance", category: "sneakers", segment: "New Balance runners", keywords: ["new balance", "990"], price: 88, source: 10, drift: 0.14, spike: 0.05, soldDay: 4, demand7: 0.2, active: 330, days: 7, ship: 14, venues: ["Goodwill", "Thrift store"] },
  { id: "jordan-1-mid", name: "Air Jordan 1 Mid (used)", brand: "Nike", category: "sneakers", segment: "Jordans", keywords: ["jordan 1", "mid"], price: 64, source: 15, drift: -0.05, soldDay: 20, active: 2900, days: 11, ship: 14, venues: ["Goodwill"] },
  // Tools
  { id: "snap-on-ratchet", name: "Snap-on 3/8\" Ratchet", brand: "Snap-on", category: "tools", segment: "Hand tools", keywords: ["snap on", "ratchet"], price: 72, source: 12, drift: 0.02, soldDay: 5, active: 480, days: 8, ship: 9, venues: ["Estate sale", "Garage sale", "Pawn shop"] },
  { id: "festool-ts55", name: "Festool TS 55 Track Saw", brand: "Festool", category: "tools", segment: "Premium power tools", keywords: ["festool", "ts 55"], price: 480, source: 150, drift: 0.04, soldDay: 1.2, active: 70, days: 6, ship: 35, venues: ["Estate sale", "Pawn shop"] },
  { id: "starrett-micrometer", name: "Starrett Micrometer Set", brand: "Starrett", category: "tools", segment: "Machinist tools", keywords: ["starrett", "micrometer"], price: 160, source: 20, drift: 0.07, soldDay: 1, active: 140, days: 10, ship: 14, venues: ["Estate sale"] },
];
