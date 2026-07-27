"use client";

import Link from "next/link";
import { useTokens, spotPrice, curveProgress } from "@/lib/hooks";
import { fmtEth, shortAddr } from "@/lib/format";
import { CreateTokenForm } from "@/components/CreateTokenForm";
import { TokenLogo } from "@/components/TokenLogo";

export default function Home() {
  const { tokens, isLoading, count } = useTokens();

  return (
    <div className="space-y-14">
      <section className="text-center space-y-4 py-8">
        <h1 className="font-mono text-3xl sm:text-4xl font-bold tracking-[0.15em] uppercase leading-snug">
          Launch your token
          <br />
          on GIWA
        </h1>
        <p className="text-zinc-400 max-w-xl mx-auto">
          Transparent bonding curve: price rises with every buy, automatic
          graduation at 800M tokens sold, liquidity migrated to the DEX.
        </p>
      </section>

      <CreateTokenForm />

      <section>
        <h2 className="font-mono text-sm font-semibold tracking-[0.2em] uppercase mb-5 text-zinc-400">
          Launched tokens {count > 0 && <span className="text-zinc-600">({count})</span>}
        </h2>

        {isLoading && <p className="text-zinc-500">Loading from chain…</p>}
        {!isLoading && tokens.length === 0 && (
          <p className="text-zinc-500">No tokens yet. Be the first to launch.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map((t) => {
            const progress = curveProgress(t.curve);
            return (
              <Link
                key={t.address}
                href={`/token/${t.address}`}
                className="rounded-xl border border-zinc-800 bg-black p-4 hover:border-white transition-colors"
              >
                <div className="flex items-center gap-3">
                  <TokenLogo uri={t.meta.logoURI} symbol={t.symbol} size={44} />
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{t.name}</div>
                    <div className="font-mono text-xs text-zinc-400">${t.symbol}</div>
                  </div>
                </div>
                <div className="mt-3 text-xs text-zinc-500">
                  creator {shortAddr(t.curve.creator)}
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-zinc-300">{fmtEth(spotPrice(t.curve), 12)} ETH</span>
                  <span className="text-zinc-500">raised {fmtEth(t.curve.realEth)} ETH</span>
                </div>
                <div className="mt-3 h-1 rounded bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-white"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="mt-1.5 font-mono text-[10px] tracking-widest uppercase text-zinc-500">
                  {t.curve.graduated ? "Graduated" : `curve ${progress.toFixed(1)}%`}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
