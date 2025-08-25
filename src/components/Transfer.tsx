'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { erc20Abi } from 'viem';

// Form data schema
import {
  SendFXRPFormDataSchema,
  SendFXRPFormData,
} from '@/types/sendFXRPFormData';

// Hooks and contract functions
import { useAssetManager } from '@/hooks/useAssetManager';
import { useFXRPBalance } from '@/hooks/useFXRPBalance';

// UI components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Send, Loader2 } from 'lucide-react';
import { FXRPBalanceCard } from '@/components/ui/fxrp-balance-card';

export default function Transfer() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    settings,
    isLoading: isLoadingSettings,
    error: assetManagerError,
  } = useAssetManager();
  const { fxrpBalance, refetchFxrpBalance, balanceError, isConnected } =
    useFXRPBalance();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<SendFXRPFormData>({
    resolver: zodResolver(SendFXRPFormDataSchema),
    defaultValues: {
      recipientAddress: '',
      amount: '',
    },
  });

  const watchedAmount = watch('amount');

  // Write contract for transfer function
  const {
    data: transferHash,
    writeContract: transferContract,
    isPending: isTransferPending,
    error: writeError,
  } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess: isTransferSuccess } =
    useWaitForTransactionReceipt({
      hash: transferHash,
    });

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

  async function transferFXRP(data: SendFXRPFormData) {
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
      const amountInWei = BigInt(
        Math.floor(parseFloat(data.amount) * Math.pow(10, decimals))
      );

      // Call the transfer function using wagmi
      transferContract({
        address: settings.fAsset as `0x${string}`,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [data.recipientAddress as `0x${string}`, amountInWei],
      });
    } catch (error) {
      console.error('Error transferring FXRP:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to transfer FXRP'
      );
    }
  }

  const isProcessing = isTransferPending || isConfirming;

  return (
    <div className='w-full max-w-4xl mx-auto p-6'>
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2 text-cyan-900'>
            <Send className='h-5 w-5 text-cyan-600' />
            Transfer FXRP
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className='text-cyan-700 mb-6'>
            Transfer FXRP tokens to another address.
          </p>

          {/* Balance Overview */}
          <div className='mb-6'>
            <FXRPBalanceCard
              balance={fxrpBalance}
              onRefresh={refreshBalances}
              colorScheme={{
                title: 'text-cyan-900',
                icon: 'text-cyan-600',
                badge: 'bg-cyan-100 text-cyan-800',
                button: 'border-cyan-300 hover:bg-cyan-100',
                description: 'text-cyan-600',
              }}
            />
          </div>

          {/* Transfer FXRP Section */}
          <form onSubmit={handleSubmit(transferFXRP)} className='space-y-6'>
            <div className='space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='recipientAddress' className='text-cyan-900'>
                  Recipient Address
                </Label>
                <Input
                  {...register('recipientAddress')}
                  type='text'
                  placeholder='0x...'
                  className='border-cyan-300 focus:ring-cyan-500 focus:border-cyan-500'
                />
                {errors.recipientAddress && (
                  <p className='text-sm text-destructive'>
                    {errors.recipientAddress.message}
                  </p>
                )}
              </div>

              <div className='space-y-2'>
                <Label htmlFor='amount' className='text-cyan-900'>
                  Amount (FXRP)
                </Label>
                <Input
                  {...register('amount')}
                  type='number'
                  placeholder='0.0'
                  step='0.000001'
                  className='border-cyan-300 focus:ring-cyan-500 focus:border-cyan-500'
                />
                {errors.amount && (
                  <p className='text-sm text-destructive'>
                    {errors.amount.message}
                  </p>
                )}
              </div>
            </div>

            <Button
              type='submit'
              disabled={isProcessing || !isConnected || isLoadingSettings}
              className='w-full bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-400 cursor-pointer'
            >
              {isProcessing ? (
                <>
                  <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                  {isTransferPending
                    ? 'Confirming...'
                    : isConfirming
                      ? 'Processing...'
                      : 'Processing...'}
                </>
              ) : (
                <>
                  <Send className='mr-2 h-4 w-4' />
                  Transfer FXRP
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
              <Alert className='bg-cyan-50 border-cyan-200 text-cyan-800'>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
