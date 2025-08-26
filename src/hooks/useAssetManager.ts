import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';
import { getAssetManagerAddress } from '@/lib/assetManager';
import { iAssetManagerAbi } from '../generated';

export function useAssetManager() {
  const [assetManagerAddress, setAssetManagerAddress] = useState<
    `0x${string}` | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  // Get AssetManager address
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
    abi: iAssetManagerAbi,
    functionName: 'getSettings',
    query: {
      enabled: !!assetManagerAddress,
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
