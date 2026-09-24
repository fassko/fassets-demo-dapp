// Hook to get FXRP token details from the IFAsset contract
// https://dev.flare.network/fassets/developer-guides/fassets-fxrp-address

import { useChainId } from 'wagmi';

import {
  getReadIfAssetAssetName,
  getReadIfAssetAssetSymbol,
  getReadIfAssetDecimals,
  getReadIfAssetName,
  getReadIfAssetSymbol,
  getTypedSettings,
} from '@/lib/abiUtils';

import { useAssetManager } from './useAssetManager';

export function useFXRPTokenDetails() {
  const chainId = useChainId();
  const { settings: rawSettings } = useAssetManager();

  // Use utility function to properly type settings from ABI
  const settings = getTypedSettings(rawSettings);

  const fAssetAddress = settings?.fAsset as `0x${string}` | undefined;
  const tokenQuery = { enabled: !!fAssetAddress };

  const useReadName = getReadIfAssetName(chainId);
  const useReadSymbol = getReadIfAssetSymbol(chainId);
  const useReadDecimals = getReadIfAssetDecimals(chainId);
  const useReadAssetName = getReadIfAssetAssetName(chainId);
  const useReadAssetSymbol = getReadIfAssetAssetSymbol(chainId);

  const {
    data: tokenName,
    isLoading: isLoadingName,
    refetch: refetchName,
  } = useReadName({
    address: fAssetAddress,
    query: tokenQuery,
  });

  const {
    data: tokenSymbol,
    isLoading: isLoadingSymbol,
    refetch: refetchSymbol,
  } = useReadSymbol({
    address: fAssetAddress,
    query: tokenQuery,
  });

  const {
    data: tokenDecimals,
    isLoading: isLoadingDecimals,
    refetch: refetchDecimals,
  } = useReadDecimals({
    address: fAssetAddress,
    query: tokenQuery,
  });

  const {
    data: assetName,
    isLoading: isLoadingAssetName,
    refetch: refetchAssetName,
  } = useReadAssetName({
    address: fAssetAddress,
    query: tokenQuery,
  });

  const {
    data: assetSymbol,
    isLoading: isLoadingAssetSymbol,
    refetch: refetchAssetSymbol,
  } = useReadAssetSymbol({
    address: fAssetAddress,
    query: tokenQuery,
  });

  const isLoading =
    isLoadingName ||
    isLoadingSymbol ||
    isLoadingDecimals ||
    isLoadingAssetName ||
    isLoadingAssetSymbol;

  const refetchAll = async () => {
    await Promise.all([
      refetchName(),
      refetchSymbol(),
      refetchDecimals(),
      refetchAssetName(),
      refetchAssetSymbol(),
    ]);
  };

  return {
    fAssetAddress,
    tokenName,
    tokenSymbol,
    tokenDecimals:
      tokenDecimals !== undefined ? Number(tokenDecimals) : undefined,
    assetName,
    assetSymbol,
    isLoading,
    refetchAll,
  };
}
