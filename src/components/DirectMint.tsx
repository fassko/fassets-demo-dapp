'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Tag,
  Zap,
} from 'lucide-react';

import Link from 'next/link';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { useAccount, useChainId, useWaitForTransactionReceipt } from 'wagmi';

import { z } from 'zod';

import { type Address } from 'viem';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAssetManager } from '@/hooks/useAssetManager';
import {
  getReadIAssetManager,
  getReadIMintingTagManager,
  getWatchIDirectMintingEvent,
  getWriteIMintingTagManager,
} from '@/lib/abiUtils';
import { getExplorerUrl } from '@/lib/utils';
import { XRP_CONFIG } from '@/lib/xrpUtils';
import {
  buildDirectMintingMemo,
  getXrplTestnetExplorerUrl,
} from '@/lib/directMintUtils';
import { isZeroAddress } from '@/lib/mintingTagUtils';
import {
  computeDirectMintBreakdownFromGrossDrops,
  computeMinimumDirectMintGrossDrops,
  formatXrpFromDrops,
  formatXrpPlaceholder,
} from '@/lib/directMintFeeBreakdown';

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

type MintMode = 'memo' | 'tag';

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
  const effectiveAddress = mounted ? connectedAddress : undefined;

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

  const [mintMode, setMintMode] = useState<MintMode>('memo');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [tagSetupError, setTagSetupError] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Flare address that should receive FXRP for the in-flight direct mint (memo or tag). */
  const expectedMintTargetRef = useRef<`0x${string}` | null>(null);

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

  const { data: executorFeeUBAData } = useReadIAssetManager({
    address: assetManagerAddress as `0x${string}`,
    functionName: 'getDirectMintingExecutorFeeUBA',
    query: { enabled: !!assetManagerAddress },
  });

  // MintingTagManager address (resolved via AssetManager.getMintingTagManager())
  const { data: mintingTagManagerAddressData } = useReadIAssetManager({
    address: assetManagerAddress as `0x${string}`,
    functionName: 'getMintingTagManager',
    query: { enabled: !!assetManagerAddress && mintMode === 'tag' },
  });
  const mintingTagManagerAddress = mintingTagManagerAddressData as
    | `0x${string}`
    | undefined;

  // Tag-mode reads against MintingTagManager
  const useReadIMintingTagManager = getReadIMintingTagManager(chainId);

  const { data: reservationFeeData } = useReadIMintingTagManager({
    address: mintingTagManagerAddress,
    functionName: 'reservationFee',
    query: { enabled: !!mintingTagManagerAddress && mintMode === 'tag' },
  });

  const {
    data: reservedTagsData,
    refetch: refetchReservedTags,
    isLoading: isLoadingReservedTags,
  } = useReadIMintingTagManager({
    address: mintingTagManagerAddress,
    functionName: 'reservedTagsForOwner',
    args: connectedAddress
      ? [connectedAddress as `0x${string}`]
      : undefined,
    query: {
      enabled:
        !!mintingTagManagerAddress && !!connectedAddress && mintMode === 'tag',
    },
  });

  const { data: mintingRecipientData } = useReadIMintingTagManager({
      address: mintingTagManagerAddress,
      functionName: 'mintingRecipient',
      args: selectedTag ? [BigInt(selectedTag)] : undefined,
      query: {
        enabled:
          !!mintingTagManagerAddress && !!selectedTag && mintMode === 'tag',
      },
    });

  // Tag-mode writes (single hook reused for reserve + setMintingRecipient)
  const {
    data: tagTxHash,
    writeContract: writeTagManager,
    isPending: isTagWritePending,
    error: tagWriteError,
    reset: resetTagWrite,
  } = getWriteIMintingTagManager(chainId);

  const { isLoading: isTagTxConfirming, isSuccess: isTagTxConfirmed } =
    useWaitForTransactionReceipt({ hash: tagTxHash });

  // Track which tag-management action is in flight so we can react to confirmation
  const pendingTagActionRef = useRef<'reserve' | null>(null);

  // Watch for DirectMintingExecuted on the AssetManager (uses IDirectMinting ABI)
  // https://dev.flare.network/fassets/direct-minting
  const useWatchIDirectMintingEvent = getWatchIDirectMintingEvent(chainId);
  const isAwaitingExecution = paymentState.status === 'awaiting-execution';
  useWatchIDirectMintingEvent({
    address: assetManagerAddress as `0x${string}`,
    eventName: 'DirectMintingExecuted',
    enabled: !!assetManagerAddress && isAwaitingExecution,
    onLogs: logs => {
      setPaymentState(prev => {
        if (prev.status !== 'awaiting-execution') return prev;
        const expected = expectedMintTargetRef.current;
        if (!expected) return prev;
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
            args.targetAddress.toLowerCase() === expected.toLowerCase() &&
            args.mintedAmountUBA !== undefined &&
            args.mintingFeeUBA !== undefined
          ) {
            return {
              status: 'minted',
              xrplTxHash: prev.xrplTxHash,
              flareTxHash: log.transactionHash ?? '',
              mintedAmountUBA: args.mintedAmountUBA,
              mintingFeeUBA: args.mintingFeeUBA,
            };
          }
        }
        return prev;
      });
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

  const executorFeeUBA =
    executorFeeUBAData !== undefined ? (executorFeeUBAData as bigint) : undefined;

  const directMintFeeParamsReady =
    feeBIPS !== null &&
    minimumFeeUBA !== null &&
    executorFeeUBA !== undefined;

  const directMintBreakdown = useMemo(() => {
    if (!directMintFeeParamsReady || !watchedAmount) return undefined;
    const parsed = parseFloat(watchedAmount);
    if (isNaN(parsed) || parsed <= 0) return undefined;
    const grossDrops = BigInt(
      Math.floor(parsed * XRP_CONFIG.DROPS_PER_XRP)
    );
    return computeDirectMintBreakdownFromGrossDrops(
      grossDrops,
      feeBIPS as bigint,
      minimumFeeUBA as bigint,
      executorFeeUBA
    );
  }, [
    directMintFeeParamsReady,
    watchedAmount,
    feeBIPS,
    minimumFeeUBA,
    executorFeeUBA,
  ]);

  const minimumMintAmountPlaceholder = useMemo(() => {
    if (!directMintFeeParamsReady) return undefined;
    const minDrops = computeMinimumDirectMintGrossDrops(
      feeBIPS as bigint,
      minimumFeeUBA as bigint,
      executorFeeUBA
    );
    if (minDrops === null) return undefined;
    return formatXrpPlaceholder(minDrops);
  }, [directMintFeeParamsReady, feeBIPS, minimumFeeUBA, executorFeeUBA]);

  // Auto-select the first reserved tag if none selected
  const reservedTags = reservedTagsData as readonly bigint[] | undefined;
  useEffect(() => {
    if (
      mintMode === 'tag' &&
      reservedTags &&
      reservedTags.length > 0 &&
      !selectedTag
    ) {
      setSelectedTag(reservedTags[0].toString());
    }
  }, [mintMode, reservedTags, selectedTag]);

  // Read recipient currently configured for the selected tag (zero-address = unset)
  const configuredRecipient = mintingRecipientData as `0x${string}` | undefined;

  const tagMintRecipient =
    configuredRecipient && !isZeroAddress(configuredRecipient)
      ? configuredRecipient
      : null;

  const isTagRecipientOnChain = !!tagMintRecipient;

  // After a tag-management tx confirms, refetch the relevant read so the UI
  // reflects the new state and the user can move on to the next step.
  useEffect(() => {
    if (!isTagTxConfirmed || !pendingTagActionRef.current) return;
    const action = pendingTagActionRef.current;
    pendingTagActionRef.current = null;
    resetTagWrite();
    if (action === 'reserve') {
      refetchReservedTags();
    }
  }, [isTagTxConfirmed, refetchReservedTags, resetTagWrite]);

  const reservationFee = reservationFeeData as bigint | undefined;

  const handleReserveTag = useCallback(() => {
    if (!mintingTagManagerAddress || reservationFee === undefined) return;
    setTagSetupError(null);
    pendingTagActionRef.current = 'reserve';
    writeTagManager({
      address: mintingTagManagerAddress,
      functionName: 'reserve',
      value: reservationFee,
    });
  }, [mintingTagManagerAddress, reservationFee, writeTagManager]);

  // Surface tag-write errors in the UI without crashing the page
  useEffect(() => {
    if (tagWriteError) {
      pendingTagActionRef.current = null;
      const msg =
        tagWriteError.message.includes('User denied') ||
        tagWriteError.message.includes('user rejected')
          ? 'Transaction was cancelled.'
          : tagWriteError.message;
      setTagSetupError(msg);
    }
  }, [tagWriteError]);

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
        expectedMintTargetRef.current = null;
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

    if (mintMode === 'tag') {
      if (!selectedTag) {
        setPaymentState({
          status: 'error',
          message: 'Please select or reserve a minting tag first',
        });
        return;
      }
      if (!isTagRecipientOnChain || !tagMintRecipient) {
        setPaymentState({
          status: 'error',
          message:
            'Set a minting recipient for this tag on the Tags page before paying with Xaman.',
        });
        return;
      }
    }

    setPaymentState({ status: 'creating' });

    const mintTarget: `0x${string}` =
      mintMode === 'tag'
        ? (tagMintRecipient as Address)
        : (effectiveAddress as `0x${string}`);

    const drops = String(
      Math.floor(parseFloat(data.amountXrp) * XRP_CONFIG.DROPS_PER_XRP)
    );

    // Tag mode uses XRPL DestinationTag; memo mode uses a 32-byte memo with
    // the recipient address. https://dev.flare.network/fassets/direct-minting
    const txjson: Record<string, unknown> =
      mintMode === 'tag'
        ? {
            TransactionType: 'Payment',
            Destination: coreVaultXrplAddress,
            Amount: drops,
            DestinationTag: Number(selectedTag),
          }
        : {
            TransactionType: 'Payment',
            Destination: coreVaultXrplAddress,
            Amount: drops,
            Memos: [
              {
                Memo: {
                  MemoData: buildDirectMintingMemo(effectiveAddress as Address),
                },
              },
            ],
          };

    try {
      const res = await fetch('/api/xaman/create-payload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txjson, options: { submit: true } }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.uuid) {
        setPaymentState({
          status: 'error',
          message: payload.error ?? 'Failed to create Xaman payload',
        });
        return;
      }

      expectedMintTargetRef.current = mintTarget;

      setPaymentState({
        status: 'pending',
        uuid: payload.uuid,
        qrPng: payload.refs.qr_png,
        deeplink: payload.next?.always ?? `https://xumm.app/sign/${payload.uuid}`,
      });

      startPolling(payload.uuid);
    } catch (err) {
      expectedMintTargetRef.current = null;
      setPaymentState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Unexpected error',
      });
    }
  }

  function handleRetry() {
    stopPolling();
    expectedMintTargetRef.current = null;
    setPaymentState({ status: 'idle' });
  }

  function minimumFeeXRP(): string | null {
    if (!minimumFeeUBA) return null;
    return (Number(minimumFeeUBA) / XRP_CONFIG.DROPS_PER_XRP).toFixed(6);
  }

  const memoPreview = effectiveAddress
    ? buildDirectMintingMemo(effectiveAddress as Address)
    : null;

  const isLoading = isLoadingSettings;
  const isTagModeReady =
    mintMode !== 'tag' || (!!selectedTag && isTagRecipientOnChain);
  const isReady =
    !!assetManagerAddress &&
    !!coreVaultXrplAddress &&
    !!effectiveAddress &&
    !isLoading &&
    isTagModeReady;
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
            {mintMode === 'memo' ? (
              <>
                <div className='rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 font-mono text-sm text-emerald-700 break-all'>
                  {effectiveAddress ?? (
                    <span className='text-red-500'>Please connect your wallet</span>
                  )}
                </div>
                <p className='text-xs text-emerald-600'>
                  Memo mode encodes this connected wallet in the XRPL payment memo.
                  FXRP is minted to this address.
                </p>
              </>
            ) : (
              <p className='text-xs text-emerald-600'>
                Tag mode mints FXRP to the on-chain recipient for your selected tag.
                Configure tags on the{' '}
                <Link href='/tags' className='text-emerald-700 hover:underline font-medium'>
                  Tags page
                </Link>
                .
              </p>
            )}
          </div>

          {/* Mode selector — memo vs tag */}
          <Tabs
            value={mintMode}
            onValueChange={value => {
              expectedMintTargetRef.current = null;
              setMintMode(value as MintMode);
              setTagSetupError(null);
              setPaymentState({ status: 'idle' });
            }}
          >
            <TabsList className='bg-emerald-100'>
              <TabsTrigger value='memo'>Memo</TabsTrigger>
              <TabsTrigger value='tag'>Tag</TabsTrigger>
            </TabsList>

            {/* MEMO MODE */}
            <TabsContent value='memo' className='space-y-1 mt-3'>
              {memoPreview && (
                <>
                  <Label className='text-emerald-900'>
                    XRPL Memo (32 bytes)
                  </Label>
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
                </>
              )}
            </TabsContent>

            {/* TAG MODE */}
            <TabsContent value='tag' className='space-y-3 mt-3'>
              <p className='text-xs text-emerald-700'>
                Reserve a tag once via{' '}
                <code className='bg-emerald-100 px-1 rounded'>
                  MintingTagManager.reserve()
                </code>
                , set its recipient on the{' '}
                <Link href='/tags' className='text-emerald-800 hover:underline font-medium'>
                  Tags page
                </Link>
                , then send XRPL payments using{' '}
                <a
                  href='https://xrpl.org/docs/concepts/transactions/source-and-destination-tags'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='inline-flex items-center gap-1 text-emerald-700 hover:underline'
                >
                  <code className='bg-emerald-100 px-1 rounded'>
                    DestinationTag
                  </code>
                  <ExternalLink className='h-3 w-3 shrink-0' />
                </a>{' '}
                instead of a memo.
              </p>

              <div className='rounded-lg border border-emerald-200 bg-emerald-50 p-3 space-y-2 text-sm'>
                <div className='flex items-center justify-between gap-2'>
                  <a
                    href='https://dev.flare.network/fassets/reference/IMintingTagManager'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='font-medium text-emerald-900 shrink-0 inline-flex items-center gap-1 hover:underline'
                  >
                    Tag manager
                    <ExternalLink className='h-3 w-3' />
                  </a>
                  {mintingTagManagerAddress ? (
                    <a
                      href={getExplorerUrl(
                        chainId,
                        mintingTagManagerAddress,
                        'address'
                      )}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='font-mono text-xs text-emerald-700 break-all max-w-[260px] text-right hover:text-emerald-900 hover:underline inline-flex items-start gap-1 justify-end'
                    >
                      {mintingTagManagerAddress}
                      <ExternalLink className='h-3 w-3 shrink-0 mt-0.5' />
                    </a>
                  ) : (
                    <span className='text-emerald-700'>—</span>
                  )}
                </div>
                {reservationFee !== undefined && (
                  <div className='flex items-center justify-between'>
                    <span className='font-medium text-emerald-900'>
                      Reservation Fee:
                    </span>
                    <span className='text-emerald-700'>
                      {(Number(reservationFee) / 1e18).toFixed(6)} FLR
                    </span>
                  </div>
                )}
              </div>

              {/* Tag selection / reservation */}
              <div className='space-y-2'>
                <Label className='text-emerald-900'>Minting Tag</Label>
                {isLoadingReservedTags ? (
                  <div className='flex items-center gap-2 text-sm text-emerald-700'>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    Loading your reserved tags…
                  </div>
                ) : reservedTags && reservedTags.length > 0 ? (
                  <div className='flex items-center gap-2'>
                    <Select
                      value={selectedTag ?? undefined}
                      onValueChange={value => setSelectedTag(value)}
                    >
                      <SelectTrigger className='border-emerald-300 focus:ring-emerald-500 flex-1'>
                        <SelectValue placeholder='Select a tag' />
                      </SelectTrigger>
                      <SelectContent>
                        {reservedTags.map(t => (
                          <SelectItem key={t.toString()} value={t.toString()}>
                            <span className='font-mono'>#{t.toString()}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type='button'
                      variant='outline'
                      onClick={handleReserveTag}
                      disabled={
                        !mintingTagManagerAddress ||
                        reservationFee === undefined ||
                        isTagWritePending ||
                        isTagTxConfirming
                      }
                      className='border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                    >
                      {(isTagWritePending || isTagTxConfirming) &&
                      pendingTagActionRef.current === 'reserve' ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <>
                          <Plus className='h-4 w-4 mr-1' />
                          Reserve another
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  <div className='flex items-center gap-2'>
                    <p className='text-sm text-emerald-700 flex-1'>
                      You have no reserved tags yet.
                    </p>
                    <Button
                      type='button'
                      onClick={handleReserveTag}
                      disabled={
                        !mintingTagManagerAddress ||
                        reservationFee === undefined ||
                        !effectiveAddress ||
                        isTagWritePending ||
                        isTagTxConfirming
                      }
                      className='bg-emerald-600 hover:bg-emerald-700'
                    >
                      {(isTagWritePending || isTagTxConfirming) &&
                      pendingTagActionRef.current === 'reserve' ? (
                        <>
                          <Loader2 className='h-4 w-4 animate-spin mr-2' />
                          Reserving…
                        </>
                      ) : (
                        <>
                          <Tag className='h-4 w-4 mr-2' />
                          Reserve a tag
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {selectedTag && (
                <div className='rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm space-y-2'>
                  <span className='font-medium text-emerald-900'>
                    Tag #{selectedTag} — on-chain mint recipient
                  </span>
                  <div className='font-mono text-xs text-emerald-700 break-all'>
                    {tagMintRecipient ?? '— not set —'}
                  </div>
                  {isTagRecipientOnChain ? (
                    <p className='text-xs text-emerald-600'>
                      Ready to mint with this tag via Xaman.
                    </p>
                  ) : (
                    <p className='text-xs text-amber-800'>
                      Set a recipient on the{' '}
                      <Link
                        href='/tags'
                        className='font-medium text-emerald-800 underline'
                      >
                        Tags page
                      </Link>{' '}
                      before paying.
                    </p>
                  )}
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    asChild
                    className='border-emerald-300 text-emerald-800'
                  >
                    <Link href='/tags'>
                      Manage tags (recipient, executor, transfer)
                    </Link>
                  </Button>
                </div>
              )}

              {tagSetupError && (
                <Alert variant='destructive'>
                  <AlertDescription>{tagSetupError}</AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>

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
                    placeholder={
                      minimumMintAmountPlaceholder ?? 'Loading…'
                    }
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
                    <div className='p-3 bg-emerald-50 border border-emerald-200 rounded-md space-y-2 text-sm'>
                      {!directMintFeeParamsReady ? (
                        <p className='text-emerald-700 flex items-center gap-2'>
                          <Loader2 className='h-4 w-4 animate-spin shrink-0' />
                          Loading fee parameters…
                        </p>
                      ) : directMintBreakdown === undefined ? null : directMintBreakdown === null ? (
                        <p className='text-amber-900'>
                          This amount is too small to cover the on-chain executor
                          fee and minimum minting fee. Enter a larger value.
                        </p>
                      ) : (
                        <>
                          <p className='font-semibold text-emerald-900'>
                            Estimated fee breakdown
                          </p>
                          <p className='text-xs text-emerald-600 leading-snug'>
                            Derived from your XRPL payment (rounded down to whole
                            drops). Minting fee is the larger of the percentage
                            of estimated net mint and the contract minimum — same
                            rule as AssetManager direct minting settings.
                          </p>
                          <dl className='space-y-1.5 text-emerald-800 border-t border-emerald-200/80 pt-2 mt-1'>
                            <div className='flex justify-between gap-3'>
                              <dt className='text-emerald-700'>XRPL payment</dt>
                              <dd className='font-mono shrink-0'>
                                {formatXrpFromDrops(
                                  directMintBreakdown.grossPaymentUBA
                                )}{' '}
                                XRP
                              </dd>
                            </div>
                            <div className='flex justify-between gap-3'>
                              <dt className='text-emerald-700'>
                                Minting fee (% of net, then min)
                              </dt>
                              <dd className='font-mono shrink-0'>
                                {formatXrpFromDrops(
                                  directMintBreakdown.appliedMintingFeeUBA
                                )}{' '}
                                XRP
                              </dd>
                            </div>
                            <div className='pl-2 space-y-1 text-xs text-emerald-600'>
                              <div className='flex justify-between gap-3'>
                                <span>
                                  {Number(feeBIPS) / 100}% of estimated net
                                </span>
                                <span className='font-mono'>
                                  {formatXrpFromDrops(
                                    directMintBreakdown.proportionalFeeUBA
                                  )}{' '}
                                  XRP
                                </span>
                              </div>
                              <div className='flex justify-between gap-3'>
                                <span>Minimum (on-chain)</span>
                                <span className='font-mono'>
                                  {formatXrpFromDrops(
                                    directMintBreakdown.minimumFeeUBA
                                  )}{' '}
                                  XRP
                                </span>
                              </div>
                              <div className='flex justify-between gap-3 font-medium text-emerald-700'>
                                <span>Applied (max of the two)</span>
                                <span className='font-mono'>
                                  {formatXrpFromDrops(
                                    directMintBreakdown.appliedMintingFeeUBA
                                  )}{' '}
                                  XRP
                                </span>
                              </div>
                            </div>
                            <div className='flex justify-between gap-3'>
                              <dt className='text-emerald-700'>
                                Executor fee (on-chain)
                              </dt>
                              <dd className='font-mono shrink-0'>
                                {formatXrpFromDrops(
                                  directMintBreakdown.executorFeeUBA
                                )}{' '}
                                XRP
                              </dd>
                            </div>
                            <div className='flex justify-between gap-3 font-semibold text-emerald-900 border-t border-emerald-200/80 pt-1.5'>
                              <dt>Total protocol fees</dt>
                              <dd className='font-mono shrink-0'>
                                {formatXrpFromDrops(
                                  directMintBreakdown.totalProtocolFeesUBA
                                )}{' '}
                                XRP
                              </dd>
                            </div>
                            <div className='flex justify-between gap-3'>
                              <dt className='text-emerald-700'>
                                Est. net toward mint
                              </dt>
                              <dd className='font-mono shrink-0'>
                                {formatXrpFromDrops(
                                  directMintBreakdown.netMintUBA
                                )}{' '}
                                XRP
                              </dd>
                            </div>
                            {directMintBreakdown.unallocatedUBA > BigInt(0) && (
                              <div className='flex justify-between gap-3 text-xs text-emerald-600'>
                                <dt>Remainder (drops, not allocated)</dt>
                                <dd className='font-mono shrink-0'>
                                  {directMintBreakdown.unallocatedUBA.toString()}
                                </dd>
                              </div>
                            )}
                          </dl>
                          <p className='text-xs text-emerald-600'>
                            Minting and executor fees are taken from your payment
                            when direct minting executes on Flare.
                          </p>
                        </>
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
