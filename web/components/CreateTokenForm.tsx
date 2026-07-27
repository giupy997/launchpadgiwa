"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { launchpadAbi } from "@/lib/abi";
import { useLaunchpadAddress } from "@/lib/hooks";
import { EXPLORER } from "@/lib/config";

export function CreateTokenForm() {
  const pad = useLaunchpadAddress();
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [initialBuy, setInitialBuy] = useState("");

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    writeContract({
      address: pad,
      abi: launchpadAbi,
      functionName: "createToken",
      args: [name.trim(), symbol.trim().toUpperCase(), 0n],
      value: initialBuy ? parseEther(initialBuy) : 0n,
    });
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 max-w-xl mx-auto">
      <h2 className="font-semibold mb-4">🚀 Crea un token</h2>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nome (es. Giwa Cat)"
            required
            maxLength={32}
            className="rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
          />
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Ticker (es. GCAT)"
            required
            maxLength={10}
            className="rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm uppercase focus:border-emerald-500 outline-none"
          />
        </div>
        <input
          value={initialBuy}
          onChange={(e) => setInitialBuy(e.target.value)}
          placeholder="Acquisto iniziale in ETH (opzionale)"
          type="number"
          step="any"
          min="0"
          className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3 py-2 text-sm focus:border-emerald-500 outline-none"
        />
        <button
          type="submit"
          disabled={!isConnected || isPending || isConfirming}
          className="w-full rounded-lg bg-emerald-500 py-2.5 font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-40"
        >
          {!isConnected
            ? "Connetti il wallet per lanciare"
            : isPending
              ? "Firma nel wallet…"
              : isConfirming
                ? "In conferma…"
                : "Lancia il token"}
        </button>
      </form>

      {isSuccess && hash && (
        <p className="mt-3 text-sm text-emerald-400">
          Token creato!{" "}
          <a href={`${EXPLORER}/tx/${hash}`} target="_blank" className="underline">
            Vedi transazione
          </a>{" "}
          <button onClick={() => reset()} className="text-zinc-500 underline ml-2">
            ok
          </button>
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-red-400 break-all">
          {(error as { shortMessage?: string }).shortMessage ?? error.message}
        </p>
      )}
    </section>
  );
}
