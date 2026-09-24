// Hook to get the AssetManager address
// https://dev.flare.network/fassets/developer-guides/fassets-asset-manager-address-contracts-registry

import { useEffect, useState } from 'react';

import { useChainId } from 'wagmi';

import { getReadIAssetManagerInfoGetSettings } from '@/lib/abiUtils';
import { getAssetManagerAddress } from '@/lib/assetManager';

export function useAssetManager() {
  const chainId = useChainId();
  const [assetManagerAddress, setAssetManagerAddress] = useState<
    `0x${string}` | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  // Get AssetManager address from Flare Contracts Registry
  useEffect(() => {
    let cancelled = false;

    const fetchAddress = async () => {
      setAssetManagerAddress(null);
      try {
        const address = await getAssetManagerAddress(chainId);
        if (!cancelled) {
          setAssetManagerAddress(address);
          setError(null);
        }
      } catch (error) {
        console.error('Error fetching AssetManager address:', error);
        if (!cancelled) {
          setError('Failed to fetch AssetManager address');
        }
      }
    };

    fetchAddress();

    return () => {
      cancelled = true;
    };
  }, [chainId]);

  // Read AssetManager settings using IAssetManagerInfo slice hook
  // Guide: https://dev.flare.network/fassets/developer-guides/fassets-settings-solidity
  const useReadGetSettings = getReadIAssetManagerInfoGetSettings(chainId);

  const {
    data: settings,
    isLoading: isLoadingSettings,
    error: readError,
    refetch: refetchSettings,
  } = useReadGetSettings({
    address: assetManagerAddress as `0x${string}`,
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
