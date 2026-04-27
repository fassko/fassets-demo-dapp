'use client';

import { useCallback, useEffect, useState } from 'react';

import { ArrowRight, ExternalLink, Loader2 } from 'lucide-react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';

import {
  useChainId,
  useWaitForTransactionReceipt,
} from 'wagmi';

import { decodeEventLog, keccak256, type ReadContractReturnType } from 'viem';

import { z } from 'zod';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FXRPBalanceCard } from '@/components/ui/fxrp-balance-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RedemptionEventCard from '@/components/ui/RedemptionEventCard';
import XRPLBalanceCard from '@/components/ui/XRPLBalanceCard';
import XRPLedgerInfoCard from '@/components/ui/XRPLedgerInfoCard';
import { useAssetManager } from '@/hooks/useAssetManager';
import { useFdcContracts } from '@/hooks/useFdcContracts';
import { useFXRPBalance } from '@/hooks/useFXRPBalance';
import {
  getAssetManagerAbi,
  getReadIAssetManager,
  getRequestAttestationHook,
  getTypedSettings,
  getWriteIAssetManager,
} from '@/lib/abiUtils';
import { copyToClipboardWithTimeout } from '@/lib/clipboard';
import {
  FDC_CONSTANTS,
  ReferencedPaymentNonexistenceProofData,
  calculateRoundId,
  prepareReferencedPaymentNonexistenceAttestationRequest,
  retrieveReferencedPaymentNonexistenceDataAndProofWithRetry,
  submitAttestationRequest,
  verifyReferencedPaymentNonexistence,
} from '@/lib/fdcUtils';
import { getExplorerUrl } from '@/lib/utils';
import {
  getAccountBalance,
  getLatestLedgerInfoWithFDCDeadlines,
  isValidXRPAddress,
} from '@/lib/xrpUtils';
import { AttestationData } from '@/types/attestation';

type RedemptionMode = 'lots' | 'amount' | 'tag';

// Schema factory — validation differs between lots (integer), amount (decimal), and tag (decimal + tag)
function makeRedeemSchema(mode: RedemptionMode) {
  const xrplAddress = z
    .string()
    .min(25, 'Address is too short')
    .max(35, 'Address is too long')
    .regex(/^r[1-9A-Za-km-z]{20,34}$/, 'Invalid XRPL address');

  if (mode === 'lots') {
    return z.object({
      xrplAddress,
      amount: z
        .string()
        .min(1, 'Lots is required')
        .refine(
          val => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
          'Lots must be a positive number'
        )
        .refine(
          val => Number.isInteger(parseFloat(val)),
          'Lots must be a whole number'
        )
        .refine(
          val => parseFloat(val) <= 1000000,
          'Amount cannot exceed 1,000,000'
        ),
      destinationTag: z.string().optional(),
    });
  }

  if (mode === 'tag') {
    return z.object({
      xrplAddress,
      amount: z
        .string()
        .min(1, 'Amount is required')
        .refine(
          val => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
          'Amount must be a positive number'
        ),
      destinationTag: z
        .string()
        .min(1, 'Destination tag is required')
        .refine(
          val => /^\d+$/.test(val),
          'Tag must be a non-negative integer'
        ),
    });
  }

  // 'amount' mode
  return z.object({
    xrplAddress,
    amount: z
      .string()
      .min(1, 'Amount is required')
      .refine(
        val => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
        'Amount must be a positive number'
      ),
    destinationTag: z.string().optional(),
  });
}

type RedeemXRPFormData = z.infer<ReturnType<typeof makeRedeemSchema>>;

export default function Redeem() {
  const [redemptionMode, setRedemptionMode] = useState<RedemptionMode>('amount');
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [remainingLots, setRemainingLots] = useState<string | null>(null);

  const [xrplBalance, setXrplBalance] = useState<string>('0');
  const [xrplAddress, setXrplAddress] = useState<string>('');

  const [redemptionEvent, setRedemptionEvent] = useState<{
    agentVault: string;
    redeemer: string;
    requestId: string;
    paymentAddress: string;
    valueUBA: string;
    feeUBA: string;
    firstUnderlyingBlock: string;
    lastUnderlyingBlock: string;
    lastUnderlyingTimestamp: string;
    paymentReference: string;
    executor: string;
    executorFeeNatWei: string;
  } | null>(null);

  // FDC attestation deadline values
  const [testXrpIndex, setTestXrpIndex] = useState<string | null>(null);
  const [closeTime, setCloseTime] = useState<string | null>(null);
  const [deadlineBlockNumber, setDeadlineBlockNumber] = useState<string | null>(
    null
  );
  const [deadlineTimestamp, setDeadlineTimestamp] = useState<string | null>(
    null
  );

  // FDC Attestation state
  const [isAttestationLoading, setIsAttestationLoading] =
    useState<boolean>(false);
  const [attestationError, setAttestationError] = useState<string | null>(null);
  const [attestationSuccess, setAttestationSuccess] = useState<string | null>(
    null
  );
  const [currentAttestationStep, setCurrentAttestationStep] =
    useState<string>('');
  const [attestationData, setAttestationData] =
    useState<AttestationData | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [proofData, setProofData] =
    useState<ReferencedPaymentNonexistenceProofData | null>(null);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(
    null
  );

  // FAssets Asset manager hook
  const {
    assetManagerAddress,
    settings: rawSettings,
    isLoading: isLoadingSettings,
    error: assetManagerError,
  } = useAssetManager();

  // Use utility function to properly type settings from ABI
  const settings = getTypedSettings(rawSettings);

  // FXRP balance hook
  // Use the useFXRPBalance hook to get the FXRP balance
  // FXRP is an ERC20 token
  // FXRP address comes from the settings
  // dev.flare.network/fassets/developer-guides/fassets-fxrp-address
  const {
    fxrpBalance,
    refetchFxrpBalance,
    balanceError,
    userAddress,
    isConnected,
  } = useFXRPBalance();

  // FDC contracts hook
  // It gets the FDC contracts from the Flare Contracts Registry
  // https://dev.flare.network/network/guides/flare-contracts-registry
  const {
    addresses: fdcAddresses,
    isLoading: isLoadingAddresses,
    error: addressError,
  } = useFdcContracts();

  const chainId = useChainId();

  // Read minimumRedeemAmountUBA — needed for tag-mode validation
  const useReadIAssetManager = getReadIAssetManager(chainId);
  const { data: minimumRedeemAmountUBAData } = useReadIAssetManager({
    address: assetManagerAddress as `0x${string}`,
    functionName: 'minimumRedeemAmountUBA',
    query: { enabled: !!assetManagerAddress },
  });
  const minimumRedeemAmountUBA = minimumRedeemAmountUBAData as
    | bigint
    | undefined;

  // FDC Attestation contract functions using contract-specific hook
  const {
    mutateAsync: requestAttestation,
    data: attestationHash,
    error: writeAttestationError,
  } = getRequestAttestationHook(chainId);

  // Wait for the FDC attestation transaction receipt
  const { data: attestationReceipt, isSuccess: isAttestationSuccess } =
    useWaitForTransactionReceipt({ hash: attestationHash });

  // Form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<RedeemXRPFormData>({
    resolver: zodResolver(makeRedeemSchema(redemptionMode)),
    defaultValues: {
      xrplAddress: '',
      amount: '',
      destinationTag: '',
    },
  });

  const watchedAmount = watch('amount');

  // Write contract for redeem function using contract-specific hook
  // https://dev.flare.network/fassets/reference/IAssetManager#redeem
  const {
    data: redeemHash,
    mutateAsync: redeemContract,
    isPending: isRedeemPending,
    error: writeError,
  } = getWriteIAssetManager(chainId);

  // Wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess: isRedeemSuccess,
    data: receipt,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash: redeemHash,
  });

  // Handle successful redemption
  useEffect(() => {
    if (isRedeemSuccess && receipt) {
      console.log('Redeem transaction successful, processing logs...');
      console.log('Transaction details:', {
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        logsCount: receipt.logs.length,
        status: receipt.status,
      });

      // Process each log in the transaction receipt
      for (const log of receipt.logs) {
        try {
          // Try to decode the log as various events
          const decodedLog = decodeEventLog({
            abi: getAssetManagerAbi(chainId),
            data: log.data,
            topics: log.topics,
          });

          console.log(
            `Decoded event: ${decodedLog.eventName}`,
            decodedLog.args
          );

          // RedemptionRequestIncomplete event — partial redemption (only relevant for redeemAmount)
          // https://dev.flare.network/fassets/reference/IAssetManagerEvents
          if (decodedLog.eventName === 'RedemptionRequestIncomplete') {
            const remaining = decodedLog.args.remainingLots?.toString();
            console.log(
              'RedemptionRequestIncomplete — remaining lots:',
              remaining
            );
            if (remaining) setRemainingLots(remaining);
            continue;
          }

          // RedemptionRequested or RedemptionWithTagRequested
          // Both events share the same fields used by the FDC flow below; the
          // tagged variant additionally carries `destinationTag` which we surface
          // in the success message.
          // https://dev.flare.network/fassets/reference/IAssetManagerEvents
          if (
            decodedLog.eventName === 'RedemptionRequested' ||
            decodedLog.eventName === 'RedemptionWithTagRequested'
          ) {
            console.log('=== RedemptionRequested Event ===');
            console.log('Agent Vault:', decodedLog.args.agentVault);
            console.log('Redeemer:', decodedLog.args.redeemer);
            console.log('Request ID:', decodedLog.args.requestId.toString());
            console.log('Payment Address:', decodedLog.args.paymentAddress);
            console.log('Value UBA:', decodedLog.args.valueUBA.toString());
            console.log('Fee UBA:', decodedLog.args.feeUBA.toString());
            console.log(
              'First Underlying Block:',
              decodedLog.args.firstUnderlyingBlock.toString()
            );
            console.log(
              'Last Underlying Block:',
              decodedLog.args.lastUnderlyingBlock.toString()
            );
            console.log(
              'Last Underlying Timestamp:',
              decodedLog.args.lastUnderlyingTimestamp.toString()
            );
            console.log('Payment Reference:', decodedLog.args.paymentReference);
            console.log('Executor:', decodedLog.args.executor);
            console.log(
              'Executor Fee Nat Wei:',
              decodedLog.args.executorFeeNatWei.toString()
            );
            console.log('=====================================');

            // Store the single event in state for UI display
            setRedemptionEvent({
              agentVault: decodedLog.args.agentVault,
              redeemer: decodedLog.args.redeemer,
              requestId: decodedLog.args.requestId.toString(),
              paymentAddress: decodedLog.args.paymentAddress,
              valueUBA: decodedLog.args.valueUBA.toString(),
              feeUBA: decodedLog.args.feeUBA.toString(),
              firstUnderlyingBlock:
                decodedLog.args.firstUnderlyingBlock.toString(),
              lastUnderlyingBlock:
                decodedLog.args.lastUnderlyingBlock.toString(),
              lastUnderlyingTimestamp:
                decodedLog.args.lastUnderlyingTimestamp.toString(),
              paymentReference: decodedLog.args.paymentReference,
              executor: decodedLog.args.executor,
              executorFeeNatWei: decodedLog.args.executorFeeNatWei.toString(),
            });

            // Break after finding the first RedemptionRequested event
            // For this demo app we only need to process the first event
            break;
          }
        } catch (error) {
          // This log is not a recognized event, continue to next log
          console.log('Log could not be decoded as known event:', log, error);
        }
      }

      const unit = redemptionMode === 'lots' ? 'lots' : 'XRP';
      const tagSuffix =
        redemptionMode === 'tag' ? ` with destination tag` : '';
      setSuccess(
        `Successfully submitted redemption of ${watchedAmount} ${unit}${tagSuffix} to ${xrplAddress}`
      );
      reset();
      refetchFxrpBalance();

      // Get the latest testXRP index after successful redemption
      getTestXrpIndex();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isRedeemSuccess,
    receipt,
    watchedAmount,
    xrplAddress,
    reset,
    refetchFxrpBalance,
  ]);

  const getTestXrpIndex = useCallback(async () => {
    try {
      console.log('Fetching latest testXRP index and close time...');

      // Get the latest ledger info and FDC attestation request deadlines
      // See the `calculateFDCDeadline` function for detailed comments
      const { ledgerInfo, fdcDeadlines } =
        await getLatestLedgerInfoWithFDCDeadlines();

      setTestXrpIndex(ledgerInfo.ledgerIndex.toString());
      setCloseTime(ledgerInfo.closeTime.toString());
      setDeadlineBlockNumber(fdcDeadlines.deadlineBlockNumber);
      setDeadlineTimestamp(fdcDeadlines.deadlineTimestamp);

      console.log('Latest testXRP index:', ledgerInfo.ledgerIndex);
      console.log('Latest close time:', ledgerInfo.closeTime);
      console.log(
        'FDC deadline block number:',
        fdcDeadlines.deadlineBlockNumber
      );
      console.log('FDC deadline timestamp:', fdcDeadlines.deadlineTimestamp);
    } catch (error) {
      console.error('Error fetching testXRP index and close time:', error);
      setTestXrpIndex(null);
      setCloseTime(null);
      setDeadlineBlockNumber(null);
      setDeadlineTimestamp(null);
    }
  }, []);

  // Handle receipt errors
  useEffect(() => {
    if (receiptError) {
      console.error('Transaction receipt error:', receiptError);
      console.error('Receipt error details:', {
        name: receiptError instanceof Error ? receiptError.name : 'Unknown',
        message:
          receiptError instanceof Error
            ? receiptError.message
            : String(receiptError),
        cause: receiptError instanceof Error ? receiptError.cause : undefined,
        stack: receiptError instanceof Error ? receiptError.stack : undefined,
      });

      const errorMessage =
        receiptError instanceof Error
          ? receiptError.message
          : String(receiptError);

      // Create error message with transaction link
      const createErrorWithLink = (message: string) => (
        <div className='space-y-2'>
          <p>{message}</p>
          {redeemHash && (
            <p className='text-sm'>
              <a
                href={getExplorerUrl(chainId, redeemHash, 'tx')}
                target='_blank'
                rel='noopener noreferrer'
                className='text-red-600 hover:text-red-800 underline'
              >
                View transaction on explorer
              </a>
            </p>
          )}
        </div>
      );

      // Provide user-friendly error messages for common redemption failures
      if (errorMessage.includes('execution reverted')) {
        setError(
          createErrorWithLink(
            'Redemption failed. This may be due to: insufficient FXRP balance, invalid redemption amount, or no available agents to fulfill the redemption. Please check your balance and try again with a smaller amount.'
          )
        );
      } else if (errorMessage.includes('insufficient funds')) {
        setError(
          createErrorWithLink(
            'Insufficient funds to complete the redemption. Please check your wallet balance for gas fees.'
          )
        );
      } else if (errorMessage.includes('user rejected')) {
        setError('Transaction was cancelled by the user.');
      } else {
        setError(createErrorWithLink(`Redemption failed: ${errorMessage}`));
      }
    }
  }, [receiptError, redeemHash, chainId]);

  const refreshBalances = useCallback(async () => {
    try {
      // Refresh XRPL balance
      if (xrplAddress) {
        try {
          const accountInfo = await getAccountBalance(xrplAddress);
          setXrplBalance(accountInfo.balanceInXRP);
        } catch (error) {
          console.error('Error fetching XRPL balance:', error);
          setXrplBalance('0');
        }
      }

      // Refresh FXRP balance - only if query is enabled
      if (userAddress && settings?.fAsset && assetManagerAddress) {
        refetchFxrpBalance();
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  }, [
    xrplAddress,
    userAddress,
    settings,
    assetManagerAddress,
    refetchFxrpBalance,
  ]);

  // Refresh XRPL balance when address is available
  useEffect(() => {
    if (
      xrplAddress &&
      xrplAddress.startsWith('r') &&
      xrplAddress.length >= 25
    ) {
      refreshBalances();
    }
  }, [xrplAddress, refreshBalances]);

  const isValidXrplAddress = (address: string): boolean => {
    try {
      makeRedeemSchema(redemptionMode)
        .pick({ xrplAddress: true })
        .parse({ xrplAddress: address });
      return isValidXRPAddress(address);
    } catch {
      return false;
    }
  };

  const handleXrplAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    const isValid = isValidXrplAddress(address);

    if (isValid) {
      setXrplAddress(address);
      refreshBalances();
    } else {
      setXrplAddress(address);
    }
  };

  const redeemToXRP = async (data: RedeemXRPFormData) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setRemainingLots(null);

    try {
      if (!settings) {
        throw new Error('AssetManager settings not loaded');
      }

      if (!isConnected) {
        throw new Error('Please connect your wallet');
      }

      const executor = '0x0000000000000000000000000000000000000000' as const;

      if (redemptionMode === 'lots') {
        const lots = parseInt(data.amount);
        if (isNaN(lots) || lots <= 0) {
          throw new Error('Lots must be a positive integer');
        }

        // https://dev.flare.network/fassets/reference/IAssetManager#redeem
        await redeemContract({
          address: assetManagerAddress!,
          functionName: 'redeem',
          args: [BigInt(lots), data.xrplAddress, executor],
        });
      } else if (redemptionMode === 'amount') {
        const amountXrp = parseFloat(data.amount);
        if (isNaN(amountXrp) || amountXrp <= 0) {
          throw new Error('Amount must be positive');
        }

        // Convert XRP to UBA (1 XRP = 10^assetDecimals UBA, typically 6 for XRP)
        const decimals = Number(settings.assetDecimals);
        const amountUBA = BigInt(
          Math.floor(amountXrp * Math.pow(10, decimals))
        );

        // https://dev.flare.network/fassets/reference/IAssetManager#redeemamount
        await redeemContract({
          address: assetManagerAddress!,
          functionName: 'redeemAmount',
          args: [amountUBA, data.xrplAddress, executor],
        });
      } else {
        // 'tag' mode — redeemWithTag(amountUBA, xrplAddress, executor, destinationTag)
        const amountXrp = parseFloat(data.amount);
        if (isNaN(amountXrp) || amountXrp <= 0) {
          throw new Error('Amount must be positive');
        }
        if (!data.destinationTag) {
          throw new Error('Destination tag is required');
        }

        const decimals = Number(settings.assetDecimals);
        const amountUBA = BigInt(
          Math.floor(amountXrp * Math.pow(10, decimals))
        );

        if (
          minimumRedeemAmountUBA !== undefined &&
          amountUBA < minimumRedeemAmountUBA
        ) {
          const minXrp =
            Number(minimumRedeemAmountUBA) / Math.pow(10, decimals);
          throw new Error(
            `Amount must be at least ${minXrp} XRP (minimumRedeemAmountUBA = ${minimumRedeemAmountUBA.toString()})`
          );
        }

        const destinationTag = BigInt(data.destinationTag);

        // https://dev.flare.network/fassets/reference/IAssetManager#redeemwithtag
        await redeemContract({
          address: assetManagerAddress!,
          functionName: 'redeemWithTag',
          args: [amountUBA, data.xrplAddress, executor, destinationTag],
        });
      }
    } catch (error) {
      console.error('Error redeeming to XRP:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to redeem to XRP'
      );
      setIsProcessing(false);
    }
  };

  // Handle write contract errors
  useEffect(() => {
    if (writeError) {
      console.error('Write contract error:', writeError);

      // Create error message with transaction link if available
      const createErrorWithLink = (message: string) => (
        <div className='space-y-2'>
          <p>{message}</p>
          {redeemHash && (
            <p className='text-sm'>
              <a
                href={getExplorerUrl(chainId, redeemHash, 'tx')}
                target='_blank'
                rel='noopener noreferrer'
                className='text-red-600 hover:text-red-800 underline'
              >
                View transaction on explorer
              </a>
            </p>
          )}
        </div>
      );

      // Handle specific error types
      if (
        writeError.message.includes('User denied transaction signature') ||
        writeError.message.includes('user rejected')
      ) {
        setError('Transaction was cancelled by the user.');
      } else if (writeError.message.includes('execution reverted')) {
        setError(
          createErrorWithLink(
            'Redemption failed. This may be due to: insufficient FXRP balance, invalid redemption amount, or no available agents to fulfill the redemption. Please check your balance and try again with a smaller amount.'
          )
        );
      } else if (writeError.message.includes('insufficient funds')) {
        setError(
          createErrorWithLink(
            'Insufficient funds to complete the redemption. Please check your wallet balance for gas fees.'
          )
        );
      } else {
        setError(createErrorWithLink(`Redemption failed: ${writeError.message}`));
      }
      setIsProcessing(false);
    }
  }, [writeError, redeemHash, chainId]);

  // Update processing state based on transaction status
  useEffect(() => {
    setIsProcessing(isRedeemPending || isConfirming);
  }, [isRedeemPending, isConfirming]);

  // Execute attestation after successful redemption
  const executeAttestation = async () => {
    if (!redemptionEvent) {
      console.log('Missing required redemption event data for attestation');
      return;
    }

    if (!fdcAddresses) {
      setAttestationError(
        'FDC contract addresses not loaded. Please wait and try again.'
      );
      return;
    }

    if (addressError) {
      setAttestationError(`Error loading contract addresses: ${addressError}`);
      return;
    }

    setIsAttestationLoading(true);
    setAttestationError(null);
    setAttestationSuccess(null);
    setCurrentAttestationStep('');
    setAttestationData(null);

    try {
      // Prepare attestation request
      // https://dev.flare.network/fdc/guides/fdc-by-hand#preparing-the-request
      setCurrentAttestationStep('Preparing attestation request...');
      console.log('Preparing attestation request...');

      // Prepare the referenced payment nonexistence attestation request data
      // https://dev.flare.network/fdc/attestation-types/referenced-payment-nonexistence
      const attestationRequestData = {
        minimalBlockNumber: redemptionEvent.firstUnderlyingBlock,
        deadlineBlockNumber: redemptionEvent.lastUnderlyingBlock,
        deadlineTimestamp: redemptionEvent.lastUnderlyingTimestamp,
        destinationAddressHash: keccak256(
          redemptionEvent.paymentAddress as `0x${string}`
        ),
        amount: (
          BigInt(redemptionEvent.valueUBA) - BigInt(redemptionEvent.feeUBA)
        ).toString(), // Value UBA minus Fee UBA
        standardPaymentReference: redemptionEvent.paymentReference,
        // These two fields are not used because XRP Ledger is not a utxo chain
        checkSourceAddresses: false,
        sourceAddressesRoot:
          '0x0000000000000000000000000000000000000000000000000000000000000000',
      };

      // Prepare the attestation request using the verifier API
      // https://dev.flare.network/fdc/guides/fdc-by-hand#preparing-the-request
      const attestationResponse =
        await prepareReferencedPaymentNonexistenceAttestationRequest(
          attestationRequestData
        );
      console.log('Attestation response:', attestationResponse);

      // Create attestation data structure with the real ABI encoded request
      // https://dev.flare.network/fdc/guides/fdc-by-hand#preparing-the-request
      const data = {
        abiEncodedRequest: attestationResponse.abiEncodedRequest,
        roundId: null, // Will be calculated after transaction
      };
      console.log('Attestation data:', data);
      setAttestationData(data);

      // Submit attestation request
      // https://dev.flare.network/fdc/guides/fdc-by-hand#submitting-the-request
      setCurrentAttestationStep(
        'Submitting attestation request to blockchain...'
      );
      console.log('Submitting attestation request...');
      if (!fdcAddresses) {
        throw new Error('FDC contract addresses not loaded');
      }
      await submitAttestationRequest(
        data.abiEncodedRequest,
        fdcAddresses,
        chainId,
        requestAttestation
      );

      // Wait for transaction to be mined and calculate round ID
      // https://dev.flare.network/fdc/guides/fdc-by-hand#waiting-for-confirmation
      setCurrentAttestationStep('Waiting for transaction confirmation...');

      setCurrentAttestationStep('');
      setAttestationSuccess(
        'Attestation request submitted! Waiting for confirmation...'
      );
    } catch (error) {
      console.error('Attestation error:', error);
      setCurrentAttestationStep('');
      setAttestationError(
        error instanceof Error ? error.message : 'An unexpected error occurred'
      );
    } finally {
      setIsAttestationLoading(false);
    }
  };

  // Handle attestation transaction success and calculate round ID
  useEffect(() => {
    if (
      isAttestationSuccess &&
      attestationReceipt &&
      attestationData &&
      attestationData.roundId === null
    ) {
      const processAttestationTransaction = async () => {
        try {
          setCurrentAttestationStep('Calculating round ID from transaction...');
          if (!fdcAddresses) {
            throw new Error('FDC contract addresses not loaded');
          }
          const roundId = await calculateRoundId(
            { receipt: { blockNumber: attestationReceipt.blockNumber } },
            fdcAddresses,
            chainId
          );
          console.log('Calculated round ID:', roundId);

          // Update attestationData with the calculated round ID
          setAttestationData(prevData =>
            prevData ? { ...prevData, roundId } : null
          );

          // Start proof retrieval
          // https://dev.flare.network/fdc/guides/fdc-by-hand#retrieving-the-proof
          setCurrentAttestationStep(
            'Retrieving proof from Data Availability Layer...'
          );
          const proof =
            await retrieveReferencedPaymentNonexistenceDataAndProofWithRetry(
              FDC_CONSTANTS.DA_LAYER_API_URL,
              attestationData.abiEncodedRequest,
              roundId,
              FDC_CONSTANTS.DA_LAYER_API_KEY
            );

          setProofData(proof);

          // Verify the payment nonexistence
          // https://dev.flare.network/fdc/guides/fdc-by-hand#verifying-the-data
          setCurrentAttestationStep(
            'Verifying payment nonexistence with FDC Verification contract...'
          );
          if (!fdcAddresses) {
            throw new Error('FDC contract addresses not loaded');
          }
          const verificationResult = await verifyReferencedPaymentNonexistence(
            proof,
            fdcAddresses,
            chainId
          );
          setVerificationResult(verificationResult);

          setCurrentAttestationStep('');
          setAttestationSuccess(
            `Round ID ${roundId} calculated, proof retrieved, and payment nonexistence verified successfully! Verification result: ${verificationResult}`
          );
        } catch (error) {
          console.error('Error processing attestation transaction:', error);
          setCurrentAttestationStep('');
          setAttestationError(
            error instanceof Error
              ? error.message
              : 'Error processing attestation transaction'
          );
        }
      };

      processAttestationTransaction();
    }
  }, [
    isAttestationSuccess,
    attestationReceipt,
    attestationData,
    fdcAddresses,
    chainId,
  ]);

  // Handle attestation write contract errors
  useEffect(() => {
    if (writeAttestationError) {
      console.error('Attestation write contract error:', writeAttestationError);

      // Handle specific error types
      if (
        writeAttestationError.message.includes(
          'User denied transaction signature'
        ) ||
        writeAttestationError.message.includes('user rejected')
      ) {
        setAttestationError(
          'Attestation transaction was cancelled by the user.'
        );
      } else if (writeAttestationError.message.includes('execution reverted')) {
        setAttestationError(
          'Attestation transaction failed: The contract rejected the transaction. This could be due to invalid parameters, insufficient funds, or network issues.'
        );
      } else if (writeAttestationError.message.includes('insufficient funds')) {
        setAttestationError(
          'Insufficient funds to complete the attestation transaction. Please check your wallet balance.'
        );
      } else if (writeAttestationError.message.includes('request fee')) {
        setAttestationError(
          'Insufficient request fee. Please ensure you have enough FLR to pay the attestation request fee.'
        );
      } else {
        setAttestationError(
          `Attestation transaction failed: ${writeAttestationError.message}`
        );
      }
    }
  }, [writeAttestationError]);

  return (
    <div className='w-full max-w-4xl mx-auto p-6'>
      <Card>
        <CardHeader>
          <div className='flex items-center gap-3'>
            <CardTitle className='flex items-center gap-2 text-green-900'>
              <ArrowRight className='h-5 w-5 text-green-600' />
              Redeem FXRP to XRP
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className='text-green-700 mb-6'>
            Convert your FXRP tokens back to native XRP on the XRP Ledger.{' '}
            <a
              href='https://dev.flare.network/fassets/redemption'
              target='_blank'
              rel='noopener noreferrer'
              className='inline-flex items-center gap-1 text-green-600 hover:text-green-800 hover:underline'
            >
              Learn more
              <ExternalLink className='h-3 w-3' />
            </a>
          </p>

          {/* Balance Overview Cards */}
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mb-6'>
            {/* XRPL Balance Card */}
            <XRPLBalanceCard
              balance={xrplBalance}
              onRefresh={refreshBalances}
            />

            {/* FXRP Balance Card */}
            <FXRPBalanceCard
              balance={fxrpBalance}
              onRefresh={refreshBalances}
              colorScheme={{
                title: 'text-green-900',
                icon: 'text-green-600',
                badge: 'bg-green-100 text-green-800',
                button: 'border-green-300 hover:bg-green-100',
                description: 'text-green-600',
              }}
            />
          </div>

          {/* Mode selector — redeem by whole lots vs arbitrary amount */}
          <Tabs
            value={redemptionMode}
            onValueChange={value => {
              setRedemptionMode(value as RedemptionMode);
              reset({ xrplAddress: '', amount: '' });
              setSuccess(null);
              setError(null);
              setRemainingLots(null);
            }}
            className='mb-4'
          >
            <TabsList className='bg-green-100'>
              <TabsTrigger value='amount'>By Amount (redeemAmount)</TabsTrigger>
              <TabsTrigger value='tag'>By Tag (redeemWithTag)</TabsTrigger>
              <TabsTrigger value='lots'>By Lots (redeem)</TabsTrigger>
            </TabsList>
            <TabsContent value='amount' className='text-xs text-green-700 mt-1'>
              Redeem an arbitrary FXRP amount via{' '}
              <code className='bg-green-100 px-1 rounded'>redeemAmount</code>.
              Subject to the lot-size minimum; if liquidity is partial, a
              <code className='bg-green-100 px-1 rounded ml-1'>
                RedemptionRequestIncomplete
              </code>{' '}
              event reports the remainder.
            </TabsContent>
            <TabsContent value='tag' className='text-xs text-green-700 mt-1'>
              Redeem an arbitrary amount and tag the XRPL payout with an{' '}
              <code className='bg-green-100 px-1 rounded'>
                XRPL DestinationTag
              </code>{' '}
              via{' '}
              <code className='bg-green-100 px-1 rounded'>redeemWithTag</code>.
              Useful for routing the redeemed XRP into a specific account on
              the destination side (exchanges, custodial wallets).
              {minimumRedeemAmountUBA !== undefined && (
                <>
                  {' '}
                  Minimum:{' '}
                  <code className='bg-green-100 px-1 rounded'>
                    {(
                      Number(minimumRedeemAmountUBA) / Math.pow(10, 6)
                    ).toFixed(6)}{' '}
                    XRP
                  </code>
                  .
                </>
              )}
            </TabsContent>
            <TabsContent value='lots' className='text-xs text-green-700 mt-1'>
              Redeem whole lots only — the standard{' '}
              <code className='bg-green-100 px-1 rounded'>redeem</code> flow.
            </TabsContent>
          </Tabs>

          {/* Redeem to XRP Section */}
          <form onSubmit={handleSubmit(redeemToXRP)} className='space-y-6'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='xrplAddress' className='text-green-900'>
                  XRPL Address (Destination)
                </Label>
                <Input
                  {...register('xrplAddress')}
                  type='text'
                  placeholder='rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
                  onChange={handleXrplAddressChange}
                  className='border-green-300 focus:ring-green-500 focus:border-green-500'
                />
                {errors.xrplAddress && (
                  <p className='text-sm text-destructive'>
                    {errors.xrplAddress.message}
                  </p>
                )}
              </div>

              {/* Destination Tag — tag mode only */}
              {redemptionMode === 'tag' && (
                <div className='space-y-2'>
                  <Label htmlFor='destinationTag' className='text-green-900'>
                    XRPL Destination Tag
                  </Label>
                  <Input
                    {...register('destinationTag')}
                    id='destinationTag'
                    type='number'
                    placeholder='72'
                    step='1'
                    min='0'
                    className='border-green-300 focus:ring-green-500 focus:border-green-500'
                  />
                  {errors.destinationTag && (
                    <p className='text-sm text-destructive'>
                      {errors.destinationTag.message}
                    </p>
                  )}
                  <p className='text-xs text-green-600'>
                    Non-negative integer (uint256). Attached to the XRPL payout
                    so the recipient can route the funds (e.g. a registered
                    minting tag).
                  </p>
                </div>
              )}

              <div className='space-y-2'>
                <Label htmlFor='amount' className='text-green-900'>
                  {redemptionMode === 'lots' ? 'Lots' : 'FXRP Amount'}
                </Label>
                <Input
                  {...register('amount')}
                  type='number'
                  placeholder={redemptionMode === 'lots' ? '1' : '5.5'}
                  step={redemptionMode === 'lots' ? '1' : 'any'}
                  min='0'
                  className='border-green-300 focus:ring-green-500 focus:border-green-500'
                />
                {errors.amount && (
                  <p className='text-sm text-destructive'>
                    {errors.amount.message}
                  </p>
                )}
                <p className='text-xs text-green-600'>
                  {redemptionMode === 'lots' ? (
                    <>
                      Amount in lots (1 lot ={' '}
                      {settings?.lotSizeAMG
                        ? (
                            Number(settings.lotSizeAMG) / Math.pow(10, 6)
                          ).toFixed(6)
                        : '0'}{' '}
                      XRP)
                    </>
                  ) : (
                    <>
                      FXRP amount to redeem. Lot size:{' '}
                      {settings?.lotSizeAMG
                        ? (
                            Number(settings.lotSizeAMG) / Math.pow(10, 6)
                          ).toFixed(6)
                        : '0'}{' '}
                      XRP — non-multiple amounts may be partially filled.
                    </>
                  )}
                </p>
                {watchedAmount &&
                  watchedAmount !== '' &&
                  !isNaN(parseFloat(watchedAmount)) &&
                  (() => {
                    const lotSize = settings?.lotSizeAMG
                      ? Number(settings.lotSizeAMG) / Math.pow(10, 6)
                      : 0;
                    const fxrpToBurn =
                      redemptionMode === 'lots'
                        ? parseFloat(watchedAmount) * lotSize
                        : parseFloat(watchedAmount);
                    const feeBIPS = settings?.redemptionFeeBIPS
                      ? Number(settings.redemptionFeeBIPS)
                      : 0;
                    const fee = (fxrpToBurn * feeBIPS) / 10000;
                    const net = fxrpToBurn - fee;

                    return (
                      <div className='mt-2 p-3 bg-green-50 border border-green-200 rounded-md space-y-2'>
                        <p className='text-sm text-green-800'>
                          <span className='font-semibold'>FXRP to burn:</span>{' '}
                          {fxrpToBurn} FXRP
                        </p>
                        <p className='text-xs text-green-600'>
                          {redemptionMode === 'lots' ? (
                            <>
                              ({watchedAmount} lots × {lotSize.toFixed(6)} XRP
                              per lot)
                            </>
                          ) : (
                            <>(arbitrary amount via redeemAmount)</>
                          )}
                        </p>

                        <div className='pt-2 border-t border-green-200 space-y-1'>
                          {feeBIPS > 0 ? (
                            <>
                              <p className='text-sm text-green-800'>
                                <span className='font-semibold'>
                                  Redemption Fee:
                                </span>{' '}
                                {fee.toFixed(6)} XRP
                              </p>
                              <p className='text-xs text-green-600'>
                                ({feeBIPS / 100}% deducted from XRP value)
                              </p>
                              <div className='pt-1 border-t border-green-300'>
                                <p className='text-sm font-semibold text-green-900'>
                                  <span>XRP to be redeemed:</span>{' '}
                                  {net.toFixed(6)} XRP
                                </p>
                                <p className='text-xs text-green-600'>
                                  (Net amount after fee deduction)
                                </p>
                              </div>
                            </>
                          ) : (
                            <div className='pt-1 border-t border-green-300'>
                              <p className='text-sm font-semibold text-green-900'>
                                <span>XRP to be redeemed:</span>{' '}
                                {fxrpToBurn.toFixed(6)} XRP
                              </p>
                              <p className='text-xs text-green-600'>
                                (No redemption fee)
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
              </div>
            </div>

            <Button
              type='submit'
              disabled={
                !mounted || isProcessing || !isConnected || isLoadingSettings
              }
              className='w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 cursor-pointer'
            >
              {isProcessing ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  {isRedeemPending
                    ? 'Confirming...'
                    : isConfirming
                      ? 'Processing...'
                      : 'Processing...'}
                </>
              ) : (
                <>
                  <ArrowRight className='mr-2 h-4 w-4' />
                  Redeem to XRP
                </>
              )}
            </Button>

            {(error || assetManagerError || balanceError || writeError) && (
              <Alert variant='destructive'>
                <AlertDescription>
                  {error ||
                    assetManagerError ||
                    balanceError?.message ||
                    'Balance error' ||
                    writeError?.message ||
                    'Transaction error'}
                </AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className='bg-green-50 border-green-200 text-green-800'>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {remainingLots && (
              <Alert className='bg-amber-50 border-amber-200 text-amber-900'>
                <AlertDescription>
                  Partial redemption — {remainingLots} lot
                  {remainingLots === '1' ? '' : 's'} could not be filled
                  (insufficient agent liquidity). The unfilled FAssets remain
                  in your wallet; submit another redemption to retry.
                </AlertDescription>
              </Alert>
            )}

            {redemptionEvent && (
              <RedemptionEventCard
                redemptionEvent={redemptionEvent}
                deadlineBlockNumber={deadlineBlockNumber}
                deadlineTimestamp={deadlineTimestamp}
                isAttestationLoading={isAttestationLoading}
                currentAttestationStep={currentAttestationStep}
                isConnected={isConnected}
                isLoadingAddresses={isLoadingAddresses}
                addressError={addressError}
                attestationError={attestationError}
                attestationSuccess={attestationSuccess}
                attestationData={attestationData}
                verificationResult={verificationResult}
                proofData={proofData}
                copiedText={copiedText}
                onExecuteAttestation={executeAttestation}
                onCopyToClipboard={copyToClipboardWithTimeout}
                setCopiedText={setCopiedText}
                underlyingSecondsForPayment={
                  settings?.underlyingSecondsForPayment !== undefined
                    ? Number(settings.underlyingSecondsForPayment)
                    : undefined
                }
              />
            )}

            <XRPLedgerInfoCard
              testXrpIndex={testXrpIndex}
              closeTime={closeTime}
              deadlineBlockNumber={deadlineBlockNumber}
              deadlineTimestamp={deadlineTimestamp}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
