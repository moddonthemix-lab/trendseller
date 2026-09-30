"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { calculateProfit } from "@/lib/scoring/profit";
import { DecisionBadge, ScoreBadge, Stat, pct, usd } from "./ui";

interface ScanMatch {
  id: string;
  name: string;
  brand: string;
  avgSoldPrice: number;
  sellThrough: number;
  avgDaysToSell: number;
  estimatedFees: number;
  shippingEstimate: number;
  purchasePrice: number;
  profit: number;
  roi: number;
  opportunityScore: number;
  buyScore: number;
  decision: "BUY" | "MAYBE" | "PASS";
  rationale: string;
}

interface Identification {
  brand: string;
  model: string;
  description: string;
  catalogId: string | null;
  estimatedResaleLow: number;
  estimatedResaleHigh: number;
  confidence: string;
  conditionNotes: string;
}

// Minimal typing for the Shape Detection API (Chrome/Android, Safari 17+ behind flag).
interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike;

async function resizeToJpeg(file: File, max = 1280): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function Scanner() {
  const [code, setCode] = useState("");
  const [query, setQuery] = useState("");
  const [price, setPrice] = useState("");
  const [matches, setMatches] = useState<ScanMatch[] | null>(null);
  const [ident, setIdent] = useState<Identification | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const lookup = useCallback(
    async (params: Record<string, string>) => {
      setBusy("Looking up…");
      setError(null);
      try {
        const qs = new URLSearchParams({ ...params, ...(price ? { price } : {}) });
        const res = await fetch(`/api/scan?${qs}`);
        const json = (await res.json()) as { matches: ScanMatch[] };
        setMatches(json.matches);
      } catch {
        setError("Lookup failed");
      } finally {
        setBusy(null);
      }
    },
    [price],
  );

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  async function startCamera() {
    const Detector = (globalThis as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Detector) {
      setError("Live barcode scanning isn't supported in this browser — type the number under the barcode instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream;
      setScanning(true);
      setError(null);
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      const detector = new Detector({ formats: ["upc_a", "upc_e", "ean_13", "ean_8", "code_128"] });
      const tick = async () => {
        if (!streamRef.current) return;
        const found = await detector.detect(video).catch(() => []);
        if (found[0]?.rawValue) {
          setCode(found[0].rawValue);
          stopCamera();
          lookup({ code: found[0].rawValue });
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    } catch {
      setError("Couldn't open the camera.");
      stopCamera();
    }
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    setBusy("Identifying photo…");
    setError(null);
    setIdent(null);
    setMatches(null);
    try {
      const image = await resizeToJpeg(file);
      const res = await fetch("/api/identify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image, mediaType: "image/jpeg" }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Identification failed");
      setIdent(json);
      setQuery(json.description);
      await lookup(json.catalogId ? { id: json.catalogId } : { q: `${json.brand} ${json.model}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Identification failed");
    } finally {
      setBusy(null);
    }
  }

  const input = "w-full rounded-xl border border-line bg-panel-2 px-3 py-3 text-base";
  const identEstimate =
    ident && matches?.length === 0
      ? calculateProfit({ salePrice: (ident.estimatedResaleLow + ident.estimatedResaleHigh) / 2, purchasePrice: Number(price) || 0, shippingCost: 12 })
      : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm text-muted">
          Shelf price
          <input className={`${input} tabular mt-1 text-ink`} inputMode="decimal" placeholder="$ e.g. 8" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))} />
        </label>
        <div className="grid grid-cols-2 gap-2 self-end">
          <button onClick={scanning ? stopCamera : startCamera} className="rounded-xl bg-accent px-3 py-3 font-semibold text-accent-ink">
            {scanning ? "Stop" : "Scan barcode"}
          </button>
          <label className="cursor-pointer rounded-xl border border-line bg-panel-2 px-3 py-3 text-center font-semibold">
            Take photo
            <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => onPhoto(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      <video ref={videoRef} playsInline muted className={`${scanning ? "block" : "hidden"} aspect-video w-full rounded-xl bg-black object-cover`} />

      <div className="grid gap-3 sm:grid-cols-2">
        <form onSubmit={(e) => (e.preventDefault(), code && lookup({ code }))} className="flex gap-2">
          <input className={`${input} tabular`} inputMode="numeric" placeholder="UPC / EAN / ISBN" value={code} onChange={(e) => setCode(e.target.value)} />
          <button className="rounded-xl border border-line px-4">Go</button>
        </form>
        <form onSubmit={(e) => (e.preventDefault(), query && lookup({ q: query }))} className="flex gap-2">
          <input className={input} placeholder="Or search: yamaha dx7" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="rounded-xl border border-line px-4">Go</button>
        </form>
      </div>

      {busy && <p className="text-sm text-muted">{busy}</p>}
      {error && <p className="rounded-xl bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>}

      {ident && (
        <div className="rounded-xl border border-line bg-panel p-3 text-sm">
          <div className="font-semibold">
            📷 {ident.brand} {ident.model} <span className="text-xs font-normal text-muted">({ident.confidence} confidence)</span>
          </div>
          <div className="text-muted">
            AI resale estimate {usd(ident.estimatedResaleLow)}–{usd(ident.estimatedResaleHigh)} · {ident.conditionNotes}
          </div>
          {identEstimate && (
            <div className="mt-2">
              Not in the tracked catalog. Rough profit at your price: <b className={identEstimate.netProfit > 15 ? "text-accent" : "text-bad"}>{usd(identEstimate.netProfit)}</b>
            </div>
          )}
        </div>
      )}

      {matches?.length === 0 && !ident && <p className="text-sm text-muted">No tracked product matched. Try a different search.</p>}

      {matches?.map((m, i) => (
        <div key={m.id} className={`rounded-2xl border border-line bg-panel p-4 ${i > 0 ? "opacity-80" : ""}`}>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <Link href={`/products/${m.id}`} className="text-lg font-bold hover:underline">
                {m.name}
              </Link>
              <p className="mt-1 text-sm text-muted">{m.rationale}</p>
            </div>
            <ScoreBadge score={m.buyScore} />
          </div>
          <div className="mb-3">
            <DecisionBadge decision={m.decision} />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Stat label="Avg sold" value={usd(m.avgSoldPrice)} />
            <Stat label="Sell-through" value={pct(m.sellThrough, false)} hint={`~${Math.round(m.avgDaysToSell)} days to sell`} />
            <Stat label="Est. fees (eBay)" value={usd(m.estimatedFees, 2)} />
            <Stat label="Shipping est." value={usd(m.shippingEstimate)} />
            <Stat label={`Profit @ ${usd(m.purchasePrice)}`} value={usd(m.profit)} tone={m.profit > 0 ? "good" : "bad"} hint={`${pct(m.roi, false)} ROI`} />
            <Stat label="Buy score" value={m.buyScore} hint={`Opportunity ${m.opportunityScore}`} />
          </div>
          {!price && <p className="mt-2 text-xs text-muted">No shelf price entered — using the typical find price.</p>}
        </div>
      ))}
    </div>
  );
}
