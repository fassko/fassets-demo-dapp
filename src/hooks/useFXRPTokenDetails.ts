// Hook to get FXRP token details from the IFAsset contract
// https://dev.flare.network/fassets/developer-guides/fassets-fxrp-address

import { useChainId } from 'wagmi';

import { getReadIFAsset, getTypedSettings } from '@/lib/abiUtils';

import { useAssetManager } from './useAssetManager';

export function useFXRPTokenDetails() {
  const chainId = useChainId();
  const { settings: rawSettings } = useAssetManager();

  // Use utility function to properly type settings from ABI
  const settings = getTypedSettings(rawSettings);

  const fAssetAddress = settings?.fAsset as `0x${string}` | undefined;

  // Use typed hook from flare-wagmi-periphery-package
  const useReadIFAsset = getReadIFAsset(chainId);

  const {
    data: tokenName,
    isLoading: isLoadingName,
    refetch: refetchName,
  } = useReadIFAsset({
    address: fAssetAddress,
    functionName: 'name',
    query: { enabled: !!fAssetAddress },
  });

  const {
    data: tokenSymbol,
    isLoading: isLoadingSymbol,
    refetch: refetchSymbol,
  } = useReadIFAsset({
    address: fAssetAddress,
    functionName: 'symbol',
    query: { enabled: !!fAssetAddress },
  });

  const {
    data: tokenDecimals,
    isLoading: isLoadingDecimals,
    refetch: refetchDecimals,
  } = useReadIFAsset({
    address: fAssetAddress,
    functionName: 'decimals',
    query: { enabled: !!fAssetAddress },
  });

  const {
    data: assetName,
    isLoading: isLoadingAssetName,
    refetch: refetchAssetName,
  } = useReadIFAsset({
    address: fAssetAddress,
    functionName: 'assetName',
    query: { enabled: !!fAssetAddress },
  });

  const {
    data: assetSymbol,
    isLoading: isLoadingAssetSymbol,
    refetch: refetchAssetSymbol,
  } = useReadIFAsset({
    address: fAssetAddress,
    functionName: 'assetSymbol',
    query: { enabled: !!fAssetAddress },
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
    tokenName: tokenName ? String(tokenName) : undefined,
    tokenSymbol: tokenSymbol ? String(tokenSymbol) : undefined,
    tokenDecimals: tokenDecimals !== undefined ? Number(tokenDecimals) : undefined,
    assetName: assetName ? String(assetName) : undefined,
    assetSymbol: assetSymbol ? String(assetSymbol) : undefined,
    isLoading,
    refetchAll,
  };
}
