// Reusable utility for getting Flare contract addresses from artifacts
// Uses the Flare periphery contract artifacts to get contract addresses

import { ethers } from 'ethers';

import { getArtifactNetwork, getChainName } from './chainUtils';
import { extractContractAddress } from './contractAddress';

/**
 * Get a contract address from Flare artifacts by product name
 * @param productName - The name of the contract product (e.g., 'AssetManagerFXRP', 'FtsoV2')
 * @param chainId - Optional chain ID (will use current network if not provided)
 * @returns The contract address
 */
export async function getFlareContractAddress(
  productName: string,
  chainId?: number
): Promise<`0x${string}`> {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // If no chainId provided, get it from the provider
      if (!chainId) {
        const network = await provider.getNetwork();
        chainId = Number(network.chainId);
      }

      console.log(
        `Getting ${productName} address for ${getChainName(chainId)}`
      );

      // Get the correct network artifacts based on chain ID
      const networkArtifacts = getArtifactNetwork(chainId);

      // Get the contract product
      const product = networkArtifacts.products[productName];
      if (!product) {
        throw new Error(
          `Contract product "${productName}" not found in artifacts for chain ${chainId}`
        );
      }

      // Get the address from the Flare contracts registry
      const addressResult = await product.getAddress(provider);

      return extractContractAddress(addressResult);
    } else {
      throw new Error(
        'MetaMask is not installed. Please install MetaMask to use this feature.'
      );
    }
  } catch (error) {
    console.error(`Error getting ${productName} address:`, error);
    throw error;
  }
}

/**
 * Get the AssetManagerFXRP contract address
 * @param chainId - Optional chain ID
 * @returns The AssetManagerFXRP contract address
 */
export async function getAssetManagerAddress(
  chainId?: number
): Promise<`0x${string}`> {
  return getFlareContractAddress('AssetManagerFXRP', chainId);
}

/**
 * Get the FtsoV2 contract address
 * @param chainId - Optional chain ID
 * @returns The FtsoV2 contract address
 */
export async function getFtsoV2Address(
  chainId?: number
): Promise<`0x${string}`> {
  return getFlareContractAddress('FtsoV2', chainId);
}
