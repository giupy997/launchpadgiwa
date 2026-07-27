"use client";

import { useReadContracts } from "wagmi";
import { launchpadAbi, launchTokenAbi } from "@/lib/abi";
import { useLaunchpadAddress, curveProgress, spotPrice, type CurveInfo } from "@/lib/hooks";
import { fmtEth, fmtTokens, shortAddr } from "@/lib/format";
import { EXPLORER } from "@/lib/config";
import { TradeBox } from "@/components/TradeBox";

export default function TokenPage({ params }: { params: { address: string } }) {
  const token = params.address as `0x${string}`;
  const pad = useLaunchpadAddress();

  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: token, abi: launchTokenAbi, functionName: "name" },
      { address: token, abi: launchTokenAbi, functionName: "symbol" },
      { address: pad, abi: launchpadAbi, functionName: "curves", args: [token] },
    ],
    query: { refetchInterval: 5_000 },
  });

  if (isLoading || !data) return <p className="text-zinc-500">Loading…</p>;

  const [nameR, symbolR, curveR] = data;
  if (curveR.status !== "success" || (curveR.result as readonly unknown[])[0] === 0n) {
    return <p className="text-zinc-500">Token not found on this launchpad.</p>;
  }

  const name = nameR.status === "success" ? (nameR.result as string) : "?";
  const symbol = symbolR.status === "success" ? (symbolR.result as string) : "?";
  const [vEth, vToken, realEth, sold, graduated, creator] = curveR.result as readonly [
    bigint,
    bigint,
    bigint,
    bigint,
    boolean,
    `0x${string}`,
  ];
  const curve: CurveInfo = { vEth, vToken, realEth, sold, graduated, creator };
  const progress = curveProgress(curve);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">
            {name} <span className="text-emerald-400 text-xl">${symbol}</span>
            {graduated && <span className="ml-3 text-lg">🎓</span>}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            <a href={`${EXPLORER}/address/${token}`} target="_blank" className="underline">
              {shortAddr(token)}
            </a>{" "}
            · creator {shortAddr(creator)}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Price" value={`${fmtEth(spotPrice(curve), 12)} ETH`} />
          <Stat label="Raised" value={`${fmtEth(realEth)} ETH`} />
          <Stat label="Sold" value={fmtTokens(sold)} />
          <Stat label="Curve" value={graduated ? "Graduated" : `${progress.toFixed(1)}%`} />
        </div>

        <div>
          <div className="h-2.5 rounded bg-zinc-800 overflow-hidden">
            <div
              className={`h-full ${graduated ? "bg-amber-400" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Once 800M tokens are sold the curve closes and liquidity migrates to the DEX.
          </p>
        </div>
      </div>

      <TradeBox token={token} symbol={symbol} graduated={graduated} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="mt-1 font-semibold text-sm">{value}</div>
    </div>
  );
}
