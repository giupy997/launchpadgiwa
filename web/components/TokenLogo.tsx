"use client";

import { useState } from "react";

/** Square (1:1) token logo with a monochrome fallback. */
export function TokenLogo({
  uri,
  symbol,
  size = 48,
}: {
  uri: string;
  symbol: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (!uri || failed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-lg border border-zinc-700 bg-black font-mono font-bold text-zinc-400 select-none"
      >
        {symbol?.slice(0, 1).toUpperCase() || "?"}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- arbitrary external hosts
    <img
      src={uri}
      alt={symbol}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className="rounded-lg object-cover aspect-square border border-zinc-800 grayscale hover:grayscale-0 transition"
    />
  );
}
