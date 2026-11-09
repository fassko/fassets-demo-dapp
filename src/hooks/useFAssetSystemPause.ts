// Reads AssetManager pause views before minting or redeeming.
// https://dev.flare.network/fassets/emergency-pause#check-pause-status

import { useChainId, useReadContracts } from 'wagmi';

import { getAssetManagerPauseAbi } from '@/lib/abiUtils';

import { useAssetManager } from './useAssetManager';

export function useFAssetSystemPause() {
  const chainId = useChainId();
  const { assetManagerAddress, error: addressError } = useAssetManager();
  const abi = getAssetManagerPauseAbi(chainId);
  const enabled = Boolean(assetManagerAddress);

  const { data, isLoading, error, refetch } = useReadContracts({
    contracts: [
      {
        address: assetManagerAddress ?? undefined,
        abi,
        functionName: 'emergencyPaused',
        chainId,
      },
      {
        address: assetManagerAddress ?? undefined,
        abi,
        functionName: 'emergencyPauseLevel',
        chainId,
      },
      {
        address: assetManagerAddress ?? undefined,
        abi,
        functionName: 'emergencyPausedUntil',
        chainId,
      },
      {
        address: assetManagerAddress ?? undefined,
        abi,
        functionName: 'mintingPaused',
        chainId,
      },
    ],
    allowFailure: true,
    query: {
      enabled,
      refetchInterval: 30_000,
    },
  });

  const emergencyPausedResult = data?.[0];
  const levelResult = data?.[1];
  const pausedUntilResult = data?.[2];
  const mintingPausedResult = data?.[3];

  const emergencyPaused =
    emergencyPausedResult?.status === 'success'
      ? emergencyPausedResult.result
      : undefined;
  const emergencyPauseLevel =
    levelResult?.status === 'success' ? Number(levelResult.result) : undefined;
  const emergencyPausedUntil =
    pausedUntilResult?.status === 'success'
      ? pausedUntilResult.result
      : undefined;
  const mintingPaused =
    mintingPausedResult?.status === 'success'
      ? mintingPausedResult.result
      : undefined;

  const readsFailed =
    enabled &&
    data !== undefined &&
    (emergencyPaused === undefined ||
      emergencyPauseLevel === undefined ||
      emergencyPausedUntil === undefined ||
      mintingPaused === undefined);

  const readError = addressError
    ? addressError
    : readsFailed
      ? 'Could not read FAsset pause status from the AssetManager.'
      : error
        ? error.message
        : null;

  const addressPending = assetManagerAddress === null && !addressError;

  return {
    assetManagerAddress,
    emergencyPaused,
    emergencyPauseLevel,
    emergencyPausedUntil,
    mintingPaused,
    isLoading: addressPending || (enabled && isLoading),
    isReady:
      emergencyPaused !== undefined &&
      emergencyPauseLevel !== undefined &&
      emergencyPausedUntil !== undefined &&
      mintingPaused !== undefined,
    error: readError,
    refetch,
  };
}
