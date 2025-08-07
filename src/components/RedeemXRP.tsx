'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Client } from 'xrpl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AssetManagerContract } from '@/utils/truffleAssetManagerContract';
import { RedeemXRPFormDataSchema, RedeemXRPFormData } from '@/types/redeemXRPFormData';

export default function RedeemXRP() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [xrplBalance, setXrplBalance] = useState<string>('0');
  const [xrplAddress, setXrplAddress] = useState<string>('');
  const [xrplClient, setXrplClient] = useState<Client | null>(null);
  const [assetManagerContract, setAssetManagerContract] = useState<AssetManagerContract | null>(null);
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

  useEffect(() => {
    initializeConnections();
  }, []);

  // Refresh XRPL balance when client and address are available
  useEffect(() => {
    if (xrplClient && xrplAddress && xrplAddress.startsWith('r') && xrplAddress.length >= 25) {
      refreshBalances();
    }
  }, [xrplClient, xrplAddress]);

  // Refresh balances when contracts are initialized
  useEffect(() => {
    if (assetManagerContract) {
      // Could add additional balance refresh logic here if needed
    }
  }, [assetManagerContract]);

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
        const assetManagerContractInstance = await AssetManagerContract.create(provider, signer);
        setAssetManagerContract(assetManagerContractInstance);
      }

      // Initialize XRPL connection
      const client = new Client('wss://s.altnet.rippletest.net:51233');
      await client.connect();
      setXrplClient(client);
    } catch (error) {
      console.error('Error initializing connections:', error);
    }
  };

  const refreshBalances = async () => {
    try {
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
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  };

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

      const tx = await assetManagerContract.redeem(
        lots.toString(),
        data.xrplAddress,
        executor
      );
      await tx.wait();
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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Redeem FXRP to XRP on XRPL
        </h2>
        
        <p className="text-gray-600 mb-6">
          Convert your FXRP tokens back to native XRP on the XRP Ledger.
        </p>

        {/* XRPL Balance Overview */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">XRPL Balance Monitor</h3>
          <div className="bg-green-50 rounded-lg p-4">
            <h4 className="font-semibold text-green-900">XRPL Balance</h4>
            <div className="mb-2">
              <input
                type="text"
                value={xrplAddress}
                onChange={handleXrplAddressChange}
                placeholder="Enter XRPL address (r...)"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              />
            </div>
            <p className="text-2xl font-bold text-green-500">{xrplBalance} XRP</p>
            <button 
              onClick={refreshBalances}
              className="text-sm text-green-500 hover:text-green-700 underline"
            >
              Refresh Balance
            </button>
          </div>
        </div>

        {/* Redeem to XRP Section */}
        <form onSubmit={handleSubmit(redeemToXRP)} className="mb-8 p-6 bg-green-50 rounded-lg">
          <h3 className="text-xl font-semibold text-green-900 mb-4">Redeem FXRP to XRP</h3>
          <p className="text-green-700 mb-4">
            Convert your FXRP tokens back to native XRP on the XRP Ledger.
          </p>
          
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                XRPL Address (Destination)
              </label>
              <input
                {...register('xrplAddress')}
                type="text"
                placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {errors.xrplAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.xrplAddress.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (XRP)
              </label>
              <input
                {...register('amount')}
                type="number"
                placeholder="0.0"
                step="0.000001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Amount will be converted to lots based on Asset Manager settings
              </p>
              {watchedAmount && (
                <div className={`mt-2 p-2 rounded border ${
                  calculatedLots === '0' 
                    ? 'bg-red-100 border-red-200' 
                    : 'bg-green-100 border-green-200'
                }`}>
                  <p className={`text-sm ${
                    calculatedLots === '0' 
                      ? 'text-red-800' 
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

          <button
            type="submit"
            disabled={isProcessing}
            className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Redeem to XRP'}
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {success}
            </div>
          )}
        </form>
      </div>
    </div>
  );
} 