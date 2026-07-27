"use client";

import { useMemo, useState } from "react";
import { type Trade } from "@/lib/events";
import { fmtNum } from "@/lib/format";

type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

const INTERVALS = [60, 300, 900, 3600, 14_400, 86_400]; // 1m 5m 15m 1h 4h 1d

function intervalLabel(s: number): string {
  if (s < 3600) return `${s / 60}m`;
  if (s < 86_400) return `${s / 3600}h`;
  return `${s / 86_400}d`;
}

/** Bucket trades into OHLCV candles; auto interval targets ~48 candles. */
function buildCandles(trades: Trade[]): { candles: Candle[]; interval: number } {
  const priced = trades.filter((t) => t.tokens > 0n && t.timestamp > 0);
  if (priced.length === 0) return { candles: [], interval: 60 };

  const price = (t: Trade) => Number((t.eth * 10n ** 18n) / t.tokens) / 1e18;
  const span = priced[priced.length - 1].timestamp - priced[0].timestamp;
  const interval =
    INTERVALS.find((i) => span / i <= 48) ?? INTERVALS[INTERVALS.length - 1];

  const byBucket = new Map<number, Candle>();
  for (const t of priced) {
    const bucket = Math.floor(t.timestamp / interval) * interval;
    const p = price(t);
    const v = Number(t.eth) / 1e18;
    const c = byBucket.get(bucket);
    if (!c) byBucket.set(bucket, { t: bucket, o: p, h: p, l: p, c: p, v });
    else {
      c.h = Math.max(c.h, p);
      c.l = Math.min(c.l, p);
      c.c = p;
      c.v += v;
    }
  }

  // fill gaps with flat candles so time stays linear (cap at 120 candles)
  const keys = [...byBucket.keys()].sort((a, b) => a - b);
  const filled: Candle[] = [];
  for (let k = keys[0]; k <= keys[keys.length - 1]; k += interval) {
    const c = byBucket.get(k);
    if (c) filled.push(c);
    else {
      const prev = filled[filled.length - 1];
      if (prev) filled.push({ t: k, o: prev.c, h: prev.c, l: prev.c, c: prev.c, v: 0 });
    }
    if (filled.length > 120) filled.shift();
  }
  return { candles: filled, interval };
}

/** Monochrome DexScreener-style candlestick chart. Pure SVG, no deps. */
export function CandleChart({ trades }: { trades: Trade[] }) {
  const { candles, interval } = useMemo(() => buildCandles(trades), [trades]);
  const [hover, setHover] = useState<number | null>(null);

  if (candles.length < 2) {
    return (
      <div className="rounded-xl border border-zinc-800 p-6 text-center text-sm text-zinc-600">
        Chart appears after a couple of trades.
      </div>
    );
  }

  const W = 640;
  const H = 200;
  const VOL_H = 28;
  const PAD = 6;
  const plotH = H - VOL_H - PAD * 2;

  const min = Math.min(...candles.map((c) => c.l));
  const max = Math.max(...candles.map((c) => c.h));
  const span = max - min || max || 1;
  const maxV = Math.max(...candles.map((c) => c.v)) || 1;

  const slot = (W - PAD * 2) / candles.length;
  const bodyW = Math.max(1.5, Math.min(9, slot * 0.6));
  const x = (i: number) => PAD + i * slot + slot / 2;
  const y = (p: number) => PAD + plotH - ((p - min) * plotH) / span;

  const active = hover !== null ? candles[hover] : candles[candles.length - 1];
  const up = active.c >= active.o;

  return (
    <div className="rounded-xl border border-zinc-800 bg-black p-4">
      <div className="flex items-baseline justify-between gap-2 mb-2 flex-wrap">
        <span className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">
          Price · {intervalLabel(interval)} candles
        </span>
        <span className="font-mono text-[11px] text-zinc-300">
          O {fmtNum(active.o)} H {fmtNum(active.h)} L {fmtNum(active.l)} C{" "}
          <span className={up ? "text-white" : "text-zinc-500"}>{fmtNum(active.c)}</span>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto touch-none"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          const i = Math.round((px - PAD - slot / 2) / slot);
          setHover(Math.max(0, Math.min(candles.length - 1, i)));
        }}
        onMouseLeave={() => setHover(null)}
      >
        {/* grid */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={W - PAD}
            y1={PAD + plotH * f}
            y2={PAD + plotH * f}
            stroke="white"
            opacity="0.06"
          />
        ))}

        {candles.map((c, i) => {
          const isUp = c.c >= c.o;
          const top = y(Math.max(c.o, c.c));
          const bot = y(Math.min(c.o, c.c));
          const h = Math.max(1, bot - top);
          return (
            <g key={c.t} opacity={hover === null || hover === i ? 1 : 0.45}>
              {/* wick */}
              <line x1={x(i)} x2={x(i)} y1={y(c.h)} y2={y(c.l)} stroke="white" strokeWidth="1" opacity={isUp ? 1 : 0.55} />
              {/* body: up = solid white, down = hollow */}
              <rect
                x={x(i) - bodyW / 2}
                y={top}
                width={bodyW}
                height={h}
                fill={isUp ? "white" : "black"}
                stroke="white"
                strokeWidth="1"
                opacity={isUp ? 1 : 0.55}
              />
              {/* volume */}
              <rect
                x={x(i) - bodyW / 2}
                y={H - PAD - (c.v / maxV) * VOL_H}
                width={bodyW}
                height={(c.v / maxV) * VOL_H}
                fill="white"
                opacity="0.18"
              />
            </g>
          );
        })}

        {hover !== null && (
          <line
            x1={x(hover)}
            x2={x(hover)}
            y1={PAD}
            y2={H - PAD}
            stroke="white"
            opacity="0.25"
            strokeDasharray="3 3"
          />
        )}
      </svg>

      <div className="flex justify-between font-mono text-[10px] text-zinc-600 mt-1">
        <span>
          {new Date(candles[0].t * 1000).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <span>min {fmtNum(min)} · max {fmtNum(max)}</span>
        <span>
          {new Date(candles[candles.length - 1].t * 1000).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  );
}
