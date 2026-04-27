'use client';

import { useEffect, useRef, useState } from 'react';

import { ExternalLink, Loader2, RefreshCw, Zap } from 'lucide-react';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAccount, useChainId } from 'wagmi';

import { z } from 'zod';

import type { Address } from 'viem';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAssetManager } from '@/hooks/useAssetManager';
import {
  getReadIAssetManager,
  getWatchIDirectMintingEvent,
} from '@/lib/abiUtils';
import { getExplorerUrl } from '@/lib/utils';
import { XRP_CONFIG } from '@/lib/xrpUtils';
import {
  buildDirectMintingMemo,
  getXrplTestnetExplorerUrl,
} from '@/lib/directMintUtils';

const DirectMintFormSchema = z.object({
  amountXrp: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      val => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Amount must be a positive number'
    ),
});

type DirectMintFormData = z.infer<typeof DirectMintFormSchema>;

type PaymentState =
  | { status: 'idle' }
  | { status: 'creating' }
  | { status: 'pending'; uuid: string; qrPng: string; deeplink: string }
  | { status: 'awaiting-execution'; xrplTxHash: string }
  | {
      status: 'minted';
      xrplTxHash: string;
      flareTxHash: string;
      mintedAmountUBA: bigint;
      mintingFeeUBA: bigint;
    }
  | { status: 'expired' }
  | { status: 'error'; message: string };

const POLL_INTERVAL_MS = 2500;

// https://dev.flare.network/fassets/direct-minting
export default function DirectMint() {
  const chainId = useChainId();
  const { address: connectedAddress } = useAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const {
    assetManagerAddress,
    isLoading: isLoadingSettings,
    error: assetManagerError,
  } = useAssetManager();

  const [coreVaultXrplAddress, setCoreVaultXrplAddress] = useState<
    string | null
  >(null);
  const [feeBIPS, setFeeBIPS] = useState<bigint | null>(null);
  const [minimumFeeUBA, setMinimumFeeUBA] = useState<bigint | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>({
    status: 'idle',
  });

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    reset,
  } = useForm<DirectMintFormData>({
    resolver: zodResolver(DirectMintFormSchema),
    defaultValues: { amountXrp: '' },
  });

  const watchedAmount = watch('amountXrp');

  // Fetch directMintingPaymentAddress and fee settings from AssetManager
  const useReadIAssetManager = getReadIAssetManager(chainId);

  const { data: paymentAddressData } = useReadIAssetManager({
    address: assetManagerAddress as `0x${string}`,
    functionName: 'directMintingPaymentAddress',
    query: { enabled: !!assetManagerAddress },
  });

  const { data: feeBIPSData } = useReadIAssetManager({
    address: assetManagerAddress as `0x${string}`,
    functionName: 'getDirectMintingFeeBIPS',
    query: { enabled: !!assetManagerAddress },
  });

  const { data: minimumFeeUBAData } = useReadIAssetManager({
    address: assetManagerAddress as `0x${string}`,
    functionName: 'getDirectMintingMinimumFeeUBA',
    query: { enabled: !!assetManagerAddress },
  });

  // Watch for DirectMintingExecuted on the AssetManager (uses IDirectMinting ABI)
  // https://dev.flare.network/fassets/direct-minting
  const useWatchIDirectMintingEvent = getWatchIDirectMintingEvent(chainId);
  const isAwaitingExecution = paymentState.status === 'awaiting-execution';
  useWatchIDirectMintingEvent({
    address: assetManagerAddress as `0x${string}`,
    eventName: 'DirectMintingExecuted',
    enabled: !!assetManagerAddress && isAwaitingExecution,
    onLogs: logs => {
      if (paymentState.status !== 'awaiting-execution' || !effectiveAddress) {
        return;
      }
      for (const log of logs) {
        const args = log.args as {
          transactionId?: `0x${string}`;
          targetAddress?: `0x${string}`;
          executor?: `0x${string}`;
          mintedAmountUBA?: bigint;
          mintingFeeUBA?: bigint;
          executorFeeUBA?: bigint;
        };
        if (
          args.targetAddress &&
          args.targetAddress.toLowerCase() === effectiveAddress.toLowerCase() &&
          args.mintedAmountUBA !== undefined &&
          args.mintingFeeUBA !== undefined
        ) {
          setPaymentState({
            status: 'minted',
            xrplTxHash: paymentState.xrplTxHash,
            flareTxHash: log.transactionHash ?? '',
            mintedAmountUBA: args.mintedAmountUBA,
            mintingFeeUBA: args.mintingFeeUBA,
          });
          break;
        }
      }
    },
  });

  useEffect(() => {
    if (paymentAddressData) setCoreVaultXrplAddress(paymentAddressData as string);
  }, [paymentAddressData]);

  useEffect(() => {
    if (feeBIPSData !== undefined) setFeeBIPS(feeBIPSData as bigint);
  }, [feeBIPSData]);

  useEffect(() => {
    if (minimumFeeUBAData !== undefined)
      setMinimumFeeUBA(minimumFeeUBAData as bigint);
  }, [minimumFeeUBAData]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }

  async function pollPayloadStatus(uuid: string) {
    try {
      const res = await fetch(`/api/xaman/payload/${uuid}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.meta?.signed && data.response?.txid) {
        stopPolling();
        setPaymentState({
          status: 'awaiting-execution',
          xrplTxHash: data.response.txid,
        });
        reset();
      } else if (data.meta?.expired || data.meta?.cancelled) {
        stopPolling();
        setPaymentState({ status: 'expired' });
      }
    } catch {
      // continue polling on transient errors
    }
  }

  function startPolling(uuid: string) {
    stopPolling();
    pollTimerRef.current = setInterval(() => {
      pollPayloadStatus(uuid);
    }, POLL_INTERVAL_MS);
  }

  async function onSubmit(data: DirectMintFormData) {
    if (!coreVaultXrplAddress) {
      setPaymentState({
        status: 'error',
        message: 'Core Vault XRPL address not loaded yet',
      });
      return;
    }

    if (!effectiveAddress) {
      setPaymentState({
        status: 'error',
        message: 'Please connect your Flare wallet to set the recipient address',
      });
      return;
    }

    setPaymentState({ status: 'creating' });

    const memoData = buildDirectMintingMemo(effectiveAddress as Address);
    const drops = String(
      Math.floor(parseFloat(data.amountXrp) * XRP_CONFIG.DROPS_PER_XRP)
    );

    try {
      const res = await fetch('/api/xaman/create-payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          txjson: {
            TransactionType: 'Payment',
            Destination: coreVaultXrplAddress,
            Amount: drops,
            Memos: [{ Memo: { MemoData: memoData } }],
          },
          options: { submit: true },
        }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.uuid) {
        setPaymentState({
          status: 'error',
          message: payload.error ?? 'Failed to create Xaman payload',
        });
        return;
      }

      setPaymentState({
        status: 'pending',
        uuid: payload.uuid,
        qrPng: payload.refs.qr_png,
        deeplink: payload.next?.always ?? `https://xumm.app/sign/${payload.uuid}`,
      });

      startPolling(payload.uuid);
    } catch (err) {
      setPaymentState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unexpected error',
      });
    }
  }

  function handleRetry() {
    stopPolling();
    setPaymentState({ status: 'idle' });
  }


  function estimatedFee(): string | null {
    if (!feeBIPS || !watchedAmount || isNaN(parseFloat(watchedAmount)))
      return null;
    const amountUBA = parseFloat(watchedAmount) * XRP_CONFIG.DROPS_PER_XRP;
    const fee = (amountUBA * Number(feeBIPS)) / 10_000;
    return (fee / XRP_CONFIG.DROPS_PER_XRP).toFixed(6);
  }

  function minimumFeeXRP(): string | null {
    if (!minimumFeeUBA) return null;
    return (Number(minimumFeeUBA) / XRP_CONFIG.DROPS_PER_XRP).toFixed(6);
  }

  const effectiveAddress = mounted ? connectedAddress : undefined;
  const memoPreview = effectiveAddress
    ? buildDirectMintingMemo(effectiveAddress as Address)
    : null;

  const isLoading = isLoadingSettings;
  const isReady =
    !!assetManagerAddress &&
    !!coreVaultXrplAddress &&
    !!effectiveAddress &&
    !isLoading;
  const isCreating = paymentState.status === 'creating';

  return (
    <div className='w-full max-w-4xl mx-auto p-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-emerald-900'>
            <Zap className='h-5 w-5 text-emerald-600' />
            Direct Mint XRP to FXRP
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          <p className='text-emerald-700'>
            Send XRP directly to the Core Vault to mint FXRP — no collateral
            reservation required. Sign with your{' '}
            <a
              href='https://xaman.app'
              target='_blank'
              rel='noopener noreferrer'
              className='text-emerald-600 hover:underline'
            >
              Xaman wallet
            </a>
            .{' '}
            <a
              href='https://dev.flare.network/fassets/direct-minting'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 hover:underline'
            >
              Learn more
              <ExternalLink className='h-3 w-3' />
            </a>
          </p>

          {/* Core Vault info panel */}
          <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2 text-sm'>
            <div className='flex items-center justify-between'>
              <span className='font-medium text-emerald-900'>
                Core Vault XRPL Address:
              </span>
              {isLoading ? (
                <Loader2 className='h-4 w-4 animate-spin text-emerald-600' />
              ) : (
                <span className='font-mono text-emerald-700 break-all text-right max-w-xs'>
                  {coreVaultXrplAddress ?? '—'}
                </span>
              )}
            </div>
            {feeBIPS !== null && (
              <div className='flex items-center justify-between'>
                <span className='font-medium text-emerald-900'>
                  Minting Fee:
                </span>
                <span className='text-emerald-700'>
                  {Number(feeBIPS) / 100}%
                </span>
              </div>
            )}
            {minimumFeeUBA !== null && (
              <div className='flex items-center justify-between'>
                <span className='font-medium text-emerald-900'>
                  Minimum Fee:
                </span>
                <span className='text-emerald-700'>{minimumFeeXRP()} XRP</span>
              </div>
            )}
          </div>

          {/* Recipient */}
          <div className='space-y-1'>
            <Label className='text-emerald-900'>Recipient (Flare Address)</Label>
            <div className='rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-sm text-emerald-700 break-all'>
              {effectiveAddress ?? (
                <span className='text-red-500'>Please connect your wallet</span>
              )}
            </div>
            <p className='text-xs text-emerald-600'>
              FXRP will be minted to your connected Flare wallet address.
            </p>
          </div>

          {/* Memo preview */}
          {memoPreview && (
            <div className='space-y-1'>
              <Label className='text-emerald-900'>XRPL Memo (32 bytes)</Label>
              <div className='rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-xs text-emerald-700 break-all'>
                {memoPreview}
              </div>
              <p className='text-xs text-emerald-600'>
                Prefix{' '}
                <code className='bg-emerald-100 px-1 rounded'>
                  4642505266410018
                </code>{' '}
                + recipient address
              </p>
            </div>
          )}

          {/* QR pending state */}
          {paymentState.status === 'pending' && (
            <div className='flex flex-col items-center gap-4 p-4 rounded-lg border border-emerald-200 bg-emerald-50'>
              <p className='font-semibold text-emerald-900 text-center'>
                Scan with Xaman to sign
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={paymentState.qrPng}
                alt='Xaman QR code'
                className='w-48 h-48 rounded-lg border border-emerald-200'
              />
              <div className='flex items-center gap-2 text-sm text-emerald-700'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Waiting for signature…
              </div>
              <a
                href={paymentState.deeplink}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-800 hover:underline'
              >
                Open in Xaman app
                <ExternalLink className='h-3 w-3' />
              </a>
              <button
                type='button'
                onClick={handleRetry}
                className='text-xs text-emerald-500 hover:text-emerald-700 underline'
              >
                Cancel
              </button>
            </div>
          )}

          {/* XRPL signed — waiting for executor to call executeDirectMinting */}
          {paymentState.status === 'awaiting-execution' && (
            <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3'>
              <div className='flex items-center gap-2'>
                <Loader2 className='h-4 w-4 animate-spin text-emerald-600' />
                <p className='font-semibold text-emerald-800'>
                  Waiting for executor to mint FXRP on Flare…
                </p>
              </div>
              <p className='text-sm text-emerald-700'>
                Your XRPL payment was signed. An executor will call{' '}
                <code className='bg-emerald-100 px-1 rounded text-xs'>
                  executeDirectMinting
                </code>{' '}
                on Flare. This page will update automatically when the{' '}
                <code className='bg-emerald-100 px-1 rounded text-xs'>
                  DirectMintingExecuted
                </code>{' '}
                event is emitted.
              </p>
              <div className='flex items-center gap-2 text-sm flex-wrap'>
                <span className='font-medium text-emerald-900'>
                  XRPL Tx:
                </span>
                <a
                  href={getXrplTestnetExplorerUrl(paymentState.xrplTxHash)}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1 font-mono text-xs text-emerald-600 hover:text-emerald-800 hover:underline break-all'
                >
                  {paymentState.xrplTxHash}
                  <ExternalLink className='h-3 w-3 flex-shrink-0' />
                </a>
              </div>
            </div>
          )}

          {/* Final success — DirectMintingExecuted event received */}
          {paymentState.status === 'minted' && (
            <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3'>
              <p className='font-semibold text-emerald-800'>
                FXRP minted successfully!
              </p>
              <div className='space-y-2 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='font-medium text-emerald-900'>
                    Minted Amount:
                  </span>
                  <span className='text-emerald-700'>
                    {(
                      Number(paymentState.mintedAmountUBA) /
                      XRP_CONFIG.DROPS_PER_XRP
                    ).toFixed(6)}{' '}
                    FXRP
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='font-medium text-emerald-900'>
                    Minting Fee:
                  </span>
                  <span className='text-emerald-700'>
                    {(
                      Number(paymentState.mintingFeeUBA) /
                      XRP_CONFIG.DROPS_PER_XRP
                    ).toFixed(6)}{' '}
                    XRP
                  </span>
                </div>
                <div className='flex items-center gap-2 flex-wrap'>
                  <span className='font-medium text-emerald-900'>
                    XRPL Tx:
                  </span>
                  <a
                    href={getXrplTestnetExplorerUrl(paymentState.xrplTxHash)}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1 font-mono text-xs text-emerald-600 hover:text-emerald-800 hover:underline break-all'
                  >
                    {paymentState.xrplTxHash}
                    <ExternalLink className='h-3 w-3 flex-shrink-0' />
                  </a>
                </div>
                {paymentState.flareTxHash && (
                  <div className='flex items-center gap-2 flex-wrap'>
                    <span className='font-medium text-emerald-900'>
                      Flare Tx:
                    </span>
                    <a
                      href={getExplorerUrl(
                        chainId,
                        paymentState.flareTxHash,
                        'tx'
                      )}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='inline-flex items-center gap-1 font-mono text-xs text-emerald-600 hover:text-emerald-800 hover:underline break-all'
                    >
                      {paymentState.flareTxHash}
                      <ExternalLink className='h-3 w-3 flex-shrink-0' />
                    </a>
                  </div>
                )}
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleRetry}
                className='border-emerald-300 text-emerald-700 hover:bg-emerald-100'
              >
                <RefreshCw className='mr-2 h-3 w-3' />
                Mint again
              </Button>
            </div>
          )}

          {/* Expired state */}
          {paymentState.status === 'expired' && (
            <Alert>
              <AlertDescription className='flex items-center justify-between'>
                <span>The Xaman signing request expired or was cancelled.</span>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={handleRetry}
                  className='ml-4'
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Form — hide while QR is shown, awaiting execution, or after final success */}
          {paymentState.status !== 'pending' &&
            paymentState.status !== 'awaiting-execution' &&
            paymentState.status !== 'minted' && (
              <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='amountXrp' className='text-emerald-900'>
                    Amount (XRP)
                  </Label>
                  <Input
                    {...register('amountXrp')}
                    id='amountXrp'
                    type='number'
                    placeholder='20'
                    step='any'
                    min='0'
                    className='border-emerald-300 focus:ring-emerald-500'
                  />
                  {errors.amountXrp && (
                    <p className='text-sm text-destructive'>
                      {errors.amountXrp.message}
                    </p>
                  )}
                  {watchedAmount && !isNaN(parseFloat(watchedAmount)) && (
                    <div className='p-3 bg-emerald-50 border border-emerald-200 rounded-md space-y-1 text-sm'>
                      {estimatedFee() && (
                        <p className='text-emerald-800'>
                          <span className='font-semibold'>
                            Estimated fee:
                          </span>{' '}
                          {estimatedFee()} XRP (deducted from payment)
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <Button
                  type='submit'
                  disabled={isCreating || !isReady}
                  className='w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 cursor-pointer'
                >
                  {isCreating ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Creating Xaman request…
                    </>
                  ) : (
                    <>
                      <Zap className='mr-2 h-4 w-4' />
                      Pay with Xaman
                    </>
                  )}
                </Button>

                {(paymentState.status === 'error' || assetManagerError) && (
                  <Alert variant='destructive'>
                    <AlertDescription>
                      {paymentState.status === 'error'
                        ? paymentState.message
                        : assetManagerError}
                    </AlertDescription>
                  </Alert>
                )}
              </form>
            )}
        </CardContent>
      </Card>
    </div>
  );
}
