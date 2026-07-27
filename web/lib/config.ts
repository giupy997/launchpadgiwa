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

// Un indirizzo per chain: aggiungere qui i deploy futuri (multichain).
export const LAUNCHPAD_ADDRESS: Record<number, `0x${string}`> = {
  [giwaSepolia.id]: "0xf71bA49eaD9ae0b208F6BAb8769ae19C98629cC1",
};

export const config = createConfig({
  chains: [giwaSepolia],
  connectors: [injected()],
  transports: {
    [giwaSepolia.id]: http(),
  },
});

export const EXPLORER = giwaSepolia.blockExplorers.default.url;
