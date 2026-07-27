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
        className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50"
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  if (chainId !== giwaSepolia.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: giwaSepolia.id })}
        className="rounded-full border border-white px-5 py-2 text-sm font-semibold text-white hover:bg-white hover:text-black"
      >
        Switch to GIWA Sepolia
      </button>
    );
  }

  return (
    <button
      onClick={() => disconnect()}
      className="rounded-full border border-zinc-700 px-5 py-2 text-sm font-mono text-zinc-300 hover:border-white hover:text-white"
      title="Disconnect"
    >
      {address?.slice(0, 6)}…{address?.slice(-4)}
    </button>
  );
}
