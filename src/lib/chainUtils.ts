// Utility functions for chain selection
// Maps wagmi chain IDs to Flare periphery contract artifact network names

import * as artifacts from '@flarenetwork/flare-periphery-contract-artifacts';

import type { Chain } from 'viem';
import { flare, flareTestnet, songbird, songbirdTestnet } from 'wagmi/chains';

// Map chain IDs to artifact network names
export function getArtifactNetwork(chainId: number) {
  switch (chainId) {
    case 14: // Flare Mainnet
      return artifacts.flare;
    case 114: // Coston2 Testnet
      return artifacts.coston2;
    case 19: // Songbird
      return artifacts.songbird;
    case 16: // Coston Testnet
      return artifacts.coston;
    default:
      // Default to flare for backwards compatibility
      return artifacts.flare;
  }
}

// Get chain name for logging/debugging
export function getChainName(chainId: number): string {
  switch (chainId) {
    case 14:
      return 'Flare Mainnet';
    case 114:
      return 'Coston2 Testnet';
    case 19:
      return 'Songbird';
    case 16:
      return 'Coston Testnet';
    default:
      return `Unknown Chain (${chainId})`;
  }
}

// Get explorer prefix for the chain
export function getExplorerName(chainId: number): string {
  switch (chainId) {
    case 14:
      return 'flare';
    case 114:
      return 'coston2';
    case 19:
      return 'songbird';
    case 16:
      return 'coston';
    default:
      return 'flare';
  }
}

// Check if chain supports FAssets
export function supportsFAssets(chainId: number): boolean {
  // FAssets are available on Flare and Coston2
  return chainId === 14 || chainId === 114;
}

// Get the appropriate chain from viem/wagmi based on chainId
export function getChainById(chainId: number): Chain | null {
  switch (chainId) {
    case 14:
      return flare;
    case 114:
      return flareTestnet;
    case 19:
      return songbird;
    case 16:
      return songbirdTestnet;
    default:
      return null;
  }
}
