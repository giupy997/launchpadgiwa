"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { useAppChain } from "@/lib/hooks";

export function ConnectButton() {
  const { address, isConnected, chainId } = useAccount();
  const appChain = useAppChain();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();

  if (!isConnected) {
    return (
      <button
        onClick={() => connect({ connector: connectors[0] })}
        disabled={isPending || connectors.length === 0}
        className="rounded-full bg-white px-4 sm:px-5 py-2 text-sm font-semibold text-black hover:bg-zinc-200 disabled:opacity-50 whitespace-nowrap"
      >
        {isPending ? "Connecting…" : (
          <>
            Connect<span className="hidden sm:inline"> wallet</span>
          </>
        )}
      </button>
    );
  }

  const wrongNetwork = chainId !== appChain.id;

  return (
    <div className="flex items-center gap-1.5">
      {wrongNetwork && (
        <button
          onClick={() => switchChain({ chainId: appChain.id })}
          disabled={switching}
          title={`Wallet is on another network — switch to ${appChain.name}`}
          className="rounded-full border border-white w-8 h-8 text-xs font-bold text-white hover:bg-white hover:text-black disabled:opacity-50"
        >
          !
        </button>
      )}
      <button
        onClick={() => disconnect()}
        className="rounded-full border border-zinc-700 px-3 sm:px-4 py-2 text-sm font-mono text-zinc-300 hover:border-white hover:text-white"
        title="Disconnect"
      >
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </button>
    </div>
  );
}
