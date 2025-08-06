'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Client } from 'xrpl';
import { FXRPContract } from '@/utils/fxrpContract';
import { AssetManagerContract } from '@/utils/assetManagerContract';
import { z } from 'zod';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface SendFXRPState {
  recipientAddress: string;
  amount: string;
  isProcessing: boolean;
  error: string | null;
  success: string | null;
}

export default function SendFXRP() {
  const [sendFXRPState, setSendFXRPState] = useState<SendFXRPState>({
    recipientAddress: '',
    amount: '',
    isProcessing: false,
    error: null,
    success: null
  });

  const [flareBalance, setFlareBalance] = useState<string>('0');
  const [fxrpBalance, setFxrpBalance] = useState<string>('0');
  const [flareProvider, setFlareProvider] = useState<ethers.BrowserProvider | null>(null);
  const [xrplClient, setXrplClient] = useState<Client | null>(null);
  const [fxrpContract, setFxrpContract] = useState<FXRPContract | null>(null);
  const [assetManagerContract, setAssetManagerContract] = useState<AssetManagerContract | null>(null);

  // Validation schemas
  const flareAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Flare address format');
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
        const fxrpContractInstance = await FXRPContract.create(provider, signer);
        const assetManagerContractInstance = await AssetManagerContract.create(provider, signer);

        setFxrpContract(fxrpContractInstance);
        setAssetManagerContract(assetManagerContractInstance);

        // Initial balance refresh
        await refreshBalances();
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
      if (flareProvider) {
        const signer = await flareProvider.getSigner();
        const address = await signer.getAddress();
        if (address) {
          const flareBalance = await flareProvider.getBalance(address);
          setFlareBalance(ethers.formatEther(flareBalance));
          
          const fxrpBalance = await fxrpContract?.getBalance(address);
          setFxrpBalance(fxrpBalance || '0');
        }
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
    }
  };

  const handleSendFXRPInputChange = (field: keyof SendFXRPState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSendFXRPState(prev => ({ ...prev, [field]: e.target.value }));
  };

  const validateSendFXRPInputs = (): boolean => {
    try {
      flareAddressSchema.parse(sendFXRPState.recipientAddress);
      amountSchema.parse(sendFXRPState.amount);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errorMessage = error.errors.map(err => err.message).join(', ');
        setSendFXRPState(prev => ({ ...prev, error: errorMessage }));
      }
      return false;
    }
  };

  const sendFXRP = async () => {
    if (!validateSendFXRPInputs()) return;
    setSendFXRPState(prev => ({ ...prev, isProcessing: true, error: null, success: null }));
    try {
      if (!fxrpContract) { throw new Error('FXRP contract not initialized'); }

      const amountInWei = ethers.parseUnits(sendFXRPState.amount, 6); // FXRP has 6 decimals
      const tx = await fxrpContract.transfer(sendFXRPState.recipientAddress, amountInWei);
      await tx.wait();
      
      setSendFXRPState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        success: `Successfully sent ${sendFXRPState.amount} FXRP to ${sendFXRPState.recipientAddress}` 
      }));
      await refreshBalances();
    } catch (error) {
      console.error('Error sending FXRP:', error);
      setSendFXRPState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Failed to send FXRP' 
      }));
    }
  };

  const mintFXRP = async () => {
    if (!validateSendFXRPInputs()) return;
    setSendFXRPState(prev => ({ ...prev, isProcessing: true, error: null, success: null }));
    try {
      if (!assetManagerContract) { throw new Error('AssetManager contract not initialized'); }

      const settings = await assetManagerContract.getSettings();
      const assetMintingGranularityUBA = settings.assetMintingGranularityUBA;
      const lotSizeAMG = settings.lotSizeAMG;

      console.log('assetMintingGranularityUBA (mint):', assetMintingGranularityUBA);
      console.log('assetMintingGranularityUBA type (mint):', typeof assetMintingGranularityUBA);
      console.log('lotSizeAMG (mint):', lotSizeAMG);
      console.log('lotSizeAMG type (mint):', typeof lotSizeAMG);

      const xrpInDrops = parseFloat(sendFXRPState.amount) * 1000000; // Convert XRP to drops
      console.log('xrpInDrops (mint):', xrpInDrops);

      const lotSize = typeof lotSizeAMG === 'bigint'
        ? Number(lotSizeAMG)
        : parseFloat(lotSizeAMG.toString());

      console.log('lotSize (mint):', lotSize);
      const lots = Math.floor(xrpInDrops / lotSize);

      console.log('lots (mint):', lots);

      if (lots <= 0) { throw new Error('Amount too small to mint. Minimum amount required.'); }

      const executor = "0x0000000000000000000000000000000000000000"; // Use zero address
      const agentVault = "0x0000000000000000000000000000000000000000"; // Placeholder
      const maxMintingFeeBIPS = "1000"; // 10% fee in basis points

      const tx = await assetManagerContract.reserveCollateral(
        agentVault,
        lots.toString(),
        maxMintingFeeBIPS,
        executor
      );
      await tx.wait();
      
      setSendFXRPState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        success: `Successfully initiated minting process for ${sendFXRPState.amount} XRP (${lots} lots)` 
      }));
      await refreshBalances();
    } catch (error) {
      console.error('Error minting FXRP:', error);
      setSendFXRPState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Failed to mint FXRP' 
      }));
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Send FXRP on Flare Network
        </h2>
        
        <p className="text-gray-600 mb-6">
          Transfer FXRP tokens to another Flare address or mint new FXRP tokens from XRP.
        </p>

        {/* Balance Overview */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-purple-50 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900">FXRP Balance</h4>
              <p className="text-2xl font-bold text-purple-600">{fxrpBalance} FXRP</p>
              <button 
                onClick={refreshBalances}
                className="text-sm text-purple-600 hover:text-purple-800 underline"
              >
                Refresh Balance
              </button>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900">Flare Network</h4>
              <p className="text-2xl font-bold text-blue-600">{flareBalance} FLR</p>
              <button 
                onClick={refreshBalances}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Refresh Balance
              </button>
            </div>
          </div>
        </div>

        {/* Send FXRP Section */}
        <div className="mb-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-xl font-semibold text-blue-900 mb-4">Send FXRP Operations</h3>
          <p className="text-blue-700 mb-4">
            Transfer FXRP tokens to another Flare address or mint new FXRP tokens from XRP.
          </p>
          
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Flare Address
              </label>
              <input
                type="text"
                value={sendFXRPState.recipientAddress}
                onChange={handleSendFXRPInputChange('recipientAddress')}
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (FXRP)
              </label>
              <input
                type="number"
                value={sendFXRPState.amount}
                onChange={handleSendFXRPInputChange('amount')}
                placeholder="0.0"
                step="0.000001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <button
              onClick={sendFXRP}
              disabled={sendFXRPState.isProcessing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {sendFXRPState.isProcessing ? 'Processing...' : 'Send FXRP'}
            </button>
            
            <button
              onClick={mintFXRP}
              disabled={sendFXRPState.isProcessing}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {sendFXRPState.isProcessing ? 'Processing...' : 'Mint FXRP'}
            </button>
          </div>

          {sendFXRPState.error && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {sendFXRPState.error}
            </div>
          )}

          {sendFXRPState.success && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {sendFXRPState.success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 