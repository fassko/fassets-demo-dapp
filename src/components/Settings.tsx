'use client';

import { useState } from 'react';

import {
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Settings as SettingsIcon,
} from 'lucide-react';

import { useAccount } from 'wagmi';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAssetManager } from '@/hooks/useAssetManager';
import { useFXRPPrice } from '@/hooks/useFXRPPrice';
import { getExplorerName } from '@/lib/chainUtils';
import { copyToClipboardWithTimeout } from '@/lib/clipboard';
import { formatPrice } from '@/lib/ftsoUtils';
import { truncateAddress } from '@/lib/utils';

// FAssets AssetManagerFXRP settings
// https://dev.flare.network/fassets/developer-guides/fassets-settings-solidity
// https://dev.flare.network/fassets/operational-parameters

interface SettingsProps {
  onNavigate?: (tab: string) => void;
}

export default function Settings({ onNavigate }: SettingsProps) {
  // Use FAssets asset manager hook to read settings
  const {
    settings,
    isLoading: loading,
    error,
    refetchSettings,
  } = useAssetManager();

  const { chain } = useAccount();
  const { priceData } = useFXRPPrice();
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refresh handler to refetch settings with loading state
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetchSettings();
    } finally {
      setIsRefreshing(false);
    }
  };

  const isLoading = loading || isRefreshing;

  // Helper function to create explorer link with copy functionality
  function createExplorerLink(address: string) {
    const isCopied = copiedAddress === address;
    // Get the explorer name based on the current chain, default to 'flare'
    const explorer = chain ? getExplorerName(chain.id) : 'flare';

    return (
      <div className='flex items-center gap-2'>
        <a
          href={`https://${explorer}-explorer.flare.network/address/${address}`}
          target='_blank'
          className='text-slate-500 font-mono hover:underline'
        >
          {truncateAddress(address)}
        </a>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => copyToClipboardWithTimeout(address, setCopiedAddress)}
          className='h-6 w-6 p-0 hover:bg-slate-100 cursor-pointer'
        >
          {isCopied ? (
            <Check className='h-3 w-3 text-green-600' />
          ) : (
            <Copy className='h-3 w-3 text-slate-500' />
          )}
        </Button>
      </div>
    );
  }

  function settingsBox(
    title: string,
    items: Array<{ title: string; value: React.ReactNode }>
  ) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='text-slate-900'>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='space-y-2 text-sm text-slate-700'>
            {items.map((item, index) => (
              <div key={index} className='flex justify-between'>
                <span className='font-medium text-slate-900'>
                  {item.title}:
                </span>
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='w-full max-w-4xl mx-auto p-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <CardTitle className='flex items-center gap-2 text-slate-900'>
              <SettingsIcon className='h-5 w-5 text-slate-600' />
              Asset Manager FXRP Settings
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className='flex items-start justify-between mb-6'>
            <p className='text-slate-700'>
              View and manage Asset Manager configuration settings for FXRP
              operations.{' '}
              <a
                href='https://dev.flare.network/fassets/overview'
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline'
              >
                Learn more
                <ExternalLink className='h-3 w-3' />
              </a>
            </p>
          </div>

          <div className='flex justify-end mb-6'>
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant='outline'
              size='sm'
              className='border-slate-300 hover:bg-slate-100 cursor-pointer'
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
              />
              {isLoading ? 'Loading...' : 'Refresh Settings'}
            </Button>
          </div>

          <div className='space-y-6'>
            {error && (
              <Alert variant='destructive'>
                <AlertDescription>
                  <strong>Error:</strong> {error}
                </AlertDescription>
              </Alert>
            )}

            {isLoading && (
              <Alert className='bg-slate-50 border-slate-200 text-slate-700'>
                <AlertDescription>
                  Loading AssetManager settings...
                </AlertDescription>
              </Alert>
            )}

            {settings && (
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                {settingsBox('Contract Addresses', [
                  {
                    title: 'Asset Manager Controller',
                    value: createExplorerLink(settings.assetManagerController),
                  },
                  {
                    title: 'FXRP Token',
                    value: createExplorerLink(settings.fAsset),
                  },
                  {
                    title: 'Agent Owner Registry',
                    value: createExplorerLink(settings.agentOwnerRegistry),
                  },
                ])}

                {settingsBox('Asset Configuration', [
                  {
                    title: 'Asset Decimals',
                    value: settings.assetDecimals.toString(),
                  },
                  {
                    title: 'Asset Minting Decimals',
                    value: settings.assetMintingDecimals.toString(),
                  },
                  {
                    title: 'Asset Unit UBA',
                    value: settings.assetUnitUBA.toString(),
                  },
                  {
                    title: 'Asset Minting Granularity UBA',
                    value: settings.assetMintingGranularityUBA.toString(),
                  },
                ])}

                {settingsBox('Minting Settings', [
                  {
                    title: 'Lot Size AMG',
                    value: settings.lotSizeAMG.toString(),
                  },
                  {
                    title: 'Collateral Reservation Fee (BIPS)',
                    value: settings.collateralReservationFeeBIPS.toString(),
                  },
                ])}

                <Card>
                  <CardHeader>
                    <div className='flex items-center justify-between'>
                      <CardTitle className='text-slate-900'>
                        Minting Cap 🧢
                      </CardTitle>
                      {onNavigate && (
                        <Button
                          onClick={() => onNavigate('minting-cap')}
                          variant='outline'
                          size='sm'
                          className='border-blue-300 hover:bg-blue-50 text-blue-700 cursor-pointer'
                        >
                          View Details
                          <ArrowRight className='h-4 w-4 ml-1' />
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-2 text-sm text-slate-700'>
                      <div className='flex justify-between'>
                        <span className='font-medium text-slate-900'>
                          Minting Cap AMG:
                        </span>
                        <span>{settings.mintingCapAMG.toString()}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='font-medium text-slate-900'>
                          Minting Cap (FXRP):
                        </span>
                        <span>
                          {(() => {
                            const mintingCap =
                              BigInt(settings.mintingCapAMG) *
                              BigInt(settings.assetMintingGranularityUBA);
                            if (mintingCap === BigInt(0)) {
                              return '♾️ Unlimited';
                            }
                            const assetDecimals = Number(
                              settings.assetDecimals
                            );
                            const formattedCap =
                              Number(mintingCap) / Math.pow(10, assetDecimals);
                            return formattedCap.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            });
                          })()}
                        </span>
                      </div>
                      {priceData && (
                        <div className='flex justify-between'>
                          <span className='font-medium text-slate-900'>
                            Minting Cap (USD):
                          </span>
                          <span>
                            {(() => {
                              const mintingCap =
                                BigInt(settings.mintingCapAMG) *
                                BigInt(settings.assetMintingGranularityUBA);
                              if (mintingCap === BigInt(0)) {
                                return '♾️ Unlimited';
                              }
                              const assetDecimals = Number(
                                settings.assetDecimals
                              );
                              const fxrpAmount =
                                Number(mintingCap) /
                                Math.pow(10, assetDecimals);
                              const usdValue = fxrpAmount * priceData.price;
                              return formatPrice(usdValue);
                            })()}
                          </span>
                        </div>
                      )}
                      <div className='flex justify-between'>
                        <span className='font-medium text-slate-900'>
                          Status:
                        </span>
                        <span>
                          {BigInt(settings.mintingCapAMG) === BigInt(0) ? (
                            <span className='text-green-600 font-semibold'>
                              Unlimited
                            </span>
                          ) : (
                            <span className='text-blue-600 font-semibold'>
                              Cap Enabled
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {settingsBox('Redemption Settings', [
                  {
                    title: 'Redemption Fee (BIPS)',
                    value: settings.redemptionFeeBIPS.toString(),
                  },
                ])}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
