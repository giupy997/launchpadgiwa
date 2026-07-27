"use client";

import { useReadContracts } from "wagmi";
import { launchpadAbi, launchTokenAbi } from "@/lib/abi";
import {
  useLaunchpadAddress,
  curveProgress,
  spotPrice,
  parseCurve,
  parseMeta,
  useExplorer,
} from "@/lib/hooks";
import { fmtEth, fmtTokens, shortAddr } from "@/lib/format";
import { TradeBox } from "@/components/TradeBox";
import { TokenLogo } from "@/components/TokenLogo";
import { PriceChart } from "@/components/PriceChart";
import { TradeFeed } from "@/components/TradeFeed";
import { useTrades, pricePoints } from "@/lib/events";
import { safeLink } from "@/lib/sanitize";

export default function TokenPage({ params }: { params: { address: string } }) {
  const token = params.address as `0x${string}`;
  const { data: tradeData } = useTrades(token);
  const pad = useLaunchpadAddress() ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`);
  const explorer = useExplorer();

  const { data, isLoading } = useReadContracts({
    contracts: [
      { address: token, abi: launchTokenAbi, functionName: "name" },
      { address: token, abi: launchTokenAbi, functionName: "symbol" },
      { address: pad, abi: launchpadAbi, functionName: "curves", args: [token] },
      { address: pad, abi: launchpadAbi, functionName: "tokenMetadata", args: [token] },
    ],
    query: { refetchInterval: 5_000 },
  });

  if (isLoading || !data) return <p className="text-zinc-500">Loading…</p>;

  const [nameR, symbolR, curveR, metaR] = data;
  if (curveR.status !== "success" || (curveR.result as readonly unknown[])[0] === 0n) {
    return <p className="text-zinc-500">Token not found on this launchpad.</p>;
  }

  const name = nameR.status === "success" ? (nameR.result as string) : "?";
  const symbol = symbolR.status === "success" ? (symbolR.result as string) : "?";
  const curve = parseCurve(curveR.result);
  const meta =
    metaR.status === "success"
      ? parseMeta(metaR.result)
      : { logoURI: "", website: "", twitter: "", telegram: "" };
  const progress = curveProgress(curve);

  const links = [
    { label: "Website", href: safeLink(meta.website) },
    { label: "X", href: safeLink(meta.twitter) },
    { label: "Telegram", href: safeLink(meta.telegram) },
  ].filter((l): l is { label: string; href: string } => l.href !== null);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <TokenLogo uri={meta.logoURI} symbol={symbol} size={72} />
          <div>
            <h1 className="text-3xl font-bold">
              {name}{" "}
              <span className="font-mono text-lg text-zinc-400">${symbol}</span>
              {curve.graduated && (
                <span className="ml-3 font-mono text-xs tracking-widest uppercase border border-white rounded-full px-2 py-0.5 align-middle">
                  Graduated
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              <a href={`${explorer}/address/${token}`} target="_blank" className="underline">
                {shortAddr(token)}
              </a>{" "}
              · creator {shortAddr(curve.creator)}
            </p>
            {links.length > 0 && (
              <div className="mt-2 flex gap-2">
                {links.map((l) => (
                  <a
                    key={l.label}
                    href={l.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300 hover:border-white hover:text-white"
                  >
                    {l.label} ↗
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Price" value={`${fmtEth(spotPrice(curve), 12)} ETH`} />
          <Stat label="Raised" value={`${fmtEth(curve.realEth)} ETH`} />
          <Stat label="Sold" value={fmtTokens(curve.sold)} />
          <Stat label="Curve" value={curve.graduated ? "Graduated" : `${progress.toFixed(1)}%`} />
        </div>

        <div>
          <div className="h-2 rounded bg-zinc-800 overflow-hidden">
            <div
              className="h-full bg-white"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Once 800M tokens are sold the curve closes and liquidity migrates to the DEX.
          </p>
        </div>

        <PriceChart points={pricePoints(tradeData?.trades ?? [])} />
        <TradeFeed
          trades={tradeData?.trades ?? []}
          symbol={symbol}
          truncated={tradeData?.truncated ?? false}
        />
      </div>

      <TradeBox token={token} symbol={symbol} graduated={curve.graduated} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-black p-3">
      <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">{label}</div>
      <div className="mt-1 font-semibold text-sm">{value}</div>
    </div>
  );
}
