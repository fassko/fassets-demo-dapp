import { useMemo } from 'react';

import { useChainId, useReadContracts } from 'wagmi';

import {
  getAssetManagerAgentsAbi,
  type GetAgentInfoReturnType,
} from '@/lib/abiUtils';

export function useAgentInfos({
  agents,
  assetManagerAddress,
}: {
  agents: readonly `0x${string}`[] | undefined;
  assetManagerAddress: `0x${string}` | null | undefined;
}) {
  const chainId = useChainId();
  const abi = getAssetManagerAgentsAbi(chainId);
  const hasAgents = !!agents && agents.length > 0 && !!assetManagerAddress;

  const contracts = useMemo(
    () =>
      hasAgents
        ? agents.map(agent => ({
            address: assetManagerAddress,
            abi,
            functionName: 'getAgentInfo' as const,
            args: [agent] as const,
          }))
        : [],
    [abi, agents, assetManagerAddress, hasAgents]
  );

  const {
    data,
    isLoading,
    error,
    refetch: refetchAgentInfos,
  } = useReadContracts({
    contracts,
    allowFailure: true,
    query: {
      enabled: hasAgents,
      staleTime: 0,
    },
  });

  const agentInfos = useMemo((): GetAgentInfoReturnType[] | undefined => {
    if (!agents) {
      return undefined;
    }
    if (agents.length === 0) {
      return [];
    }
    if (!data) {
      return undefined;
    }

    return data.flatMap(item =>
      item.status === 'success' && item.result != null
        ? [item.result as GetAgentInfoReturnType]
        : []
    );
  }, [agents, data]);

  return {
    agentInfos,
    isLoading: hasAgents && isLoading,
    error: error ? error.message : null,
    refetchAgentInfos,
  };
}
