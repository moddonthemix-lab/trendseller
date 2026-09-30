import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CLAUDE_MODEL, FALLBACK_OPTIONS, getClaude } from "@/lib/ai/claude";
import { marketContext } from "@/lib/ai/context";
import { fallbackPlan } from "@/lib/ai/fallbackPlanner";
import { getMarketData } from "@/lib/data/repository";

export const runtime = "nodejs";
export const maxDuration = 300;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(8000) }))
    .min(1)
    .max(40),
});

const SYSTEM = `You are the sourcing strategist inside Reseller Edge, a private tool for one professional reseller. The owner has a background in audio engineering, so they know pro audio gear well.

Your job is to turn market data into concrete buying decisions. When asked what to source, answer with:
- specific products (brand + model), not vague categories
- what to pay at most, expected resale price, expected profit range, and how fast it sells
- where to look (thrift, flea market, estate sale, pawn, local listings)
- why it's an opportunity right now (trend, sell-through, low competition, local underpricing)

Ground every number in the market snapshot you are given; if something isn't in the data, say it's your general knowledge and give a range. When the user gives a budget, allocate it. Be direct and skimmable: short intro line, then bullet lists or a compact table. Skip generic reselling advice unless asked.`;

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request" }, { status: 400 });
  const { messages } = parsed.data;
  if (messages[messages.length - 1].role !== "user") return Response.json({ error: "Last message must be from the user" }, { status: 400 });

  const { products, localListings, home } = await getMarketData();
  const claude = getClaude();
  const encoder = new TextEncoder();

  if (!claude) {
    const text = fallbackPlan(messages[messages.length - 1].content, products, localListings, home);
    return new Response(text, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Assistant-Mode": "rules" } });
  }

  const today = new Date().toISOString().slice(0, 10);
  const system: Anthropic.Beta.BetaTextBlockParam[] = [
    { type: "text", text: SYSTEM },
    {
      type: "text",
      text: `# Market snapshot (${today})\n\n${marketContext(products, localListings, home)}`,
      cache_control: { type: "ephemeral" },
    },
  ];

  const stream = claude.beta.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system,
    messages,
    ...FALLBACK_OPTIONS,
    betas: [...FALLBACK_OPTIONS.betas],
  });

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          controller.enqueue(encoder.encode("\n\n_The assistant declined this request. Try rephrasing it as a sourcing question._"));
        } else if (final.stop_reason === "max_tokens") {
          controller.enqueue(encoder.encode("\n\n_(Response truncated.)_"));
        }
      } catch (err) {
        console.error("assistant stream failed", err);
        controller.enqueue(encoder.encode("\n\n_The AI service had a problem. Showing the rule-based plan instead:_\n\n"));
        controller.enqueue(encoder.encode(fallbackPlan(messages[messages.length - 1].content, products, localListings, home)));
      } finally {
        controller.close();
      }
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "X-Assistant-Mode": "claude" } });
}
