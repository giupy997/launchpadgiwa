"use client";

import Link from "next/link";
import { useTokens, spotPrice, curveProgress } from "@/lib/hooks";
import { fmtEth, shortAddr } from "@/lib/format";
import { CreateTokenForm } from "@/components/CreateTokenForm";

export default function Home() {
  const { tokens, isLoading, count } = useTokens();

  return (
    <div className="space-y-10">
      <section className="text-center space-y-3 py-6">
        <h1 className="text-4xl font-bold tracking-tight">
          Lancia il tuo token su <span className="text-emerald-400">GIWA</span>
        </h1>
        <p className="text-zinc-400 max-w-xl mx-auto">
          Bonding curve trasparente: prezzo che sale a ogni acquisto, graduation
          automatica a 800M di token venduti, liquidità migrata sul DEX.
        </p>
      </section>

      <CreateTokenForm />

      <section>
        <h2 className="text-lg font-semibold mb-4 text-zinc-300">
          Token lanciati {count > 0 && <span className="text-zinc-500">({count})</span>}
        </h2>

        {isLoading && <p className="text-zinc-500">Caricamento dalla chain…</p>}
        {!isLoading && tokens.length === 0 && (
          <p className="text-zinc-500">Ancora nessun token. Sii il primo a lanciare.</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tokens.map((t) => {
            const progress = curveProgress(t.curve);
            return (
              <Link
                key={t.address}
                href={`/token/${t.address}`}
                className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-emerald-500/50 transition-colors"
              >
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold">{t.name}</span>
                  <span className="text-sm text-emerald-400">${t.symbol}</span>
                </div>
                <div className="mt-2 text-xs text-zinc-500">
                  creator {shortAddr(t.curve.creator)}
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span className="text-zinc-400">
                    {fmtEth(spotPrice(t.curve), 12)} ETH
                  </span>
                  <span className="text-zinc-400">
                    raccolti {fmtEth(t.curve.realEth)} ETH
                  </span>
                </div>
                <div className="mt-3 h-1.5 rounded bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full ${t.curve.graduated ? "bg-amber-400" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-zinc-500">
                  {t.curve.graduated ? "🎓 Graduato" : `curva ${progress.toFixed(1)}%`}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
