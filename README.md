# laU NCHA — Token Launchpad

Launchpad stile pump.fun per lanciare token su chain EVM. Target primario:
**GIWA** (L2 OP Stack di Upbit/Dunamu), con architettura chain-agnostic per
il deploy multichain futuro (Monad, MegaETH, ...).

## Struttura

- `contracts/` — smart contract (Solidity + Foundry)
  - `src/Launchpad.sol` — factory + bonding curve (constant product con riserve
    virtuali), fee di protocollo, graduation e migrazione DEX
  - `src/LaunchToken.sol` — ERC-20 creato dal launchpad; transfer bloccati fino
    alla graduation
  - `src/interfaces/IDexMigrator.sol` — adapter DEX pluggabile (uno per chain)
- `web/` — frontend (da fare: Next.js + wagmi/viem)

## Parametri della curva

- Supply totale: 1B per token; 800M venduti sulla curva, 200M riservati al DEX
- Riserve virtuali: 1.25 ETH / 1.05B token → la curva raccoglie ~4 ETH
- Fee: 1% su buy e sell (max 5%, configurabile dall'owner)
- Graduation: quando gli 800M sono esauriti → trading su curva chiuso,
  `migrate()` sposta 200M token + ETH raccolti sull'adapter DEX

## Deploy

| Chain | Contratto | Indirizzo |
|---|---|---|
| GIWA Sepolia (91342) | Launchpad | [`0xf71bA49eaD9ae0b208F6BAb8769ae19C98629cC1`](https://sepolia-explorer.giwa.io/address/0xf71bA49eaD9ae0b208F6BAb8769ae19C98629cC1) |

## Rete: GIWA Sepolia (testnet)

| Parametro | Valore |
|---|---|
| Chain ID | 91342 |
| RPC | https://sepolia-rpc.giwa.io/ |
| Explorer | https://sepolia-explorer.giwa.io |
| Gas token | ETH (test) |
| Faucet | vedi https://docs.giwa.io/get-started/faucets |

## Comandi

```bash
cd contracts
forge test                       # test suite (17 test, incluso fuzz)
```

Deploy su GIWA Sepolia (richiede `.env` con `PRIVATE_KEY`, vedi `.env.example`):

```bash
cd contracts && source .env && forge script script/Deploy.s.sol --rpc-url giwa_sepolia --private-key "$PRIVATE_KEY" --broadcast
```

## TODO

- [x] Deploy su GIWA Sepolia (27 lug 2026) e smoke test read-only
- [x] Smoke test on-chain: token di prova [`TEST` 0x7Fc8...1305](https://sepolia-explorer.giwa.io/address/0x7Fc8d6f3AD8b93F771Cd0Dadd458A495c42F1305) creato con buy iniziale, curva e prezzi verificati
- [ ] Adapter `IDexMigrator` per un DEX su GIWA (da individuare quando
      l'ecosistema mainnet sarà live)
- [ ] Frontend Next.js + wagmi/viem
- [ ] Indexer eventi (creazioni, trade) per feed e classifiche
- [ ] Verifica policy di deploy permissionless su GIWA mainnet
- [ ] Review legale (MiCA) prima del lancio pubblico
