"use client";

import { useEffect, useRef, useState } from "react";
import { useSwitchChain } from "wagmi";
import { APP_CHAINS } from "@/lib/config";
import { useAppChain } from "@/lib/hooks";

const CHAIN_LOGOS: Record<number, string> = {
  91342: "/chains/giwa.png",
  4663: "/chains/robinhood.png",
};

function ChainLogo({ id, size = 18 }: { id: number; size?: number }) {
  const src = CHAIN_LOGOS[id];
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- tiny local asset
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="rounded-full shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

export function ChainSwitcher() {
  const chain = useAppChain();
  const { switchChain, isPending } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={isPending}
        className="flex items-center gap-2 rounded-full bg-black border border-zinc-700 px-3 py-1.5 text-xs font-mono tracking-wider uppercase text-zinc-300 hover:border-white disabled:opacity-50"
        title="Switch chain"
      >
        <ChainLogo id={chain.id} />
        <span className="hidden sm:inline">{chain.name}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-700 bg-black p-1 z-20 shadow-lg shadow-black/60">
          {APP_CHAINS.map((c) => {
            const active = c.id === chain.id;
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (!active) switchChain({ chainId: c.id });
                }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm ${
                  active ? "bg-zinc-900 text-white" : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                }`}
              >
                <ChainLogo id={c.id} size={22} />
                <span className="flex-1">
                  {c.name}
                  {c.testnet && (
                    <span className="ml-2 font-mono text-[10px] tracking-widest uppercase text-zinc-500">
                      testnet
                    </span>
                  )}
                </span>
                {active && <span className="text-xs">●</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
