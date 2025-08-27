'use client';

import { useCallback, useEffect, useState } from 'react';

import { ArrowRight, Loader2 } from 'lucide-react';

import { useForm } from 'react-hook-form';

import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

import { decodeEventLog, keccak256 } from 'viem';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FXRPBalanceCard } from '@/components/ui/fxrp-balance-card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RedemptionEventCard from '@/components/ui/RedemptionEventCard';
import XRPLBalanceCard from '@/components/ui/XRPLBalanceCard';
import XRPLedgerInfoCard from '@/components/ui/XRPLedgerInfoCard';
import { useAssetManager } from '@/hooks/useAssetManager';
import { useFdcContracts } from '@/hooks/useFdcContracts';
import { useFXRPBalance } from '@/hooks/useFXRPBalance';
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
import {
  getAccountBalance,
  getLatestLedgerInfoWithFDCDeadlines,
  isValidXRPAddress,
} from '@/lib/xrpUtils';
import { AttestationData } from '@/types/attestation';

import {
  iAssetManagerAbi,
  useWriteIFdcHubRequestAttestation,
} from '../generated';

// Form data types
const RedeemXRPFormDataSchema = z.object({
  xrplAddress: z
    .string()
    .min(25, 'Address is too short')
    .max(35, 'Address is too long')
    .regex(/^r[1-9A-Za-km-z]{20,34}$/, 'Invalid XRPL address'),
  amount: z
    .string()
    .min(1, 'Amount is required')
    .refine(
      val => !isNaN(parseFloat(val)) && parseFloat(val) > 0,
      'Amount must be a positive number'
    )
    .refine(
      val => parseFloat(val) <= 1000000,
      'Amount cannot exceed 1,000,000'
    ),
});

type RedeemXRPFormData = z.infer<typeof RedeemXRPFormDataSchema>;

export default function Redeem() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
    settings,
    isLoading: isLoadingSettings,
    error: assetManagerError,
  } = useAssetManager();

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

  // FDC Attestation contract functions hook
  const {
    writeContract: requestAttestation,
    data: attestationHash,
    error: writeAttestationError,
  } = useWriteIFdcHubRequestAttestation();

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
    resolver: zodResolver(RedeemXRPFormDataSchema),
    defaultValues: {
      xrplAddress: '',
      amount: '',
    },
  });

  const watchedAmount = watch('amount');

  // Write contract for redeem function
  const {
    data: redeemHash,
    writeContract: redeemContract,
    isPending: isRedeemPending,
    error: writeError,
  } = useWriteContract();

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
            abi: iAssetManagerAbi,
            data: log.data,
            topics: log.topics,
          });

          console.log(
            `Decoded event: ${decodedLog.eventName}`,
            decodedLog.args
          );

          if (decodedLog.eventName === 'RedemptionRequested') {
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

      setSuccess(
        `Successfully redeemed ${watchedAmount} lots to ${xrplAddress}`
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

      setError(
        `Transaction receipt failed: ${receiptError instanceof Error ? receiptError.message : String(receiptError)}`
      );
    }
  }, [receiptError]);

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
      RedeemXRPFormDataSchema.pick({ xrplAddress: true }).parse({
        xrplAddress: address,
      });
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

    try {
      if (!settings) {
        throw new Error('AssetManager settings not loaded');
      }

      if (!isConnected) {
        throw new Error('Please connect your wallet');
      }

      // Validate that amount is a positive integer (lots)
      const lots = parseInt(data.amount);
      if (isNaN(lots) || lots <= 0) {
        throw new Error('Lots must be a positive integer');
      }

      // Call the redeem function using wagmi - Diamond proxy approach
      redeemContract({
        address: assetManagerAddress!,
        // Use the AssetManager ABI from the Flare Contracts Registry
        // https://dev.flare.network/network/guides/flare-contracts-registry
        abi: iAssetManagerAbi,
        // Use the redeem function from the AssetManager ABI
        // https://dev.flare.network/fassets/reference/IAssetManager#redeem
        functionName: 'redeem',
        // Parameters for the redeem function
        // Lots, XRPL address, executor (zero address for this demo)
        args: [
          BigInt(lots),
          data.xrplAddress,
          '0x0000000000000000000000000000000000000000',
        ],
      });
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

      // Handle specific error types
      if (
        writeError.message.includes('User denied transaction signature') ||
        writeError.message.includes('user rejected')
      ) {
        setError('Transaction was cancelled by the user.');
      } else if (writeError.message.includes('execution reverted')) {
        setError(
          'Transaction failed: The contract rejected the transaction. This could be due to insufficient funds, invalid parameters, or network issues.'
        );
      } else if (writeError.message.includes('insufficient funds')) {
        setError(
          'Insufficient funds to complete the transaction. Please check your wallet balance.'
        );
      } else {
        setError(`Transaction failed: ${writeError.message}`);
      }
      setIsProcessing(false);
    }
  }, [writeError]);

  // Update processing state based on transaction status
  useEffect(() => {
    setIsProcessing(isRedeemPending || isConfirming);
  }, [isRedeemPending, isConfirming]);

  // Execute attestation after successful redemption
  const executeAttestation = async () => {
    if (!redemptionEvent || !deadlineBlockNumber || !deadlineTimestamp) {
      console.log('Missing required data for attestation');
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
        deadlineBlockNumber: deadlineBlockNumber,
        deadlineTimestamp: deadlineTimestamp,
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
            fdcAddresses
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
            fdcAddresses
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
  }, [isAttestationSuccess, attestationReceipt, attestationData, fdcAddresses]);

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
          <CardTitle className='flex items-center gap-2 text-green-900'>
            <ArrowRight className='h-5 w-5 text-green-600' />
            Redeem FXRP to XRP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-green-700 mb-6'>
            Convert your FXRP tokens back to native XRP on the XRP Ledger.
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

              <div className='space-y-2'>
                <Label htmlFor='amount' className='text-green-900'>
                  Lots
                </Label>
                <Input
                  {...register('amount')}
                  type='number'
                  placeholder='1'
                  step='1'
                  min='1'
                  className='border-green-300 focus:ring-green-500 focus:border-green-500'
                />
                {errors.amount && (
                  <p className='text-sm text-destructive'>
                    {errors.amount.message}
                  </p>
                )}
                <p className='text-xs text-green-600'>
                  Amount in lots (1 lot ={' '}
                  {settings?.lotSizeAMG
                    ? (Number(settings.lotSizeAMG) / Math.pow(10, 6)).toFixed(6)
                    : '0'}{' '}
                  XRP)
                </p>
                {watchedAmount &&
                  watchedAmount !== '' &&
                  !isNaN(parseFloat(watchedAmount)) && (
                    <div className='mt-2 p-3 bg-green-50 border border-green-200 rounded-md space-y-2'>
                      <p className='text-sm text-green-800'>
                        <span className='font-semibold'>FXRP to burn:</span>{' '}
                        {parseFloat(watchedAmount) *
                          (settings?.lotSizeAMG
                            ? Number(settings.lotSizeAMG) / Math.pow(10, 6)
                            : 0)}{' '}
                        FXRP
                      </p>
                      <p className='text-xs text-green-600'>
                        ({watchedAmount} lots ×{' '}
                        {settings?.lotSizeAMG
                          ? (
                              Number(settings.lotSizeAMG) / Math.pow(10, 6)
                            ).toFixed(6)
                          : '0'}{' '}
                        XRP per lot)
                      </p>

                      <div className='pt-2 border-t border-green-200 space-y-1'>
                        {settings?.redemptionFeeBIPS &&
                          Number(settings.redemptionFeeBIPS) > 0 && (
                            <>
                              <p className='text-sm text-green-800'>
                                <span className='font-semibold'>
                                  Redemption Fee:
                                </span>{' '}
                                {(
                                  (parseFloat(watchedAmount) *
                                    (settings?.lotSizeAMG
                                      ? Number(settings.lotSizeAMG) /
                                        Math.pow(10, 6)
                                      : 0) *
                                    Number(settings.redemptionFeeBIPS)) /
                                  10000
                                ).toFixed(6)}{' '}
                                XRP
                              </p>
                              <p className='text-xs text-green-600'>
                                ({Number(settings.redemptionFeeBIPS) / 100}%
                                deducted from XRP value)
                              </p>

                              <div className='pt-1 border-t border-green-300'>
                                <p className='text-sm font-semibold text-green-900'>
                                  <span>XRP to be redeemed:</span>{' '}
                                  {(
                                    parseFloat(watchedAmount) *
                                    (settings?.lotSizeAMG
                                      ? Number(settings.lotSizeAMG) /
                                        Math.pow(10, 6)
                                      : 0) *
                                    (1 -
                                      Number(settings.redemptionFeeBIPS) /
                                        10000)
                                  ).toFixed(6)}{' '}
                                  XRP
                                </p>
                                <p className='text-xs text-green-600'>
                                  (Net amount after fee deduction)
                                </p>
                              </div>
                            </>
                          )}

                        {(!settings?.redemptionFeeBIPS ||
                          Number(settings.redemptionFeeBIPS) === 0) && (
                          <div className='pt-1 border-t border-green-300'>
                            <p className='text-sm font-semibold text-green-900'>
                              <span>XRP to be redeemed:</span>{' '}
                              {(
                                parseFloat(watchedAmount) *
                                (settings?.lotSizeAMG
                                  ? Number(settings.lotSizeAMG) /
                                    Math.pow(10, 6)
                                  : 0)
                              ).toFixed(6)}{' '}
                              XRP
                            </p>
                            <p className='text-xs text-green-600'>
                              (No redemption fee)
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
              </div>
            </div>

            <Button
              type='submit'
              disabled={isProcessing || !isConnected || isLoadingSettings}
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
