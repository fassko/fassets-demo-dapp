// Hook to get the FXRP balance
// https://dev.flare.network/fassets/developer-guides/fassets-fxrp-address

import { useAccount, useChainId } from 'wagmi';

import {
  getReadIfAssetBalanceOf,
  getReadIfAssetDecimals,
  getTypedSettings,
} from '@/lib/abiUtils';

import { useAssetManager } from './useAssetManager';

export function useFXRPBalance() {
  const { address: userAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { settings: rawSettings, assetManagerAddress } = useAssetManager();

  const settings = getTypedSettings(rawSettings);
  const fAssetAddress = settings?.fAsset as `0x${string}` | undefined;
  const tokenEnabled = { enabled: !!fAssetAddress };

  const useReadDecimals = getReadIfAssetDecimals(chainId);
  const { data: tokenDecimals } = useReadDecimals({
    address: fAssetAddress,
    query: tokenEnabled,
  });

  // Read FXRP balance from the IFAsset ABI in the periphery artifacts package
  // FXRP is an IFAsset token
  // https://dev.flare.network/fassets/developer-guides/fassets-fxrp-address
  const useReadBalanceOf = getReadIfAssetBalanceOf(chainId);
  const {
    data: fxrpBalanceData,
    refetch: refetchFxrpBalance,
    isLoading: isLoadingBalance,
    error: balanceError,
  } = useReadBalanceOf({
    address: fAssetAddress,
    args: [userAddress as `0x${string}`],
    query: {
      enabled:
        !!userAddress &&
        !!fAssetAddress &&
        !!assetManagerAddress &&
        isConnected,
    },
  });

  const decimals =
    tokenDecimals !== undefined ? Number(tokenDecimals) : undefined;
  const fxrpBalance =
    fxrpBalanceData !== undefined && decimals !== undefined
      ? (Number(fxrpBalanceData) / Math.pow(10, decimals)).toFixed(decimals)
      : '0';

  return {
    fxrpBalance,
    fxrpBalanceData,
    tokenDecimals: decimals,
    refetchFxrpBalance,
    isLoadingBalance,
    balanceError,
    userAddress,
    isConnected,
  };
}
