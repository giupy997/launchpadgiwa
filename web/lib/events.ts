"use client";

import { useQuery } from "@tanstack/react-query";
import { parseAbiItem, type AbiEvent, type PublicClient } from "viem";
import { usePublicClient } from "wagmi";
import { LAUNCHPAD_DEPLOY_BLOCK } from "./config";
import { useAppChain, useLaunchpadAddress } from "./hooks";

export type Trade = {
  type: "buy" | "sell";
  trader: `0x${string}`;
  eth: bigint;
  tokens: bigint;
  block: bigint;
  tx: `0x${string}`;
  timestamp: number; // unix seconds, 0 if unknown
};

const boughtEvent = parseAbiItem(
  "event Bought(address indexed token, address indexed buyer, uint256 ethIn, uint256 tokensOut, uint256 fee)"
);
const soldEvent = parseAbiItem(
  "event Sold(address indexed token, address indexed seller, uint256 tokensIn, uint256 ethOut, uint256 fee)"
);

/** Chunked getLogs: public RPCs cap the block range per request. */
async function getLogsChunked(
  client: PublicClient,
  params: { address: `0x${string}`; event: AbiEvent; args: { token: `0x${string}` } },
  fromBlock: bigint,
  toBlock: bigint
) {
  const CHUNK = 90_000n;
  const MAX_CHUNKS = 40; // scan cap; log a truncation flag beyond this
  const logs = [];
  let chunks = 0;
  // scan backwards so the most recent trades arrive even if we hit the cap
  let hi = toBlock;
  while (hi >= fromBlock && chunks < MAX_CHUNKS) {
    const lo = hi - CHUNK + 1n > fromBlock ? hi - CHUNK + 1n : fromBlock;
    logs.push(
      ...(await client.getLogs({ ...params, fromBlock: lo, toBlock: hi }))
    );
    hi = lo - 1n;
    chunks++;
  }
  return { logs, truncated: hi >= fromBlock };
}

/** All curve trades for a token, oldest first, with block timestamps for the
 *  most recent ones. No backend: reads straight from the chain. */
export function useTrades(token: `0x${string}`) {
  const client = usePublicClient();
  const chain = useAppChain();
  const pad = useLaunchpadAddress();
  const deployBlock = LAUNCHPAD_DEPLOY_BLOCK[chain.id] ?? 0n;

  return useQuery({
    queryKey: ["trades", chain.id, token],
    enabled: !!client && !!pad,
    refetchInterval: 15_000,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<{ trades: Trade[]; truncated: boolean }> => {
      if (!client || !pad) return { trades: [], truncated: false };
      const latest = await client.getBlockNumber();

      const [bought, sold] = await Promise.all([
        getLogsChunked(client, { address: pad, event: boughtEvent, args: { token } }, deployBlock, latest),
        getLogsChunked(client, { address: pad, event: soldEvent, args: { token } }, deployBlock, latest),
      ]);

      const trades: Trade[] = [
        ...bought.logs.map((l) => {
          const a = l.args as { buyer: `0x${string}`; ethIn: bigint; tokensOut: bigint };
          return {
            type: "buy" as const,
            trader: a.buyer,
            eth: a.ethIn,
            tokens: a.tokensOut,
            block: l.blockNumber,
            tx: l.transactionHash,
            timestamp: 0,
          };
        }),
        ...sold.logs.map((l) => {
          const a = l.args as { seller: `0x${string}`; tokensIn: bigint; ethOut: bigint };
          return {
            type: "sell" as const,
            trader: a.seller,
            eth: a.ethOut,
            tokens: a.tokensIn,
            block: l.blockNumber,
            tx: l.transactionHash,
            timestamp: 0,
          };
        }),
      ].sort((a, b) => (a.block === b.block ? 0 : a.block < b.block ? -1 : 1));

      // timestamps for the last 300 trades — unique blocks only, and the
      // batched transport coalesces these into a handful of HTTP requests
      const recentBlocks = [...new Set(trades.slice(-300).map((t) => t.block))];
      const stamps = new Map<bigint, number>();
      await Promise.all(
        recentBlocks.map(async (bn) => {
          const b = await client.getBlock({ blockNumber: bn });
          stamps.set(bn, Number(b.timestamp));
        })
      );
      for (const t of trades) t.timestamp = stamps.get(t.block) ?? 0;

      return { trades, truncated: bought.truncated || sold.truncated };
    },
  });
}

/** Price per whole token (wei) implied by each trade, chronological. */
export function pricePoints(trades: Trade[]): number[] {
  return trades
    .filter((t) => t.tokens > 0n)
    .map((t) => Number((t.eth * 10n ** 18n) / t.tokens) / 1e18);
}
