// FDC contract addresses
// More info: https://dev.flare.network/fdc/overview

import { ethers } from 'ethers';

import { getArtifactNetwork, getChainName } from './chainUtils';
import { extractContractAddress } from './contractAddress';

export interface FdcContractAddresses {
  fdcHub: `0x${string}`;
  fdcRequestFeeConfigurations: `0x${string}`;
  flareSystemsManager: `0x${string}`;
  fdcVerification: `0x${string}`;
}

export async function getFdcContractAddresses(
  chainId?: number
): Promise<FdcContractAddresses> {
  try {
    if (typeof window !== 'undefined' && window.ethereum) {
      const provider = new ethers.BrowserProvider(window.ethereum);

      // If no chainId provided, get it from the provider
      if (!chainId) {
        const network = await provider.getNetwork();
        chainId = Number(network.chainId);
      }

      console.log(
        `Getting FDC contract addresses for ${getChainName(chainId)}`
      );

      // Get the correct network artifacts based on chain ID
      const networkArtifacts = getArtifactNetwork(chainId);

      // Get FDC Hub address from Flare Contracts Registry
      // https://dev.flare.network/network/guides/flare-contracts-registry
      const fdcHub = networkArtifacts.products.FdcHub;
      const fdcHubAddressResult = await fdcHub.getAddress(provider);

      // Get FDC Request Fee Configurations address from Flare Contracts Registry
      // https://dev.flare.network/network/guides/flare-contracts-registry
      const fdcRequestFeeConfigurations =
        networkArtifacts.products.FdcRequestFeeConfigurations;
      const fdcRequestFeeConfigurationsAddressResult =
        await fdcRequestFeeConfigurations.getAddress(provider);

      // Get Flare Systems Manager address from Flare Contracts Registry
      // https://dev.flare.network/network/guides/flare-contracts-registry
      const flareSystemsManager = networkArtifacts.products.FlareSystemsManager;
      const flareSystemsManagerAddressResult =
        await flareSystemsManager.getAddress(provider);

      // Get FDC Verification address from Flare Contracts Registry
      // https://dev.flare.network/network/guides/flare-contracts-registry
      const fdcVerification = networkArtifacts.products.FdcVerification;
      const fdcVerificationAddressResult =
        await fdcVerification.getAddress(provider);

      return {
        fdcHub: extractContractAddress(fdcHubAddressResult),
        fdcRequestFeeConfigurations: extractContractAddress(
          fdcRequestFeeConfigurationsAddressResult
        ),
        flareSystemsManager: extractContractAddress(
          flareSystemsManagerAddressResult
        ),
        fdcVerification: extractContractAddress(fdcVerificationAddressResult),
      };
    } else {
      throw new Error(
        'MetaMask is not installed. Please install MetaMask to use this feature.'
      );
    }
  } catch (error) {
    console.error('Error getting FDC contract addresses:', error);
    throw error;
  }
}
