# FAssets Demo

A Next.js demo application for [Flare FAssets](https://dev.flare.network/fassets/overview), focused on **FXRP** (wrapped XRP on Flare). It walks through reading Asset Manager settings, **direct minting** from XRPL, **minting tags**, on-chain **FXRP transfers**, and **redemption** back to XRP—including FDC attestation for redemption completion.

## Features

### Settings (`/`)

- Read **AssetManagerFXRP** operational parameters (minting, redemption, timelock, liquidation, and related settings)
- **FXRP token** metadata (name, symbol, decimals, contract address)
- **FTSO** FXRP/USD price
- **Minting cap** usage (total, minted, available lots)
- Explorer links and copy-to-clipboard for contract addresses

### Direct Mint (`/mint`)

Mint FXRP by sending XRP to the protocol **Core Vault** on XRPL ([direct minting](https://dev.flare.network/fassets/direct-minting)):

- **Memo mode** — payment memo encodes your Flare recipient; uses [Xaman](https://xumm.app/) (XUMM) for signing via QR/deeplink
- **Tag mode** — pay with an **XRPL destination tag** tied to a reserved [minting tag](https://dev.flare.network/fassets/developer-guides/fassets-direct-minting-tag) NFT
- Live **fee breakdown** (minting fee, executor fee, net minted amount) and minimum mint amount
- Watches `DirectMintingExecuted` on Flare after the XRPL payment is signed

### Minting Tags (`/tags`)

Manage **MintingTagManager** ERC-721 tags used for tag-based direct mint and redemption:

- Reserve tags, set **minting recipient** and **executor**, transfer ownership
- View tag details (recipient, executor, pending executor changes)
- Links to tag-based mint and redeem flows

### Transfer (`/transfer`)

- Send **FXRP** (ERC-20) to another Flare address
- FXRP balance display with refresh

### Redeem (`/redeem`)

Redeem FXRP for native XRP on XRPL:

- **By amount** — `redeemAmount` for arbitrary FXRP amounts (with partial-fill / `RedemptionRequestIncomplete` handling)
- **By tag** — `redeemWithTag` to attach an XRPL destination tag to the payout (exchanges, custodial wallets)
- **Redemption limits** table (minimum amount, queue total, wallet balance)
- **FDC attestation** flow after redemption (`ReferencedPaymentNonexistence`) to complete redemption on-chain
- FLR, FXRP, and XRPL balance cards; XRPL ledger info with FDC deadlines

## Tech stack

- **Next.js 16** (App Router, Turbopack dev server)
- **React 19**, **TypeScript**, **Tailwind CSS 4**
- **wagmi 3** + **viem 2** + **@tanstack/react-query**
- **@flarenetwork/flare-wagmi-periphery-package** for network-specific FAssets ABIs and hooks
- **xrpl** for XRPL account/ledger reads
- **react-hook-form** + **zod** for forms

## Supported networks

| Network | Chain ID |
|---------|----------|
| Flare Mainnet | 14 |
| Flare Testnet (Coston2) | 114 |
| Songbird | 19 |
| Songbird Testnet (Coston) | 16 |

Connect an injected wallet (e.g. MetaMask) and switch to a supported Flare network. **Coston2** is the usual testnet for FAssets development.

## Getting started

### Prerequisites

- **Node.js 20+** (recommended; project targets modern Node)
- A browser wallet with a supported Flare network configured
- For **Direct Mint (Xaman)**: [Xaman Developer](https://apps.xumm.dev/) API key and secret

### Installation

```bash
git clone <repository-url>
cd fassets-demo-dapp
npm install
```

### Environment variables

Create `.env.local` in the project root for Xaman direct-mint signing (server-side API routes only):

```bash
XAMAN_API_KEY=your_xaman_api_key
XAMAN_API_SECRET=your_xaman_api_secret
```

Without these, memo-mode direct mint cannot create Xaman payloads; other pages (settings, transfer, redeem contract calls, tag management) still work when the wallet is connected.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` / `npm run lint:fix` | ESLint |
| `npm run format` / `npm run check:all` | Prettier and combined checks |
| `npm run generate` | Regenerate wagmi contract hooks |
| `npm run generate-types` | OpenZeppelin type generation (see `docs/TYPES_GENERATION.md`) |

## Project structure

| Path | Role |
|------|------|
| `src/app/` | App Router pages (`/`, `/mint`, `/tags`, `/transfer`, `/redeem`) |
| `src/app/api/xaman/` | Xaman payload create/status (direct mint) |
| `src/app/api/proof-request/` | DA Layer proof proxy (FDC redemption attestation) |
| `src/components/` | UI: `Settings`, `DirectMint`, `MintingTags`, `Transfer`, `Redeem` |
| `src/hooks/` | `useAssetManager`, `useFdcContracts`, `useFXRPBalance`, `useMintingCapData`, etc. |
| `src/lib/` | ABIs, FDC utils, direct-mint fee math, XRPL helpers, wagmi config |

## Components and documentation

### Core

| Component | Description | Docs |
|-----------|-------------|------|
| `Settings.tsx` | Asset Manager settings, minting cap, FXRP metadata & price | [FAssets settings](https://dev.flare.network/fassets/developer-guides/fassets-settings-solidity), [operational parameters](https://dev.flare.network/fassets/operational-parameters) |
| `DirectMint.tsx` | XRPL → FXRP direct mint (memo or tag) | [Direct minting](https://dev.flare.network/fassets/direct-minting), [minting tags](https://dev.flare.network/fassets/developer-guides/fassets-direct-minting-tag) |
| `MintingTags.tsx` | Reserve and configure minting tag NFTs | [Minting tags guide](https://dev.flare.network/fassets/developer-guides/fassets-direct-minting-tag) |
| `Transfer.tsx` | FXRP ERC-20 transfers on Flare | [FAssets registry](https://dev.flare.network/fassets/developer-guides/fassets-asset-manager-address-contracts-registry) |
| `Redeem.tsx` | `redeemAmount` / `redeemWithTag` + FDC completion | [Redemption](https://dev.flare.network/fassets/developer-guides/fassets-redeem), [FDC payment types](https://dev.flare.network/fdc/attestation-types/payment) |

### Removed flows

Older **collateral reserve → execute minting** and standalone **Attestation** demo components were removed in favor of **direct minting** and integrated FDC handling inside **Redeem**.

## Troubleshooting

1. **Wallet not connecting** — Use an injected provider; unlock the extension and approve the site.
2. **Wrong network** — Switch to Flare Testnet (Coston2) or another supported chain; the header shows the active network.
3. **Transactions fail** — Ensure sufficient **FLR** for gas on Flare.
4. **Direct mint stuck** — Confirm Xaman credentials in `.env.local`; complete or cancel the Xaman payload; check Core Vault address and (for tag mode) that the tag recipient is set on-chain.
5. **Redemption attestation** — Wait for FDC voting rounds; use the redeem UI’s attestation step after the redemption transaction confirms.
6. **Balances stale** — Use refresh controls on balance cards.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run check:all` when applicable
5. Open a pull request

## License

MIT License.
