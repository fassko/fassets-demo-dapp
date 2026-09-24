// FDC contract addresses
// More info: https://dev.flare.network/fdc/overview

import { getFlareContractAddress } from './flareContracts';

export interface FdcContractAddresses {
  fdcHub: `0x${string}`;
  fdcRequestFeeConfigurations: `0x${string}`;
  flareSystemsManager: `0x${string}`;
  fdcVerification: `0x${string}`;
}

/**
 * Get all FDC contract addresses for a given chain
 * @param chainId - Optional chain ID (will use current network if not provided)
 * @returns Object containing all FDC contract addresses
 */
export async function getFdcContractAddresses(
  chainId?: number
): Promise<FdcContractAddresses> {
  try {
    // Fetch all FDC contract addresses in parallel
    const [
      fdcHub,
      fdcRequestFeeConfigurations,
      flareSystemsManager,
      fdcVerification,
    ] = await Promise.all([
      getFlareContractAddress('FdcHub', chainId),
      getFlareContractAddress('FdcRequestFeeConfigurations', chainId),
      getFlareContractAddress('FlareSystemsManager', chainId),
      getFlareContractAddress('FdcVerification', chainId),
    ]);

    return {
      fdcHub,
      fdcRequestFeeConfigurations,
      flareSystemsManager,
      fdcVerification,
    };
  } catch (error) {
    console.error('Error getting FDC contract addresses:', error);
    throw error;
  }
}
