import { defineChain } from "viem";
import { createConfig, http, injected } from "wagmi";

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

// One address per chain: add future deployments here (multichain).
export const LAUNCHPAD_ADDRESS: Record<number, `0x${string}`> = {
  [giwaSepolia.id]: "0x1f3F5C50f670D2B4d6d0f83c40Df92DBbE41fC73",
};

export const config = createConfig({
  chains: [giwaSepolia],
  connectors: [injected()],
  transports: {
    [giwaSepolia.id]: http(),
  },
});

export const EXPLORER = giwaSepolia.blockExplorers.default.url;
