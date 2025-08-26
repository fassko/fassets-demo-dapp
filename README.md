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

## Code Formatting & Import Sorting

This project uses Prettier for code formatting and ESLint for code linting, with automatic import sorting configured.

### Import Sorting

The project uses ESLint with the `eslint-plugin-import` to automatically organize imports in a consistent order:

1. **React imports** (react, react-\*)
2. **External library imports** (organized by package)
3. **Internal imports** (@/\*)
4. **Relative imports** (./\*)

The import order is enforced by ESLint rules and can be automatically fixed using the linting commands.

### Formatting Commands

```bash
# Format all files (including import sorting)
npm run format

# Check formatting without making changes
npm run format:check

# Sort imports only
npm run sort:imports

# Check import sorting without making changes
npm run sort:imports:check

# Lint code
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Fix all issues (linting + formatting)
npm run fix:all

# Check all issues (linting + formatting)
npm run check:all
```

### Editor Setup

For the best development experience, install the following VS Code extensions:

- Prettier - Code formatter
- ESLint
- Tailwind CSS IntelliSense
- TypeScript and JavaScript Language Features

The project includes VS Code settings that will automatically format your code on save.

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

### Adding New Features

1. Create new components in `src/components/`
2. Add navigation tabs in `Navigation.tsx`
3. Update the main page to include new components
4. Add any utility functions in `src/utils/`

## Troubleshooting

### Common Issues

1. **MetaMask not connecting**: Ensure MetaMask is installed and unlocked
2. **Network errors**: Verify you're connected to Flare Coston2 testnet
3. **Transaction failures**: Check your account has sufficient FLR for gas fees
4. **Balance not updating**: Click the "Refresh Balance" buttons

### Debug Mode

Open browser developer tools to view:

- Console logs for transaction details
- Network tab for API calls
- React DevTools for component state

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
