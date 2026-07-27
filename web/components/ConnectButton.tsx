"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { giwaSepolia } from "@/lib/config";

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isPending || connectors.length === 0}
        className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
      >
        {isPending ? "Connessione…" : "Connetti wallet"}
      </button>
    );
  }

  if (chainId !== giwaSepolia.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: giwaSepolia.id })}
        className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-400"
      >
        Passa a GIWA Sepolia
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800"
      title="Disconnetti"
    >
      {address?.slice(0, 6)}…{address?.slice(-4)}
    </button>
  );
}
