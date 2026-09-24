'use client';

import { Loader2, RefreshCw, Tag } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FxrpRedemption, RedemptionKind } from '@/lib/fxrpRedemptions';
import { getExplorerUrl, truncateAddress, truncateString } from '@/lib/utils';

const KIND_LABEL: Record<RedemptionKind, string> = {
  amount: 'Amount',
  tag: 'Tag',
};

const KIND_BADGE_CLASS: Record<RedemptionKind, string> = {
  amount: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  tag: 'bg-teal-100 text-teal-800 border-teal-200',
};

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

type RedemptionHistoryTableProps = {
  redemptions: FxrpRedemption[];
  isLoading: boolean;
  error: Error | null;
  chainId: number;
  connectedAddress?: `0x${string}`;
  onRefresh: () => void;
};

export function RedemptionHistoryTable({
  redemptions,
  isLoading,
  error,
  chainId,
  connectedAddress,
  onRefresh,
}: RedemptionHistoryTableProps) {
  const connected = connectedAddress?.toLowerCase();

  return (
    <div className='rounded-lg border border-green-200 overflow-hidden'>
      <div className='bg-green-100/70 px-4 py-2 border-b border-green-200 flex items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold text-green-900'>
          Your redemptions
        </h3>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onRefresh}
          disabled={isLoading}
          className='border-green-300 hover:bg-green-100 cursor-pointer'
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {isLoading && redemptions.length === 0 ? (
        <div className='flex items-center gap-2 p-6 text-sm text-green-700'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Loading redemptions…
        </div>
      ) : error && redemptions.length === 0 ? (
        <div className='p-6 space-y-3'>
          <Alert variant='destructive'>
            <AlertDescription>
              {error.message || 'Failed to load redemptions'}
            </AlertDescription>
          </Alert>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onRefresh}
            className='border-green-300 hover:bg-green-100 cursor-pointer'
          >
            Try again
          </Button>
        </div>
      ) : !connected ? (
        <p className='p-6 text-sm text-green-700'>
          Connect a wallet to see your redemptions.
        </p>
      ) : redemptions.length === 0 ? (
        <p className='p-6 text-sm text-green-700'>
          No redemptions for this wallet yet.
        </p>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-green-200 bg-green-50 text-left text-xs uppercase tracking-wide text-green-800'>
                <th className='px-4 py-2 font-medium'>Type</th>
                <th className='px-4 py-2 font-medium'>Redeemer</th>
                <th className='px-4 py-2 font-medium'>Destination</th>
                <th className='px-4 py-2 font-medium'>Payout</th>
                <th className='px-4 py-2 font-medium hidden sm:table-cell'>
                  Time
                </th>
                <th className='px-4 py-2 font-medium'>Tx</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map(redemption => {
                const isOwn =
                  connected !== undefined &&
                  redemption.redeemer.toLowerCase() === connected;
                return (
                  <tr
                    key={`${redemption.hash}-${redemption.logIndex}`}
                    className='border-b border-green-100 last:border-b-0'
                  >
                    <td className='px-4 py-3'>
                      <Badge
                        variant='outline'
                        className={KIND_BADGE_CLASS[redemption.kind]}
                      >
                        {redemption.kind === 'tag' ? (
                          <Tag className='h-3 w-3' />
                        ) : null}
                        {KIND_LABEL[redemption.kind]}
                      </Badge>
                    </td>
                    <td className='px-4 py-3 font-mono text-xs text-green-800'>
                      <div className='flex items-center gap-2'>
                        <a
                          href={getExplorerUrl(
                            chainId,
                            redemption.redeemer,
                            'address'
                          )}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-green-700 hover:text-green-900 hover:underline'
                        >
                          {truncateAddress(redemption.redeemer)}
                        </a>
                        {isOwn ? (
                          <Badge
                            variant='outline'
                            className='bg-green-100 text-green-800 border-green-200'
                          >
                            You
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className='px-4 py-3 font-mono text-xs text-green-800'>
                      <span title={redemption.paymentAddress}>
                        {truncateString(redemption.paymentAddress, 6, 4, 14)}
                      </span>
                      {redemption.destinationTag ? (
                        <span className='block text-[11px] text-green-600 mt-0.5'>
                          tag {redemption.destinationTag}
                        </span>
                      ) : null}
                    </td>
                    <td className='px-4 py-3 font-medium text-green-900 whitespace-nowrap'>
                      <span>{redemption.payout} XRP</span>
                      <span className='block text-[11px] font-normal text-green-600 mt-0.5'>
                        agent fee {redemption.fee}
                      </span>
                      {redemption.systemFee ? (
                        <span className='block text-[11px] font-normal text-green-600'>
                          system fee {redemption.systemFee} FXRP
                        </span>
                      ) : null}
                    </td>
                    <td className='px-4 py-3 text-green-700 whitespace-nowrap hidden sm:table-cell'>
                      {formatTimestamp(redemption.timestamp)}
                    </td>
                    <td className='px-4 py-3 font-mono text-xs'>
                      <a
                        href={getExplorerUrl(chainId, redemption.hash, 'tx')}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='text-green-600 hover:text-green-800 underline'
                      >
                        {truncateString(redemption.hash, 6, 4, 12)}
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
