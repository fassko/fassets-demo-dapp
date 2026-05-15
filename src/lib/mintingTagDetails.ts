import type { Address } from 'viem';

import { getMintingTagManagerAbi } from '@/lib/abiUtils';
import { createFlarePublicClient } from '@/lib/publicClient';

export type MintingTagDetails = {
  tagId: bigint;
  recipient: Address;
  allowedExecutor: Address;
  pendingExecutor: boolean;
  pendingNewExecutor: Address;
  pendingActiveAfterTs: bigint;
};

export async function fetchMintingTagsDetails(
  mintingTagManagerAddress: Address,
  tagIds: readonly bigint[],
  chainId: number
): Promise<MintingTagDetails[]> {
  if (tagIds.length === 0) return [];

  const publicClient = createFlarePublicClient(chainId);
  const abi = getMintingTagManagerAbi(chainId);

  return Promise.all(
    tagIds.map(async tagId => {
      const [recipient, allowedExecutor, pending] = await Promise.all([
        publicClient.readContract({
          address: mintingTagManagerAddress,
          abi,
          functionName: 'mintingRecipient',
          args: [tagId],
        }),
        publicClient.readContract({
          address: mintingTagManagerAddress,
          abi,
          functionName: 'allowedExecutor',
          args: [tagId],
        }),
        publicClient.readContract({
          address: mintingTagManagerAddress,
          abi,
          functionName: 'pendingAllowedExecutorChange',
          args: [tagId],
        }),
      ]);

      return {
        tagId,
        recipient: recipient as Address,
        allowedExecutor: allowedExecutor as Address,
        pendingExecutor: pending[0] as boolean,
        pendingNewExecutor: pending[1] as Address,
        pendingActiveAfterTs: pending[2] as bigint,
      };
    })
  );
}
