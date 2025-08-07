'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AssetManagerContract } from '@/utils/truffleAssetManagerContract';
import { FXRPContract } from '@/utils/fxrpContract';
import { SendFXRPFormDataSchema, SendFXRPFormData } from '@/types/sendFXRPFormData';

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

  useEffect(() => {
    initializeConnections();
  }, []);

  // Refresh balances when contracts are initialized
  useEffect(() => {
    if (fxrpContract && assetManagerContract) {
      refreshBalances();
    }
  }, [fxrpContract, assetManagerContract]);

  async function initializeConnections() {
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
  }

  async function refreshBalances() {
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
  }

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
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Send FXRP on Flare Network
        </h2>
        
        <p className="text-gray-600 mb-6">
          Transfer FXRP tokens to another Flare address.
        </p>

        {/* Balance Overview */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-2xl font-bold text-blue-600">{fxrpBalance} FXRP</p>
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
        <form onSubmit={handleSubmit(sendFXRP)} className="mb-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-xl font-semibold text-blue-900 mb-4">Send FXRP</h3>
          <p className="text-blue-700 mb-4">
            Transfer FXRP tokens to another Flare address.
          </p>
          
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Flare Address
              </label>
              <input
                {...register('recipientAddress')}
                type="text"
                placeholder="0x..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.recipientAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.recipientAddress.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (FXRP)
              </label>
              <input
                {...register('amount')}
                type="number"
                placeholder="0.0"
                step="0.000001"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isProcessing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              {isProcessing ? 'Processing...' : 'Send FXRP'}
            </button>
          </div>

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