'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Client } from 'xrpl';
import { AssetManagerContract } from '@/utils/assetManagerContract';
import { z } from 'zod';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface RedeemState {
  xrplAddress: string;
  amount: string;
  isProcessing: boolean;
  error: string | null;
  success: string | null;
}

export default function RedeemXRP() {
  const [redeemState, setRedeemState] = useState<RedeemState>({
    xrplAddress: '',
    amount: '',
    isProcessing: false,
    error: null,
    success: null
  });

  const [xrplBalance, setXrplBalance] = useState<string>('0');
  const [xrplAddress, setXrplAddress] = useState<string>('');
  const [flareProvider, setFlareProvider] = useState<ethers.BrowserProvider | null>(null);
  const [xrplClient, setXrplClient] = useState<Client | null>(null);
  const [assetManagerContract, setAssetManagerContract] = useState<AssetManagerContract | null>(null);

  // Validation schemas
  const xrplAddressSchema = z.string().regex(/^r[a-zA-Z0-9]{24,34}$/, 'Invalid XRPL address format');
  const amountSchema = z.string().refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Amount must be a positive number');

  useEffect(() => {
    initializeConnections();
  }, []);

  const initializeConnections = async () => {
    try {
      // Initialize Flare connection
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        setFlareProvider(provider);

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

  const handleRedeemInputChange = (field: keyof RedeemState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRedeemState(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleXrplAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setXrplAddress(address);
    
    // Auto-fetch balance when a valid XRPL address is entered
    if (address && address.startsWith('r') && address.length >= 25) {
      // Debounce the balance fetch
      setTimeout(() => {
        if (xrplClient && address === xrplAddress) {
          refreshBalances();
        }
      }, 1000);
    }
  };

  const validateRedeemInputs = (): boolean => {
    try {
      xrplAddressSchema.parse(redeemState.xrplAddress);
      amountSchema.parse(redeemState.amount);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(err => err.message).join(', ');
        setRedeemState(prev => ({ ...prev, error: errorMessage }));
      }
      return false;
    }
  };

  const redeemToXRP = async () => {
    if (!validateRedeemInputs()) return;
    setRedeemState(prev => ({ ...prev, isProcessing: true, error: null, success: null }));
    try {
      if (!assetManagerContract) { throw new Error('AssetManager contract not initialized'); }

      const settings = await assetManagerContract.getSettings();
      const assetMintingGranularityUBA = settings.assetMintingGranularityUBA;
      const lotSizeAMG = settings.lotSizeAMG;

      console.log('assetMintingGranularityUBA:', assetMintingGranularityUBA);
      console.log('assetMintingGranularityUBA type:', typeof assetMintingGranularityUBA);
      console.log('lotSizeAMG:', lotSizeAMG);
      console.log('lotSizeAMG type:', typeof lotSizeAMG);

      const xrpInDrops = parseFloat(redeemState.amount) * 1000000; // Convert XRP to drops
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
        redeemState.xrplAddress,
        executor
      );
      await tx.wait();
      setRedeemState(prev => ({
        ...prev,
        isProcessing: false,
        success: `Successfully redeemed ${redeemState.amount} XRP (${lots} lots) to ${redeemState.xrplAddress}`
      }));
    } catch (error) {
      console.error('Error redeeming to XRP:', error);
      setRedeemState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Failed to redeem to XRP' 
      }));
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
            <p className="text-2xl font-bold text-green-600">{xrplBalance} XRP</p>
            <button 
              onClick={refreshBalances}
              className="text-sm text-green-600 hover:text-green-800 underline"
            >
              Refresh Balance
            </button>
          </div>
        </div>

        {/* Redeem to XRP Section */}
        <div className="mb-8 p-6 bg-green-50 rounded-lg">
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
                type="text"
                value={redeemState.xrplAddress}
                onChange={handleRedeemInputChange('xrplAddress')}
                placeholder="rXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (XRP)
              </label>
              <input
                type="number"
                value={redeemState.amount}
                onChange={handleRedeemInputChange('amount')}
                placeholder="0.0"
                step="0.000001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Amount will be converted to lots based on Asset Manager settings
              </p>
            </div>
          </div>

          <button
            onClick={redeemToXRP}
            disabled={redeemState.isProcessing}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {redeemState.isProcessing ? 'Processing...' : 'Redeem to XRP'}
          </button>

          {redeemState.error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {redeemState.error}
            </div>
          )}

          {redeemState.success && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {redeemState.success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 