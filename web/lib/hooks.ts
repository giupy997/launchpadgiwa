"use client";

import { useMemo } from "react";
import { useChainId, useReadContract, useReadContracts } from "wagmi";
import { launchpadAbi, launchTokenAbi } from "./abi";
import { APP_CHAINS, giwaSepolia, LAUNCHPAD_ADDRESS } from "./config";

/** The app chain currently selected (falls back to GIWA Sepolia). */
export function useAppChain() {
  const chainId = useChainId();
  return APP_CHAINS.find((c) => c.id === chainId) ?? giwaSepolia;
}

/** Block explorer base URL for the current app chain. */
export function useExplorer() {
  return useAppChain().blockExplorers.default.url;
}

/** Launchpad address on the current app chain; undefined if not deployed yet. */
export function useLaunchpadAddress(): `0x${string}` | undefined {
  return LAUNCHPAD_ADDRESS[useAppChain().id];
}

export type CurveInfo = {
  vEth: bigint;
  vToken: bigint;
  realEth: bigint;
  sold: bigint;
  graduated: boolean;
  creator: `0x${string}`;
};

export type TokenMeta = {
  logoURI: string;
  website: string;
  twitter: string;
  telegram: string;
  livestream: string;
  description: string;
};

export type TokenInfo = {
  address: `0x${string}`;
  name: string;
  symbol: string;
  curve: CurveInfo;
  meta: TokenMeta;
};

const REFETCH = { refetchInterval: 5_000 } as const;

export function parseCurve(result: unknown): CurveInfo {
  const [vEth, vToken, realEth, sold, graduated, creator] = result as readonly [
    bigint,
    bigint,
    bigint,
    bigint,
    boolean,
    `0x${string}`,
  ];
  return { vEth, vToken, realEth, sold, graduated, creator };
}

export function parseMeta(result: unknown): TokenMeta {
  const [logoURI, website, twitter, telegram, livestream, description] = result as readonly [
    string,
    string,
    string,
    string,
    string,
    string,
  ];
  return { logoURI, website, twitter, telegram, livestream, description };
}

/** Full token list with name, symbol, curve state and metadata (multicall). */
export function useTokens() {
  const pad = useLaunchpadAddress();

  const { data: count } = useReadContract({
    address: pad,
    abi: launchpadAbi,
    functionName: "tokenCount",
    query: { ...REFETCH, enabled: !!pad },
  });

  const n = pad ? Number(count ?? 0n) : 0;
  const padSafe = (pad ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

  const { data: addrs } = useReadContracts({
    contracts: Array.from({ length: n }, (_, i) => ({
      address: padSafe,
      abi: launchpadAbi,
      functionName: "allTokens" as const,
      args: [BigInt(i)] as const,
    })),
    query: { enabled: n > 0 },
  });

  const tokenAddrs = useMemo(
    () =>
      (addrs ?? [])
        .map((r) => (r.status === "success" ? (r.result as `0x${string}`) : null))
        .filter((a): a is `0x${string}` => a !== null),
    [addrs]
  );

  const { data: details, isLoading } = useReadContracts({
    contracts: tokenAddrs.flatMap((t) => [
      { address: t, abi: launchTokenAbi, functionName: "name" as const },
      { address: t, abi: launchTokenAbi, functionName: "symbol" as const },
      { address: padSafe, abi: launchpadAbi, functionName: "curves" as const, args: [t] as const },
      { address: padSafe, abi: launchpadAbi, functionName: "tokenMetadata" as const, args: [t] as const },
    ]),
    query: { enabled: tokenAddrs.length > 0, ...REFETCH },
  });

  const tokens: TokenInfo[] = useMemo(() => {
    if (!details) return [];
    return tokenAddrs
      .map((address, i) => {
        const name = details[i * 4];
        const symbol = details[i * 4 + 1];
        const curve = details[i * 4 + 2];
        const meta = details[i * 4 + 3];
        if (
          name?.status !== "success" ||
          symbol?.status !== "success" ||
          curve?.status !== "success" ||
          meta?.status !== "success"
        )
          return null;
        return {
          address,
          name: name.result as string,
          symbol: symbol.result as string,
          curve: parseCurve(curve.result),
          meta: parseMeta(meta.result),
        };
      })
      .filter((t): t is TokenInfo => t !== null)
      .reverse(); // newest first
  }, [details, tokenAddrs]);

  return { tokens, isLoading: isLoading && n > 0, count: n };
}

/** Spot price in wei per whole token (1e18). */
export function spotPrice(curve: CurveInfo): bigint {
  return (curve.vEth * 10n ** 18n) / curve.vToken;
}

/** Curve progress 0..100 (800M = graduation). */
export function curveProgress(curve: CurveInfo): number {
  const CURVE_SUPPLY = 800_000_000n * 10n ** 18n;
  return Number((curve.sold * 10_000n) / CURVE_SUPPLY) / 100;
}
