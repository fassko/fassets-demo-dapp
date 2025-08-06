'use client';

import { useState, useEffect } from 'react';
import { coston2 } from 'flare-periphery-contract-artifacts-test-fassets';
import { ethers } from 'ethers';

// Extend Window interface for ethereum
declare global {
  interface Window {
    ethereum?: any;
  }
}

interface AssetManagerSettings {
  // The settings might be returned as an array, so we'll handle both cases
  [key: string]: any;
}

export default function AssetManagerSettings() {
  const [settings, setSettings] = useState<AssetManagerSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAssetManagerSettings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Check if MetaMask is available
      if (typeof window !== 'undefined' && window.ethereum) {
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create Web3 provider
        const provider = new ethers.BrowserProvider(window.ethereum);
        
        // Get the AssetManagerFXRP contract address and ABI
        const assetManagerInfo = coston2.products.AssetManagerFXRP;
        const contractAddress = await assetManagerInfo.getAddress(provider);
        
        // Create contract instance
        const assetManagerFXRP = new ethers.Contract(
          contractAddress,
          assetManagerInfo.abi,
          provider
        );
        
        console.log('Contract ABI functions:', assetManagerInfo.abi.filter((item: any) => item.type === 'function').map((item: any) => item.name));
        
        // Try to get settings as a struct object
        const settingsData = await assetManagerFXRP.getSettings();
        
        console.log('Raw settings data:', settingsData);
        console.log('Settings data type:', typeof settingsData);
        console.log('Is array:', Array.isArray(settingsData));
        
        setSettings(settingsData);
      } else {
        throw new Error('MetaMask is not installed. Please install MetaMask to use this feature.');
      }
    } catch (err) {
      console.error('Error fetching AssetManager settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssetManagerSettings();
  }, []);

  // Log settings whenever they change
  useEffect(() => {
    if (settings) {
      console.log('AssetManager Settings:', settings);
    }
  }, [settings]);

  // Helper function to create explorer link
  const createExplorerLink = (address: string) => (
    <a 
      href={`https://coston2-explorer.flare.network/address/${address}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-600 font-mono hover:text-blue-800 underline ml-1"
    >
      {address}
    </a>
  );

  return (
    <div className="w-full">
      <div className="mb-6">
        <button
          onClick={fetchAssetManagerSettings}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Loading...' : 'Refresh Settings'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div className="mb-6 p-4 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
          Loading AssetManager settings...
        </div>
      )}

      {settings && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-800">
            Asset Manager FXRP Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contract Addresses */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Contract Addresses</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium">Asset Manager Controller:</span> 
                  {createExplorerLink(settings.assetManagerController)}
                </div>
                <div><span className="font-medium">F-Asset:</span> {createExplorerLink(settings.fAsset)}</div>
                <div><span className="font-medium">Agent Vault Factory:</span> {createExplorerLink(settings.agentVaultFactory)}</div>
                <div><span className="font-medium">Collateral Pool Factory:</span> {createExplorerLink(settings.collateralPoolFactory)}</div>
                <div><span className="font-medium">Price Reader:</span> {createExplorerLink(settings.priceReader)}</div>
              </div>
            </div>

            {/* Asset Configuration */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Asset Configuration</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Asset Decimals:</span> {settings.assetDecimals}</div>
                <div><span className="font-medium">Asset Minting Decimals:</span> {settings.assetMintingDecimals}</div>
                <div><span className="font-medium">Chain ID:</span> <span className="font-mono">{settings.chainId}</span></div>
                <div><span className="font-medium">Asset Unit UBA:</span> <span className="font-mono">{settings.assetUnitUBA}</span></div>
                <div><span className="font-medium">Asset Minting Granularity UBA:</span> <span className="font-mono">{settings.assetMintingGranularityUBA}</span></div>
              </div>
            </div>

            {/* Minting Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Minting Settings</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Minting Cap AMG:</span> <span className="font-mono">{settings.mintingCapAMG}</span></div>
                <div><span className="font-medium">Lot Size AMG:</span> <span className="font-mono">{settings.lotSizeAMG}</span></div>
                <div><span className="font-medium">Minting Pool Holdings Required (BIPS):</span> {settings.mintingPoolHoldingsRequiredBIPS}</div>
                <div><span className="font-medium">Collateral Reservation Fee (BIPS):</span> {settings.collateralReservationFeeBIPS}</div>
              </div>
            </div>

            {/* Redemption Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Redemption Settings</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Redemption Fee (BIPS):</span> {settings.redemptionFeeBIPS}</div>
                <div><span className="font-medium">Redemption Default Factor Vault Collateral (BIPS):</span> {settings.redemptionDefaultFactorVaultCollateralBIPS}</div>
                <div><span className="font-medium">Max Redeemed Tickets:</span> {settings.maxRedeemedTickets}</div>
              </div>
            </div>

            {/* Timelock Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Timelock Settings</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Agent Exit Available Timelock (seconds):</span> <span className="font-mono">{settings.agentExitAvailableTimelockSeconds}</span></div>
                <div><span className="font-medium">Agent Fee Change Timelock (seconds):</span> <span className="font-mono">{settings.agentFeeChangeTimelockSeconds}</span></div>
                <div><span className="font-medium">Agent Minting CR Change Timelock (seconds):</span> <span className="font-mono">{settings.agentMintingCRChangeTimelockSeconds}</span></div>
                <div><span className="font-medium">Pool Exit CR Change Timelock (seconds):</span> <span className="font-mono">{settings.poolExitCRChangeTimelockSeconds}</span></div>
              </div>
            </div>

            {/* Liquidation Settings */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Liquidation Settings</h3>
              <div className="space-y-2 text-sm">
                <div><span className="font-medium">Liquidation Step (seconds):</span> <span className="font-mono">{settings.liquidationStepSeconds}</span></div>
                <div><span className="font-medium">Collateral Pool Token Timelock (seconds):</span> {settings.collateralPoolTokenTimelockSeconds}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 