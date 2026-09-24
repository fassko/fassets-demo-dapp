import { useChainId } from 'wagmi';

import { getReadIRedeemExtendedSettingsMinimumRedeemAmountUba } from '@/lib/abiUtils';

export function useMinimumRedeemAmountUBA(
  assetManagerAddress: `0x${string}` | null | undefined
) {
  const chainId = useChainId();
  const useReadMinimumRedeemAmountUBA =
    getReadIRedeemExtendedSettingsMinimumRedeemAmountUba(chainId);

  const {
    data: minimumRedeemAmountUBA,
    isLoading,
    error,
    refetch,
  } = useReadMinimumRedeemAmountUBA({
    address: assetManagerAddress ?? undefined,
    query: { enabled: !!assetManagerAddress },
  });

  return {
    minimumRedeemAmountUBA,
    isLoading,
    error,
    refetch,
  };
}
