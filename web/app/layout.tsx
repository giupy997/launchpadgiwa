import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from "@/components/ConnectButton";
import { ChainSwitcher } from "@/components/ChainSwitcher";
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
              <div className="flex items-center gap-2 shrink-0">
                <ChainSwitcher />
                <ConnectButton />
              </div>
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-10">{children}</main>
          <footer className="border-t border-zinc-900">
            <div className="mx-auto max-w-5xl px-4 py-8 text-xs text-zinc-600 font-mono tracking-wide">
              HOLO LAUNCHPAD · MULTICHAIN ·{" "}
              <a
                className="underline hover:text-zinc-300"
                href="https://github.com/giupy997/launchpadgiwa"
                target="_blank"
              >
                SOURCE
              </a>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
