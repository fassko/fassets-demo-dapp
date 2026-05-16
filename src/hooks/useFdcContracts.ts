// Hook to get the FDC contract addresses
// https://dev.flare.network/fdc/guides/fdc-by-hand

import { useEffect, useState } from 'react';

import { useChainId } from 'wagmi';

import {
  FdcContractAddresses,
  getFdcContractAddresses,
} from '@/lib/fdcContracts';

export function useFdcContracts() {
  const chainId = useChainId();
  const [addresses, setAddresses] = useState<FdcContractAddresses | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Get FDC contract addresses
  useEffect(() => {
    let cancelled = false;

    const fetchAddresses = async () => {
      setIsLoading(true);
      setAddresses(null);
      try {
        const contractAddresses = await getFdcContractAddresses(chainId);
        if (!cancelled) {
          setAddresses(contractAddresses);
          setError(null);
        }
      } catch (error) {
        console.error('Error fetching FDC contract addresses:', error);
        if (!cancelled) {
          setError('Failed to fetch FDC contract addresses');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchAddresses();

    return () => {
      cancelled = true;
    };
  }, [chainId]);

  return {
    addresses,
    isLoading,
    error,
  };
}
