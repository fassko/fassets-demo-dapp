// Reusable utility for getting Flare contract addresses from artifacts
// Uses the Flare periphery contract artifacts to get contract addresses

import { ethers } from 'ethers';

import { getArtifactNetwork, getChainById, getChainName } from './chainUtils';
import { extractContractAddress } from './contractAddress';

function getRpcUrl(chainId: number): string {
  const chain = getChainById(chainId);
  if (!chain) {
    throw new Error(`Unsupported chain ID: ${chainId}`);
  }

  const httpUrl = chain.rpcUrls.default.http[0];
  if (!httpUrl) {
    throw new Error(`No RPC URL configured for chain ${chainId}`);
  }

  return httpUrl;
}

async function resolveChainId(chainId?: number): Promise<number> {
  if (chainId) {
    return chainId;
  }

  if (typeof window !== 'undefined' && window.ethereum) {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    return Number(network.chainId);
  }

  // Default to Flare mainnet when no wallet is connected (e.g. first load on Vercel)
  return 14;
}

/**
 * Prefer the connected wallet provider when it matches the target chain;
 * otherwise use a public JSON-RPC provider so the app works without MetaMask.
 */
async function getProvider(chainId: number): Promise<ethers.Provider> {
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      const network = await browserProvider.getNetwork();
      if (Number(network.chainId) === chainId) {
        return browserProvider;
      }
    } catch {
      // Fall back to public RPC below
    }
  }

  return new ethers.JsonRpcProvider(getRpcUrl(chainId));
}

/**
 * Get a contract address from Flare artifacts by product name
 * @param productName - The name of the contract product (e.g., 'AssetManagerFXRP', 'FtsoV2')
 * @param chainId - Optional chain ID (defaults to wallet chain or Flare mainnet)
 * @returns The contract address
 */
export async function getFlareContractAddress(
  productName: string,
  chainId?: number
): Promise<`0x${string}`> {
  try {
    const resolvedChainId = await resolveChainId(chainId);
    const provider = await getProvider(resolvedChainId);

    console.log(
      `Getting ${productName} address for ${getChainName(resolvedChainId)}`
    );

    const networkArtifacts = getArtifactNetwork(resolvedChainId);
    const product = networkArtifacts.products[productName];
    if (!product) {
      throw new Error(
        `Contract product "${productName}" not found in artifacts for chain ${resolvedChainId}`
      );
    }

    const addressResult = await product.getAddress(provider);
    return extractContractAddress(addressResult);
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
