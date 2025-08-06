'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Client, Wallet, xrpToDrops } from 'xrpl';
import { z } from 'zod';
import { FXRPContract } from '@/utils/fxrpContract';
import { AssetManagerContract } from '@/utils/assetManagerContract';

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

// Zod schemas for form validation
const flareAddressSchema = z.string()
  .min(42, 'Flare address must be 42 characters')
  .max(42, 'Flare address must be 42 characters')
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Flare address format');

const xrplAddressSchema = z.string()
  .min(25, 'XRPL address must be at least 25 characters')
  .max(35, 'XRPL address must be at most 35 characters')
  .regex(/^r[a-zA-Z0-9]{24,34}$/, 'Invalid XRPL address format');

const amountSchema = z.string()
  .min(1, 'Amount is required')
  .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Amount must be a positive number'
  })
  .refine((val) => parseFloat(val) <= 1000000, {
    message: 'Amount cannot exceed 1,000,000'
  });

const sendFXRPSchema = z.object({
  recipientAddress: flareAddressSchema,
  amount: amountSchema
});

const redeemSchema = z.object({
  xrplAddress: xrplAddressSchema,
  amount: amountSchema
});

interface PaymentState {
  flareAddress: string;
  xrplAddress: string;
  amount: string;
  isProcessing: boolean;
  error: string | null;
  success: string | null;
}

interface SendFXRPState {
  recipientAddress: string;
  amount: string;
  isProcessing: boolean;
  error: string | null;
  success: string | null;
}

interface RedeemState {
  xrplAddress: string;
  amount: string;
  isProcessing: boolean;
  error: string | null;
  success: string | null;
}

export default function CrossChainPaymentPortal() {
  const [sendFXRPState, setSendFXRPState] = useState<SendFXRPState>({
    recipientAddress: '',
    amount: '',
    isProcessing: false,
    error: null,
    success: null
  });

  const [redeemState, setRedeemState] = useState<RedeemState>({
    xrplAddress: '',
    amount: '',
    isProcessing: false,
    error: null,
    success: null
  });

  const [flareBalance, setFlareBalance] = useState<string>('0');
  const [fxrpBalance, setFxrpBalance] = useState<string>('0');
  const [xrplBalance, setXrplBalance] = useState<string>('0');
  const [xrplAddress, setXrplAddress] = useState<string>('');
  const [flareProvider, setFlareProvider] = useState<ethers.BrowserProvider | null>(null);
  const [xrplClient, setXrplClient] = useState<Client | null>(null);
  const [fxrpContract, setFxrpContract] = useState<FXRPContract | null>(null);
  const [assetManagerContract, setAssetManagerContract] = useState<AssetManagerContract | null>(null);

  // Initialize connections
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
        
        // Get signer
        const signer = await provider.getSigner();
        
        // Initialize FXRP contract
        const fxrp = await FXRPContract.create(provider, signer);
        setFxrpContract(fxrp);
        
        // Initialize AssetManager contract
        const assetManager = await AssetManagerContract.create(provider, signer);
        setAssetManagerContract(assetManager);
        
        // Get balances
        const address = await signer.getAddress();
        const flareBalance = await provider.getBalance(address);
        setFlareBalance(ethers.formatEther(flareBalance));
        
        const fxrpBalance = await fxrp.getBalance(address);
        setFxrpBalance(fxrpBalance);
      }

      // Initialize XRPL connection
      const client = new Client('wss://s.altnet.rippletest.net:51233'); // Testnet
      await client.connect();
      setXrplClient(client);
      
      // Get XRPL balance (you'll need to implement this based on your wallet)
      // setXrplBalance('0');
    } catch (error) {
      console.error('Error initializing connections:', error);
    }
  };

  const handleSendFXRPInputChange = (field: keyof SendFXRPState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setSendFXRPState(prev => ({
      ...prev,
      [field]: e.target.value,
      error: null,
      success: null
    }));
  };

  const handleRedeemInputChange = (field: keyof RedeemState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRedeemState(prev => ({
      ...prev,
      [field]: e.target.value,
      error: null,
      success: null
    }));
  };

  const validateSendFXRPInputs = (): boolean => {
    if (!flareProvider) {
      setSendFXRPState(prev => ({ ...prev, error: 'Flare connection not initialized' }));
      return false;
    }

    try {
      sendFXRPSchema.parse({
        recipientAddress: sendFXRPState.recipientAddress,
        amount: sendFXRPState.amount
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        setSendFXRPState(prev => ({ ...prev, error: firstError.message }));
      } else {
        setSendFXRPState(prev => ({ ...prev, error: 'Validation failed' }));
      }
      return false;
    }
  };

  const validateRedeemInputs = (): boolean => {
    if (!flareProvider) {
      setRedeemState(prev => ({ ...prev, error: 'Flare connection not initialized' }));
      return false;
    }

    try {
      redeemSchema.parse({
        xrplAddress: redeemState.xrplAddress,
        amount: redeemState.amount
      });
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        setRedeemState(prev => ({ ...prev, error: firstError.message }));
      } else {
        setRedeemState(prev => ({ ...prev, error: 'Validation failed' }));
      }
      return false;
    }
  };

  const sendFXRP = async () => {
    if (!validateSendFXRPInputs()) return;

    setSendFXRPState(prev => ({ ...prev, isProcessing: true, error: null, success: null }));

    try {
      if (!fxrpContract) {
        throw new Error('FXRP contract not initialized');
      }

      // Send FXRP
      const tx = await fxrpContract.transfer(sendFXRPState.recipientAddress, sendFXRPState.amount);
      await tx.wait();

      setSendFXRPState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        success: `Successfully sent ${sendFXRPState.amount} FXRP to ${sendFXRPState.recipientAddress}` 
      }));

      // Refresh balances
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

  const redeemToXRP = async () => {
    if (!validateRedeemInputs()) return;

    setRedeemState(prev => ({ ...prev, isProcessing: true, error: null, success: null }));

    try {
      if (!assetManagerContract) {
        throw new Error('AssetManager contract not initialized');
      }

      // Get settings to convert XRP to lots
      const settings = await assetManagerContract.getSettings();
      const assetMintingGranularityUBA = settings.assetMintingGranularityUBA;
      const lotSizeAMG = settings.lotSizeAMG;
      
      console.log('assetMintingGranularityUBA:', assetMintingGranularityUBA);
      console.log('assetMintingGranularityUBA type:', typeof assetMintingGranularityUBA);
      console.log('lotSizeAMG:', lotSizeAMG);
      console.log('lotSizeAMG type:', typeof lotSizeAMG);
      
      // Convert XRP amount to lots
      // 1 XRP = 1,000,000 drops (6 decimals)
      // lotSizeAMG is the size of one lot in Asset Minting Granularity units
      const xrpInDrops = parseFloat(redeemState.amount) * 1000000; // Convert XRP to drops
      console.log('xrpInDrops:', xrpInDrops);
      
      // Convert lotSizeAMG to number if it's a BigInt
      const lotSize = typeof lotSizeAMG === 'bigint' 
        ? Number(lotSizeAMG) 
        : parseFloat(lotSizeAMG.toString());
      
      console.log('lotSize:', lotSize);
      const lots = Math.floor(xrpInDrops / lotSize);
      
      console.log('lots', lots);
      
      if (lots <= 0) {
        throw new Error('Amount too small to redeem. Minimum amount required.');
      }

      // Use zero address as executor
      const executor = "0x0000000000000000000000000000000000000000";

      // Call the AssetManager's redeem function with lots instead of XRP amount
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

      // Refresh balances
      await refreshBalances();

    } catch (error) {
      console.error('Error redeeming to XRP:', error);
      setRedeemState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Failed to redeem to XRP' 
      }));
    }
  };

  const mintFXRP = async () => {
    if (!validateSendFXRPInputs()) return;

    setSendFXRPState(prev => ({ ...prev, isProcessing: true, error: null, success: null }));

    try {
      if (!assetManagerContract) {
        throw new Error('AssetManager contract not initialized');
      }

      // Get settings to convert XRP to lots
      const settings = await assetManagerContract.getSettings();
      const assetMintingGranularityUBA = settings.assetMintingGranularityUBA;
      const lotSizeAMG = settings.lotSizeAMG;
      
      console.log('assetMintingGranularityUBA (mint):', assetMintingGranularityUBA);
      console.log('assetMintingGranularityUBA type (mint):', typeof assetMintingGranularityUBA);
      console.log('lotSizeAMG (mint):', lotSizeAMG);
      console.log('lotSizeAMG type (mint):', typeof lotSizeAMG);
      
      // Convert XRP amount to lots
      // 1 XRP = 1,000,000 drops (6 decimals)
      // lotSizeAMG is the size of one lot in Asset Minting Granularity units
      const xrpInDrops = parseFloat(sendFXRPState.amount) * 1000000; // Convert XRP to drops
      console.log('xrpInDrops (mint):', xrpInDrops);
      
      // Convert lotSizeAMG to number if it's a BigInt
      const lotSize = typeof lotSizeAMG === 'bigint' 
        ? Number(lotSizeAMG) 
        : parseFloat(lotSizeAMG.toString());
      
      console.log('lotSize (mint):', lotSize);
      const lots = Math.floor(xrpInDrops / lotSize);
      
      console.log('lots (mint):', lots);
      
      if (lots <= 0) {
        throw new Error('Amount too small to mint. Minimum amount required.');
      }

      // Use zero address as executor
      const executor = "0x0000000000000000000000000000000000000000";

      // For demo purposes, we'll use a placeholder agent vault address
      // In a real implementation, you would get this from getAvailableAgents()
      const agentVault = "0x0000000000000000000000000000000000000000"; // Placeholder
      const maxMintingFeeBIPS = "1000"; // 10% fee in basis points

      // Call the AssetManager's reserveCollateral function with lots instead of XRP amount
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

      // Refresh balances
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

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Cross-Chain Payment Portal
        </h2>
        
        <p className="text-gray-600 mb-6">
          Send FXRP (wrapped XRP) on Flare to another address, then redeem it back to native XRP on XRPL
        </p>

        {/* Balance Overview */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <h3 className="text-xl font-semibold text-blue-900 mb-4">Send FXRP on Flare Network</h3>
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

        {/* Redeem to XRP Section */}
        <div className="mb-8 p-6 bg-green-50 rounded-lg">
          <h3 className="text-xl font-semibold text-green-900 mb-4">Redeem FXRP to XRP on XRPL</h3>
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

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            <li>Use "Send FXRP" to transfer FXRP to another Flare address</li>
            <li>Use "Mint FXRP" to initiate the minting process (reserves collateral)</li>
            <li>Use "Redeem to XRP" to convert FXRP back to native XRP on XRPL</li>
            <li>Amounts are automatically converted to lots (Asset Minting Granularity units)</li>
            <li>This demo uses Truffle TypeChain types for type safety with ethers.js for contract interactions</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 