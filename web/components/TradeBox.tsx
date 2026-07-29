"use client";

import { useState } from "react";
import { erc20Abi, parseUnits } from "viem";
import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { launchpadAbi, launchTokenAbi } from "@/lib/abi";
import {
  useLaunchpadAddress,
  useExplorer,
  useAppChain,
  quoteInfo,
  type CurveInfo,
} from "@/lib/hooks";
import { fmtUnits, fmtTokens } from "@/lib/format";
import { SlippageControl, useSlippageBps } from "@/components/SlippageControl";

export function TradeBox({
  token,
  symbol,
  curve,
}: {
  token: `0x${string}`;
  symbol: string;
  curve: CurveInfo;
}) {
  const padMaybe = useLaunchpadAddress();
  const deployed = !!padMaybe;
  const pad = padMaybe ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`);
  const explorer = useExplorer();
  const chain = useAppChain();
  const { address: user, isConnected } = useAccount();
  const [mode, setMode] = useState<"buy" | "sell">("buy");
  const [slippageBps, setSlippageBps] = useSlippageBps();
  const [amount, setAmount] = useState("");

  const q = quoteInfo(chain.id, curve.quoteAsset);
  const isEthQuote = q.address === null;
  const graduated = curve.graduated;

  const parsed = safeParse(amount, mode === "buy" ? q.decimals : 18);

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

  // ERC-20 quote curves: quote-asset allowance and balance for the buy side
  const { data: quoteAllowance } = useReadContract({
    address: q.address ?? undefined,
    abi: erc20Abi,
    functionName: "allowance",
    args: user && q.address ? [user, pad] : undefined,
    query: { enabled: !!user && !!q.address, refetchInterval: 5_000 },
  });

  const { data: quoteBalance } = useReadContract({
    address: q.address ?? undefined,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: user && q.address ? [user] : undefined,
    query: { enabled: !!user && !!q.address, refetchInterval: 5_000 },
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

  const needsSellApproval =
    mode === "sell" && parsed > 0n && (allowance === undefined || (allowance as bigint) < parsed);
  const needsBuyApproval =
    mode === "buy" &&
    !isEthQuote &&
    parsed > 0n &&
    (quoteAllowance === undefined || (quoteAllowance as bigint) < parsed);

  function withSlippage(quote: bigint): bigint {
    return quote - (quote * BigInt(slippageBps)) / 10_000n;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    reset();
    if (mode === "buy") {
      if (isEthQuote) {
        writeContract({
          address: pad,
          abi: launchpadAbi,
          functionName: "buy",
          chainId: chain.id,
          args: [token, buyQuote !== undefined ? withSlippage(buyQuote as bigint) : 0n],
          value: parsed,
        });
      } else if (needsBuyApproval) {
        writeContract({
          address: q.address!,
          abi: erc20Abi,
          functionName: "approve",
          chainId: chain.id,
          args: [pad, parsed],
        });
      } else {
        writeContract({
          address: pad,
          abi: launchpadAbi,
          functionName: "buyWithQuote",
          chainId: chain.id,
          args: [token, parsed, buyQuote !== undefined ? withSlippage(buyQuote as bigint) : 0n],
        });
      }
    } else if (needsSellApproval) {
      writeContract({
        address: token,
        abi: launchTokenAbi,
        functionName: "approve",
        chainId: chain.id,
        args: [pad, parsed],
      });
    } else {
      writeContract({
        address: pad,
        abi: launchpadAbi,
        functionName: "sell",
        chainId: chain.id,
        args: [token, parsed, sellQuote !== undefined ? withSlippage(sellQuote as bigint) : 0n],
      });
    }
  }

  if (graduated) {
    return (
      <div className="rounded-xl border border-zinc-700 bg-black p-5 h-fit">
        <p className="text-sm text-zinc-300">
          🎓 Curve completed: trading here is closed. This token now trades on
          the DEX, paired with {q.symbol}.
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
            placeholder={mode === "buy" ? `${q.symbol} to spend` : `${symbol} to sell`}
            type="number"
            step="any"
            min="0"
            className="w-full rounded-lg bg-black border border-zinc-700 px-3 py-2 text-sm focus:border-white outline-none"
          />
          {mode === "buy" && !isEthQuote && quoteBalance !== undefined && (
            <p className="mt-1 text-xs text-zinc-500">
              Balance: {fmtUnits(quoteBalance as bigint, q.decimals)} {q.symbol}
            </p>
          )}
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
          <p className="text-sm text-zinc-400">
            ≈ {fmtUnits(sellQuote as bigint, q.decimals)} {q.symbol}
          </p>
        )}

        <button
          type="submit"
          disabled={!deployed || !isConnected || parsed === 0n || isPending || isConfirming}
          className={`w-full rounded-lg py-2.5 font-semibold text-black disabled:opacity-40 ${
            mode === "buy" ? "bg-white hover:bg-zinc-200" : "bg-zinc-300 hover:bg-white"
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
                  : needsBuyApproval
                    ? `Approve ${q.symbol}`
                    : needsSellApproval
                      ? `Approve ${symbol}`
                      : mode === "buy"
                        ? "Buy"
                        : "Sell"}
        </button>
      </form>

      <SlippageControl bps={slippageBps} onChange={setSlippageBps} />
      <p className="text-xs text-zinc-600">1% fee · 50% creator · 30% holders · 20% treasury</p>

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

function safeParse(v: string, decimals: number): bigint {
  try {
    return v ? parseUnits(v, decimals) : 0n;
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
