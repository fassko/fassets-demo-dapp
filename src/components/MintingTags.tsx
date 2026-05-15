'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import Link from 'next/link';

import {
  ArrowRightLeft,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Tag,
  UserCog,
} from 'lucide-react';

import {
  useAccount,
  useChainId,
  useWaitForTransactionReceipt,
  useWriteContract,
} from 'wagmi';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getMintingTagManagerFullAbi,
  getReadIAssetManager,
  getReadIMintingTagManager,
} from '@/lib/abiUtils';
import { useAssetManager } from '@/hooks/useAssetManager';
import {
  fetchMintingTagsDetails,
  type MintingTagDetails,
} from '@/lib/mintingTagDetails';
import {
  formatFlareAddress,
  isZeroAddress,
  tryParseFlareRecipient,
  ZERO_ADDRESS,
} from '@/lib/mintingTagUtils';
import { getExplorerUrl, truncateAddress } from '@/lib/utils';

function successMessageWithTxLink(
  message: string,
  txHash: `0x${string}` | undefined,
  chainId: number
): ReactNode {
  if (!txHash) return message;
  return (
    <span className='block space-y-1'>
      <span>{message}</span>
      <a
        href={getExplorerUrl(chainId, txHash, 'tx')}
        target='_blank'
        rel='noopener noreferrer'
        className='font-mono text-xs text-violet-800 hover:underline inline-flex items-center gap-1 break-all'
      >
        {truncateAddress(txHash)}
        <ExternalLink className='h-3 w-3 shrink-0' />
      </a>
    </span>
  );
}

type PendingAction =
  | 'reserve'
  | 'setRecipient'
  | 'setExecutor'
  | 'transfer'
  | null;

function formatExecutorCell(
  executor: string,
  pending: MintingTagDetails | undefined
): string {
  if (pending?.pendingExecutor) {
    const when = new Date(Number(pending.pendingActiveAfterTs) * 1000);
    return `Pending → ${formatFlareAddress(pending.pendingNewExecutor)} (after ${when.toLocaleString()})`;
  }
  if (isZeroAddress(executor)) return 'Anyone';
  return executor;
}

export default function MintingTags() {
  const chainId = useChainId();
  const { address: connectedAddress, isConnected } = useAccount();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const effectiveAddress = mounted ? connectedAddress : undefined;

  const { assetManagerAddress, error: assetManagerError } = useAssetManager();

  const useReadIAssetManager = getReadIAssetManager(chainId);
  const { data: mintingTagManagerAddressData } = useReadIAssetManager({
    address: assetManagerAddress as `0x${string}`,
    functionName: 'getMintingTagManager',
    query: { enabled: !!assetManagerAddress },
  });
  const mintingTagManagerAddress = mintingTagManagerAddressData as
    | `0x${string}`
    | undefined;

  const useReadIMintingTagManager = getReadIMintingTagManager(chainId);
  const { data: reservationFeeData } = useReadIMintingTagManager({
    address: mintingTagManagerAddress,
    functionName: 'reservationFee',
    query: { enabled: !!mintingTagManagerAddress },
  });
  const reservationFee = reservationFeeData as bigint | undefined;

  const {
    data: reservedTagsData,
    refetch: refetchReservedTags,
    isLoading: isLoadingReservedTags,
  } = useReadIMintingTagManager({
    address: mintingTagManagerAddress,
    functionName: 'reservedTagsForOwner',
    args: effectiveAddress ? [effectiveAddress] : undefined,
    query: {
      enabled: !!mintingTagManagerAddress && !!effectiveAddress,
    },
  });
  const reservedTags = reservedTagsData as readonly bigint[] | undefined;

  const [tagDetails, setTagDetails] = useState<MintingTagDetails[]>([]);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [recipientInput, setRecipientInput] = useState('');
  const [executorInput, setExecutorInput] = useState('');
  const [transferInput, setTransferInput] = useState('');

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<ReactNode>(null);

  const pendingActionRef = useRef<PendingAction>(null);

  const tagManagerAbi = useMemo(
    () => getMintingTagManagerFullAbi(chainId),
    [chainId]
  );

  const {
    writeContract: writeTagManager,
    data: tagTxHash,
    isPending: isTagWritePending,
    error: tagWriteError,
    reset: resetTagWrite,
  } = useWriteContract();

  const { isLoading: isTagTxConfirming, isSuccess: isTagTxConfirmed } =
    useWaitForTransactionReceipt({ hash: tagTxHash });

  const loadTagDetails = useCallback(async () => {
    if (!mintingTagManagerAddress || !reservedTags?.length) {
      setTagDetails([]);
      return;
    }
    setIsLoadingDetails(true);
    setDetailsError(null);
    try {
      const details = await fetchMintingTagsDetails(
        mintingTagManagerAddress,
        reservedTags,
        chainId
      );
      setTagDetails(details);
    } catch (err) {
      console.error(err);
      setDetailsError('Failed to load tag details from chain.');
      setTagDetails([]);
    } finally {
      setIsLoadingDetails(false);
    }
  }, [mintingTagManagerAddress, reservedTags, chainId]);

  useEffect(() => {
    loadTagDetails();
  }, [loadTagDetails]);

  useEffect(() => {
    if (reservedTags && reservedTags.length > 0 && !selectedTag) {
      setSelectedTag(reservedTags[0].toString());
    }
  }, [reservedTags, selectedTag]);

  const selectedDetails = useMemo(
    () => tagDetails.find(d => d.tagId.toString() === selectedTag),
    [tagDetails, selectedTag]
  );

  useEffect(() => {
    if (!selectedDetails) return;
    setRecipientInput(
      isZeroAddress(selectedDetails.recipient)
        ? ''
        : selectedDetails.recipient
    );
    setExecutorInput(
      isZeroAddress(selectedDetails.allowedExecutor)
        ? ''
        : selectedDetails.allowedExecutor
    );
  }, [selectedDetails?.tagId, selectedDetails?.recipient, selectedDetails?.allowedExecutor]);

  const recipientParsed = useMemo(
    () => tryParseFlareRecipient(recipientInput),
    [recipientInput]
  );
  const executorParsed = useMemo(
    () => tryParseFlareRecipient(executorInput),
    [executorInput]
  );
  const transferParsed = useMemo(
    () => tryParseFlareRecipient(transferInput),
    [transferInput]
  );

  const isRecipientOnChain =
    !!recipientParsed &&
    !!selectedDetails &&
    selectedDetails.recipient.toLowerCase() === recipientParsed.toLowerCase();

  const isTransferToSelf =
    !!transferParsed &&
    !!effectiveAddress &&
    transferParsed.toLowerCase() === effectiveAddress.toLowerCase();

  const refreshAll = useCallback(async () => {
    await refetchReservedTags();
    await loadTagDetails();
  }, [refetchReservedTags, loadTagDetails]);

  useEffect(() => {
    if (!isTagTxConfirmed || !pendingActionRef.current) return;
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    resetTagWrite();

    const hash = tagTxHash;

    if (action === 'transfer') {
      setSelectedTag(null);
      setRecipientInput('');
      setExecutorInput('');
      setTransferInput('');
      setActionSuccess(
        successMessageWithTxLink(
          'Tag transferred. Recipient and executor were reset on-chain.',
          hash,
          chainId
        )
      );
    } else if (action === 'reserve') {
      setActionSuccess(
        successMessageWithTxLink('New minting tag reserved.', hash, chainId)
      );
    } else if (action === 'setRecipient') {
      setActionSuccess(
        successMessageWithTxLink(
          'Minting recipient updated on-chain.',
          hash,
          chainId
        )
      );
    } else if (action === 'setExecutor') {
      setActionSuccess(
        successMessageWithTxLink(
          'Executor change submitted. It may activate after the cooldown period.',
          hash,
          chainId
        )
      );
    }

    refreshAll();
  }, [isTagTxConfirmed, resetTagWrite, refreshAll, tagTxHash, chainId]);

  useEffect(() => {
    if (tagWriteError) {
      pendingActionRef.current = null;
      const msg =
        tagWriteError.message.includes('User denied') ||
        tagWriteError.message.includes('user rejected')
          ? 'Transaction was cancelled.'
          : tagWriteError.message;
      setActionError(msg);
    }
  }, [tagWriteError]);

  const handleReserve = () => {
    if (!mintingTagManagerAddress || reservationFee === undefined) return;
    setActionError(null);
    setActionSuccess(null);
    pendingActionRef.current = 'reserve';
    writeTagManager({
      address: mintingTagManagerAddress,
      abi: tagManagerAbi,
      functionName: 'reserve',
      value: reservationFee,
    });
  };

  const handleSetRecipient = () => {
    if (!mintingTagManagerAddress || !selectedTag || !recipientParsed) return;
    setActionError(null);
    setActionSuccess(null);
    pendingActionRef.current = 'setRecipient';
    writeTagManager({
      address: mintingTagManagerAddress,
      abi: tagManagerAbi,
      functionName: 'setMintingRecipient',
      args: [BigInt(selectedTag), recipientParsed],
    });
  };

  const handleSetExecutor = () => {
    if (!mintingTagManagerAddress || !selectedTag || !executorParsed) return;
    setActionError(null);
    setActionSuccess(null);
    pendingActionRef.current = 'setExecutor';
    writeTagManager({
      address: mintingTagManagerAddress,
      abi: tagManagerAbi,
      functionName: 'setAllowedExecutor',
      args: [BigInt(selectedTag), executorParsed],
    });
  };

  const handleTransfer = () => {
    if (!mintingTagManagerAddress || !selectedTag || !transferParsed) return;
    if (isTransferToSelf) {
      setActionError('Cannot transfer the tag to your own address.');
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    pendingActionRef.current = 'transfer';
    writeTagManager({
      address: mintingTagManagerAddress,
      abi: tagManagerAbi,
      functionName: 'transfer',
      args: [transferParsed, BigInt(selectedTag)],
    });
  };

  const isTxBusy = isTagWritePending || isTagTxConfirming;
  const pendingLabel = pendingActionRef.current;

  return (
    <div className='w-full max-w-5xl mx-auto p-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-violet-900'>
            <Tag className='h-5 w-5 text-violet-600' />
            Minting tags
          </CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          <p className='text-violet-700 text-sm'>
            Minting tags are ERC-721 NFTs used for direct minting via XRPL{' '}
            <code className='bg-violet-100 px-1 rounded'>DestinationTag</code>
            . Manage recipients, allowed executors, and transfers here.{' '}
            <a
              href='https://dev.flare.network/fassets/developer-guides/fassets-direct-minting-tag'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-violet-600 hover:underline'
            >
              Guide
              <ExternalLink className='h-3 w-3' />
            </a>
            {' · '}
            <Link href='/mint' className='text-violet-600 hover:underline'>
              Mint with a tag →
            </Link>
          </p>

          {!isConnected && (
            <Alert className='border-violet-200 bg-violet-50 text-violet-900'>
              <AlertDescription>
                Connect your Flare wallet to view and manage your tags.
              </AlertDescription>
            </Alert>
          )}

          {(assetManagerError || detailsError) && (
            <Alert variant='destructive'>
              <AlertDescription>
                {assetManagerError ?? detailsError}
              </AlertDescription>
            </Alert>
          )}

          <div className='rounded-lg border border-violet-200 bg-violet-50/80 p-3 text-sm space-y-1'>
            <div className='flex justify-between gap-2 items-start'>
              <span className='font-medium text-violet-900 shrink-0'>
                Tag manager
              </span>
              {mintingTagManagerAddress ? (
                <a
                  href={getExplorerUrl(
                    chainId,
                    mintingTagManagerAddress,
                    'address'
                  )}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='font-mono text-xs text-violet-700 break-all text-right max-w-[55%] hover:text-violet-900 hover:underline inline-flex items-start gap-1 justify-end'
                >
                  {mintingTagManagerAddress}
                  <ExternalLink className='h-3 w-3 shrink-0 mt-0.5' />
                </a>
              ) : (
                <span className='text-violet-700'>—</span>
              )}
            </div>
            {reservationFee !== undefined && (
              <div className='flex justify-between gap-2'>
                <span className='font-medium text-violet-900'>
                  Reserve fee
                </span>
                <span className='text-violet-800'>
                  {(Number(reservationFee) / 1e18).toFixed(6)} FLR
                </span>
              </div>
            )}
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              onClick={handleReserve}
              disabled={
                !isConnected ||
                !mintingTagManagerAddress ||
                reservationFee === undefined ||
                isTxBusy
              }
              className='bg-violet-600 hover:bg-violet-700'
            >
              {isTxBusy && pendingLabel === 'reserve' ? (
                <Loader2 className='h-4 w-4 animate-spin mr-2' />
              ) : (
                <Plus className='h-4 w-4 mr-2' />
              )}
              Reserve new tag
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => refreshAll()}
              disabled={!isConnected || isLoadingReservedTags || isLoadingDetails}
              className='border-violet-300 text-violet-800'
            >
              <RefreshCw
                className={`h-4 w-4 mr-2 ${isLoadingDetails ? 'animate-spin' : ''}`}
              />
              Refresh
            </Button>
          </div>

          {/* Tags overview table */}
          <div className='rounded-lg border border-violet-200 overflow-hidden'>
            <div className='bg-violet-100/70 px-4 py-2 border-b border-violet-200'>
              <h3 className='text-sm font-semibold text-violet-900'>
                Your tags
              </h3>
            </div>
            {isLoadingReservedTags ? (
              <div className='flex items-center gap-2 p-6 text-sm text-violet-700'>
                <Loader2 className='h-4 w-4 animate-spin' />
                Loading tags…
              </div>
            ) : !reservedTags?.length ? (
              <p className='p-6 text-sm text-violet-700'>
                No reserved tags yet. Reserve one to get an XRPL destination tag
                for direct minting.
              </p>
            ) : (
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-violet-200 bg-violet-50 text-left text-xs uppercase tracking-wide text-violet-800'>
                      <th className='px-4 py-2 font-medium'>Tag</th>
                      <th className='px-4 py-2 font-medium'>Mint recipient</th>
                      <th className='px-4 py-2 font-medium'>
                        Allowed executor
                      </th>
                      <th className='px-4 py-2 font-medium w-24'>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservedTags.map(tagId => {
                      const id = tagId.toString();
                      const detail = tagDetails.find(
                        d => d.tagId.toString() === id
                      );
                      const isSelected = selectedTag === id;
                      return (
                        <tr
                          key={id}
                          role='button'
                          tabIndex={0}
                          onClick={() => setSelectedTag(id)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setSelectedTag(id);
                            }
                          }}
                          className={
                            isSelected
                              ? 'bg-violet-100/80 border-b border-violet-200 cursor-pointer'
                              : 'border-b border-violet-100 hover:bg-violet-50/50 cursor-pointer'
                          }
                        >
                          <td className='px-4 py-3 font-mono font-semibold text-violet-900'>
                            #{id}
                          </td>
                          <td className='px-4 py-3 font-mono text-xs text-violet-800 break-all max-w-[200px]'>
                            {isLoadingDetails && !detail
                              ? '…'
                              : detail && !isZeroAddress(detail.recipient)
                                ? detail.recipient
                                : '— not set —'}
                          </td>
                          <td className='px-4 py-3 text-xs text-violet-800 max-w-[240px]'>
                            {isLoadingDetails && !detail
                              ? '…'
                              : detail
                                ? formatExecutorCell(
                                    detail.allowedExecutor,
                                    detail
                                  )
                                : '—'}
                          </td>
                          <td className='px-4 py-3 text-xs text-violet-600'>
                            {isSelected ? (
                              <span className='font-medium text-violet-900'>
                                Selected
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedTag && (
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-4'>
              {/* Update recipient */}
              <Card className='border-violet-200'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-base flex items-center gap-2 text-violet-900'>
                    <UserCog className='h-4 w-4' />
                    Mint recipient
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-3 text-sm'>
                  <p className='text-xs text-violet-600'>
                    Flare address that receives FXRP when this tag is used on
                    XRPL.
                  </p>
                  <Input
                    value={recipientInput}
                    onChange={e => setRecipientInput(e.target.value)}
                    placeholder='0x…'
                    className='font-mono text-xs border-violet-300'
                  />
                  {recipientInput.trim() && !recipientParsed && (
                    <p className='text-xs text-destructive'>Invalid address.</p>
                  )}
                  <Button
                    type='button'
                    className='w-full bg-violet-600 hover:bg-violet-700'
                    disabled={
                      !recipientParsed || isTxBusy || isRecipientOnChain
                    }
                    onClick={handleSetRecipient}
                  >
                    {isTxBusy && pendingLabel === 'setRecipient' ? (
                      <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : null}
                    {isRecipientOnChain
                      ? 'Recipient matches on-chain'
                      : 'Update recipient'}
                  </Button>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='w-full border-violet-300'
                    disabled={!effectiveAddress}
                    onClick={() =>
                      effectiveAddress && setRecipientInput(effectiveAddress)
                    }
                  >
                    Use connected wallet
                  </Button>
                </CardContent>
              </Card>

              {/* Update executor */}
              <Card className='border-violet-200'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-base flex items-center gap-2 text-violet-900'>
                    <UserCog className='h-4 w-4' />
                    Allowed executor
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-3 text-sm'>
                  <p className='text-xs text-violet-600'>
                    Only this address may call{' '}
                    <code className='bg-violet-100 px-1 rounded text-[10px]'>
                      executeDirectMinting
                    </code>{' '}
                    for this tag. Leave empty on-chain means anyone can execute.
                    Changes may have a cooldown.
                  </p>
                  <Input
                    value={executorInput}
                    onChange={e => setExecutorInput(e.target.value)}
                    placeholder='0x…'
                    className='font-mono text-xs border-violet-300'
                  />
                  {executorInput.trim() && !executorParsed && (
                    <p className='text-xs text-destructive'>Invalid address.</p>
                  )}
                  {selectedDetails?.pendingExecutor && (
                    <p className='text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2'>
                      Pending:{' '}
                      {formatFlareAddress(selectedDetails.pendingNewExecutor)}{' '}
                      activates{' '}
                      {new Date(
                        Number(selectedDetails.pendingActiveAfterTs) * 1000
                      ).toLocaleString()}
                    </p>
                  )}
                  <Button
                    type='button'
                    className='w-full bg-violet-600 hover:bg-violet-700'
                    disabled={!executorParsed || isTxBusy}
                    onClick={handleSetExecutor}
                  >
                    {isTxBusy && pendingLabel === 'setExecutor' ? (
                      <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : null}
                    Set allowed executor
                  </Button>
                </CardContent>
              </Card>

              {/* Transfer */}
              <Card className='border-violet-200'>
                <CardHeader className='pb-2'>
                  <CardTitle className='text-base flex items-center gap-2 text-violet-900'>
                    <ArrowRightLeft className='h-4 w-4' />
                    Transfer tag
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-3 text-sm'>
                  <p className='text-xs text-violet-600'>
                    Moves NFT ownership to a new address, sets recipient to the
                    new owner, and clears the allowed executor.
                  </p>
                  <Input
                    value={transferInput}
                    onChange={e => setTransferInput(e.target.value)}
                    placeholder='0x… new owner'
                    className='font-mono text-xs border-violet-300'
                  />
                  {transferInput.trim() && !transferParsed && (
                    <p className='text-xs text-destructive'>Invalid address.</p>
                  )}
                  {isTransferToSelf && (
                    <p className='text-xs text-destructive'>
                      Use a different address than your wallet.
                    </p>
                  )}
                  <Button
                    type='button'
                    variant='outline'
                    className='w-full border-violet-300 text-violet-900'
                    disabled={
                      !transferParsed || isTransferToSelf || isTxBusy
                    }
                    onClick={handleTransfer}
                  >
                    {isTxBusy && pendingLabel === 'transfer' ? (
                      <Loader2 className='h-4 w-4 animate-spin mr-2' />
                    ) : (
                      <ArrowRightLeft className='h-4 w-4 mr-2' />
                    )}
                    Transfer tag #{selectedTag}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {actionSuccess && (
            <Alert className='border-violet-300 bg-violet-50 text-violet-900'>
              <AlertDescription>{actionSuccess}</AlertDescription>
            </Alert>
          )}
          {actionError && (
            <Alert variant='destructive'>
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
