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
  [giwaSepolia.id]: "0xF066f4E454d1A06829eA836197eEf7dedACA7dfe",
  [robinhood.id]: "0xc90CD49b50D973E45Ccc6cb94413a06F55718859",
};

// Launchpad deployment blocks: where on-chain event scans start.
export const LAUNCHPAD_DEPLOY_BLOCK: Record<number, bigint> = {
  [giwaSepolia.id]: 31_832_799n,
  [robinhood.id]: 20_966_123n,
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
