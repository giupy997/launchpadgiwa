"use client";

import {
  useAccount,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { launchpadAbi } from "@/lib/abi";
import { useLaunchpadAddress } from "@/lib/hooks";
import { fmtEth } from "@/lib/format";

/** Accrued creator fee earnings (60% of trade fees) with a claim button.
 *  Renders nothing on chains whose deployment predates creator fees. */
export function CreatorFees() {
  const pad = useLaunchpadAddress();
  const { address: user } = useAccount();

  const { data: accrued, isError } = useReadContract({
    address: pad,
    abi: launchpadAbi,
    functionName: "creatorFees",
    args: user ? [user] : undefined,
    query: { enabled: !!pad && !!user, refetchInterval: 10_000 },
  });

  const { writeContract, data: hash, isPending, error, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (!pad || !user || isError || accrued === undefined) return null;

  const amount = accrued as bigint;

  return (
    <div className="rounded-xl border border-zinc-800 px-5 py-3">
      <div className="font-mono text-[10px] tracking-widest uppercase text-zinc-500">
        Creator earnings
      </div>
      <div className="mt-0.5 flex items-center gap-3">
        <span className="font-semibold">{fmtEth(amount)} ETH</span>
        {amount > 0n && (
          <button
            onClick={() => {
              reset();
              writeContract({ address: pad, abi: launchpadAbi, functionName: "claimCreatorFees" });
            }}
            disabled={isPending || isConfirming}
            className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black hover:bg-zinc-200 disabled:opacity-40"
          >
            {isPending ? "Sign…" : isConfirming ? "Claiming…" : "Claim"}
          </button>
        )}
        {isSuccess && <span className="text-xs text-zinc-400">claimed ✓</span>}
      </div>
      {error && (
        <p className="mt-1 text-xs text-zinc-500 break-all">
          {(error as { shortMessage?: string }).shortMessage ?? error.message}
        </p>
      )}
      <p className="mt-1 text-[11px] text-zinc-600">60% of the 1% trade fee on your tokens.</p>
    </div>
  );
}
