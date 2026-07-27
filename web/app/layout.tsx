import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { ConnectButton } from "@/components/ConnectButton";
import Link from "next/link";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
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
        className={`${geistSans.variable} font-sans antialiased bg-zinc-950 text-zinc-100 min-h-screen`}
      >
        <Providers>
          <header className="border-b border-zinc-800">
            <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
              <Link href="/" className="text-xl font-bold tracking-tight">
                <span className="text-emerald-400">HOLO</span> Launchpad
                <span className="ml-2 rounded bg-zinc-800 px-2 py-0.5 text-xs font-normal text-zinc-400">
                  GIWA Sepolia
                </span>
              </Link>
              <ConnectButton />
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
          <footer className="mx-auto max-w-5xl px-4 py-8 text-xs text-zinc-600">
            Testnet only — no real value. Contract:{" "}
            <a
              className="underline hover:text-zinc-400"
              href="https://sepolia-explorer.giwa.io/address/0xf71bA49eaD9ae0b208F6BAb8769ae19C98629cC1"
              target="_blank"
            >
              0xf71b…9cC1
            </a>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
