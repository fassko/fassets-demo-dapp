'use client';

import { useState, useEffect, useCallback } from 'react';
import { Client } from 'xrpl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { decodeEventLog, keccak256 } from 'viem';

// Form data schema
import { RedeemXRPFormDataSchema, RedeemXRPFormData } from '@/types/redeemXRPFormData';

// Hooks and contract functions
import { useAssetManager } from '@/hooks/useAssetManager';
import { useFXRPBalance } from '@/hooks/useFXRPBalance';
import { useFdcContracts } from '@/hooks/useFdcContracts';
import { 
  iAssetManagerAbi,
  useWriteIFdcHubRequestAttestation
} from "../generated";

// UI components
import { ArrowRight, RefreshCw, Loader2, Wallet, XCircle, CheckCircle, Copy, Check, Shield, Lock, Eye, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FXRPBalanceCard } from "@/components/ui/fxrp-balance-card";
import { copyToClipboardWithTimeout } from '@/lib/clipboard';

// Utils
import { publicClient } from '@/lib/publicClient';
import { 
  retrieveDataAndProofBaseWithRetry, 
  calculateRoundId, 
  FDC_CONSTANTS,
  prepareReferencedPaymentNonexistenceAttestationRequest,
  verifyReferencedPaymentNonexistence,
  submitAttestationRequest
} from '@/lib/fdcUtils';

export default function Redeem() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [xrplBalance, setXrplBalance] = useState<string>('0');
  const [xrplAddress, setXrplAddress] = useState<string>('');
  const [xrplClient, setXrplClient] = useState<Client | null>(null);

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
  const [deadlineBlockNumber, setDeadlineBlockNumber] = useState<string | null>(null);
  const [deadlineTimestamp, setDeadlineTimestamp] = useState<string | null>(null);

  // FDC Attestation state
  const [isAttestationLoading, setIsAttestationLoading] = useState<boolean>(false);
  const [attestationError, setAttestationError] = useState<string | null>(null);
  const [attestationSuccess, setAttestationSuccess] = useState<string | null>(null);
  const [currentAttestationStep, setCurrentAttestationStep] = useState<string>('');
  const [attestationData, setAttestationData] = useState<{
    abiEncodedRequest: string;
    roundId: number | null;
  } | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [proofData, setProofData] = useState<any | null>(null);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  // Asset manager and XRPL balance hooks
  const { assetManagerAddress, settings, isLoading: isLoadingSettings, error: assetManagerError } = useAssetManager();
  const { fxrpBalance, refetchFxrpBalance, balanceError, userAddress, isConnected } = useFXRPBalance();
  const { addresses: fdcAddresses, isLoading: isLoadingAddresses, error: addressError } = useFdcContracts();

  // FDC Attestation contract functions
  const { writeContract: requestAttestation, data: attestationHash, error: writeAttestationError } = useWriteIFdcHubRequestAttestation();
  const { data: attestationReceipt, isSuccess: isAttestationSuccess } = useWaitForTransactionReceipt({ hash: attestationHash });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<RedeemXRPFormData>({
    resolver: zodResolver(RedeemXRPFormDataSchema),
    defaultValues: {
      xrplAddress: '',
      amount: ''
    }
  });

  const watchedAmount = watch('amount');

  // Write contract for redeem function
  const { data: redeemHash, writeContract: redeemContract, isPending: isRedeemPending, error: writeError } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isRedeemSuccess, data: receipt, error: receiptError } = useWaitForTransactionReceipt({
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
        status: receipt.status
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

          console.log(`Decoded event: ${decodedLog.eventName}`, decodedLog.args);

          if (decodedLog.eventName === 'RedemptionRequested') {
            console.log('=== RedemptionRequested Event ===');
            console.log('Agent Vault:', decodedLog.args.agentVault);
            console.log('Redeemer:', decodedLog.args.redeemer);
            console.log('Request ID:', decodedLog.args.requestId.toString());
            console.log('Payment Address:', decodedLog.args.paymentAddress);
            console.log('Value UBA:', decodedLog.args.valueUBA.toString());
            console.log('Fee UBA:', decodedLog.args.feeUBA.toString());
            console.log('First Underlying Block:', decodedLog.args.firstUnderlyingBlock.toString());
            console.log('Last Underlying Block:', decodedLog.args.lastUnderlyingBlock.toString());
            console.log('Last Underlying Timestamp:', decodedLog.args.lastUnderlyingTimestamp.toString());
            console.log('Payment Reference:', decodedLog.args.paymentReference);
            console.log('Executor:', decodedLog.args.executor);
            console.log('Executor Fee Nat Wei:', decodedLog.args.executorFeeNatWei.toString());
            console.log('=====================================');

            // Store the single event in state for UI display
            setRedemptionEvent({
              agentVault: decodedLog.args.agentVault,
              redeemer: decodedLog.args.redeemer,
              requestId: decodedLog.args.requestId.toString(),
              paymentAddress: decodedLog.args.paymentAddress,
              valueUBA: decodedLog.args.valueUBA.toString(),
              feeUBA: decodedLog.args.feeUBA.toString(),
              firstUnderlyingBlock: decodedLog.args.firstUnderlyingBlock.toString(),
              lastUnderlyingBlock: decodedLog.args.lastUnderlyingBlock.toString(),
              lastUnderlyingTimestamp: decodedLog.args.lastUnderlyingTimestamp.toString(),
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

      setSuccess(`Successfully redeemed ${watchedAmount} lots to ${xrplAddress}`);
      reset();
      refetchFxrpBalance();
      
      // Get the latest testXRP index after successful redemption
      getTestXrpIndex();
    }
  }, [isRedeemSuccess, receipt, watchedAmount, xrplAddress, reset, refetchFxrpBalance]);

  // Handle receipt errors
  useEffect(() => {
    if (receiptError) {
      console.error('Transaction receipt error:', receiptError);
      console.error('Receipt error details:', {
        name: receiptError instanceof Error ? receiptError.name : 'Unknown',
        message: receiptError instanceof Error ? receiptError.message : String(receiptError),
        cause: receiptError instanceof Error ? receiptError.cause : undefined,
        stack: receiptError instanceof Error ? receiptError.stack : undefined
      });
      
      setError(`Transaction receipt failed: ${receiptError instanceof Error ? receiptError.message : String(receiptError)}`);
    }
  }, [receiptError]);

  // Initialize XRPL connection
  useEffect(() => {
    const initXrpl = async () => {
      try {
        const client = new Client('wss://s.altnet.rippletest.net:51233');
        await client.connect();
        setXrplClient(client);
      } catch (error) {
        console.error('Error initializing XRPL connection:', error);
      }
    };

    initXrpl();
  }, []);

  const getTestXrpIndex = useCallback(async () => {
    if (!xrplClient) {
      console.warn('XRPL client not available');
      return;
    }

    try {
      console.log('Fetching latest testXRP index and close time...');
      
      // Get the latest ledger info
      const ledgerInfo = await xrplClient.request({
        command: 'ledger',
        ledger_index: 'validated'
      });
      
      console.log('Latest ledger info:', ledgerInfo);
      
      // Get the latest testXRP index from the ledger
      const testXrpIndexValue = ledgerInfo.result.ledger_index;
      setTestXrpIndex(testXrpIndexValue.toString());
      
      // Get the close time (latest timestamp)
      const closeTimeValue = ledgerInfo.result.ledger.close_time;
      setCloseTime(closeTimeValue.toString());
      
      // Calculate FDC deadline values
      // L = latest validated ledger_index
      // T_ripple = that ledger's close_time (Ripple epoch seconds)
      const L = testXrpIndexValue;
      const T_ripple = closeTimeValue;
      
      // deadlineBlockNumber = L + 225 (≈ 225 ledgers of confirmation)
      const deadlineBlockNumberValue = L + 225;
      setDeadlineBlockNumber(deadlineBlockNumberValue.toString());
      
      // deadlineTimestamp = (T_ripple + 946684800) + 900
      // (add 946,684,800 to convert Ripple→UNIX, then add ~15 minutes for 3 ledgers)
      const deadlineTimestampValue = (T_ripple + 946684800) + 900;
      setDeadlineTimestamp(deadlineTimestampValue.toString());
      
      console.log('Latest testXRP index:', testXrpIndexValue);
      console.log('Latest close time:', closeTimeValue);
      console.log('FDC deadline block number:', deadlineBlockNumberValue);
      console.log('FDC deadline timestamp:', deadlineTimestampValue);
    } catch (error) {
      console.error('Error fetching testXRP index and close time:', error);
      setTestXrpIndex(null);
      setCloseTime(null);
      setDeadlineBlockNumber(null);
      setDeadlineTimestamp(null);
    }
  }, [xrplClient]);

  const refreshBalances = useCallback(async () => {
    try {
      // Refresh XRPL balance
      if (xrplClient && xrplAddress) {
        try {
          const accountInfo = await xrplClient.request({
            command: 'account_info',
            account: xrplAddress,
            ledger_index: 'validated'
          });
          
          const balanceInDrops = accountInfo.result.account_data.Balance;
          const balanceInXRP = parseFloat(balanceInDrops) / 1000000;
          setXrplBalance(balanceInXRP.toString());
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
  }, [xrplClient, xrplAddress, userAddress, settings, assetManagerAddress, refetchFxrpBalance]);

  // Refresh XRPL balance when client and address are available
  useEffect(() => {
    if (xrplClient && xrplAddress && xrplAddress.startsWith('r') && xrplAddress.length >= 25) {
      refreshBalances();
    }
  }, [xrplClient, xrplAddress, refreshBalances]);

  const isValidXrplAddress = (address: string): boolean => {
    try {
      RedeemXRPFormDataSchema.pick({ xrplAddress: true }).parse({ xrplAddress: address });
      return true;
    } catch {
      return false;
    }
  };

  const handleXrplAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    const isValid = isValidXrplAddress(address);
    
    if (isValid) {
      setXrplAddress(address);
      if (xrplClient) {
        refreshBalances();
      }
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
        abi: iAssetManagerAbi,
        functionName: 'redeem',
        args: [BigInt(lots), data.xrplAddress, assetManagerAddress!],
      });

    } catch (error) {
      console.error('Error redeeming to XRP:', error);
      setError(error instanceof Error ? error.message : 'Failed to redeem to XRP');
      setIsProcessing(false);
    }
  };

  // Handle write contract errors
  useEffect(() => {
    if (writeError) {
      console.error('Write contract error:', writeError);
      
      // Handle specific error types
      if (writeError.message.includes('User denied transaction signature') || writeError.message.includes('user rejected')) {
        setError('Transaction was cancelled by the user.');
      } else if (writeError.message.includes('execution reverted')) {
        setError('Transaction failed: The contract rejected the transaction. This could be due to insufficient funds, invalid parameters, or network issues.');
      } else if (writeError.message.includes('insufficient funds')) {
        setError('Insufficient funds to complete the transaction. Please check your wallet balance.');
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
      setAttestationError('FDC contract addresses not loaded. Please wait and try again.');
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
      // Step 1: Prepare attestation request
      setCurrentAttestationStep('Preparing attestation request...');
      console.log('Preparing attestation request...');
      
      const attestationRequestData = {
        minimalBlockNumber: redemptionEvent.firstUnderlyingBlock,
        deadlineBlockNumber: deadlineBlockNumber,
        deadlineTimestamp: deadlineTimestamp,
        destinationAddressHash: keccak256(redemptionEvent.paymentAddress as `0x${string}`),
        amount: (BigInt(redemptionEvent.valueUBA) - BigInt(redemptionEvent.feeUBA)).toString(), // Value UBA minus Fee UBA
        standardPaymentReference: redemptionEvent.paymentReference,
        checkSourceAddresses: false,
        sourceAddressesRoot: "0x0000000000000000000000000000000000000000000000000000000000000000",
      };
      
      // Prepare the attestation request using the verifier API
      const attestationResponse = await prepareReferencedPaymentNonexistenceAttestationRequest(attestationRequestData);
      console.log('Attestation response:', attestationResponse);
      
      // Create attestation data structure with the real ABI encoded request
      const data = {
        abiEncodedRequest: attestationResponse.abiEncodedRequest,
        roundId: null, // Will be calculated after transaction
      };
      console.log('Attestation data:', data);
      setAttestationData(data);

      // Step 2: Submit attestation request
      setCurrentAttestationStep('Submitting attestation request to blockchain...');
      console.log('Submitting attestation request...');
      if (!fdcAddresses) {
        throw new Error('FDC contract addresses not loaded');
      }
      await submitAttestationRequest(data.abiEncodedRequest, fdcAddresses, publicClient, requestAttestation);
      
      // Wait for transaction to be mined and calculate round ID
      setCurrentAttestationStep('Waiting for transaction confirmation...');
      
      setCurrentAttestationStep('');
      setAttestationSuccess('Attestation request submitted! Waiting for confirmation...');
    } catch (error) {
      console.error('Attestation error:', error);
      setCurrentAttestationStep('');
      setAttestationError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsAttestationLoading(false);
    }
  };

  // Handle attestation transaction success and calculate round ID
  useEffect(() => {
    if (isAttestationSuccess && attestationReceipt && attestationData && attestationData.roundId === null) {
      const processAttestationTransaction = async () => {
        try {
          setCurrentAttestationStep('Calculating round ID from transaction...');
          if (!fdcAddresses) {
            throw new Error('FDC contract addresses not loaded');
          }
          const roundId = await calculateRoundId(
            { receipt: { blockNumber: attestationReceipt.blockNumber } },
            fdcAddresses,
            publicClient
          );
          console.log('Calculated round ID:', roundId);
          
          // Update attestationData with the calculated round ID
          setAttestationData(prevData => prevData ? { ...prevData, roundId } : null);
          
          // Start proof retrieval
          setCurrentAttestationStep('Retrieving proof from Data Availability Layer...');
          const proof = await retrieveDataAndProofBaseWithRetry(
            FDC_CONSTANTS.DA_LAYER_API_URL,
            attestationData.abiEncodedRequest,
            roundId,
            FDC_CONSTANTS.DA_LAYER_API_KEY
          );
          
          setProofData(proof);
          
          // Verify the payment nonexistence
          setCurrentAttestationStep('Verifying payment nonexistence with FDC Verification contract...');
          if (!fdcAddresses) {
            throw new Error('FDC contract addresses not loaded');
          }
          const verificationResult = await verifyReferencedPaymentNonexistence(proof, fdcAddresses, publicClient);
          setVerificationResult(verificationResult);
          
          setCurrentAttestationStep('');
          setAttestationSuccess(`Round ID ${roundId} calculated, proof retrieved, and payment nonexistence verified successfully! Verification result: ${verificationResult}`);
        } catch (error) {
          console.error('Error processing attestation transaction:', error);
          setCurrentAttestationStep('');
          setAttestationError(error instanceof Error ? error.message : 'Error processing attestation transaction');
        }
      };

      processAttestationTransaction();
    }
  }, [isAttestationSuccess, attestationReceipt, attestationData]);

  // Handle attestation write contract errors
  useEffect(() => {
    if (writeAttestationError) {
      console.error('Attestation write contract error:', writeAttestationError);
      
      // Handle specific error types
      if (writeAttestationError.message.includes('User denied transaction signature') || writeAttestationError.message.includes('user rejected')) {
        setAttestationError('Attestation transaction was cancelled by the user.');
      } else if (writeAttestationError.message.includes('execution reverted')) {
        setAttestationError('Attestation transaction failed: The contract rejected the transaction. This could be due to invalid parameters, insufficient funds, or network issues.');
      } else if (writeAttestationError.message.includes('insufficient funds')) {
        setAttestationError('Insufficient funds to complete the attestation transaction. Please check your wallet balance.');
      } else if (writeAttestationError.message.includes('request fee')) {
        setAttestationError('Insufficient request fee. Please ensure you have enough FLR to pay the attestation request fee.');
      } else {
        setAttestationError(`Attestation transaction failed: ${writeAttestationError.message}`);
      }
    }
  }, [writeAttestationError]);

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <ArrowRight className="h-5 w-5 text-green-600" />
            Redeem FXRP to XRP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-green-700 mb-6">
            Convert your FXRP tokens back to native XRP on the XRP Ledger.
          </p>

          {/* Balance Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* XRPL Balance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  <Wallet className="h-5 w-5 text-green-600" />
                  XRPL Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-green-600" />
                    <Badge variant="secondary" className="text-lg bg-green-100 text-green-800">
                      {xrplBalance} XRP
                    </Badge>
                  </div>
                  <Button 
                    onClick={refreshBalances}
                    variant="outline"
                    size="sm"
                    className="border-green-300 hover:bg-green-100 cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                <p className="text-xs text-green-600 mt-2">XRPL Balance</p>
              </CardContent>
            </Card>

            {/* FXRP Balance Card */}
            <FXRPBalanceCard
              balance={fxrpBalance}
              onRefresh={refreshBalances}
              colorScheme={{
                title: "text-green-900",
                icon: "text-green-600",
                badge: "bg-green-100 text-green-800",
                button: "border-green-300 hover:bg-green-100",
                description: "text-green-600"
              }}
            />
          </div>

          {/* Redeem to XRP Section */}
          <form onSubmit={handleSubmit(redeemToXRP)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="xrplAddress" className="text-green-900">XRPL Address (Destination)</Label>
                <Input
                  {...register('xrplAddress')}
                  type="text"
                  placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                  onChange={handleXrplAddressChange}
                  className="border-green-300 focus:ring-green-500 focus:border-green-500"
                />
                {errors.xrplAddress && (
                  <p className="text-sm text-destructive">{errors.xrplAddress.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-green-900">Lots</Label>
                <Input
                  {...register('amount')}
                  type="number"
                  placeholder="1"
                  step="1"
                  min="1"
                  className="border-green-300 focus:ring-green-500 focus:border-green-500"
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
                <p className="text-xs text-green-600">
                  Amount in lots (1 lot = {settings?.lotSizeAMG ? (Number(settings.lotSizeAMG) / Math.pow(10, 6)).toFixed(6) : '0'} XRP)
                </p>
                {watchedAmount && watchedAmount !== '' && !isNaN(parseFloat(watchedAmount)) && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md space-y-2">
                    <p className="text-sm text-green-800">
                      <span className="font-semibold">FXRP to burn:</span> {parseFloat(watchedAmount) * (settings?.lotSizeAMG ? Number(settings.lotSizeAMG) / Math.pow(10, 6) : 0)} FXRP
                    </p>
                    <p className="text-xs text-green-600">
                      ({watchedAmount} lots × {settings?.lotSizeAMG ? (Number(settings.lotSizeAMG) / Math.pow(10, 6)).toFixed(6) : '0'} XRP per lot)
                    </p>
                    
                    <div className="pt-2 border-t border-green-200 space-y-1">
                      {settings?.redemptionFeeBIPS && Number(settings.redemptionFeeBIPS) > 0 && (
                        <>
                          <p className="text-sm text-green-800">
                            <span className="font-semibold">Redemption Fee:</span> {((parseFloat(watchedAmount) * (settings?.lotSizeAMG ? Number(settings.lotSizeAMG) / Math.pow(10, 6) : 0)) * Number(settings.redemptionFeeBIPS) / 10000).toFixed(6)} XRP
                          </p>
                          <p className="text-xs text-green-600">
                            ({Number(settings.redemptionFeeBIPS) / 100}% deducted from XRP value)
                          </p>
                          
                          <div className="pt-1 border-t border-green-300">
                            <p className="text-sm font-semibold text-green-900">
                              <span>XRP to be redeemed:</span> {((parseFloat(watchedAmount) * (settings?.lotSizeAMG ? Number(settings.lotSizeAMG) / Math.pow(10, 6) : 0)) * (1 - Number(settings.redemptionFeeBIPS) / 10000)).toFixed(6)} XRP
                            </p>
                            <p className="text-xs text-green-600">
                              (Net amount after fee deduction)
                            </p>
                          </div>
                        </>
                      )}
                      
                      {(!settings?.redemptionFeeBIPS || Number(settings.redemptionFeeBIPS) === 0) && (
                        <div className="pt-1 border-t border-green-300">
                          <p className="text-sm font-semibold text-green-900">
                            <span>XRP to be redeemed:</span> {(parseFloat(watchedAmount) * (settings?.lotSizeAMG ? Number(settings.lotSizeAMG) / Math.pow(10, 6) : 0)).toFixed(6)} XRP
                          </p>
                          <p className="text-xs text-green-600">
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
              type="submit"
              disabled={isProcessing || !isConnected || isLoadingSettings}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isRedeemPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Processing...'}
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Redeem to XRP
                </>
              )}
            </Button>

                      {(error || assetManagerError || balanceError || writeError) && (
            <Alert variant="destructive">
              <AlertDescription>
                {error || assetManagerError || (balanceError?.message || 'Balance error') || (writeError?.message || 'Transaction error')}
              </AlertDescription>
            </Alert>
          )}

            {success && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {redemptionEvent && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-900">Redemption Event</h3>
                
                <div className="space-y-3">
                  <h4 className="text-md font-semibold text-green-800">RedemptionRequested Event</h4>
                  <div className="bg-green-50 border border-green-200 rounded p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Request ID:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
                        {redemptionEvent.requestId}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Payment Reference:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
                        {redemptionEvent.paymentReference}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Agent Vault:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
                        {redemptionEvent.agentVault}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Redeemer:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
                        {redemptionEvent.redeemer}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Payment Address:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
                        {redemptionEvent.paymentAddress}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Value UBA:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
                        {redemptionEvent.valueUBA}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Fee UBA:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
                        {redemptionEvent.feeUBA}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Executor:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
                        {redemptionEvent.executor}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Executor Fee Nat Wei:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
                        {redemptionEvent.executorFeeNatWei}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">First Underlying Block:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
                        {redemptionEvent.firstUnderlyingBlock}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Last Underlying Block:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
                        {redemptionEvent.lastUnderlyingBlock}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Last Underlying Timestamp:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
                        {redemptionEvent.lastUnderlyingTimestamp}
                      </code>
                    </div>
                  </div>
                </div>

                {/* FDC Attestation Section */}
                <div className="space-y-4">
                  <h4 className="text-md font-semibold text-green-800">FDC Payment Nonexistence Attestation</h4>
                  
                  <div className="bg-green-50 border border-green-200 rounded p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Minimal Block Number:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                        {redemptionEvent.firstUnderlyingBlock}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Deadline Block Number:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                        {deadlineBlockNumber || 'Calculating...'}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Deadline Timestamp:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                        {deadlineTimestamp || 'Calculating...'}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Destination Address:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                        {redemptionEvent.paymentAddress}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Value UBA:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                        {redemptionEvent.valueUBA}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Fee UBA:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                        {redemptionEvent.feeUBA}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Net Amount (UBA):</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                        {(BigInt(redemptionEvent.valueUBA) - BigInt(redemptionEvent.feeUBA)).toString()}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Net Amount (XRP):</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                        {((BigInt(redemptionEvent.valueUBA) - BigInt(redemptionEvent.feeUBA)) / BigInt(1000000)).toString()}
                      </code>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Payment Reference:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                        {redemptionEvent.paymentReference}
                      </code>
                    </div>
                  </div>

                  <Button
                    onClick={executeAttestation}
                    disabled={isAttestationLoading || !deadlineBlockNumber || !deadlineTimestamp || !isConnected || isLoadingAddresses || !!addressError}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {isAttestationLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {currentAttestationStep || 'Executing Attestation...'}
                      </>
                                      ) : (
                    <>
                      <Shield className="mr-2 h-4 w-4" />
                      Execute Payment Nonexistence Attestation
                    </>
                  )}
                  </Button>

                  {isAttestationLoading && currentAttestationStep && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-blue-800 font-medium">{currentAttestationStep}</span>
                      </div>
                      <p className="text-blue-600 text-sm mt-2">
                        Please wait while the attestation process completes. This may take several minutes.
                      </p>
                    </div>
                  )}

                  {attestationError && (
                    <Alert variant="destructive">
                      <XCircle className="h-4 w-4" />
                      <AlertDescription>{attestationError}</AlertDescription>
                    </Alert>
                  )}

                  {attestationSuccess && (
                    <Alert className="bg-green-50 border-green-200 text-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>{attestationSuccess}</AlertDescription>
                    </Alert>
                  )}

                  {attestationData && (
                    <div className="space-y-4">
                      <h5 className="text-md font-semibold text-green-800">Attestation Data</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">ABI Encoded Request:</span>
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1">
                            {attestationData.abiEncodedRequest.length > 20 
                              ? `${attestationData.abiEncodedRequest.slice(0, 10)}...${attestationData.abiEncodedRequest.slice(-10)}`
                              : attestationData.abiEncodedRequest
                            }
                          </code>
                          <button
                            type="button"
                            onClick={() => copyToClipboardWithTimeout(attestationData.abiEncodedRequest, setCopiedText)}
                            className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                          >
                            {copiedText === attestationData.abiEncodedRequest ? (
                              <Check className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3 text-gray-500" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Round ID:</span>
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1">
                            {attestationData.roundId ?? 'Calculating...'}
                          </code>
                          {attestationData.roundId !== null && (
                            <button
                              type="button"
                              onClick={() => copyToClipboardWithTimeout(attestationData.roundId!.toString(), setCopiedText)}
                              className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                            >
                              {copiedText === attestationData.roundId!.toString() ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-500" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {verificationResult !== null && (
                    <div className="space-y-4">
                      <h5 className="text-md font-semibold text-green-800">Payment Nonexistence Verification Result</h5>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Verification Status:</span>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          verificationResult 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {verificationResult ? '✅ Payment Nonexistence Verified' : '❌ Payment Found or Verification Failed'}
                        </div>
                      </div>
                    </div>
                  )}

                  {proofData && (
                    <div className="space-y-4">
                      <h5 className="text-md font-semibold text-green-800">Proof Data</h5>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Voting Round:</span>
                          <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1">
                            {proofData.response?.votingRound ?? 'Not available'}
                          </code>
                          {proofData.response?.votingRound && (
                            <button
                              type="button"
                              onClick={() => copyToClipboardWithTimeout(proofData.response.votingRound.toString(), setCopiedText)}
                              className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                            >
                              {copiedText === proofData.response.votingRound.toString() ? (
                                <Check className="h-3 w-3 text-green-600" />
                              ) : (
                                <Copy className="h-3 w-3 text-gray-500" />
                              )}
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <span className="font-medium">Proof Array:</span>
                          <div className="space-y-1">
                            {proofData.proof && Array.isArray(proofData.proof) && proofData.proof.map((proofItem: string, index: number) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className="text-sm text-gray-600 w-8">[{index}]:</span>
                                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1">
                                  {proofItem.length > 20 
                                    ? `${proofItem.slice(0, 10)}...${proofItem.slice(-10)}`
                                    : proofItem
                                  }
                                </code>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboardWithTimeout(proofItem, setCopiedText)}
                                  className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                                >
                                  {copiedText === proofItem ? (
                                    <Check className="h-3 w-3 text-green-600" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-gray-500" />
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <span className="font-medium">Response Body:</span>
                          <div className="bg-gray-100 rounded p-3 text-sm font-mono">
                            <div><strong>Minimal Block Timestamp:</strong> {proofData.response?.responseBody?.minimalBlockTimestamp}</div>
                            <div><strong>First Overflow Block Number:</strong> {proofData.response?.responseBody?.firstOverflowBlockNumber}</div>
                            <div><strong>First Overflow Block Timestamp:</strong> {proofData.response?.responseBody?.firstOverflowBlockTimestamp}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {(testXrpIndex || closeTime || deadlineBlockNumber || deadlineTimestamp) && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-green-900">Latest XRPL Ledger Info</h3>
                <div className="bg-green-50 border border-green-200 rounded p-4 space-y-3">
                  {testXrpIndex && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">TestXRP Index:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                        {testXrpIndex}
                      </code>
                    </div>
                  )}
                  {closeTime && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Close Time:</span>
                      <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                        {closeTime}
                      </code>
                    </div>
                  )}
                  {closeTime && (
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-green-900">Readable Time:</span>
                      <span className="text-sm text-green-800">
                        {new Date((parseInt(closeTime) + 946684800) * 1000).toLocaleString()}
                      </span>
                    </div>
                  )}
                  
                  {/* FDC Deadline Values */}
                  {(deadlineBlockNumber || deadlineTimestamp) && (
                    <div className="pt-3 border-t border-green-300 space-y-2">
                      <h4 className="text-md font-semibold text-green-800">FDC Deadline Values</h4>
                      
                      {deadlineBlockNumber && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-green-900">Deadline Block Number:</span>
                          <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                            {deadlineBlockNumber}
                          </code>
                        </div>
                      )}
                      
                      {deadlineTimestamp && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-green-900">Deadline Timestamp:</span>
                          <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
                            {deadlineTimestamp}
                          </code>
                        </div>
                      )}
                      
                      {deadlineTimestamp && (
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-green-900">Deadline Readable:</span>
                          <span className="text-sm text-green-800">
                            {new Date(parseInt(deadlineTimestamp) * 1000).toLocaleString()}
                          </span>
                        </div>
                      )}
                      
                      <p className="text-xs text-green-600">
                        FDC deadline: ~15 minutes confirmation window
                      </p>
                    </div>
                  )}
                  
                  <p className="text-xs text-green-600 mt-2">
                    Latest validated ledger information from XRPL testnet
                  </p>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 