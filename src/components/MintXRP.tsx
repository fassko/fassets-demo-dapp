'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AssetManagerContract } from '@/utils/truffleAssetManagerContract';

// Zod schema for MintXRP form
const MintXRPFormDataSchema = z.object({
  agentVault: z.string()
    .min(1, 'Agent vault address is required'),
  lots: z.string()
    .min(1, 'Lots amount is required')
    .refine(val => !isNaN(parseFloat(val)) && parseFloat(val) > 0, 'Lots must be a positive number')
    .refine(val => Number.isInteger(parseFloat(val)), 'Lots must be a whole number (no decimals)')
});

type MintXRPFormData = z.infer<typeof MintXRPFormDataSchema>;

export default function MintXRP() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [assetManagerContract, setAssetManagerContract] = useState<AssetManagerContract | null>(null);
  const [availableAgents, setAvailableAgents] = useState<Array<{
    agentVault: string;
    ownerManagementAddress: string;
    feeBIPS: bigint;
    mintingVaultCollateralRatioBIPS: bigint;
    mintingPoolCollateralRatioBIPS: bigint;
    freeCollateralLots: bigint;
    status: bigint;
  }>>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(false);
  const [lotSizeAMG, setLotSizeAMG] = useState<string>('0');


  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<MintXRPFormData>({
    resolver: zodResolver(MintXRPFormDataSchema),
    defaultValues: {
      agentVault: '',
      lots: ''
    }
  });

  const initializeConnections = useCallback(async () => {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const assetManagerContractInstance = await AssetManagerContract.create(provider, signer);
        setAssetManagerContract(assetManagerContractInstance);
        
        // Fetch available agents and settings after contract is initialized
        await Promise.all([
          fetchAvailableAgents(assetManagerContractInstance),
          fetchAssetManagerSettings(assetManagerContractInstance)
        ]);
      }
    } catch (error) {
      console.error('Error initializing connections:', error);
    }
  }, []);

  useEffect(() => {
    initializeConnections();
  }, [initializeConnections]);

  async function fetchAssetManagerSettings(contract: AssetManagerContract) {
    try {
      const settings = await contract.getSettings();
      
      // Get lot size and asset decimals
      const lotSizeRaw = typeof settings.lotSizeAMG === 'bigint'
        ? settings.lotSizeAMG.toString()
        : settings.lotSizeAMG.toString();
      
      const decimals = typeof settings.assetDecimals === 'bigint'
        ? Number(settings.assetDecimals)
        : Number(settings.assetDecimals);
      
      // Convert lot size to human readable format
      const lotSizeHumanReadable = ethers.formatUnits(lotSizeRaw, decimals);
      
      setLotSizeAMG(lotSizeHumanReadable);
      console.log('Lot size AMG (human readable):', lotSizeHumanReadable);
      console.log('Asset decimals:', decimals);
    } catch (error) {
      console.error('Error fetching AssetManager settings:', error);
      setError('Failed to fetch AssetManager settings');
    }
  }

  async function fetchAvailableAgents(contract: AssetManagerContract) {
    setIsLoadingAgents(true);
    try {
      const result = await contract.getAvailableAgentsDetailedList();
      // Filter agents with more than 0 free collateral lots
      const availableAgentsWithCollateral = result.agents.filter(agent => 
        agent.freeCollateralLots > BigInt(0)
      );
      setAvailableAgents(availableAgentsWithCollateral);
      console.log('Available agents with collateral:', availableAgentsWithCollateral);
    } catch (error) {
      console.error('Error fetching available agents:', error);
      setError('Failed to fetch available agents');
    } finally {
      setIsLoadingAgents(false);
    }
  }

  async function mintXRP(data: MintXRPFormData) {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);

    try {
      if (!assetManagerContract) { 
        throw new Error('AssetManager contract not initialized'); 
      }

      // Fetch agent info to get the fee
      const agentInfo = await assetManagerContract.getAgentInfo(data.agentVault);
      const agentFeeBIPS = agentInfo.feeBIPS.toString();

      const executor = "0x0000000000000000000000000000000000000000"; // Use zero address

      console.log('Minting XRP with parameters:', {
        agentVault: data.agentVault,
        lots: data.lots,
        agentFeeBIPS,
        executor
      });

      await assetManagerContract.reserveCollateral(
        data.agentVault,
        data.lots,
        agentFeeBIPS,
        executor
      );

      setSuccess(`Successfully reserved collateral for ${data.lots} lots with agent fee ${Number(agentFeeBIPS) / 100}%`);
      reset();
    } catch (error) {
      console.error('Error minting XRP:', error);
      setError(error instanceof Error ? error.message : 'Failed to mint XRP');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <div className="rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Mint XRP to FXRP
        </h2>
        
        <p className="text-gray-600 mb-6">
          Reserve collateral and mint FXRP tokens by providing XRP to the Asset Manager.
        </p>

        {/* Mint XRP Section */}
        <form onSubmit={handleSubmit(mintXRP)} className="mb-8 p-6 bg-blue-50 rounded-lg">
          <h3 className="text-xl font-semibold text-blue-900 mb-4">Mint XRP to FXRP</h3>
          <p className="text-blue-700 mb-4">
            Reserve collateral with an agent vault to mint FXRP tokens.
          </p>
          
          <div className="space-y-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent Vault
              </label>
              {isLoadingAgents ? (
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                  <p className="text-gray-500">Loading available agents...</p>
                </div>
              ) : (
                <select
                  {...register('agentVault')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select an agent vault</option>
                  {availableAgents.map((agent, index) => (
                    <option key={index} value={agent.agentVault}>
                      {agent.agentVault} (Fee: {Number(agent.feeBIPS) / 100}%, Free Collateral: {agent.freeCollateralLots.toString()} lots)
                    </option>
                  ))}
                </select>
              )}
              {errors.agentVault && (
                <p className="text-red-500 text-sm mt-1">{errors.agentVault.message}</p>
              )}
              {availableAgents.length === 0 && !isLoadingAgents && (
                <p className="text-blue-600 text-sm mt-1">No available agents found</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lots Amount
              </label>
              <input
                {...register('lots')}
                type="number"
                placeholder="1"
                step="1"
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.lots && (
                <p className="text-red-500 text-sm mt-1">{errors.lots.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Amount in lots (1 lot = {lotSizeAMG} XRP)
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {isProcessing ? 'Processing...' : 'Mint XRP to FXRP'}
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
