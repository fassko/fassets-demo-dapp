# Flare Network Demo App

A comprehensive demo application showcasing Flare Network's cross-chain capabilities, including Asset Manager settings and FXRP cross-chain payments.

## Features

### 1. Asset Manager Settings

- View AssetManagerFXRP contract settings from the Flare network
- Real-time balance display for Flare and XRPL networks
- Explorer links to verify contract addresses
- Organized display of contract addresses, asset configuration, minting settings, redemption settings, timelock settings, and liquidation settings

### 2. Cross-Chain Payment Portal

- Send FXRP (wrapped XRP) on Flare to another address
- Redeem FXRP back to native XRP on XRPL
- Real-time balance tracking for FLR, FXRP, and XRP
- Input validation and error handling
- Transaction status feedback

## Getting Started

### Prerequisites

- Node.js 18+
- MetaMask wallet extension
- Flare network configured in MetaMask

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd fassets-demo-dapp
```

2. Install dependencies:

```bash
npm install
```

3. Start the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

## Components

The application is organized into several key components that demonstrate different aspects of the Flare Network ecosystem:

### Core FAssets Components

#### `Settings.tsx` - Asset Manager Configuration

- **Purpose**: Displays and manages FAssets AssetManagerFXRP contract settings
- **Documentation**: [FAssets Settings Guide](https://dev.flare.network/fassets/developer-guides/fassets-settings-solidity) | [Operational Parameters](https://dev.flare.network/fassets/operational-parameters)

#### `Mint.tsx` - FXRP Minting Interface

- **Purpose**: Enables users to mint FXRP by reserving FLR collateral
- **Documentation**: [FAssets Minting Guide](https://dev.flare.network/fassets/developer-guides/fassets-mint) | [IAssetManager Reference](https://dev.flare.network/fassets/reference/IAssetManager#reservecollateral)

#### `Execute.tsx` - Minting Execution

- **Purpose**: Executes the actual FXRP minting after collateral reservation
- **Documentation**: [IAssetManager ExecuteMinting](https://dev.flare.network/fassets/reference/IAssetManager#executeminting) | [FAssets Minting Guide](https://dev.flare.network/fassets/developer-guides/fassets-mint/)

### FDC (Flare Data Connector) Components

#### `Attestation.tsx` - Cross-Chain Verification

- **Purpose**: Demonstrates FDC attestation for XRP payment verification
- **Documentation**: [FDC Payment Attestation](https://dev.flare.network/fdc/attestation-types/payment) | [FDC Implementation Guide](https://dev.flare.network/fdc/guides/fdc-by-hand)

### FXRP Transfer & Redemption Components

#### `Transfer.tsx` - FXRP Transfers

- **Purpose**: Enables FXRP transfers between Flare addresses
- **Documentation**: [FAssets Asset Manager Registry](https://dev.flare.network/fassets/developer-guides/fassets-asset-manager-address-contracts-registry)

#### `Redeem.tsx` - FXRP to XRP Redemption

- **Purpose**: Facilitates redemption of FXRP back to native XRP on XRPL
- **Documentation**: [FAssets Redemption Guide](https://dev.flare.network/fassets/developer-guides/fassets-redeem)

## Troubleshooting

### Common Issues

1. **MetaMask not connecting**: Ensure MetaMask is installed and unlocked
2. **Network errors**: Verify you're connected to Flare Coston2 testnet
3. **Transaction failures**: Check your account has sufficient FLR for gas fees
4. **Balance not updating**: Click the "Refresh Balance" buttons

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
