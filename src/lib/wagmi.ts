import { flare, flareTestnet, songbird, songbirdTestnet } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

import { createConfig, http } from 'wagmi';

import type { Chain } from 'viem';

/**
 * Multicall3 is deployed on both testnets at the canonical address, but the
 * published chain objects do not list it. Without this, batched reads such as
 * the system redemption fee settings cannot run on Coston 2.
 */
const MULTICALL3_ADDRESS =
  '0xcA11bde05977b3631167028862bE2a173976CA11' as const;

function withMulticall3<T extends Chain>(chain: T): T {
  return {
    ...chain,
    contracts: {
      ...chain.contracts,
      multicall3: { address: MULTICALL3_ADDRESS },
    },
  };
}

const coston2 = withMulticall3(flareTestnet);
const coston = withMulticall3(songbirdTestnet);

export const config = createConfig({
  chains: [flare, coston2, songbird, coston],
  connectors: [injected()],
  transports: {
    [flare.id]: http(), // Flare Mainnet (Chain ID: 14)
    [coston2.id]: http(), // Coston2 Testnet (Chain ID: 114)
    [songbird.id]: http(), // Songbird Canary Network (Chain ID: 19)
    [coston.id]: http(), // Coston Testnet (Chain ID: 16)
  },
});
