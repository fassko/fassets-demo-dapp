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
