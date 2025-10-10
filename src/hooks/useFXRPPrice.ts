// Hook to fetch FXRP price from FTSO
// FXRP price equals XRP price

import { useCallback, useEffect, useState } from 'react';

import { useAccount } from 'wagmi';

import { getXRPUSDPrice, type FTSOPriceData } from '@/lib/ftsoUtils';

export function useFXRPPrice() {
  const { chain } = useAccount();
  const [priceData, setPriceData] = useState<FTSOPriceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchPrice = useCallback(async () => {
    if (!chain) {
      setError('No chain connected');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getXRPUSDPrice(chain.id);
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
  }, [chain]);

  // Fetch price on mount and when chain changes
  useEffect(() => {
    if (chain) {
      fetchPrice();
    }
  }, [chain, fetchPrice]);

  // Auto-refresh price every 30 seconds
  useEffect(() => {
    if (!chain || !priceData) return;

    const interval = setInterval(() => {
      const now = Date.now();
      // Only refresh if it's been more than 30 seconds since last fetch
      if (now - lastFetch > 30000) {
        fetchPrice();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [chain, priceData, lastFetch, fetchPrice]);

  return {
    priceData,
    isLoading,
    error,
    refetch: fetchPrice,
  };
}
