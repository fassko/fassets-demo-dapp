// Collateral reservation fee calculations
// More info: https://dev.flare.network/fassets/minting#collateral-reservation-fee

import { getAssetManagerAbi } from '@/lib/abiUtils';
import { publicClient } from '@/lib/publicClient';

/**
 * Calculate reservation fee for a given number of lots
 * @param assetManagerAddress - The AssetManager contract address
 * @param lots - Number of lots as string
 * @param chainId - The chain ID to get the appropriate ABI
 * @returns Promise<bigint> - The reservation fee in wei (BigInt)
 */
export async function calculateReservationFee(
  assetManagerAddress: string,
  lots: string,
  chainId: number
): Promise<bigint> {
  if (!assetManagerAddress || !lots || isNaN(parseInt(lots))) {
    throw new Error('Invalid parameters for fee calculation');
  }

  try {
    const feeData = await publicClient.readContract({
      address: assetManagerAddress as `0x${string}`,
      // Use the network-specific AssetManager ABI to read the collateralReservationFee function
      abi: getAssetManagerAbi(chainId),
      // Use the collateralReservationFee function to get the reservation fee
      // https://dev.flare.network/fassets/minting#collateral-reservation-fee
      functionName: 'collateralReservationFee',
      // Use the lots number to get the reservation fee
      args: [BigInt(lots)],
    });

    if (feeData) {
      return feeData as bigint;
    } else {
      throw new Error('Failed to calculate reservation fee');
    }
  } catch (error) {
    console.error('Error calculating reservation fee:', error);
    throw new Error('Failed to calculate reservation fee. Please try again.');
  }
}

/**
 * Get current reservation fee for a given number of lots
 * @param assetManagerAddress - The AssetManager contract address
 * @param lotsNumber - Number of lots as number
 * @param chainId - The chain ID to get the appropriate ABI
 * @returns Promise<bigint> - The reservation fee in wei (BigInt)
 */
export async function getCurrentReservationFee(
  assetManagerAddress: string,
  lotsNumber: number,
  chainId: number
): Promise<bigint> {
  if (!assetManagerAddress) {
    throw new Error('AssetManager address not provided');
  }

  return calculateReservationFee(
    assetManagerAddress,
    lotsNumber.toString(),
    chainId
  );
}

/**
 * Convert wei amount to FLR (Flare tokens)
 * @param weiAmount - Amount in wei as BigInt
 * @returns number - Amount in FLR
 */
export function weiToFLR(weiAmount: bigint): number {
  return Number(weiAmount) / Math.pow(10, 18);
}

/**
 * Convert FLR amount to wei
 * @param flrAmount - Amount in FLR
 * @returns bigint - Amount in wei
 */
export function flrToWei(flrAmount: number): bigint {
  return BigInt(Math.floor(flrAmount * Math.pow(10, 18)));
}

/**
 * Get current reservation fee as FLR for display purposes
 * @param assetManagerAddress - The AssetManager contract address
 * @param lotsNumber - Number of lots
 * @param chainId - The chain ID to get the appropriate ABI
 * @returns Promise<number> - The reservation fee in FLR
 */
export async function getCurrentReservationFeeAsFLR(
  assetManagerAddress: string,
  lotsNumber: number,
  chainId: number
): Promise<number> {
  const feeWei = await getCurrentReservationFee(
    assetManagerAddress,
    lotsNumber,
    chainId
  );
  return weiToFLR(feeWei);
}
