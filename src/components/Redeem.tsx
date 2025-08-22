'use client';

import { useState, useEffect, useCallback } from 'react';
import { Client } from 'xrpl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { decodeEventLog } from 'viem';

// Form data schema
import { RedeemXRPFormDataSchema, RedeemXRPFormData } from '@/types/redeemXRPFormData';

// Hooks and contract functions
import { useAssetManager } from '@/hooks/useAssetManager';
import { useFXRPBalance } from '@/hooks/useFXRPBalance';
import { iAssetManagerAbi } from "../generated";

// UI components
import { ArrowRight, RefreshCw, Loader2, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { FXRPBalanceCard } from "@/components/ui/fxrp-balance-card";

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

  const { assetManagerAddress, settings, isLoading: isLoadingSettings, error: assetManagerError } = useAssetManager();
  const { fxrpBalance, refetchFxrpBalance, balanceError, userAddress, isConnected } = useFXRPBalance();

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
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 