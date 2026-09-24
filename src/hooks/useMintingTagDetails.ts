import { useChainId } from 'wagmi';

import type { Address } from 'viem';

import {
  getReadIMintingTagManagerAllowedExecutor,
  getReadIMintingTagManagerMintingRecipient,
  getReadIMintingTagManagerPendingAllowedExecutorChange,
} from '@/lib/abiUtils';

export type MintingTagDetails = {
  tagId: bigint;
  recipient: Address;
  allowedExecutor: Address;
  pendingExecutor: boolean;
  pendingNewExecutor: Address;
  pendingActiveAfterTs: bigint;
};

export function useMintingTagDetails({
  mintingTagManagerAddress,
  tagId,
  enabled = true,
}: {
  mintingTagManagerAddress: `0x${string}` | undefined;
  tagId: bigint | undefined;
  enabled?: boolean;
}) {
  const chainId = useChainId();
  const queryEnabled =
    !!mintingTagManagerAddress && tagId !== undefined && enabled;
  const args = tagId !== undefined ? ([tagId] as const) : undefined;

  const useReadRecipient = getReadIMintingTagManagerMintingRecipient(chainId);
  const useReadExecutor = getReadIMintingTagManagerAllowedExecutor(chainId);
  const useReadPending =
    getReadIMintingTagManagerPendingAllowedExecutorChange(chainId);

  const {
    data: recipient,
    isLoading: isLoadingRecipient,
    error: recipientError,
    refetch: refetchRecipient,
  } = useReadRecipient({
    address: mintingTagManagerAddress,
    args,
    query: { enabled: queryEnabled },
  });

  const {
    data: allowedExecutor,
    isLoading: isLoadingExecutor,
    error: executorError,
    refetch: refetchExecutor,
  } = useReadExecutor({
    address: mintingTagManagerAddress,
    args,
    query: { enabled: queryEnabled },
  });

  const {
    data: pending,
    isLoading: isLoadingPending,
    error: pendingError,
    refetch: refetchPending,
  } = useReadPending({
    address: mintingTagManagerAddress,
    args,
    query: { enabled: queryEnabled },
  });

  const details: MintingTagDetails | undefined =
    tagId !== undefined &&
    recipient !== undefined &&
    allowedExecutor !== undefined &&
    pending !== undefined
      ? {
          tagId,
          recipient,
          allowedExecutor,
          pendingExecutor: pending[0],
          pendingNewExecutor: pending[1],
          pendingActiveAfterTs: pending[2],
        }
      : undefined;

  const refetch = async () => {
    await Promise.all([
      refetchRecipient(),
      refetchExecutor(),
      refetchPending(),
    ]);
  };

  return {
    details,
    isLoading:
      queryEnabled &&
      (isLoadingRecipient || isLoadingExecutor || isLoadingPending),
    error: recipientError ?? executorError ?? pendingError,
    refetch,
  };
}
