// FTSO utilities for fetching price feeds
// FXRP price equals XRP price, so we use the XRP/USD feed

import { createPublicClient, http } from 'viem';

import { getFtsoV2InterfaceAbi } from './abiUtils';
import { getChainById } from './chainUtils';
import { getFtsoV2Address } from './flareContracts';

// FTSO feed ID (bytes21)
// XRP/USD feed - used for FXRP price on all networks
export const XRP_USD_FEED_ID =
  '0x015852502f55534400000000000000000000000000' as const;

export interface FTSOPriceData {
  price: number;
  decimals: number;
  timestamp: number;
}

/**
 * Get the current XRP/USD price from FTSO
 * @param chainId - The chain ID to query
 * @returns Promise with price data
 */
export async function getXRPUSDPrice(
  chainId: number
): Promise<FTSOPriceData | null> {
  try {
    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    const client = createPublicClient({
      chain,
      transport: http(),
    });

    // Get FTSO V2 contract address from Flare artifacts
    const ftsoV2Address = await getFtsoV2Address(chainId);

    // Get XRP/USD price feed (FXRP tracks XRP price on all networks)
    const { result: simulateResult } = await client.simulateContract({
      address: ftsoV2Address as `0x${string}`,
      abi: getFtsoV2InterfaceAbi(chainId),
      functionName: 'getFeedsById',
      args: [[XRP_USD_FEED_ID]],
    });

    // Extract data from result
    // result is a tuple: [values: uint256[], decimals: int8[], timestamp: uint64]
    const [values, decimals, timestamp] = simulateResult;

    if (!values || values.length === 0) {
      throw new Error('No feed data returned');
    }

    const value = values[0];
    const decimal = decimals[0];

    // Convert price to USD (divide by 10^decimals)
    const priceInUSD = Number(value) / Math.pow(10, Math.abs(decimal));

    return {
      price: priceInUSD,
      decimals: Math.abs(decimal),
      timestamp: Number(timestamp),
    };
  } catch (error) {
    console.error('Error fetching XRP/USD price from FTSO:', error);
    return null;
  }
}

/**
 * Format price for display with proper currency formatting
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: price < 0.01 ? 6 : price < 1 ? 4 : 2,
  }).format(price);
}
