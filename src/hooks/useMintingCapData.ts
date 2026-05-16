import { useCallback, useEffect, useState } from 'react';

import { useChainId } from 'wagmi';

import { createPublicClient, http, type ReadContractReturnType } from 'viem';

import { useAssetManager } from '@/hooks/useAssetManager';
import {
  getAssetManagerAbi,
  getReadIAssetManager,
  getReadIFAsset,
  getTypedSettings,
} from '@/lib/abiUtils';
import { getChainById } from '@/lib/chainUtils';

const AGENT_STATUS_NORMAL = 0;
const AGENT_STATUS_LIQUIDATION = 1;

export interface MintingCapData {
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
  const [mintingData, setMintingData] = useState<MintingCapData | null>(null);
  const [isCalculating, setIsCalculating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    assetManagerAddress,
    settings: rawSettings,
    isLoading: isLoadingSettings,
    error: assetManagerError,
    refetchSettings,
  } = useAssetManager();

  const settings = getTypedSettings(rawSettings);

  type AssetManagerAbi = ReturnType<typeof getAssetManagerAbi>;
  type GetAllAgentsReturnType = ReadContractReturnType<
    AssetManagerAbi,
    'getAllAgents',
    readonly [bigint, bigint]
  >;

  const useReadIFAsset = getReadIFAsset(chainId);
  const {
    data: totalSupply,
    isLoading: isLoadingSupply,
    refetch: refetchSupply,
  } = useReadIFAsset({
    address: settings?.fAsset as `0x${string}`,
    functionName: 'totalSupply',
    query: {
      enabled: !!settings?.fAsset,
      staleTime: 0,
    },
  });

  const useReadIAssetManager = getReadIAssetManager(chainId);
  const {
    data: rawAllAgentsData,
    isLoading: isLoadingAgents,
    refetch: refetchAgents,
  } = useReadIAssetManager({
    address: assetManagerAddress as `0x${string}`,
    functionName: 'getAllAgents',
    query: {
      enabled: !!assetManagerAddress,
      staleTime: 0,
    },
    args: [BigInt(0), BigInt(100)],
  });

  const allAgentsData = rawAllAgentsData as GetAllAgentsReturnType | undefined;

  useEffect(() => {
    const calculateMintingCap = async () => {
      if (!settings || !totalSupply || !allAgentsData || !assetManagerAddress) {
        return;
      }

      try {
        setIsCalculating(true);
        setError(null);

        const lotSizeUBA =
          BigInt(settings.lotSizeAMG) *
          BigInt(settings.assetMintingGranularityUBA);

        const mintingCap =
          BigInt(settings.mintingCapAMG) *
          BigInt(settings.assetMintingGranularityUBA);

        const assetDecimals = Number(settings.assetDecimals);

        const supply = BigInt(totalSupply);
        const formattedSupply = Number(supply) / Math.pow(10, assetDecimals);
        const mintedLots = supply / lotSizeUBA;

        const agents = (allAgentsData as GetAllAgentsReturnType)[0];
        let availableToMintLots = 0;

        const currentChain = getChainById(chainId) || getChainById(14);
        if (!currentChain) {
          throw new Error('Unable to determine chain');
        }

        const client = createPublicClient({
          chain: currentChain,
          transport: http(),
        });

        for (const agent of agents) {
          try {
            const agentInfo = await client.readContract({
              address: assetManagerAddress as `0x${string}`,
              abi: getAssetManagerAbi(chainId),
              functionName: 'getAgentInfo',
              args: [agent],
            });

            const isAgentActiveOrLiquidation =
              Number(agentInfo.status) === AGENT_STATUS_NORMAL ||
              Number(agentInfo.status) === AGENT_STATUS_LIQUIDATION;
            const isPubliclyAvailable = agentInfo.publiclyAvailable === true;

            if (isAgentActiveOrLiquidation && isPubliclyAvailable) {
              availableToMintLots += Number(agentInfo.freeCollateralLots);
            }
          } catch (err) {
            console.error(`Error fetching agent info for ${agent}:`, err);
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

        setMintingData({
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
        });
      } catch (err) {
        console.error('Error calculating minting cap:', err);
        setError(
          err instanceof Error ? err.message : 'Failed to calculate minting cap'
        );
      } finally {
        setIsCalculating(false);
      }
    };

    calculateMintingCap();
  }, [settings, totalSupply, allAgentsData, assetManagerAddress, chainId]);

  const isLoading =
    isLoadingSettings || isLoadingSupply || isLoadingAgents || isCalculating;

  const refetch = useCallback(async () => {
    await Promise.all([refetchSettings(), refetchSupply(), refetchAgents()]);
  }, [refetchSettings, refetchSupply, refetchAgents]);

  return {
    mintingData,
    isLoading,
    error: error ?? assetManagerError,
    refetch,
  };
}
