import { createPublicClient, http } from 'viem';

import { getChainById } from './chainUtils';

/**
 * Create a public client for any supported Flare network
 * @param chainId - The chain ID (14 for Flare, 114 for Coston2, 19 for Songbird, 16 for Coston)
 * @returns A configured public client for the specified chain
 */
export function createFlarePublicClient(chainId: number = 14) {
  const chain = getChainById(chainId);

  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  return createPublicClient({
    chain,
    transport: http(),
  });
}

/**
 * Legacy export - defaults to Flare mainnet for backwards compatibility
 * @deprecated Use createFlarePublicClient() instead for multi-chain support
 */
export const publicClient = createFlarePublicClient(14);
