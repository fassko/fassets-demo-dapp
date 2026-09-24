'use client';

import { Loader2, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FxrpMinting } from '@/lib/fxrpMintings';
import { getExplorerUrl, truncateAddress, truncateString } from '@/lib/utils';

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

type MintingHistoryTableProps = {
  mintings: FxrpMinting[];
  isLoading: boolean;
  error: Error | null;
  chainId: number;
  connectedAddress?: `0x${string}`;
  onRefresh: () => void;
};

export function MintingHistoryTable({
  mintings,
  isLoading,
  error,
  chainId,
  connectedAddress,
  onRefresh,
}: MintingHistoryTableProps) {
  const connected = connectedAddress?.toLowerCase();

  return (
    <div className='rounded-lg border border-emerald-200 overflow-hidden'>
      <div className='bg-emerald-100/70 px-4 py-2 border-b border-emerald-200 flex items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold text-emerald-900'>
          Your mintings
        </h3>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onRefresh}
          disabled={isLoading}
          className='border-emerald-300 hover:bg-emerald-100 cursor-pointer'
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {isLoading && mintings.length === 0 ? (
        <div className='flex items-center gap-2 p-6 text-sm text-emerald-700'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Loading mintings…
        </div>
      ) : error && mintings.length === 0 ? (
        <div className='p-6 space-y-3'>
          <Alert variant='destructive'>
            <AlertDescription>
              {error.message || 'Failed to load mintings'}
            </AlertDescription>
          </Alert>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onRefresh}
            className='border-emerald-300 hover:bg-emerald-100 cursor-pointer'
          >
            Try again
          </Button>
        </div>
      ) : !connected ? (
        <p className='p-6 text-sm text-emerald-700'>
          Connect a wallet to see your mintings.
        </p>
      ) : mintings.length === 0 ? (
        <p className='p-6 text-sm text-emerald-700'>
          No mintings for this wallet yet.
        </p>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-emerald-200 bg-emerald-50 text-left text-xs uppercase tracking-wide text-emerald-800'>
                <th className='px-4 py-2 font-medium'>Recipient</th>
                <th className='px-4 py-2 font-medium'>Minted</th>
                <th className='px-4 py-2 font-medium hidden sm:table-cell'>
                  Fee
                </th>
                <th className='px-4 py-2 font-medium hidden sm:table-cell'>
                  Time
                </th>
                <th className='px-4 py-2 font-medium'>Tx</th>
              </tr>
            </thead>
            <tbody>
              {mintings.map(minting => {
                const isOwn =
                  connected !== undefined &&
                  minting.targetAddress.toLowerCase() === connected;
                return (
                  <tr
                    key={`${minting.hash}-${minting.logIndex}`}
                    className='border-b border-emerald-100 last:border-b-0'
                  >
                    <td className='px-4 py-3 font-mono text-xs text-emerald-800'>
                      <div className='flex items-center gap-2'>
                        <a
                          href={getExplorerUrl(
                            chainId,
                            minting.targetAddress,
                            'address'
                          )}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-emerald-700 hover:text-emerald-900 hover:underline'
                        >
                          {truncateAddress(minting.targetAddress)}
                        </a>
                        {isOwn ? (
                          <Badge
                            variant='outline'
                            className='bg-emerald-100 text-emerald-800 border-emerald-200'
                          >
                            You
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className='px-4 py-3 font-medium text-emerald-900 whitespace-nowrap'>
                      {minting.mintedAmount} FXRP
                    </td>
                    <td className='px-4 py-3 text-emerald-700 whitespace-nowrap hidden sm:table-cell'>
                      {minting.mintingFee} FXRP
                    </td>
                    <td className='px-4 py-3 text-emerald-700 whitespace-nowrap hidden sm:table-cell'>
                      {formatTimestamp(minting.timestamp)}
                    </td>
                    <td className='px-4 py-3 font-mono text-xs'>
                      <a
                        href={getExplorerUrl(chainId, minting.hash, 'tx')}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-emerald-600 hover:text-emerald-800 underline'
                      >
                        {truncateString(minting.hash, 6, 4, 12)}
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
