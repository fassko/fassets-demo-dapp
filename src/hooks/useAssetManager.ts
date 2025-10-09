// Hook to get the AssetManager address
// https://dev.flare.network/fassets/developer-guides/fassets-asset-manager-address-contracts-registry

import { useEffect, useState } from 'react';

import { useReadContract } from 'wagmi';

import { getAssetManagerAddress } from '@/lib/assetManager';

// Import the generated type for the IAssetManager
import { iAssetManagerAbi } from '../generated';

export function useAssetManager() {
  const [assetManagerAddress, setAssetManagerAddress] = useState<
    `0x${string}` | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  // Get AssetManager address from Flare Contracts Registry at startup
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const address = await getAssetManagerAddress();
        setAssetManagerAddress(address);
        setError(null);
      } catch (error) {
        console.error('Error fetching AssetManager address:', error);
        setError('Failed to fetch AssetManager address');
      }
    };

    fetchAddress();
  }, []);

  // Read AssetManager settings
  const {
    data: settings,
    isLoading: isLoadingSettings,
    error: readError,
    refetch: refetchSettings,
  } = useReadContract({
    address: assetManagerAddress!,
    // Use the iAssetManager ABI to read the settings
    // from the generated types
    abi: iAssetManagerAbi,
    // Use the getSettings function to read the settings
    // Guide: https://dev.flare.network/fassets/developer-guides/fassets-settings-solidity
    functionName: 'getSettings',
    query: {
      enabled: !!assetManagerAddress,
      gcTime: 0,
      staleTime: 0,
    },
  });

  // Handle read errors
  useEffect(() => {
    if (readError) {
      setError(readError.message);
    } else if (settings) {
      setError(null);
    }
  }, [readError, settings]);

  return {
    assetManagerAddress,
    settings,
    isLoading: isLoadingSettings,
    error,
    refetchSettings,
  };
}
