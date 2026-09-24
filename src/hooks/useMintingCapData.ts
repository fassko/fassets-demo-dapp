import { useCallback, useMemo } from 'react';

import { useChainId } from 'wagmi';

import { useAgentInfos } from '@/hooks/useAgentInfos';
import { useAssetManager } from '@/hooks/useAssetManager';
import {
  getReadIAssetManagerAgentsGetAllAgents,
  getReadIfAssetDecimals,
  getReadIfAssetTotalSupply,
  getTypedSettings,
  type GetAllAgentsReturnType,
} from '@/lib/abiUtils';

const AGENT_STATUS_NORMAL = 0;
const AGENT_STATUS_LIQUIDATION = 1;

interface MintingCapData {
  mintingCapLots: bigint;
  mintingCapFXRP: number;
  totalSupply: bigint;
  totalSupplyFXRP: number;
  mintedLots: bigint;
  availableToMintLots: number;
  availableToMintFXRP: number;
  usagePercentage: number;
  remainingPercentage: number;
  remainingAmount: bigint;
  remainingAmountFXRP: number;
  lotSizeUBA: bigint;
  hasMintingCap: boolean;
}

export function useMintingCapData() {
  const chainId = useChainId();
  const {
    assetManagerAddress,
    settings: rawSettings,
    isLoading: isLoadingSettings,
    error: assetManagerError,
    refetchSettings,
  } = useAssetManager();

  const settings = getTypedSettings(rawSettings);
  const fAssetAddress = settings?.fAsset as `0x${string}` | undefined;

  const useReadDecimals = getReadIfAssetDecimals(chainId);
  const { data: tokenDecimals, refetch: refetchDecimals } = useReadDecimals({
    address: fAssetAddress,
    query: {
      enabled: !!fAssetAddress,
      staleTime: 0,
    },
  });

  const useReadTotalSupply = getReadIfAssetTotalSupply(chainId);
  const {
    data: totalSupply,
    isLoading: isLoadingSupply,
    refetch: refetchSupply,
  } = useReadTotalSupply({
    address: fAssetAddress,
    query: {
      enabled: !!fAssetAddress,
      staleTime: 0,
    },
  });

  const useReadGetAllAgents = getReadIAssetManagerAgentsGetAllAgents(chainId);
  const {
    data: rawAllAgentsData,
    isLoading: isLoadingAgents,
    refetch: refetchAgents,
  } = useReadGetAllAgents({
    address: assetManagerAddress as `0x${string}`,
    query: {
      enabled: !!assetManagerAddress,
      staleTime: 0,
    },
    args: [BigInt(0), BigInt(100)],
  });

  const allAgentsData = rawAllAgentsData as GetAllAgentsReturnType | undefined;
  const agents = allAgentsData?.[0];

  const {
    agentInfos,
    isLoading: isLoadingAgentInfos,
    error: agentInfosError,
    refetchAgentInfos,
  } = useAgentInfos({
    agents,
    assetManagerAddress,
  });

  const { mintingData, error: calculationError } = useMemo(() => {
    if (
      !settings ||
      totalSupply === undefined ||
      !agentInfos ||
      tokenDecimals === undefined
    ) {
      return { mintingData: null, error: null };
    }

    try {
      const lotSizeUBA =
        BigInt(settings.lotSizeAMG) *
        BigInt(settings.assetMintingGranularityUBA);

      const mintingCap =
        BigInt(settings.mintingCapAMG) *
        BigInt(settings.assetMintingGranularityUBA);

      const assetDecimals = Number(tokenDecimals);
      const supply = BigInt(totalSupply);
      const formattedSupply = Number(supply) / Math.pow(10, assetDecimals);
      const mintedLots = supply / lotSizeUBA;

      let availableToMintLots = 0;
      for (const agentInfo of agentInfos) {
        const isAgentActiveOrLiquidation =
          Number(agentInfo.status) === AGENT_STATUS_NORMAL ||
          Number(agentInfo.status) === AGENT_STATUS_LIQUIDATION;
        const isPubliclyAvailable = agentInfo.publiclyAvailable === true;

        if (isAgentActiveOrLiquidation && isPubliclyAvailable) {
          availableToMintLots += Number(agentInfo.freeCollateralLots);
        }
      }

      let finalAvailableLots = availableToMintLots;
      const hasMintingCap = mintingCap > BigInt(0);

      let usagePercentage = 0;
      let remainingPercentage = 100;
      let remainingAmount = BigInt(0);
      let remainingAmountFXRP = 0;

      if (hasMintingCap) {
        remainingAmount = mintingCap - supply;
        const remainingCapacityLots = Number(remainingAmount / lotSizeUBA);
        finalAvailableLots = Math.min(
          remainingCapacityLots,
          availableToMintLots
        );

        usagePercentage = (Number(supply) / Number(mintingCap)) * 100;
        remainingPercentage = 100 - usagePercentage;
        remainingAmountFXRP =
          Number(remainingAmount) / Math.pow(10, assetDecimals);
      }

      const mintingCapLots = mintingCap / lotSizeUBA;
      const formattedMintingCap =
        Number(mintingCap) / Math.pow(10, assetDecimals);
      const availableToMintFXRP =
        (finalAvailableLots * Number(lotSizeUBA)) / Math.pow(10, assetDecimals);

      return {
        mintingData: {
          mintingCapLots,
          mintingCapFXRP: formattedMintingCap,
          totalSupply: supply,
          totalSupplyFXRP: formattedSupply,
          mintedLots,
          availableToMintLots: finalAvailableLots,
          availableToMintFXRP,
          usagePercentage,
          remainingPercentage,
          remainingAmount,
          remainingAmountFXRP,
          lotSizeUBA,
          hasMintingCap,
        } satisfies MintingCapData,
        error: null,
      };
    } catch (err) {
      console.error('Error calculating minting cap:', err);
      return {
        mintingData: null,
        error:
          err instanceof Error
            ? err.message
            : 'Failed to calculate minting cap',
      };
    }
  }, [agentInfos, settings, tokenDecimals, totalSupply]);

  const isLoading =
    isLoadingSettings ||
    isLoadingSupply ||
    isLoadingAgents ||
    isLoadingAgentInfos;

  const refetch = useCallback(async () => {
    await Promise.all([
      refetchSettings(),
      refetchSupply(),
      refetchDecimals(),
      refetchAgents(),
      refetchAgentInfos(),
    ]);
  }, [
    refetchAgentInfos,
    refetchAgents,
    refetchDecimals,
    refetchSettings,
    refetchSupply,
  ]);

  return {
    mintingData,
    isLoading,
    error: calculationError ?? agentInfosError ?? assetManagerError,
    refetch,
  };
}
