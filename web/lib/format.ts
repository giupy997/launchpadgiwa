import { formatEther } from "viem";

export function fmtEth(wei: bigint, digits = 5): string {
  const v = Number(formatEther(wei));
  if (v === 0) return "0";
  if (v < 0.00001) return v.toExponential(2);
  return v.toLocaleString("en-US", { maximumFractionDigits: digits });
}

export function fmtTokens(wei: bigint): string {
  const v = Number(formatEther(wei));
  if (v >= 1_000_000) return (v / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "M";
  if (v >= 1_000) return (v / 1_000).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "k";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
