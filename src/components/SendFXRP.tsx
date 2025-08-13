'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { erc20Abi } from 'viem';

// Form data schema
import { SendFXRPFormDataSchema, SendFXRPFormData } from '@/types/sendFXRPFormData';

// Hooks and contract functions
import { useAssetManager } from '@/hooks/useAssetManager';
import { useFXRPBalance } from '@/hooks/useFXRPBalance';
import { iAssetManagerAbi } from "../generated";

// UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Send, RefreshCw, Loader2, Coins } from "lucide-react";

export default function SendFXRP() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { assetManagerAddress, settings, isLoading: isLoadingSettings, error: assetManagerError } = useAssetManager();
  const { fxrpBalance, refetchFxrpBalance, isLoadingBalance, balanceError, userAddress, isConnected } = useFXRPBalance();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch
  } = useForm<SendFXRPFormData>({
    resolver: zodResolver(SendFXRPFormDataSchema),
    defaultValues: {
      recipientAddress: '',
      amount: ''
    }
  });

  const watchedAmount = watch('amount');

  // Write contract for transfer function
  const { data: transferHash, writeContract: transferContract, isPending: isTransferPending, error: writeError } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isTransferSuccess } = useWaitForTransactionReceipt({
    hash: transferHash,
  });

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
    }
  }, [writeError]);

  // Handle successful transfer
  useEffect(() => {
    if (isTransferSuccess) {
      setSuccess(`Successfully sent ${watchedAmount} FXRP`);
      reset();
      refetchFxrpBalance();
    }
  }, [isTransferSuccess, watchedAmount, reset, refetchFxrpBalance]);

  const refreshBalances = async () => {
    try {
      refetchFxrpBalance();
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  };

  async function sendFXRP(data: SendFXRPFormData) {
    setError(null);
    setSuccess(null);

    try {
      if (!isConnected) {
        throw new Error('Please connect your wallet');
      }

      if (!settings) {
        throw new Error('AssetManager settings not loaded');
      }

      // Convert amount to wei using correct decimals
      const decimals = Number(settings.assetDecimals);
      const amountInWei = BigInt(Math.floor(parseFloat(data.amount) * Math.pow(10, decimals)));

      // Call the transfer function using wagmi
      transferContract({
        address: settings.fAsset as `0x${string}`,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [data.recipientAddress as `0x${string}`, amountInWei],
      });

    } catch (error) {
      console.error('Error sending FXRP:', error);
      setError(error instanceof Error ? error.message : 'Failed to send FXRP');
    }
  }

  const isProcessing = isTransferPending || isConfirming;

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <Send className="h-5 w-5 text-amber-600" />
            Send FXRP on Flare Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-amber-700 mb-6">
            Transfer FXRP tokens to another Flare address.
          </p>

          {/* Balance Overview */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <Coins className="h-5 w-5 text-amber-600" />
                FXRP Balance
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-lg bg-amber-100 text-amber-800">
                    {fxrpBalance} FXRP
                  </Badge>
                </div>
                <Button 
                  onClick={refreshBalances}
                  variant="outline"
                  size="sm"
                  className="border-amber-300 hover:bg-amber-100 cursor-pointer"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Balance
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Send FXRP Section */}
          <form onSubmit={handleSubmit(sendFXRP)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="recipientAddress" className="text-amber-900">Recipient Flare Address</Label>
                <Input
                  {...register('recipientAddress')}
                  type="text"
                  placeholder="0x..."
                  className="border-amber-300 focus:ring-amber-500 focus:border-amber-500"
                />
                {errors.recipientAddress && (
                  <p className="text-sm text-destructive">{errors.recipientAddress.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-amber-900">Amount (FXRP)</Label>
                <Input
                  {...register('amount')}
                  type="number"
                  placeholder="0.0"
                  step="0.000001"
                  className="border-amber-300 focus:ring-amber-500 focus:border-amber-500"
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>
            </div>

            <Button
              type="submit"
              disabled={isProcessing || !isConnected || isLoadingSettings}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isTransferPending ? 'Confirming...' : isConfirming ? 'Processing...' : 'Processing...'}
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send FXRP
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
              <Alert className="bg-amber-50 border-amber-200 text-amber-800">
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 