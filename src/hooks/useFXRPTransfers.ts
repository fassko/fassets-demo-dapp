import { useQuery } from '@tanstack/react-query';

import { useAccount, useChainId } from 'wagmi';

import {
  mapFxrpTransfers,
  type FxrpTransfer,
  type FxrpTransferRaw,
} from '@/lib/fxrpTransfers';

type UseFXRPTransfersParams = {
  tokenAddress?: `0x${string}`;
  decimals?: number;
};

async function fetchFxrpTransfers(
  chainId: number,
  address: string,
  token: string
): Promise<FxrpTransferRaw[]> {
  const params = new URLSearchParams({
    chainId: String(chainId),
    address,
    token,
  });
  const response = await fetch(`/api/fxrp-transfers?${params.toString()}`);
  const data = (await response.json()) as {
    transfers?: FxrpTransferRaw[];
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'Failed to fetch transfers');
  }

  return data.transfers ?? [];
}

export function useFXRPTransfers({
  tokenAddress,
  decimals,
}: UseFXRPTransfersParams) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const query = useQuery({
    queryKey: ['fxrp-transfers', chainId, address, tokenAddress],
    queryFn: () => fetchFxrpTransfers(chainId, address!, tokenAddress!),
    enabled: Boolean(isConnected && address && tokenAddress && chainId),
  });

  const transfers: FxrpTransfer[] =
    query.data && address && decimals !== undefined
      ? mapFxrpTransfers(query.data, address, decimals)
      : [];

  return {
    transfers,
    isLoading: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    isConnected,
  };
}
