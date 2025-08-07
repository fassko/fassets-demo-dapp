'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AssetManagerContract } from '@/utils/truffleAssetManagerContract';
import { FXRPContract } from '@/utils/fxrpContract';
import { SendFXRPFormDataSchema, SendFXRPFormData } from '@/types/sendFXRPFormData';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Send, RefreshCw, Loader2 } from "lucide-react";

export default function SendFXRP() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [fxrpBalance, setFxrpBalance] = useState<string>('0');
  const [flareProvider, setFlareProvider] = useState<ethers.BrowserProvider | null>(null);
  const [fxrpContract, setFxrpContract] = useState<FXRPContract | null>(null);
  const [assetManagerContract, setAssetManagerContract] = useState<AssetManagerContract | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<SendFXRPFormData>({
    resolver: zodResolver(SendFXRPFormDataSchema),
    defaultValues: {
      recipientAddress: '',
      amount: ''
    }
  });

  const refreshBalances = useCallback(async () => {
    try {
      if (flareProvider) {
        const signer = await flareProvider.getSigner();
        const address = await signer.getAddress();
        if (address) {
          const fxrpBalance = await fxrpContract?.getBalance(address);
          setFxrpBalance(fxrpBalance || '0');
        }
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  }, [flareProvider, fxrpContract]);

  const initializeConnections = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        setFlareProvider(provider);

        const signer = await provider.getSigner();
        const fxrpContractInstance = await FXRPContract.create(provider, signer);
        const assetManagerContractInstance = await AssetManagerContract.create(provider, signer);

        setFxrpContract(fxrpContractInstance);
        setAssetManagerContract(assetManagerContractInstance);

        await refreshBalances();
      }
    } catch (error) {
      console.error('Error initializing connections:', error);
    }
  }, [refreshBalances]);

  useEffect(() => {
    initializeConnections();
  }, [initializeConnections]);

  // Refresh balances when contracts are initialized
  useEffect(() => {
    if (fxrpContract && assetManagerContract) {
      refreshBalances();
    }
  }, [fxrpContract, assetManagerContract, refreshBalances]);

  async function sendFXRP(data: SendFXRPFormData) {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      if (!fxrpContract) { throw new Error('FXRP contract not initialized'); }

      await fxrpContract.transfer(data.recipientAddress, data.amount);
      
      setSuccess(`Successfully sent ${data.amount} FXRP to ${data.recipientAddress}`);
      reset();
      await refreshBalances();
    } catch (error) {
      console.error('Error sending FXRP:', error);
      setError(error instanceof Error ? error.message : 'Failed to send FXRP');
    } finally {
      setIsProcessing(false);
    }
  }

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
                  className="border-amber-300 hover:bg-amber-100"
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
              disabled={isProcessing}
              className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send FXRP
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
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