import { z } from "zod";
import { CLAUDE_MODEL, FALLBACK_OPTIONS, getClaude } from "@/lib/ai/claude";
import { getMarketData } from "@/lib/data/repository";

export const runtime = "nodejs";
export const maxDuration = 120;

const Body = z.object({
  image: z.string().min(100).max(8_000_000), // base64 data URL or bare base64
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp", "image/gif"]).default("image/jpeg"),
});

const Identification = z.object({
  brand: z.string(),
  model: z.string(),
  description: z.string(),
  category: z.string(),
  catalogId: z.string().nullable(),
  estimatedResaleLow: z.number(),
  estimatedResaleHigh: z.number(),
  confidence: z.enum(["low", "medium", "high"]),
  conditionNotes: z.string(),
});

const SCHEMA = {
  type: "object",
  properties: {
    brand: { type: "string" },
    model: { type: "string", description: "Exact model number/name if visible, else best guess" },
    description: { type: "string", description: "One-line listing-style title" },
    category: { type: "string" },
    catalogId: { type: ["string", "null"], description: "Matching id from the provided catalog, or null" },
    estimatedResaleLow: { type: "number" },
    estimatedResaleHigh: { type: "number" },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    conditionNotes: { type: "string", description: "Visible condition issues or things to check before buying" },
  },
  required: ["brand", "model", "description", "category", "catalogId", "estimatedResaleLow", "estimatedResaleHigh", "confidence", "conditionNotes"],
  additionalProperties: false,
};

/** Photo → product identification (Claude vision), matched against the catalog when possible. */
export async function POST(req: Request) {
  const claude = getClaude();
  if (!claude) return Response.json({ error: "Photo identification needs ANTHROPIC_API_KEY. Use barcode or search instead." }, { status: 501 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid image" }, { status: 400 });
  const data = parsed.data.image.replace(/^data:[^;]+;base64,/, "");

  const { products } = await getMarketData();
  const catalog = products.map((p) => `${p.id}: ${p.brand} ${p.name}`).join("\n");

  const response = await claude.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: parsed.data.mediaType, data } },
          {
            type: "text",
            text: `A reseller photographed this item in a thrift store. Identify it as precisely as possible (brand, model) and estimate its used resale value on eBay in USD. If it matches one of these tracked catalog items, set catalogId:\n\n${catalog}`,
          },
        ],
      },
    ],
    ...FALLBACK_OPTIONS,
    betas: [...FALLBACK_OPTIONS.betas],
  });

  if (response.stop_reason === "refusal") return Response.json({ error: "Could not identify this image." }, { status: 422 });
  const text = response.content.find((b) => b.type === "text");
  let json: unknown = null;
  try {
    json = text?.type === "text" ? JSON.parse(text.text) : null;
  } catch {
    json = null;
  }
  const result = Identification.safeParse(json);
  if (!result.success) return Response.json({ error: "Could not identify this image." }, { status: 422 });
  const catalogId = result.data.catalogId && products.some((p) => p.id === result.data.catalogId) ? result.data.catalogId : null;
  return Response.json({ ...result.data, catalogId });
}
