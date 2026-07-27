import { formatEther } from "viem";

const SUB = "₀₁₂₃₄₅₆₇₈₉";

/** 0.0000000012 -> "0.0₈12" (DexScreener-style compressed zeros). */
function subscriptSmall(v: number, sig = 3): string {
  const m = v.toFixed(20).match(/^0\.(0+)([1-9]\d*)/);
  if (!m) return "0";
  const zeros = m[1].length;
  const digits = m[2].slice(0, sig).replace(/0+$/, "") || m[2][0];
  const sub = String(zeros)
    .split("")
    .map((d) => SUB[Number(d)])
    .join("");
  return `0.0${sub}${digits}`;
}

/** Human ETH amount: sensible digits per magnitude, subscript zeros when tiny. */
export function fmtEth(wei: bigint, _digits = 5): string {
  const v = Number(formatEther(wei));
  return fmtNum(v);
}

/** Same formatting for plain numbers (chart axis, prices). */
export function fmtNum(v: number): string {
  if (v === 0) return "0";
  if (v >= 1000) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 4 });
  if (v >= 0.001) return v.toLocaleString("en-US", { maximumFractionDigits: 5 });
  return subscriptSmall(v);
}

export function fmtTokens(wei: bigint): string {
  const v = Number(formatEther(wei));
  if (v >= 1_000_000_000) return (v / 1_000_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "B";
  if (v >= 1_000_000) return (v / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "M";
  if (v >= 1_000) return (v / 1_000).toLocaleString("en-US", { maximumFractionDigits: 2 }) + "k";
  if (v > 0 && v < 0.01) return "<0.01";
  return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}
