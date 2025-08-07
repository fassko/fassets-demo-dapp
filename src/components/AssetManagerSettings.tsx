'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { AssetManagerContract } from '@/utils/truffleAssetManagerContract';
import type { IAssetManagerInstance } from '@/types/truffle-types/flare-periphery-contracts-fassets-test/coston2/IAssetManager';

// Type for the return value of getSettings() method
type AssetManagerSettings = Awaited<ReturnType<IAssetManagerInstance['getSettings']>>;

export default function AssetManagerSettings() {
  const [settings, setSettings] = useState<AssetManagerSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchAssetManagerSettings() {
    setLoading(true);
    setError(null);
    
    try {
      
      if (typeof window !== 'undefined' && window.ethereum) {  
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const assetManagerContract = await AssetManagerContract.create(provider, signer);
        
        const settingsData = await assetManagerContract.getSettings();
        
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
  }

  useEffect(() => {
    fetchAssetManagerSettings();
  }, []);

  // Helper function to create explorer link
  function createExplorerLink(address: string) {
    return <a 
      href={`https://coston2-explorer.flare.network/address/${address}`}
      target="_blank"
      className="text-blue-600 font-mono hover:underline ml-1"
    >
      {address}
    </a>
  }

  function settingsBox(title: string, items: Array<{ title: string; value: React.ReactNode }>) {
    return (
      <div className="border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold mb-3">{title}</h3>
        <div className="space-y-2 text-sm">
          {items.map((item, index) => (
            <div key={index}>
              <span className="font-medium">{item.title}:</span> {item.value}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <button
          onClick={fetchAssetManagerSettings}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg"
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
            Asset Manager FXRP Settings (Truffle Types)
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {settingsBox("Contract Addresses", [
              {
                title: "Asset Manager Controller",
                value: createExplorerLink(settings.assetManagerController)
              },
              {
                title: "FXRP Token",
                value: createExplorerLink(settings.fAsset)
              }
            ])}

            {settingsBox("Asset Configuration", [
              {
                title: "Asset Decimals",
                value: settings.assetDecimals
              },
              {
                title: "Asset Minting Decimals",
                value: settings.assetMintingDecimals
              },
              {
                title: "Asset Unit UBA",
                value: settings.assetUnitUBA
              },
              {
                title: "Asset Minting Granularity UBA",
                value: settings.assetMintingGranularityUBA
              }
            ])}

            {settingsBox("Minting Settings", [
              {
                title: "Lot Size AMG",
                value: settings.lotSizeAMG
              },
              {
                title: "Collateral Reservation Fee (BIPS)",
                value: settings.collateralReservationFeeBIPS
              }
            ])}

            {settingsBox("Redemption Settings", [
              {
                title: "Redemption Fee (BIPS)",
                value: settings.redemptionFeeBIPS
              }
            ])}
          </div>
        </div>
      )}
    </div>
  );
} 