// Utility function to get the FAssets AssetManagerFXRP contract address
// https://dev.flare.network/network/guides/flare-contracts-registry

import { ethers } from 'ethers';

import { getArtifactNetwork, getChainName } from './chainUtils';
import { extractContractAddress } from './contractAddress';

export async function getAssetManagerAddress(
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

      console.log(`Getting AssetManager address for ${getChainName(chainId)}`);

      // Get the correct network artifacts based on chain ID
      const networkArtifacts = getArtifactNetwork(chainId);

      // Get the address of the AssetManagerFXRP contract
      // from the Flare contracts registry
      // https://dev.flare.network/network/guides/flare-contracts-registry
      const assetManagerFXRP = networkArtifacts.products.AssetManagerFXRP;
      const addressResult = await assetManagerFXRP.getAddress(provider);

      return extractContractAddress(addressResult);
    } else {
      throw new Error(
        'MetaMask is not installed. Please install MetaMask to use this feature.'
      );
    }
  } catch (error) {
    console.error('Error getting AssetManager address:', error);
    throw error;
  }
}
