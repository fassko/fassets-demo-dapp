import { useQuery } from '@tanstack/react-query';

import { useChainId } from 'wagmi';

import {
  mapFxrpRedemptions,
  type FxrpRedemption,
  type FxrpRedemptionRaw,
} from '@/lib/fxrpRedemptions';

type UseFXRPRedemptionsParams = {
  assetManagerAddress?: `0x${string}` | null;
  redeemer?: `0x${string}`;
};

async function fetchFxrpRedemptions(
  chainId: number,
  assetManager: string,
  redeemer: string
): Promise<FxrpRedemptionRaw[]> {
  const params = new URLSearchParams({
    chainId: String(chainId),
    assetManager,
    redeemer,
  });
  const response = await fetch(`/api/fxrp-redemptions?${params.toString()}`);
  const data = (await response.json()) as {
    redemptions?: FxrpRedemptionRaw[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to fetch redemptions');
  }

  return data.redemptions ?? [];
}

export function useFXRPRedemptions({
  assetManagerAddress,
  redeemer,
}: UseFXRPRedemptionsParams) {
  const chainId = useChainId();
  const enabled = Boolean(chainId && assetManagerAddress && redeemer);

  const query = useQuery({
    queryKey: ['fxrp-redemptions', chainId, assetManagerAddress, redeemer],
    queryFn: () =>
      fetchFxrpRedemptions(chainId, assetManagerAddress!, redeemer!),
    enabled,
  });

  const redemptions: FxrpRedemption[] = query.data
    ? mapFxrpRedemptions(query.data)
    : [];

  return {
    redemptions,
    isLoading: enabled && (query.isPending || query.isFetching),
    error: enabled ? query.error : null,
    refetch: query.refetch,
  };
}
