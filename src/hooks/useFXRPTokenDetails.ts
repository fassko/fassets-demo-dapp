// Hook to get FXRP token details from the IFAsset contract
// https://dev.flare.network/fassets/developer-guides/fassets-fxrp-address

import { useChainId, useReadContract } from 'wagmi';

import { getIFAssetAbi } from '@/lib/abiUtils';

import { useAssetManager } from './useAssetManager';

export function useFXRPTokenDetails() {
  const chainId = useChainId();
  const { settings } = useAssetManager();

  const fAssetAddress = settings?.fAsset as `0x${string}` | undefined;
  const fAssetAbi = getIFAssetAbi(chainId);

  const {
    data: tokenName,
    isLoading: isLoadingName,
    refetch: refetchName,
  } = useReadContract({
    address: fAssetAddress,
    abi: fAssetAbi,
    functionName: 'name',
    query: { enabled: !!fAssetAddress },
  });

  const {
    data: tokenSymbol,
    isLoading: isLoadingSymbol,
    refetch: refetchSymbol,
  } = useReadContract({
    address: fAssetAddress,
    abi: fAssetAbi,
    functionName: 'symbol',
    query: { enabled: !!fAssetAddress },
  });

  const {
    data: tokenDecimals,
    isLoading: isLoadingDecimals,
    refetch: refetchDecimals,
  } = useReadContract({
    address: fAssetAddress,
    abi: fAssetAbi,
    functionName: 'decimals',
    query: { enabled: !!fAssetAddress },
  });

  const {
    data: assetName,
    isLoading: isLoadingAssetName,
    refetch: refetchAssetName,
  } = useReadContract({
    address: fAssetAddress,
    abi: fAssetAbi,
    functionName: 'assetName',
    query: { enabled: !!fAssetAddress },
  });

  const {
    data: assetSymbol,
    isLoading: isLoadingAssetSymbol,
    refetch: refetchAssetSymbol,
  } = useReadContract({
    address: fAssetAddress,
    abi: fAssetAbi,
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
