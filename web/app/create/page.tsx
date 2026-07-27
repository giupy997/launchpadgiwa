"use client";

import { CreateTokenForm } from "@/components/CreateTokenForm";

export default function CreatePage() {
  return (
    <div className="space-y-8">
      <section className="text-center space-y-3 py-4">
        <h1 className="font-mono text-2xl sm:text-3xl font-bold tracking-[0.15em] uppercase">
          Create a token
        </h1>
        <p className="text-zinc-400 max-w-xl mx-auto text-sm">
          1B total supply. 800M sold on the bonding curve, 200M reserved for DEX
          liquidity at graduation. 1% fee on trades.
        </p>
      </section>
      <CreateTokenForm />
    </div>
  );
}
