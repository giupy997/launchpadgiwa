"use client";

import { useState } from "react";
import { parseEther } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { launchpadAbi, launchTokenAbi } from "@/lib/abi";
import { useLaunchpadAddress, useExplorer, useAppChain } from "@/lib/hooks";
import { fmtEth, fmtTokens } from "@/lib/format";

const SLIPPAGE_BPS = 100n; // 1% tolerance on the quote

export function TradeBox({
  token,
  symbol,
  graduated,
}: {
  token: `0x${string}`;
  symbol: string;
  graduated: boolean;
}) {
  const padMaybe = useLaunchpadAddress();
  const deployed = !!padMaybe;
  const pad = padMaybe ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`);
  const explorer = useExplorer();
  const appChainId = useAppChain().id;
  const { address: user, isConnected } = useAccount();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");

  const parsed = safeParse(amount);

  const { data: balance } = useReadContract({
    address: token,
    abi: launchTokenAbi,
    functionName: "balanceOf",
    args: user ? [user] : undefined,
    query: { enabled: !!user, refetchInterval: 5_000 },
  });

  const { data: allowance } = useReadContract({
    address: token,
    abi: launchTokenAbi,
    functionName: "allowance",
    args: user ? [user, pad] : undefined,
    query: { enabled: !!user, refetchInterval: 5_000 },
  });

  const { data: buyQuote } = useReadContract({
    address: pad,
    abi: launchpadAbi,
    functionName: "quoteBuy",
    args: [token, parsed],
    query: { enabled: mode === "buy" && parsed > 0n, refetchInterval: 5_000 },
  });

  const { data: sellQuote } = useReadContract({
    address: pad,
    abi: launchpadAbi,
    functionName: "quoteSell",
    args: [token, parsed],
    query: { enabled: mode === "sell" && parsed > 0n, refetchInterval: 5_000 },
  });

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const needsApproval =
    mode === "sell" && parsed > 0n && (allowance === undefined || (allowance as bigint) < parsed);

  function withSlippage(quote: bigint): bigint {
    return quote - (quote * SLIPPAGE_BPS) / 10_000n;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    if (mode === "buy") {
      writeContract({
        address: pad,
        abi: launchpadAbi,
        functionName: "buy",
        chainId: appChainId,
        args: [token, buyQuote !== undefined ? withSlippage(buyQuote as bigint) : 0n],
        value: parsed,
      });
    } else if (needsApproval) {
      writeContract({
        address: token,
        abi: launchTokenAbi,
        functionName: "approve",
        chainId: appChainId,
        args: [pad, parsed],
      });
    } else {
      writeContract({
        address: pad,
        abi: launchpadAbi,
        functionName: "sell",
        chainId: appChainId,
        args: [token, parsed, sellQuote !== undefined ? withSlippage(sellQuote as bigint) : 0n],
      });
    }
  }

  if (graduated) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-black p-5 h-fit">
        <p className="text-sm text-zinc-300">
          🎓 Curve completed: trading here is closed. This token&apos;s liquidity
          lives (or will live) on the DEX after migration.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-5 h-fit space-y-4">
      <div className="grid grid-cols-2 rounded-lg bg-zinc-900 p-1 text-sm font-semibold">
        <Tab active={mode === "buy"} onClick={() => setMode("buy")}>
          Buy
        </Tab>
        <Tab active={mode === "sell"} onClick={() => setMode("sell")}>
          Sell
        </Tab>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <div>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={mode === "buy" ? "ETH to spend" : `${symbol} to sell`}
            type="number"
            step="any"
            min="0"
            className="w-full rounded-lg bg-black border border-zinc-700 px-3 py-2 text-sm focus:border-white outline-none"
          />
          {mode === "sell" && balance !== undefined && (
            <button
              type="button"
              onClick={() => setAmount(fmtRaw(balance as bigint))}
              className="mt-1 text-xs text-zinc-500 underline"
            >
              Max: {fmtTokens(balance as bigint)} {symbol}
            </button>
          )}
        </div>

        {parsed > 0n && mode === "buy" && buyQuote !== undefined && (
          <p className="text-sm text-zinc-400">
            ≈ {fmtTokens(buyQuote as bigint)} {symbol}
          </p>
        )}
        {parsed > 0n && mode === "sell" && sellQuote !== undefined && (
          <p className="text-sm text-zinc-400">≈ {fmtEth(sellQuote as bigint)} ETH</p>
        )}

        <button
          type="submit"
          disabled={!deployed || !isConnected || parsed === 0n || isPending || isConfirming}
          className={`w-full rounded-lg py-2.5 font-semibold text-black disabled:opacity-40 ${
            mode === "buy"
              ? "bg-white hover:bg-zinc-200"
              : "bg-zinc-300 hover:bg-white"
          }`}
        >
          {!deployed
            ? "Not deployed on this chain"
            : !isConnected
            ? "Connect wallet"
            : isPending
              ? "Sign in wallet…"
              : isConfirming
                ? "Confirming…"
                : needsApproval
                  ? `Approve ${symbol}`
                  : mode === "buy"
                    ? "Buy"
                    : "Sell"}
        </button>
      </form>

      <p className="text-xs text-zinc-600">1% fee · max 1% slippage on quote</p>

      {isSuccess && hash && (
        <p className="text-sm text-zinc-300">
          Done!{" "}
          <a href={`${explorer}/tx/${hash}`} target="_blank" className="underline">
            tx
          </a>
        </p>
      )}
      {error && (
        <p className="text-sm text-zinc-400 break-all">
          {(error as { shortMessage?: string }).shortMessage ?? error.message}
        </p>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const activeCls = "bg-white text-black";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md py-1.5 ${active ? activeCls : "text-zinc-400"}`}
    >
      {children}
    </button>
  );
}

function safeParse(v: string): bigint {
  try {
    return v ? parseEther(v) : 0n;
  } catch {
    return 0n;
  }
}

function fmtRaw(wei: bigint): string {
  // full-precision decimal string for the input field
  const s = wei.toString().padStart(19, "0");
  const int = s.slice(0, -18);
  const frac = s.slice(-18).replace(/0+$/, "");
  return frac ? `${int}.${frac}` : int;
}
