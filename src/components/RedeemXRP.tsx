'use client';

import { useState, useEffect, useCallback } from 'react';
import { Client } from 'xrpl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// Form data schema
import { RedeemXRPFormDataSchema, RedeemXRPFormData } from '@/types/redeemXRPFormData';

// Hooks and contract functions
import { useAssetManager } from '@/hooks/useAssetManager';
import { useFXRPBalance } from '@/hooks/useFXRPBalance';
import { iAssetManagerAbi } from "../generated";

// UI components
import { ArrowRight, RefreshCw, Loader2, Wallet, Coins } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

export default function RedeemXRP() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [xrplBalance, setXrplBalance] = useState<string>('0');
  const [xrplAddress, setXrplAddress] = useState<string>('');
  const [xrplClient, setXrplClient] = useState<Client | null>(null);
  const [calculatedLots, setCalculatedLots] = useState<string>('0');

  const { assetManagerAddress, settings, isLoading: isLoadingSettings, error: assetManagerError } = useAssetManager();
  const { fxrpBalance, refetchFxrpBalance, isLoadingBalance, balanceError, userAddress, isConnected } = useFXRPBalance();

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
  const { isLoading: isConfirming, isSuccess: isRedeemSuccess } = useWaitForTransactionReceipt({
    hash: redeemHash,
  });

  // Calculate lots when amount changes
  useEffect(() => {
    const calculateLots = async () => {
      if (settings && watchedAmount) {
        try {
          const lotSizeAMG = settings.lotSizeAMG;
          const xrpInDrops = parseFloat(watchedAmount) * 1000000; // Convert XRP to drops
          const lotSize = Number(lotSizeAMG);
          const lots = Math.floor(xrpInDrops / lotSize);
          setCalculatedLots(lots.toString());
        } catch (error) {
          console.error('Error calculating lots:', error);
          setCalculatedLots('0');
        }
      }
    };

    calculateLots();
  }, [settings, watchedAmount]);



  // Handle successful redemption
  useEffect(() => {
    if (isRedeemSuccess) {
      setSuccess(`Successfully redeemed ${watchedAmount} XRP to ${xrplAddress}`);
      reset();
      refetchFxrpBalance();
    }
  }, [isRedeemSuccess, watchedAmount, xrplAddress, reset, refetchFxrpBalance]);

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

      const lotSizeAMG = settings.lotSizeAMG;
      const xrpInDrops = parseFloat(data.amount) * 1000000;
      const lotSize = Number(lotSizeAMG);
      const lots = Math.floor(xrpInDrops / lotSize);

      if (lots <= 0) {
        throw new Error('Amount too small to redeem. Minimum amount required.');
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Coins className="h-5 w-5 text-blue-600" />
                  FXRP Balance
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-blue-600" />
                    <Badge variant="secondary" className="text-lg bg-blue-100 text-blue-800">
                      {fxrpBalance} FXRP
                    </Badge>
                  </div>
                  <Button 
                    onClick={refreshBalances}
                    variant="outline"
                    size="sm"
                    className="border-blue-300 hover:bg-blue-100 cursor-pointer"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
                <p className="text-xs text-blue-600 mt-2">FXRP Token Balance</p>
              </CardContent>
            </Card>
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
                <Label htmlFor="amount" className="text-green-900">Amount (XRP)</Label>
                <Input
                  {...register('amount')}
                  type="number"
                  placeholder="0.0"
                  step="0.000001"
                  className="border-green-300 focus:ring-green-500 focus:border-green-500"
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
                <p className="text-xs text-green-600">
                  Amount will be converted to lots based on Asset Manager settings
                </p>
                {watchedAmount && (
                  <div className={`mt-2 p-2 rounded border ${
                    calculatedLots === '0' 
                      ? 'bg-destructive/10 border-destructive/20' 
                      : 'bg-green-100 border-green-200'
                  }`}>
                    <p className={`text-sm ${
                      calculatedLots === '0' 
                        ? 'text-destructive' 
                        : 'text-green-800'
                    }`}>
                      {calculatedLots === '0' ? (
                        <span className="font-semibold">Warning:</span>
                      ) : (
                        <span className="font-semibold">Calculated Lots:</span>
                      )} {calculatedLots === '0' ? 'Amount too small to fit in a lot' : calculatedLots}
                    </p>
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
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 