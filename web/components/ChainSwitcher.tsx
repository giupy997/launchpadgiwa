"use client";

import { useSwitchChain } from "wagmi";
import { APP_CHAINS } from "@/lib/config";
import { useAppChain } from "@/lib/hooks";

export function ChainSwitcher() {
  const chain = useAppChain();
  const { switchChain, isPending } = useSwitchChain();

  return (
    <select
      value={chain.id}
      disabled={isPending}
      onChange={(e) => switchChain({ chainId: Number(e.target.value) })}
      className="rounded-full bg-black border border-zinc-700 px-3 py-2 text-xs font-mono tracking-wider uppercase text-zinc-300 focus:border-white outline-none hover:border-white cursor-pointer disabled:opacity-50"
      title="Switch chain"
    >
      {APP_CHAINS.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
          {c.testnet ? " · testnet" : ""}
        </option>
      ))}
    </select>
  );
}
