"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { launchpadAbi } from "@/lib/abi";
import { useLaunchpadAddress, useExplorer } from "@/lib/hooks";
import { TokenLogo } from "@/components/TokenLogo";

const inputCls =
  "w-full rounded-lg bg-black border border-zinc-700 px-3 py-2 text-sm focus:border-white outline-none placeholder:text-zinc-600";

export function CreateTokenForm() {
  const padMaybe = useLaunchpadAddress();
  const deployed = !!padMaybe;
  const pad = padMaybe ?? ("0x0000000000000000000000000000000000000000" as `0x${string}`);
  const explorer = useExplorer();
  const { isConnected } = useAccount();
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [initialBuy, setInitialBuy] = useState("");
  const [logoURI, setLogoURI] = useState("");
  const [website, setWebsite] = useState("");
  const [twitter, setTwitter] = useState("");
  const [telegram, setTelegram] = useState("");

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    writeContract({
      address: pad,
      abi: launchpadAbi,
      functionName: "createToken",
      args: [
        name.trim(),
        symbol.trim().toUpperCase(),
        0n,
        {
          logoURI: logoURI.trim(),
          website: website.trim(),
          twitter: twitter.trim(),
          telegram: telegram.trim(),
        },
      ],
      value: initialBuy ? parseEther(initialBuy) : 0n,
    });
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-black p-6 max-w-xl mx-auto">
      <h2 className="font-mono text-sm font-semibold tracking-[0.2em] uppercase mb-5">
        Create a token
      </h2>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. Giwa Cat)"
            required
            maxLength={32}
            className={inputCls}
          />
          <input
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            placeholder="Ticker (e.g. GCAT)"
            required
            maxLength={10}
            className={`${inputCls} uppercase`}
          />
        </div>

        <div className="flex gap-3 items-start">
          <input
            value={logoURI}
            onChange={(e) => setLogoURI(e.target.value)}
            placeholder="Logo URL — square 1:1 image (optional)"
            type="url"
            className={inputCls}
          />
          <TokenLogo uri={logoURI.trim()} symbol={symbol} size={38} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="Website"
            type="url"
            className={inputCls}
          />
          <input
            value={twitter}
            onChange={(e) => setTwitter(e.target.value)}
            placeholder="X / Twitter"
            type="url"
            className={inputCls}
          />
          <input
            value={telegram}
            onChange={(e) => setTelegram(e.target.value)}
            placeholder="Telegram"
            type="url"
            className={inputCls}
          />
        </div>

        <input
          value={initialBuy}
          onChange={(e) => setInitialBuy(e.target.value)}
          placeholder="Initial buy in ETH (optional)"
          type="number"
          step="any"
          min="0"
          className={inputCls}
        />

        <button
          type="submit"
          disabled={!deployed || !isConnected || isPending || isConfirming}
          className="w-full rounded-full bg-white py-2.5 font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
        >
          {!deployed
            ? "Not deployed on this chain"
            : !isConnected
            ? "Connect wallet to launch"
            : isPending
              ? "Sign in wallet…"
              : isConfirming
                ? "Confirming…"
                : "Launch token"}
        </button>
      </form>

      {isSuccess && hash && (
        <p className="mt-3 text-sm text-zinc-300">
          Token created!{" "}
          <a href={`${explorer}/tx/${hash}`} target="_blank" className="underline">
            View transaction
          </a>{" "}
          <button onClick={() => reset()} className="text-zinc-500 underline ml-2">
            ok
          </button>
        </p>
      )}
      {error && (
        <p className="mt-3 text-sm text-zinc-400 break-all border border-zinc-700 rounded-lg p-2">
          ⚠ {(error as { shortMessage?: string }).shortMessage ?? error.message}
        </p>
      )}
    </section>
  );
}
