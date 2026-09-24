import { useQuery } from '@tanstack/react-query';

import { useChainId } from 'wagmi';

import {
  mapFxrpMintings,
  type FxrpMinting,
  type FxrpMintingRaw,
} from '@/lib/fxrpMintings';

type UseFXRPMintingsParams = {
  assetManagerAddress?: `0x${string}` | null;
  tokenAddress?: `0x${string}`;
  recipient?: `0x${string}`;
};

async function fetchFxrpMintings(
  chainId: number,
  assetManager: string,
  recipient: string,
  token: string
): Promise<FxrpMintingRaw[]> {
  const params = new URLSearchParams({
    chainId: String(chainId),
    assetManager,
    recipient,
    token,
  });
  const response = await fetch(`/api/fxrp-mintings?${params.toString()}`);
  const data = (await response.json()) as {
    mintings?: FxrpMintingRaw[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to fetch mintings');
  }

  return data.mintings ?? [];
}

export function useFXRPMintings({
  assetManagerAddress,
  tokenAddress,
  recipient,
}: UseFXRPMintingsParams) {
  const chainId = useChainId();
  const enabled = Boolean(
    chainId && assetManagerAddress && tokenAddress && recipient
  );

  const query = useQuery({
    queryKey: [
      'fxrp-mintings',
      chainId,
      assetManagerAddress,
      tokenAddress,
      recipient,
    ],
    queryFn: () =>
      fetchFxrpMintings(
        chainId,
        assetManagerAddress!,
        recipient!,
        tokenAddress!
      ),
    enabled,
  });

  const mintings: FxrpMinting[] = query.data ? mapFxrpMintings(query.data) : [];

  return {
    mintings,
    isLoading:
      Boolean(recipient) && (!enabled || query.isPending || query.isFetching),
    error: enabled ? query.error : null,
    refetch: query.refetch,
  };
}
