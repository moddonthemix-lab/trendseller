import type { Metadata, Viewport } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reseller Edge AI",
  description: "Personal reselling intelligence: what to buy today, where, and why.",
  applicationName: "Reseller Edge",
  appleWebApp: { capable: true, title: "Reseller Edge", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0f14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh font-sans">
        <Nav />
        <main className="mx-auto max-w-6xl px-4 pb-24 pt-5 lg:ml-56 lg:px-8 lg:pb-10">{children}</main>
      </body>
    </html>
  );
}
