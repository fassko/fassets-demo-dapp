// Hook to get the AssetManager address
// https://dev.flare.network/fassets/developer-guides/fassets-asset-manager-address-contracts-registry

import { useEffect, useState } from 'react';

import { useChainId } from 'wagmi';

import { getReadIAssetManager } from '@/lib/abiUtils';
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

  // Read AssetManager settings using typed hook from flare-wagmi-periphery-package
  // Guide: https://dev.flare.network/fassets/developer-guides/fassets-settings-solidity
  // TypeScript has issues with deep type instantiation when getReadIAssetManager
  // returns a union of different hooks. We suppress this error as the types are
  // correct at runtime, just too complex for TypeScript to infer.
  const useReadIAssetManager = getReadIAssetManager(chainId);
  
  const {
    data: settings,
    isLoading: isLoadingSettings,
    error: readError,
    refetch: refetchSettings,
  } =
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - Type instantiation is excessively deep and possibly infinite
    useReadIAssetManager({
    address: assetManagerAddress as `0x${string}`,
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
