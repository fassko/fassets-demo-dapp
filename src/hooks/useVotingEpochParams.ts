// Voting epoch parameters from FlareSystemsManager.
// Used to compute FDC round IDs: (blockTimestamp - firstVotingRoundStartTs) / votingEpochDurationSeconds
// https://dev.flare.network/fdc/guides/fdc-by-hand

import { useChainId } from 'wagmi';

import {
  getReadIFlareSystemsManagerFirstVotingRoundStartTs,
  getReadIFlareSystemsManagerVotingEpochDurationSeconds,
} from '@/lib/abiUtils';

export function useVotingEpochParams({
  flareSystemsManagerAddress,
}: {
  flareSystemsManagerAddress: `0x${string}` | undefined;
}) {
  const chainId = useChainId();
  const queryEnabled = !!flareSystemsManagerAddress;

  const useReadFirstVotingRoundStartTs =
    getReadIFlareSystemsManagerFirstVotingRoundStartTs(chainId);
  const useReadVotingEpochDurationSeconds =
    getReadIFlareSystemsManagerVotingEpochDurationSeconds(chainId);

  const {
    data: firstVotingRoundStartTs,
    isLoading: isLoadingFirstVotingRoundStartTs,
    error: firstVotingRoundStartTsError,
    refetch: refetchFirstVotingRoundStartTs,
  } = useReadFirstVotingRoundStartTs({
    address: flareSystemsManagerAddress,
    query: {
      enabled: queryEnabled,
    },
  });

  const {
    data: votingEpochDurationSeconds,
    isLoading: isLoadingVotingEpochDurationSeconds,
    error: votingEpochDurationSecondsError,
    refetch: refetchVotingEpochDurationSeconds,
  } = useReadVotingEpochDurationSeconds({
    address: flareSystemsManagerAddress,
    query: {
      enabled: queryEnabled,
    },
  });

  const refetch = async () => {
    await Promise.all([
      refetchFirstVotingRoundStartTs(),
      refetchVotingEpochDurationSeconds(),
    ]);
  };

  return {
    firstVotingRoundStartTs:
      firstVotingRoundStartTs !== undefined
        ? BigInt(firstVotingRoundStartTs)
        : undefined,
    votingEpochDurationSeconds:
      votingEpochDurationSeconds !== undefined
        ? BigInt(votingEpochDurationSeconds)
        : undefined,
    isLoading:
      queryEnabled &&
      (isLoadingFirstVotingRoundStartTs || isLoadingVotingEpochDurationSeconds),
    error: firstVotingRoundStartTsError ?? votingEpochDurationSecondsError,
    refetch,
  };
}
