import { flare, flareTestnet, songbird, songbirdTestnet } from 'wagmi/chains';
import { injected, metaMask, walletConnect } from 'wagmi/connectors';

import { createConfig, http } from 'wagmi';

export const config = createConfig({
  chains: [flare, flareTestnet, songbird, songbirdTestnet],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({ projectId: 'YOUR_WALLET_CONNECT_PROJECT_ID' }),
  ],
  transports: {
    [flare.id]: http(), // Flare Mainnet (Chain ID: 14)
    [flareTestnet.id]: http(), // Coston2 Testnet (Chain ID: 114)
    [songbird.id]: http(), // Songbird Canary Network (Chain ID: 19)
    [songbirdTestnet.id]: http(), // Coston Testnet (Chain ID: 16)
  },
});
