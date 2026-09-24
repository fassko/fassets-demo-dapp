'use client';

import { ArrowDownLeft, ArrowUpRight, Loader2, RefreshCw } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { FxrpTransfer, TransferDirection } from '@/lib/fxrpTransfers';
import { getExplorerUrl, truncateAddress, truncateString } from '@/lib/utils';

const DIRECTION_LABEL: Record<TransferDirection, string> = {
  sent: 'Sent',
  received: 'Received',
  mint: 'Mint',
  redeem: 'Redeem',
};

const DIRECTION_BADGE_CLASS: Record<TransferDirection, string> = {
  sent: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  received: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  mint: 'bg-sky-100 text-sky-800 border-sky-200',
  redeem: 'bg-amber-100 text-amber-800 border-amber-200',
};

function formatTimestamp(timestamp: string | null): string {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

type TransferHistoryTableProps = {
  transfers: FxrpTransfer[];
  isLoading: boolean;
  isConnected: boolean;
  error: Error | null;
  chainId: number;
  onRefresh: () => void;
};

export function TransferHistoryTable({
  transfers,
  isLoading,
  isConnected,
  error,
  chainId,
  onRefresh,
}: TransferHistoryTableProps) {
  return (
    <div className='rounded-lg border border-cyan-200 overflow-hidden'>
      <div className='bg-cyan-100/70 px-4 py-2 border-b border-cyan-200 flex items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold text-cyan-900'>
          Recent FXRP transfers
        </h3>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onRefresh}
          disabled={!isConnected || isLoading}
          className='border-cyan-300 hover:bg-cyan-100 cursor-pointer'
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
          />
          Refresh
        </Button>
      </div>

      {!isConnected ? (
        <p className='p-6 text-sm text-cyan-700'>
          Connect your wallet to see recent transfers.
        </p>
      ) : isLoading && transfers.length === 0 ? (
        <div className='flex items-center gap-2 p-6 text-sm text-cyan-700'>
          <Loader2 className='h-4 w-4 animate-spin' />
          Loading transfers…
        </div>
      ) : error && transfers.length === 0 ? (
        <div className='p-6 space-y-3'>
          <Alert variant='destructive'>
            <AlertDescription>
              {error.message || 'Failed to load transfers'}
            </AlertDescription>
          </Alert>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onRefresh}
            className='border-cyan-300 hover:bg-cyan-100 cursor-pointer'
          >
            Try again
          </Button>
        </div>
      ) : transfers.length === 0 ? (
        <p className='p-6 text-sm text-cyan-700'>No FXRP transfers yet.</p>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-cyan-200 bg-cyan-50 text-left text-xs uppercase tracking-wide text-cyan-800'>
                <th className='px-4 py-2 font-medium'>Direction</th>
                <th className='px-4 py-2 font-medium'>Counterparty</th>
                <th className='px-4 py-2 font-medium'>Amount</th>
                <th className='px-4 py-2 font-medium hidden sm:table-cell'>
                  Time
                </th>
                <th className='px-4 py-2 font-medium'>Tx</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(transfer => (
                <tr
                  key={`${transfer.hash}-${transfer.logIndex}`}
                  className='border-b border-cyan-100 last:border-b-0'
                >
                  <td className='px-4 py-3'>
                    <Badge
                      variant='outline'
                      className={DIRECTION_BADGE_CLASS[transfer.direction]}
                    >
                      {transfer.direction === 'sent' ? (
                        <ArrowUpRight className='h-3 w-3' />
                      ) : transfer.direction === 'received' ? (
                        <ArrowDownLeft className='h-3 w-3' />
                      ) : null}
                      {DIRECTION_LABEL[transfer.direction]}
                    </Badge>
                  </td>
                  <td className='px-4 py-3 font-mono text-xs text-cyan-800'>
                    <a
                      href={getExplorerUrl(
                        chainId,
                        transfer.counterparty,
                        'address'
                      )}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-cyan-700 hover:text-cyan-900 hover:underline'
                    >
                      {truncateAddress(transfer.counterparty)}
                    </a>
                  </td>
                  <td className='px-4 py-3 font-medium text-cyan-900 whitespace-nowrap'>
                    {transfer.amount} FXRP
                  </td>
                  <td className='px-4 py-3 text-cyan-700 whitespace-nowrap hidden sm:table-cell'>
                    {formatTimestamp(transfer.timestamp)}
                  </td>
                  <td className='px-4 py-3 font-mono text-xs'>
                    <a
                      href={getExplorerUrl(chainId, transfer.hash, 'tx')}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-cyan-600 hover:text-cyan-800 underline'
                    >
                      {truncateString(transfer.hash, 6, 4, 12)}
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
