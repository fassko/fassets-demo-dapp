'use client';

import { useEffect, useState } from 'react';

import { Loader2, RefreshCw } from 'lucide-react';
import { createPublicClient, erc20Abi, http } from 'viem';
import { useAccount, useReadContract } from 'wagmi';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { NetworkBadge } from '@/components/ui/network-badge';
import { useAssetManager } from '@/hooks/useAssetManager';
import { getChainById } from '@/lib/chainUtils';

import { iAssetManagerAbi } from '../generated';

// Agent status constants
const AGENT_STATUS_NORMAL = 0;
const AGENT_STATUS_LIQUIDATION = 1;

interface MintingCapData {
  mintingCapLots: bigint;
  mintingCapFXRP: number;
  totalSupply: bigint;
  totalSupplyFXRP: number;
  mintedLots: bigint;
  availableToMintLots: number;
  usagePercentage: number;
  remainingPercentage: number;
  remainingAmount: bigint;
  remainingAmountFXRP: number;
  lotSizeUBA: bigint;
  hasMintingCap: boolean;
}

export default function MintingCap() {
  const [mintingData, setMintingData] = useState<MintingCapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { chain } = useAccount();
  const {
    assetManagerAddress,
    settings,
    isLoading: isLoadingSettings,
    error: assetManagerError,
    refetchSettings,
  } = useAssetManager();

  // Read total FXRP supply
  const {
    data: totalSupply,
    isLoading: isLoadingSupply,
    refetch: refetchSupply,
  } = useReadContract({
    address: settings?.fAsset as `0x${string}`,
    abi: erc20Abi,
    functionName: 'totalSupply',
    query: {
      enabled: !!settings?.fAsset,
      staleTime: 0,
    },
  });

  // Read all agents
  const {
    data: allAgentsData,
    isLoading: isLoadingAgents,
    refetch: refetchAgents,
  } = useReadContract({
    address: assetManagerAddress!,
    abi: iAssetManagerAbi,
    functionName: 'getAllAgents',
    query: {
      enabled: !!assetManagerAddress,
      staleTime: 0,
    },
    args: [BigInt(0), BigInt(100)],
  });

  // Calculate minting capacity
  useEffect(() => {
    const calculateMintingCap = async () => {
      if (!settings || !totalSupply || !allAgentsData || !assetManagerAddress) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Calculate lot size in UBA
        const lotSizeUBA =
          BigInt(settings.lotSizeAMG) *
          BigInt(settings.assetMintingGranularityUBA);

        // Calculate minting cap in UBA
        const mintingCap =
          BigInt(settings.mintingCapAMG) *
          BigInt(settings.assetMintingGranularityUBA);

        const assetDecimals = Number(settings.assetDecimals);

        // Get total supply
        const supply = BigInt(totalSupply);
        const formattedSupply = Number(supply) / Math.pow(10, assetDecimals);

        // Calculate minted lots
        const mintedLots = supply / lotSizeUBA;

        // Get agents and calculate available capacity
        const agents = allAgentsData[0];
        let availableToMintLots = 0;

        // Create a public client for reading contract data
        // Use the current connected chain or fall back to a default
        const currentChain = chain || getChainById(14); // Default to Flare mainnet if no chain connected
        if (!currentChain) {
          throw new Error('Unable to determine chain');
        }

        const client = createPublicClient({
          chain: currentChain,
          transport: http(),
        });

        // Loop through all agents to calculate available capacity
        for (const agent of agents) {
          // Get agent info using direct contract call
          try {
            const agentInfo = await client.readContract({
              address: assetManagerAddress as `0x${string}`,
              abi: iAssetManagerAbi,
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
            // Continue to next agent
          }
        }

        // If minting cap is set, calculate remaining capacity
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

        setMintingData({
          mintingCapLots,
          mintingCapFXRP: formattedMintingCap,
          totalSupply: supply,
          totalSupplyFXRP: formattedSupply,
          mintedLots,
          availableToMintLots: finalAvailableLots,
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
        setIsLoading(false);
      }
    };

    calculateMintingCap();
  }, [settings, totalSupply, allAgentsData, assetManagerAddress, chain]);

  const loading =
    isLoadingSettings ||
    isLoadingSupply ||
    isLoadingAgents ||
    isLoading ||
    isRefreshing;

  // Refresh handler to refetch all data
  const handleRefresh = async () => {
    setError(null);
    setIsRefreshing(true);
    try {
      await Promise.all([refetchSettings(), refetchSupply(), refetchAgents()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className='w-full max-w-4xl mx-auto p-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <CardTitle
                className='flex items-center gap-2'
                style={{ color: '#E62058' }}
              >
                <span className='text-3xl'>🧢</span>
                Minting Cap
              </CardTitle>
              <NetworkBadge
                className='bg-red-50 text-red-700 font-semibold'
                style={{ borderColor: '#E62058' }}
              />
            </div>
            <Button
              onClick={handleRefresh}
              disabled={loading}
              variant='outline'
              size='sm'
              className='cursor-pointer'
              style={{ borderColor: '#E62058', color: '#E62058' }}
              onMouseEnter={e =>
                (e.currentTarget.style.backgroundColor = '#FEE2E2')
              }
              onMouseLeave={e =>
                (e.currentTarget.style.backgroundColor = 'transparent')
              }
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
              />
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className='mb-6' style={{ color: '#DC2626' }}>
            View available FXRP minting capacity and usage statistics
          </p>

          {loading && (
            <div className='flex items-center justify-center space-x-2 p-8'>
              <Loader2
                className='h-8 w-8 animate-spin'
                style={{ color: '#E62058' }}
              />
              <span className='text-lg' style={{ color: '#E62058' }}>
                Loading minting cap data...
              </span>
            </div>
          )}
          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {assetManagerError && (
            <Alert variant='destructive'>
              <AlertDescription>{assetManagerError}</AlertDescription>
            </Alert>
          )}
          {!loading && !error && mintingData && (
            <div className='space-y-6'>
              {/* Fun Cap Status Indicator */}
              <div
                className='rounded-lg p-6 overflow-hidden relative'
                style={{
                  background: (() => {
                    if (!mintingData.hasMintingCap) {
                      return 'linear-gradient(135deg, #34D399 0%, #10B981 100%)';
                    }
                    if (mintingData.usagePercentage >= 90) {
                      return 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)';
                    }
                    if (mintingData.usagePercentage >= 70) {
                      return 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)';
                    }
                    return 'linear-gradient(135deg, #34D399 0%, #10B981 100%)';
                  })(),
                  border: '3px solid #E62058',
                }}
              >
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-4'>
                    <span className='text-6xl'>
                      {!mintingData.hasMintingCap
                        ? '🎩'
                        : mintingData.usagePercentage >= 90
                          ? '🧢'
                          : mintingData.usagePercentage >= 70
                            ? '🧢'
                            : '🎉'}
                    </span>
                    <div>
                      <h3 className='text-2xl font-bold text-white mb-1'>
                        {!mintingData.hasMintingCap
                          ? 'No Cap! Unlimited Minting!'
                          : mintingData.usagePercentage >= 90
                            ? 'Cap is Tight! 🧢'
                            : mintingData.usagePercentage >= 70
                              ? 'Cap is Fitting Snug'
                              : 'Cap is Loose! Plenty of Room!'}
                      </h3>
                      <p className='text-white text-sm opacity-90'>
                        {!mintingData.hasMintingCap
                          ? 'Mint as much as you want, no limits! 🚀'
                          : mintingData.usagePercentage >= 90
                            ? `Only ${mintingData.remainingPercentage.toFixed(1)}% capacity remaining`
                            : mintingData.usagePercentage >= 70
                              ? `${mintingData.remainingPercentage.toFixed(1)}% capacity still available`
                              : `${mintingData.remainingPercentage.toFixed(1)}% capacity available - go wild! 🎊`}
                      </p>
                    </div>
                  </div>
                  {mintingData.hasMintingCap && (
                    <div className='text-right'>
                      <div className='text-4xl font-bold text-white'>
                        {mintingData.usagePercentage.toFixed(0)}%
                      </div>
                      <div className='text-sm text-white opacity-90'>Used</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Minting Cap Overview */}
              <div
                className='rounded-lg p-6 space-y-4'
                style={{
                  background:
                    'linear-gradient(to bottom right, #FEE2E2, #FECACA)',
                  border: '2px solid #E62058',
                }}
              >
                <div>
                  <h3
                    className='text-2xl font-bold flex items-center gap-2'
                    style={{ color: '#B91C1C' }}
                  >
                    <span>🧢</span>
                    {mintingData.hasMintingCap
                      ? `${mintingData.mintingCapFXRP.toLocaleString()} FXRP`
                      : 'Unlimited'}
                  </h3>
                  <p className='text-sm mt-1' style={{ color: '#DC2626' }}>
                    {mintingData.hasMintingCap
                      ? `Minting Cap (${mintingData.mintingCapLots.toString()} lots)`
                      : 'No minting cap set'}
                  </p>
                </div>
              </div>

              {/* Supply Information */}
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div
                  className='bg-white rounded-lg p-5'
                  style={{ border: '2px solid #E62058' }}
                >
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-2xl'>📊</span>
                    <h4 className='font-semibold' style={{ color: '#B91C1C' }}>
                      Total Supply
                    </h4>
                  </div>
                  <p
                    className='text-2xl font-bold'
                    style={{ color: '#DC2626' }}
                  >
                    {mintingData.totalSupplyFXRP.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6,
                    })}{' '}
                    FXRP
                  </p>
                  <p className='text-sm mt-1' style={{ color: '#E62058' }}>
                    {mintingData.mintedLots.toString()} lots minted
                  </p>
                </div>

                <div
                  className='bg-white rounded-lg p-5'
                  style={{
                    border: `2px solid ${mintingData.availableToMintLots > 0 ? '#10B981' : '#6B7280'}`,
                  }}
                >
                  <div className='flex items-center gap-2 mb-2'>
                    <span className='text-2xl'>
                      {mintingData.availableToMintLots > 0 ? '✨' : '⚠️'}
                    </span>
                    <h4
                      className='font-semibold'
                      style={{
                        color:
                          mintingData.availableToMintLots > 0
                            ? '#065F46'
                            : '#4B5563',
                      }}
                    >
                      Available to Mint
                    </h4>
                  </div>
                  <p
                    className='text-2xl font-bold'
                    style={{
                      color:
                        mintingData.availableToMintLots > 0
                          ? '#047857'
                          : '#6B7280',
                    }}
                  >
                    {mintingData.availableToMintLots.toLocaleString()} lots
                  </p>
                  {mintingData.availableToMintLots > 0 ? (
                    <p className='text-sm text-green-600 mt-1'>
                      Ready for minting 🎉
                    </p>
                  ) : (
                    <p className='text-sm text-gray-600 mt-1'>
                      No capacity available
                    </p>
                  )}
                </div>
              </div>

              {/* Minting Cap Usage Progress */}
              {mintingData.hasMintingCap && (
                <div
                  className='bg-white rounded-lg p-6 space-y-4'
                  style={{ border: '2px solid #E62058' }}
                >
                  <div className='flex items-center justify-between'>
                    <h4
                      className='font-semibold flex items-center gap-2'
                      style={{ color: '#B91C1C' }}
                    >
                      <span>📈</span>
                      Minting Cap Usage
                    </h4>
                    <span
                      className='text-sm font-medium'
                      style={{ color: '#DC2626' }}
                    >
                      {mintingData.usagePercentage.toFixed(2)}% Used
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className='relative'>
                    <div
                      className='h-8 rounded-full overflow-hidden'
                      style={{
                        backgroundColor: '#FEE2E2',
                        border: '2px solid #E62058',
                      }}
                    >
                      <div
                        className='h-full transition-all duration-500 flex items-center justify-end pr-2'
                        style={{
                          width: `${mintingData.usagePercentage}%`,
                          background:
                            'linear-gradient(to right, #DC2626, #E62058)',
                        }}
                      >
                        {mintingData.usagePercentage > 10 && (
                          <span className='text-xs font-bold text-white'>
                            {mintingData.usagePercentage.toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Usage Details */}
                  <div className='grid grid-cols-2 gap-4 pt-2'>
                    <div className='space-y-1'>
                      <p
                        className='text-xs font-medium'
                        style={{ color: '#E62058' }}
                      >
                        Used
                      </p>
                      <p
                        className='text-lg font-bold'
                        style={{ color: '#B91C1C' }}
                      >
                        {mintingData.totalSupplyFXRP.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        FXRP
                      </p>
                      <p className='text-xs' style={{ color: '#DC2626' }}>
                        {mintingData.usagePercentage.toFixed(2)}%
                      </p>
                    </div>
                    <div className='space-y-1'>
                      <p className='text-xs text-green-600 font-medium'>
                        Remaining
                      </p>
                      <p className='text-lg font-bold text-green-900'>
                        {mintingData.remainingAmountFXRP.toLocaleString(
                          undefined,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}{' '}
                        FXRP
                      </p>
                      <p className='text-xs text-green-500'>
                        {mintingData.remainingPercentage.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
