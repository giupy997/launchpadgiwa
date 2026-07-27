import { defineChain } from "viem";
import { sepolia } from "viem/chains";
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

export { sepolia };

// One address per chain: add future deployments here (multichain).
export const LAUNCHPAD_ADDRESS: Record<number, `0x${string}`> = {
  [giwaSepolia.id]: "0x1f3F5C50f670D2B4d6d0f83c40Df92DBbE41fC73",
};

// OP Stack standard bridge for GIWA Sepolia (on Ethereum Sepolia, L1).
// Sending plain ETH to it bridges to the same address on GIWA L2.
export const L1_STANDARD_BRIDGE: `0x${string}` =
  "0x77b2ffc0F57598cAe1DB76cb398059cF5d10A7E7";

export const config = createConfig({
  chains: [giwaSepolia, sepolia],
  connectors: [injected()],
  transports: {
    [giwaSepolia.id]: http(),
    [sepolia.id]: http(),
  },
});

export const EXPLORER = giwaSepolia.blockExplorers.default.url;
