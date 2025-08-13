import { coston2 } from '@flarenetwork/flare-periphery-contract-artifacts';
import { ethers } from 'ethers';

export async function getAssetManagerAddress(): Promise<`0x${string}`> {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Get the address of the AssetManagerFXRP contract
      // from the Flare contracts registry
      // https://dev.flare.network/network/guides/flare-contracts-registry
      const assetManagerFXRP = coston2.products.AssetManagerFXRP;
      const addressResult = await assetManagerFXRP.getAddress(provider);
      
      
      if (typeof addressResult === 'string') {
        return addressResult as `0x${string}`;
      } else if (addressResult && typeof addressResult === 'object' && 'data' in addressResult) {
        return (addressResult as { data: string }).data as `0x${string}`;
      } else {
        throw new Error('Invalid address format returned from getAddress');
      }
    } else {
      throw new Error('MetaMask is not installed. Please install MetaMask to use this feature.');
    }
  } catch (error) {
    console.error('Error getting AssetManager address:', error);
    throw error;
  }
}
