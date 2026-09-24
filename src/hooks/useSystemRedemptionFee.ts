import { useChainId, useReadContracts } from 'wagmi';

import { isZeroAddress } from '@/lib/mintingTagUtils';

/**
 * `IRedeemExtendedSettings` reads that are not in the published periphery package yet.
 * Coston 2's Asset Manager exposes the rate and receiver, but
 * `effectiveSystemRedemptionFeeBIPS` is not on that diamond and reverts.
 * The effective rate is the configured rate when the receiver is nonzero, and 0 otherwise.
 */
const systemRedemptionFeeAbi = [
  {
    type: 'function',
    name: 'systemRedemptionFeeBIPS',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'systemRedemptionFeeReceiver',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
] as const;

export function useSystemRedemptionFee(
  assetManagerAddress: `0x${string}` | null | undefined
) {
  const chainId = useChainId();
  const enabled = Boolean(assetManagerAddress);

  const { data, isLoading, error } = useReadContracts({
    contracts: [
      {
        address: assetManagerAddress ?? undefined,
        abi: systemRedemptionFeeAbi,
        functionName: 'systemRedemptionFeeBIPS',
        chainId,
      },
      {
        address: assetManagerAddress ?? undefined,
        abi: systemRedemptionFeeAbi,
        functionName: 'systemRedemptionFeeReceiver',
        chainId,
      },
    ],
    allowFailure: true,
    query: {
      enabled,
    },
  });

  const feeResult = data?.[0];
  const receiverResult = data?.[1];
  const feeLoaded = feeResult?.status === 'success';
  const receiverLoaded = receiverResult?.status === 'success';

  const readError =
    enabled && data && (!feeLoaded || !receiverLoaded)
      ? 'System redemption fee settings are unavailable on this Asset Manager.'
      : error
        ? error.message
        : null;

  const configuredFeeBIPS = feeLoaded ? BigInt(feeResult.result) : undefined;
  const effectiveSystemRedemptionFeeBIPS =
    configuredFeeBIPS === undefined || !receiverLoaded
      ? undefined
      : isZeroAddress(receiverResult.result)
        ? 0n
        : configuredFeeBIPS;

  return {
    effectiveSystemRedemptionFeeBIPS,
    systemRedemptionFeeReceiver: receiverLoaded
      ? (receiverResult.result as `0x${string}`)
      : undefined,
    isLoading: enabled && isLoading,
    error: readError,
  };
}
