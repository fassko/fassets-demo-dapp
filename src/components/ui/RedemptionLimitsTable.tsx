import { Info, Loader2 } from 'lucide-react';

import {
  computeMaxRedeemableUBA,
  formatUbaAsAsset,
} from '@/lib/redeemValidation';

type RedemptionLimitsTableProps = {
  assetDecimals: number;
  minimumRedeemAmountUBA?: bigint;
  redemptionQueueTotalValueUBA: bigint | null;
  walletBalanceUBA?: bigint;
  isLoadingQueue: boolean;
  isConnected: boolean;
};

function formatXrp(
  uba: bigint | undefined | null,
  decimals: number
): string {
  if (uba === undefined || uba === null) return '—';
  return `${formatUbaAsAsset(uba, decimals)} XRP`;
}

export function RedemptionLimitsTable({
  assetDecimals,
  minimumRedeemAmountUBA,
  redemptionQueueTotalValueUBA,
  walletBalanceUBA,
  isLoadingQueue,
  isConnected,
}: RedemptionLimitsTableProps) {
  const queueUba = redemptionQueueTotalValueUBA ?? BigInt(0);
  const walletUba = walletBalanceUBA ?? BigInt(0);
  const minUba = minimumRedeemAmountUBA ?? BigInt(0);

  const maxRedeemableUBA =
    minimumRedeemAmountUBA !== undefined &&
    redemptionQueueTotalValueUBA !== null &&
    walletBalanceUBA !== undefined
      ? computeMaxRedeemableUBA(
          walletUba,
          minUba,
          queueUba
        )
      : null;

  const limitingFactor =
    maxRedeemableUBA !== null && maxRedeemableUBA > BigInt(0)
      ? walletUba <= queueUba
        ? 'Your FXRP balance'
        : 'Agent queue liquidity'
      : maxRedeemableUBA === BigInt(0) &&
          walletUba > BigInt(0) &&
          redemptionQueueTotalValueUBA !== null
        ? walletUba < minUba
          ? 'Balance below minimum'
          : queueUba < minUba
            ? 'Queue liquidity below minimum'
            : 'Cannot redeem (limits too low)'
        : null;

  const rows: {
    label: string;
    value: string;
    description: string;
    highlight?: boolean;
  }[] = [
    {
      label: 'Minimum per request',
      value:
        minimumRedeemAmountUBA !== undefined
          ? formatXrp(minimumRedeemAmountUBA, assetDecimals)
          : '—',
      description: 'Smallest amount the Asset Manager accepts',
    },
    {
      label: 'Agent liquidity (queue)',
      value: isLoadingQueue
        ? 'Loading…'
        : redemptionQueueTotalValueUBA !== null
          ? formatXrp(redemptionQueueTotalValueUBA, assetDecimals)
          : '—',
      description:
        'XRP value agents have offered in the redemption queue (max per tx)',
    },
    {
      label: 'Your FXRP balance',
      value: !isConnected
        ? 'Connect wallet'
        : walletBalanceUBA !== undefined
          ? formatXrp(walletBalanceUBA, assetDecimals)
          : '—',
      description: 'FXRP held by your connected wallet',
    },
    {
      label: 'You can redeem up to',
      value:
        !isConnected
          ? 'Connect wallet'
          : isLoadingQueue || minimumRedeemAmountUBA === undefined
            ? '…'
            : maxRedeemableUBA !== null && maxRedeemableUBA > BigInt(0)
              ? formatXrp(maxRedeemableUBA, assetDecimals)
              : '0 XRP',
      description:
        maxRedeemableUBA !== null && maxRedeemableUBA > BigInt(0) && limitingFactor
          ? `Capped by ${limitingFactor.toLowerCase()}`
          : limitingFactor ??
            'Lowest of your balance and queue liquidity (must meet minimum)',
      highlight: true,
    },
  ];

  return (
    <div className='mb-6 rounded-lg border border-green-200 bg-green-50/80 overflow-hidden'>
      <div className='flex items-center gap-2 border-b border-green-200 bg-green-100/60 px-4 py-2.5'>
        <Info className='h-4 w-4 text-green-700 shrink-0' />
        <h3 className='text-sm font-semibold text-green-900'>
          Redemption limits
        </h3>
        {isLoadingQueue && (
          <Loader2 className='h-3.5 w-3.5 animate-spin text-green-600 ml-auto' />
        )}
      </div>
      <div className='overflow-x-auto'>
        <table className='w-full text-sm'>
          <thead>
            <tr className='border-b border-green-200 text-left text-xs uppercase tracking-wide text-green-800'>
              <th className='px-4 py-2 font-medium'>Limit</th>
              <th className='px-4 py-2 font-medium whitespace-nowrap'>
                Amount
              </th>
              <th className='px-4 py-2 font-medium hidden sm:table-cell'>
                Meaning
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.label}
                className={
                  row.highlight
                    ? 'border-t-2 border-green-300 bg-green-100/50'
                    : 'border-b border-green-100 last:border-b-0'
                }
              >
                <td
                  className={`px-4 py-3 align-top ${
                    row.highlight
                      ? 'font-semibold text-green-900'
                      : 'text-green-800'
                  }`}
                >
                  {row.label}
                </td>
                <td
                  className={`px-4 py-3 align-top whitespace-nowrap font-mono tabular-nums ${
                    row.highlight
                      ? 'font-semibold text-green-950'
                      : 'text-green-900'
                  }`}
                >
                  {row.value}
                </td>
                <td className='px-4 py-3 align-top text-green-700 hidden sm:table-cell'>
                  {row.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {limitingFactor && maxRedeemableUBA !== null && maxRedeemableUBA > BigInt(0) && (
        <p className='border-t border-green-200 px-4 py-2 text-xs text-green-700 sm:hidden'>
          <span className='font-medium'>You can redeem up to:</span>{' '}
          {limitingFactor}
        </p>
      )}
    </div>
  );
}
