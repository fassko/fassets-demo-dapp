'use client';

// FAssets AssetManagerFXRP settings
// https://dev.flare.network/fassets/developer-guides/fassets-settings-solidity
// https://dev.flare.network/fassets/operational-parameters

import { useState } from 'react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAssetManager } from '@/hooks/useAssetManager';
import { Check, Copy, RefreshCw, Settings as SettingsIcon } from 'lucide-react';

import { copyToClipboardWithTimeout } from '@/lib/clipboard';
import { truncateAddress } from '@/lib/utils';

export default function Settings() {
  // Use FAssets asset manager hook to read settings
  const {
    settings,
    isLoading: loading,
    error,
    refetchSettings,
  } = useAssetManager();

  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  // Helper function to create explorer link with copy functionality
  function createExplorerLink(address: string, explorer: string = 'coston2') {
    const isCopied = copiedAddress === address;

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
          className='h-6 w-6 p-0 hover:bg-slate-100'
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
          <CardTitle className='flex items-center gap-2 text-slate-900'>
            <SettingsIcon className='h-5 w-5 text-slate-600' />
            Asset Manager FXRP Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-slate-700 mb-6'>
            View and manage Asset Manager configuration settings for FXRP
            operations.
          </p>

          <div className='flex justify-end mb-6'>
            <Button
              onClick={() => refetchSettings()}
              disabled={loading}
              variant='outline'
              size='sm'
              className='border-slate-300 hover:bg-slate-100 cursor-pointer'
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`}
              />
              {loading ? 'Loading...' : 'Refresh Settings'}
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

            {loading && (
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

                {settingsBox('Redemption Settings', [
                  {
                    title: 'Redemption Fee (BIPS)',
                    value: settings.redemptionFeeBIPS.toString(),
                  },
                ])}

                {settingsBox('Registry Addresses', [
                  {
                    title: 'Agent Owner Registry',
                    value: createExplorerLink(settings.agentOwnerRegistry),
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
