"use client";
import { useRef, useState } from "react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const PROMPTS = ["I have $200 to spend at Goodwill.", "What should I source this week?", "I am going to a flea market.", "What categories are hot right now?", "What audio gear should I look for at estate sales?"];

/** Tiny markdown renderer: headings, bullets, bold, italics, tables stay monospace. */
function Markdown({ text }: { text: string }) {
  const inline = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
      .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, "$1<i>$2</i>")
      .replace(/(^|\s)_(.+?)_(?=\s|$|[.,])/g, "$1<i>$2</i>")
      .replace(/`(.+?)`/g, "<code>$1</code>");
  const html = text
    .split("\n")
    .map((line) => {
      if (/^#{1,4}\s/.test(line)) return `<div class="mt-3 font-bold">${inline(line.replace(/^#+\s/, ""))}</div>`;
      if (/^\s*[-*]\s/.test(line)) return `<div class="pl-4 -indent-3">• ${inline(line.replace(/^\s*[-*]\s/, ""))}</div>`;
      if (/^\s*\d+\.\s/.test(line)) return `<div class="pl-4 -indent-3">${inline(line.trim())}</div>`;
      if (/^\|/.test(line)) return /^\|[\s|:-]+\|$/.test(line) ? "" : `<div class="font-mono text-xs whitespace-pre overflow-x-auto">${inline(line)}</div>`;
      return line.trim() ? `<p class="mt-1.5">${inline(line)}</p>` : "";
    })
    .join("");
  return <div className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    if (!text.trim() || busy) return;
    const next: Msg[] = [...messages, { role: "user", content: text.trim() }];
    setMessages([...next, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next }) });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages([...next, { role: "assistant", content: acc }]);
        endRef.current?.scrollIntoView({ block: "end" });
      }
    } catch {
      setMessages([...next, { role: "assistant", content: "_Something went wrong. Try again._" }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!messages.length && (
        <div className="flex flex-wrap gap-2">
          {PROMPTS.map((p) => (
            <button key={p} onClick={() => send(p)} className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm hover:border-accent">
              {p}
            </button>
          ))}
        </div>
      )}
      <div className="space-y-3">
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-accent px-3 py-2 text-sm text-accent-ink">
              {m.content}
            </div>
          ) : (
            <div key={i} className="max-w-full rounded-2xl rounded-bl-sm border border-line bg-panel px-4 py-3">
              {m.content ? <Markdown text={m.content} /> : <span className="animate-pulse text-sm text-muted">Analyzing the market…</span>}
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>
      <form onSubmit={(e) => (e.preventDefault(), send(input))} className="sticky bottom-20 flex gap-2 lg:bottom-4">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask what to source…" className="flex-1 rounded-xl border border-line bg-panel-2 px-3 py-3" />
        <button disabled={busy} className="rounded-xl bg-accent px-4 font-semibold text-accent-ink disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
