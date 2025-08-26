import { useEffect, useState } from 'react';

import { publicClient } from '@/lib/publicClient';

import { iAssetManagerAbi } from '../generated';

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
    const calculateReservationFee = async () => {
      if (assetManagerAddress && lots && agentVault && !isNaN(parseInt(lots))) {
        setIsLoading(true);
        setError(null);

        try {
          const feeData = await publicClient.readContract({
            address: assetManagerAddress as `0x${string}`,
            abi: iAssetManagerAbi,
            functionName: 'collateralReservationFee',
            args: [BigInt(lots)],
          });

          if (feeData) {
            const feeInFLR = (Number(feeData) / Math.pow(10, 18)).toString();
            setReservationFee(feeInFLR);
          }
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

    calculateReservationFee();
  }, [assetManagerAddress, lots, agentVault]);

  // Function to get current fee at transaction time (returns BigInt for precision)
  const getCurrentFee = async (lotsNumber: number): Promise<bigint> => {
    if (!assetManagerAddress) {
      throw new Error('AssetManager address not loaded');
    }

    try {
      const feeData = await publicClient.readContract({
        address: assetManagerAddress as `0x${string}`,
        abi: iAssetManagerAbi,
        functionName: 'collateralReservationFee',
        args: [BigInt(lotsNumber)],
      });

      if (feeData) {
        return feeData as bigint; // Return the raw BigInt value
      } else {
        throw new Error('Failed to get current reservation fee');
      }
    } catch (error) {
      console.error('Error getting current reservation fee:', error);
      throw new Error(
        'Failed to get current reservation fee. Please try again.'
      );
    }
  };

  // Function to get current fee as number for display purposes
  const getCurrentFeeAsNumber = async (lotsNumber: number): Promise<number> => {
    const feeBigInt = await getCurrentFee(lotsNumber);
    return Number(feeBigInt) / Math.pow(10, 18);
  };

  return {
    reservationFee,
    isLoading,
    error,
    getCurrentFee,
    getCurrentFeeAsNumber,
  };
}
