// Hook to get the FXRP balance
// https://dev.flare.network/fassets/developer-guides/fassets-fxrp-address

import { useEffect, useState } from 'react';

import { useAccount, useChainId, useReadContract } from 'wagmi';

import { getIFAssetAbi } from '@/lib/abiUtils';

import { useAssetManager } from './useAssetManager';

export function useFXRPBalance() {
  const [fxrpBalance, setFxrpBalance] = useState<string>('0');
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { settings, assetManagerAddress } = useAssetManager();

  // Read FXRP balance using wagmi
  // FXRP is an IFAsset token
  const {
    data: fxrpBalanceData,
    refetch: refetchFxrpBalance,
    isLoading: isLoadingBalance,
    error: balanceError,
  } = useReadContract({
    // Get the FXRP token address from the settings
    // https://dev.flare.network/fassets/developer-guides/fassets-fxrp-address
    address: settings?.fAsset as `0x${string}`,
    // FXRP is an IFAsset token
    abi: getIFAssetAbi(chainId),
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    query: {
      enabled:
        !!userAddress &&
        !!settings?.fAsset &&
        !!assetManagerAddress &&
        isConnected,
    },
  });

  // Update FXRP balance when data changes
  useEffect(() => {
    if (fxrpBalanceData && settings) {
      const decimals = Number(settings.assetDecimals);
      const formattedBalance = (
        Number(fxrpBalanceData) / Math.pow(10, decimals)
      ).toFixed(decimals);
      setFxrpBalance(formattedBalance);
    } else {
      setFxrpBalance('0');
    }
  }, [fxrpBalanceData, settings]);

  return {
    fxrpBalance,
    fxrpBalanceData,
    refetchFxrpBalance,
    isLoadingBalance,
    balanceError,
    userAddress,
    isConnected,
  };
}
