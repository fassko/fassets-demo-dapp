'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Client, Wallet, xrpToDrops } from 'xrpl';
import { FXRPContract } from '@/utils/fxrpContract';
import { AssetManagerContract } from '@/utils/assetManagerContract';

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface PaymentState {
  flareAddress: string;
  xrplAddress: string;
  amount: string;
  isProcessing: boolean;
  error: string | null;
  success: string | null;
}

export default function CrossChainPaymentPortal() {
  const [paymentState, setPaymentState] = useState<PaymentState>({
    flareAddress: '',
    xrplAddress: '',
    amount: '',
    isProcessing: false,
    error: null,
    success: null
  });

  const [flareBalance, setFlareBalance] = useState<string>('0');
  const [fxrpBalance, setFxrpBalance] = useState<string>('0');
  const [xrplBalance, setXrplBalance] = useState<string>('0');
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

  const handleInputChange = (field: keyof PaymentState) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setPaymentState(prev => ({
      ...prev,
      [field]: e.target.value,
      error: null,
      success: null
    }));
  };

  const validateInputs = (): boolean => {
    if (!paymentState.flareAddress || !paymentState.xrplAddress || !paymentState.amount) {
      setPaymentState(prev => ({ ...prev, error: 'All fields are required' }));
      return false;
    }

    if (!ethers.isAddress(paymentState.flareAddress)) {
      setPaymentState(prev => ({ ...prev, error: 'Invalid Flare address' }));
      return false;
    }

    if (parseFloat(paymentState.amount) <= 0) {
      setPaymentState(prev => ({ ...prev, error: 'Amount must be greater than 0' }));
      return false;
    }

    return true;
  };

  const sendFXRP = async () => {
    if (!validateInputs()) return;

    setPaymentState(prev => ({ ...prev, isProcessing: true, error: null, success: null }));

    try {
      if (!fxrpContract) {
        throw new Error('FXRP contract not initialized');
      }

      // Send FXRP
      const tx = await fxrpContract.transfer(paymentState.flareAddress, paymentState.amount);
      await tx.wait();

      setPaymentState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        success: `Successfully sent ${paymentState.amount} FXRP to ${paymentState.flareAddress}` 
      }));

      // Refresh balances
      await refreshBalances();

    } catch (error) {
      console.error('Error sending FXRP:', error);
      setPaymentState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Failed to send FXRP' 
      }));
    }
  };

  const redeemToXRP = async () => {
    if (!validateInputs()) return;

    setPaymentState(prev => ({ ...prev, isProcessing: true, error: null, success: null }));

    try {
      if (!assetManagerContract) {
        throw new Error('AssetManager contract not initialized');
      }

      // Call the AssetManager's redeem function
      const tx = await assetManagerContract.redeem(paymentState.amount, paymentState.xrplAddress);
      await tx.wait();
      
      setPaymentState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        success: `Successfully redeemed ${paymentState.amount} FXRP to ${paymentState.xrplAddress}` 
      }));

      // Refresh balances
      await refreshBalances();

    } catch (error) {
      console.error('Error redeeming to XRP:', error);
      setPaymentState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Failed to redeem to XRP' 
      }));
    }
  };

  const mintFXRP = async () => {
    if (!validateInputs()) return;

    setPaymentState(prev => ({ ...prev, isProcessing: true, error: null, success: null }));

    try {
      if (!assetManagerContract) {
        throw new Error('AssetManager contract not initialized');
      }

      // Call the AssetManager's mint function
      const tx = await assetManagerContract.mint(paymentState.amount, paymentState.flareAddress);
      await tx.wait();
      
      setPaymentState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        success: `Successfully minted ${paymentState.amount} FXRP to ${paymentState.flareAddress}` 
      }));

      // Refresh balances
      await refreshBalances();

    } catch (error) {
      console.error('Error minting FXRP:', error);
      setPaymentState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Failed to mint FXRP' 
      }));
    }
  };

  const refreshBalances = async () => {
    try {
      if (flareProvider && fxrpContract) {
        const signer = await flareProvider.getSigner();
        const address = await signer.getAddress();
        
        const flareBalance = await flareProvider.getBalance(address);
        setFlareBalance(ethers.formatEther(flareBalance));
        
        const fxrpBalance = await fxrpContract.getBalance(address);
        setFxrpBalance(fxrpBalance);
      }

      if (xrplClient) {
        // Implement XRPL balance refresh
        // setXrplBalance('...');
      }
    } catch (error) {
      console.error('Error refreshing balances:', error);
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

        {/* Balance Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900">Flare Network</h3>
            <p className="text-2xl font-bold text-blue-600">{flareBalance} FLR</p>
            <button 
              onClick={refreshBalances}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Refresh Balance
            </button>
          </div>
          <div className="bg-purple-50 rounded-lg p-4">
            <h3 className="font-semibold text-purple-900">FXRP Balance</h3>
            <p className="text-2xl font-bold text-purple-600">{fxrpBalance} FXRP</p>
            <button 
              onClick={refreshBalances}
              className="text-sm text-purple-600 hover:text-purple-800 underline"
            >
              Refresh Balance
            </button>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-900">XRPL Network</h3>
            <p className="text-2xl font-bold text-green-600">{xrplBalance} XRP</p>
            <button 
              onClick={refreshBalances}
              className="text-sm text-green-600 hover:text-green-800 underline"
            >
              Refresh Balance
            </button>
          </div>
        </div>

        {/* Payment Form */}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient Flare Address
            </label>
            <input
              type="text"
              value={paymentState.flareAddress}
              onChange={handleInputChange('flareAddress')}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recipient XRPL Address
            </label>
            <input
              type="text"
              value={paymentState.xrplAddress}
              onChange={handleInputChange('xrplAddress')}
              placeholder="r..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (FXRP/XRP)
            </label>
            <input
              type="number"
              value={paymentState.amount}
              onChange={handleInputChange('amount')}
              placeholder="0.0"
              step="0.000001"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={sendFXRP}
            disabled={paymentState.isProcessing}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {paymentState.isProcessing ? 'Processing...' : 'Send FXRP on Flare'}
          </button>
          
          <button
            onClick={redeemToXRP}
            disabled={paymentState.isProcessing}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {paymentState.isProcessing ? 'Processing...' : 'Redeem to XRP on XRPL'}
          </button>
        </div>

        {/* Status Messages */}
        {paymentState.error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            <strong>Error:</strong> {paymentState.error}
          </div>
        )}

        {paymentState.success && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            <strong>Success:</strong> {paymentState.success}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">How it works:</h3>
          <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600">
            <li>Enter the recipient's Flare address and XRPL address</li>
            <li>Specify the amount of FXRP/XRP to send</li>
            <li>Click "Send FXRP on Flare" to send wrapped XRP on the Flare network</li>
            <li>Click "Redeem to XRP on XRPL" to convert FXRP back to native XRP</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 