import { defineChain } from "viem";
import { mainnet, sepolia } from "viem/chains";
import { cookieStorage, createConfig, createStorage, http, injected } from "wagmi";

export const giwaSepolia = defineChain({
  id: 91342,
  name: "GIWA Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia-rpc.giwa.io"] },
  },
  blockExplorers: {
    default: { name: "GIWA Explorer", url: "https://sepolia-explorer.giwa.io" },
  },
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
  testnet: true,
});

export const robinhood = defineChain({
  id: 4663,
  name: "Robinhood Chain",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.mainnet.chain.robinhood.com"] },
  },
  blockExplorers: {
    default: {
      name: "Robinhood Explorer",
      url: "https://robinhoodchain.blockscout.com",
    },
  },
  contracts: {
    multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" },
  },
});

export { sepolia, mainnet };

// Chains the app runs on (shown in the chain switcher).
export const APP_CHAINS = [giwaSepolia, robinhood] as const;

// One address per chain: add future deployments here (multichain).
export const LAUNCHPAD_ADDRESS: Record<number, `0x${string}` | undefined> = {
  [giwaSepolia.id]: "0xD04C4b497139E174d832058F3b94F700E02c72E0",
  [robinhood.id]: "0x88d5d0B0233768192e1E79fa146DB6e5E1aa0E81",
};

// Launchpad deployment blocks: where on-chain event scans start.
export const LAUNCHPAD_DEPLOY_BLOCK: Record<number, bigint> = {
  [giwaSepolia.id]: 31_991_098n, // v7
  [robinhood.id]: 22_541_519n, // v7
};

// Quote assets offered at launch per chain. address null = native ETH.
// To add one (e.g. a tokenized stock): owner must also enable it on-chain
// with setQuoteAsset(asset, virtualReserve).
export type QuoteAssetInfo = {
  address: `0x${string}` | null;
  symbol: string;
  decimals: number;
};
export const QUOTE_ASSETS: Record<number, QuoteAssetInfo[]> = {
  [giwaSepolia.id]: [{ address: null, symbol: "ETH", decimals: 18 }],
  [robinhood.id]: [
    { address: null, symbol: "ETH", decimals: 18 },
    { address: "0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC", symbol: "NVDA", decimals: 18 },
    { address: "0xaF3D76f1834A1d425780943C99Ea8A608f8a93f9", symbol: "AAPL", decimals: 18 },
    { address: "0x322F0929c4625eD5bAd873c95208D54E1c003b2d", symbol: "TSLA", decimals: 18 },
    { address: "0x1b0E319c6A659F002271B69dB8A7df2F911c153E", symbol: "GME", decimals: 18 },
    { address: "0xe93237C50D904957Cf27E7B1133b510C669c2e74", symbol: "MSFT", decimals: 18 },
    { address: "0x12f190a9F9d7D37a250758b26824B97CE941bF54", symbol: "AMZN", decimals: 18 },
    { address: "0xc0D6457C16Cc70d6790Dd43521C899C87ce02f35", symbol: "META", decimals: 18 },
    { address: "0x2e0847E8910a9732eB3fb1bb4b70a580ADAD4FE3", symbol: "GOOGL", decimals: 18 },
    { address: "0x6330D8C3178a418788dF01a47479c0ce7CCF450b", symbol: "COIN", decimals: 18 },
    { address: "0x894E1EC2D74FFE5AEF8Dc8A9e84686acCB964F2A", symbol: "PLTR", decimals: 18 },
    { address: "0x86923f96303D656E4aa86D9d42D1e57ad2023fdC", symbol: "AMD", decimals: 18 },
  ],
};

// OP Stack standard bridge for GIWA Sepolia (on Ethereum Sepolia, L1).
// Sending plain ETH to it bridges to the same address on GIWA L2.
export const L1_STANDARD_BRIDGE: `0x${string}` =
  "0x77b2ffc0F57598cAe1DB76cb398059cF5d10A7E7";

// batch: true coalesces JSON-RPC requests fired in the same tick into a
// single HTTP call — with multicall batching below it cuts RPC round trips
// dramatically (every card/stat read used to be its own request).
const transport = () => http(undefined, { batch: true });

export const config = createConfig({
  // Cookie-backed state + ssr: the server renders with the persisted chain,
  // so selection survives reloads without hydration mismatches.
  ssr: true,
  storage: createStorage({ storage: cookieStorage }),
  chains: [giwaSepolia, robinhood, sepolia, mainnet],
  connectors: [injected()],
  batch: { multicall: { wait: 16 } },
  transports: {
    [giwaSepolia.id]: transport(),
    [robinhood.id]: transport(),
    [sepolia.id]: transport(),
    [mainnet.id]: transport(),
  },
});
