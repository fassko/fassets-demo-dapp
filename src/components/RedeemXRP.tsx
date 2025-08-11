'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { Client } from 'xrpl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AssetManagerContract } from '@/utils/truffleAssetManagerContract';
import { FXRPContract } from '@/utils/fxrpContract';
import { RedeemXRPFormDataSchema, RedeemXRPFormData } from '@/types/redeemXRPFormData';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, RefreshCw, Loader2, Wallet, Coins } from "lucide-react";

export default function RedeemXRP() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [xrplBalance, setXrplBalance] = useState<string>('0');
  const [fxrpBalance, setFxrpBalance] = useState<string>('0');
  const [xrplAddress, setXrplAddress] = useState<string>('');
  const [userAddress, setUserAddress] = useState<string>('');
  const [xrplClient, setXrplClient] = useState<Client | null>(null);
  const [assetManagerContract, setAssetManagerContract] = useState<AssetManagerContract | null>(null);
  const [fxrpContract, setFxrpContract] = useState<FXRPContract | null>(null);
  const [calculatedLots, setCalculatedLots] = useState<string>('0');

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

  // Calculate lots when amount changes
  useEffect(() => {
    const calculateLots = async () => {
      if (assetManagerContract && watchedAmount) {
        try {
          const settings = await assetManagerContract.getSettings();
          const lotSizeAMG = settings.lotSizeAMG;

          const xrpInDrops = parseFloat(watchedAmount) * 1000000; // Convert XRP to drops
          const lotSize = typeof lotSizeAMG === 'bigint'
            ? Number(lotSizeAMG)
            : parseFloat(lotSizeAMG.toString());

          const lots = Math.floor(xrpInDrops / lotSize);
          setCalculatedLots(lots.toString());
        } catch (error) {
          console.error('Error calculating lots:', error);
          setCalculatedLots('0');
        }
      }
    };

    calculateLots();
  }, [assetManagerContract, watchedAmount]);

  const initializeConnections = async () => {
    try {
      // Initialize Flare connection
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);

        const signer = await provider.getSigner();
        const userAddress = await signer.getAddress();
        setUserAddress(userAddress);
        
        const assetManagerContractInstance = await AssetManagerContract.create(provider, signer);
        setAssetManagerContract(assetManagerContractInstance);
        
        const fxrpContractInstance = await FXRPContract.create(provider, signer);
        setFxrpContract(fxrpContractInstance);
      }

      // Initialize XRPL connection
      const client = new Client('wss://s.altnet.rippletest.net:51233');
      await client.connect();
      setXrplClient(client);
    } catch (error) {
      console.error('Error initializing connections:', error);
    }
  };

  const refreshBalances = useCallback(async () => {
    try {
      // Refresh XRPL balance
      if (xrplClient && xrplAddress) {
        try {
          // Get account info from XRPL
          const accountInfo = await xrplClient.request({
            command: 'account_info',
            account: xrplAddress,
            ledger_index: 'validated'
          });
          
          // Convert balance from drops to XRP
          const balanceInDrops = accountInfo.result.account_data.Balance;
          const balanceInXRP = parseFloat(balanceInDrops) / 1000000; // 1 XRP = 1,000,000 drops
          setXrplBalance(balanceInXRP.toString());
        } catch (error) {
          console.error('Error fetching XRPL balance:', error);
          setXrplBalance('0');
        }
      }
      
      // Refresh FXRP balance
      if (fxrpContract && userAddress) {
        try {
          const balance = await fxrpContract.getBalance(userAddress);
          setFxrpBalance(balance);
        } catch (error) {
          console.error('Error fetching FXRP balance:', error);
          setFxrpBalance('0');
        }
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  }, [xrplClient, xrplAddress, fxrpContract, userAddress]);

  // Refresh XRPL balance when client and address are available
  useEffect(() => {
    if (xrplClient && xrplAddress && xrplAddress.startsWith('r') && xrplAddress.length >= 25) {
      refreshBalances();
    }
  }, [xrplClient, xrplAddress, refreshBalances]);

  // Refresh balances when contracts are initialized
  useEffect(() => {
    if (assetManagerContract && fxrpContract && userAddress) {
      refreshBalances();
    }
  }, [assetManagerContract, fxrpContract, userAddress, refreshBalances]);

  useEffect(() => {
    initializeConnections();
  }, []);

  const isValidXrplAddress = (address: string): boolean => {
    try {
      RedeemXRPFormDataSchema.pick({ xrplAddress: true }).parse({ xrplAddress: address });
      console.log('Valid XRPL address:', address);
      return true;
    } catch {
      console.log('Invalid XRPL address:', address);
      return false;
    }
  };

  const handleXrplAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    
    // Validate XRPL address format and auto-fetch balance when valid
    const isValid = isValidXrplAddress(address);
    
    if (isValid) {
      console.log('Valid XRPL address:', address);
      setXrplAddress(address);
      
      // Refresh balances only if address is valid and client exists
      if (xrplClient) {
        refreshBalances();
      }
    } else {
      // Invalid XRPL address: still update state for UI feedback, but skip refresh
      console.warn("Invalid XRPL address:", address);
      setXrplAddress(address);
    }
  };

  const redeemToXRP = async (data: RedeemXRPFormData) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      if (!assetManagerContract) { throw new Error('AssetManager contract not initialized'); }

      const settings = await assetManagerContract.getSettings();
      const assetMintingGranularityUBA = settings.assetMintingGranularityUBA;
      const lotSizeAMG = settings.lotSizeAMG;

      console.log('assetMintingGranularityUBA:', assetMintingGranularityUBA);
      console.log('assetMintingGranularityUBA type:', typeof assetMintingGranularityUBA);
      console.log('lotSizeAMG:', lotSizeAMG);
      console.log('lotSizeAMG type:', typeof lotSizeAMG);

      const xrpInDrops = parseFloat(data.amount) * 1000000; // Convert XRP to drops
      console.log('xrpInDrops:', xrpInDrops);

      const lotSize = typeof lotSizeAMG === 'bigint'
        ? Number(lotSizeAMG)
        : parseFloat(lotSizeAMG.toString());

      console.log('lotSize:', lotSize);
      const lots = Math.floor(xrpInDrops / lotSize);

      console.log('lots', lots);

      if (lots <= 0) { throw new Error('Amount too small to redeem. Minimum amount required.'); }

      const executor = "0x0000000000000000000000000000000000000000"; // Use zero address

      await assetManagerContract.redeem(
        lots.toString(),
        data.xrplAddress,
        executor
      );
      
      setSuccess(`Successfully redeemed ${data.amount} XRP (${lots} lots) to ${data.xrplAddress}`);
      reset();
    } catch (error) {
      console.error('Error redeeming to XRP:', error);
      setError(error instanceof Error ? error.message : 'Failed to redeem to XRP');
    } finally {
      setIsProcessing(false);
    }
  };

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
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ArrowRight className="mr-2 h-4 w-4" />
                  Redeem to XRP
                </>
              )}
            </Button>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
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