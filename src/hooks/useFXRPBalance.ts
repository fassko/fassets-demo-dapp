// Hook to get the FXRP balance
// https://dev.flare.network/fassets/developer-guides/fassets-fxrp-address

import { useEffect, useState } from 'react';

import { useAccount, useChainId } from 'wagmi';

import { type ReadContractReturnType } from 'viem';

import { getAssetManagerAbi, getReadIFAsset } from '@/lib/abiUtils';

import { useAssetManager } from './useAssetManager';

export function useFXRPBalance() {
  const [fxrpBalance, setFxrpBalance] = useState<string>('0');
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { settings: rawSettings, assetManagerAddress } = useAssetManager();

  // Extract return type from the ABI using viem's ReadContractReturnType
  // This gets the type directly from the ABI function signature for getSettings
  // Use ReturnType to get the ABI type first to avoid deep instantiation
  type AssetManagerAbi = ReturnType<typeof getAssetManagerAbi>;
  type GetSettingsReturnType = ReadContractReturnType<
    AssetManagerAbi,
    'getSettings'
  >;

  // Type assertion using the type extracted from the ABI
  const settings = rawSettings as GetSettingsReturnType | undefined;

  // Read FXRP balance using typed hook from flare-wagmi-periphery-package
  // FXRP is an IFAsset token
  // https://dev.flare.network/fassets/developer-guides/fassets-fxrp-address
  const useReadIFAsset = getReadIFAsset(chainId);
  const {
    data: fxrpBalanceData,
    refetch: refetchFxrpBalance,
    isLoading: isLoadingBalance,
    error: balanceError,
  } = useReadIFAsset({
    // Get the FXRP token address from the settings
    address: settings?.fAsset as `0x${string}`,
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
