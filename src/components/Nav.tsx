"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Today", icon: "☀" },
  { href: "/scanner", label: "Scan", icon: "⌖" },
  { href: "/arbitrage", label: "Local", icon: "⌂" },
  { href: "/assistant", label: "Ask AI", icon: "✦" },
  { href: "/inventory", label: "Inventory", icon: "▤" },
];

const MORE = [
  { href: "/products", label: "Product DB" },
  { href: "/gems", label: "Hidden Gems" },
  { href: "/deals", label: "Deal Detector" },
  { href: "/modes/audio", label: "Audio Mode" },
  { href: "/modes/camera", label: "Camera Mode" },
  { href: "/modes/gaming", label: "Gaming Mode" },
];

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Nav() {
  const path = usePathname();
  return (
    <>
      <aside className="fixed inset-y-0 left-0 hidden w-56 flex-col border-r border-line bg-panel px-3 py-5 lg:flex">
        <Link href="/" className="mb-6 px-2 text-lg font-black tracking-tight">
          Reseller <span className="text-accent">Edge</span>
        </Link>
        <nav className="flex flex-col gap-0.5 text-sm">
          {[...LINKS, ...MORE].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-2 py-1.5 ${isActive(path, l.href) ? "bg-panel-2 font-semibold text-ink" : "text-muted hover:text-ink"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="font-black tracking-tight">
          Reseller <span className="text-accent">Edge</span>
        </Link>
        <details className="relative">
          <summary className="cursor-pointer list-none rounded-lg border border-line px-3 py-1 text-sm text-muted">More</summary>
          <div className="absolute right-0 mt-2 flex w-44 flex-col rounded-xl border border-line bg-panel p-1 text-sm shadow-xl">
            {MORE.map((l) => (
              <Link key={l.href} href={l.href} className="rounded-lg px-3 py-2 hover:bg-panel-2">
                {l.label}
              </Link>
            ))}
          </div>
        </details>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive(path, l.href) ? "text-accent" : "text-muted"}`}>
            <span className="text-lg leading-none">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
