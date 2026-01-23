// Hook to fetch FXRP price from FTSO
// FXRP price equals XRP price

import { useCallback, useEffect, useState } from 'react';

import { useChainId } from 'wagmi';

import { getXRPUSDPrice, type FTSOPriceData } from '@/lib/ftsoUtils';

export function useFXRPPrice() {
  const chainId = useChainId();
  const [priceData, setPriceData] = useState<FTSOPriceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchPrice = useCallback(async () => {
    if (!chainId) {
      setError('No chain connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getXRPUSDPrice(chainId);
      if (data) {
        setPriceData(data);
        setLastFetch(Date.now());
      } else {
        setError('Failed to fetch price data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [chainId]);

  // Fetch price on mount and when chain changes
  useEffect(() => {
    if (chainId) {
      fetchPrice();
    }
  }, [chainId, fetchPrice]);

  // Auto-refresh price every 30 seconds
  useEffect(() => {
    if (!chainId || !priceData) return;

    const interval = setInterval(() => {
      const now = Date.now();
      // Only refresh if it's been more than 30 seconds since last fetch
      if (now - lastFetch > 30000) {
        fetchPrice();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [chainId, priceData, lastFetch, fetchPrice]);

  return {
    priceData,
    isLoading,
    error,
    refetch: fetchPrice,
  };
}
