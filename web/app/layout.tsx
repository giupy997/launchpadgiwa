import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from "@/components/ConnectButton";
import { Nav } from "@/components/Nav";
import Link from "next/link";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "HOLO Launchpad — launch tokens on GIWA",
  description: "Launch your token on the bonding curve. GIWA Sepolia testnet.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-black text-white min-h-screen`}
      >
        <Providers>
          <header className="border-b border-zinc-800 sticky top-0 bg-black/90 backdrop-blur z-10">
            <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between gap-4">
              <Link
                href="/"
                className="font-mono text-lg font-bold tracking-[0.25em] uppercase shrink-0"
              >
                HOLO
              </Link>
              <Nav />
              <ConnectButton />
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
          <footer className="border-t border-zinc-900">
            <div className="mx-auto max-w-5xl px-4 py-8 text-xs text-zinc-600 font-mono tracking-wide">
              TESTNET ONLY — NO REAL VALUE · GIWA SEPOLIA · CONTRACT:{" "}
              <a
                className="underline hover:text-zinc-300"
                href="https://sepolia-explorer.giwa.io/address/0x1f3F5C50f670D2B4d6d0f83c40Df92DBbE41fC73"
                target="_blank"
              >
                0x1f3F…fC73
              </a>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
