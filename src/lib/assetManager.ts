import { coston2 } from '@flarenetwork/flare-periphery-contract-artifacts';
import { ethers } from 'ethers';
import { extractContractAddress } from './contractAddress';

export async function getAssetManagerAddress(): Promise<`0x${string}`> {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Get the address of the AssetManagerFXRP contract
      // from the Flare contracts registry
      // https://dev.flare.network/network/guides/flare-contracts-registry
      const assetManagerFXRP = coston2.products.AssetManagerFXRP;
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
