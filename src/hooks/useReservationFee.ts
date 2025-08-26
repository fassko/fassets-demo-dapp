import { useEffect, useState } from 'react';

import { calculateReservationFee, weiToFLR } from '@/lib/feeUtils';

export function useReservationFee(
  assetManagerAddress: string | undefined,
  lots: string,
  agentVault: string
) {
  const [reservationFee, setReservationFee] = useState<string>('0');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate reservation fee when lots or agent vault changes
  useEffect(() => {
    const calculateFee = async () => {
      if (assetManagerAddress && lots && agentVault && !isNaN(parseInt(lots))) {
        setIsLoading(true);
        setError(null);

        try {
          const feeWei = await calculateReservationFee(
            assetManagerAddress,
            lots
          );
          const feeInFLR = weiToFLR(feeWei).toString();
          setReservationFee(feeInFLR);
        } catch (error) {
          console.error('Error calculating reservation fee:', error);
          setReservationFee('0');
          setError('Failed to calculate reservation fee');
        } finally {
          setIsLoading(false);
        }
      } else {
        setReservationFee('0');
        setError(null);
      }
    };

    calculateFee();
  }, [assetManagerAddress, lots, agentVault]);

  // Function to get current fee at transaction time (returns BigInt for precision)
  // Fee can change at transaction time
  const getCurrentFee = async (lotsNumber: number): Promise<bigint> => {
    if (!assetManagerAddress) {
      throw new Error('AssetManager address not loaded');
    }
    return calculateReservationFee(assetManagerAddress, lotsNumber.toString());
  };

  // Function to get current fee as number for display purposes
  const getCurrentFeeAsNumber = async (lotsNumber: number): Promise<number> => {
    const feeWei = await getCurrentFee(lotsNumber);
    return weiToFLR(feeWei);
  };

  return {
    reservationFee,
    isLoading,
    error,
    getCurrentFee,
    getCurrentFeeAsNumber,
  };
}
