'use client';

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { AssetManagerContract } from '@/utils/assetManagerContract';
import type { IAssetManagerInstance } from '@/types/truffle-types/flare-periphery-contracts-fassets-test/coston2/IAssetManager';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw } from "lucide-react";

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
      className="text-slate-500 font-mono hover:underline ml-1"
    >
      {address}
    </a>
  }

  function settingsBox(title: string, items: Array<{ title: string; value: React.ReactNode }>) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-slate-700">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-slate-600">
            {items.map((item, index) => (
              <div key={index} className="flex justify-between">
                <span className="font-medium text-slate-700">{item.title}:</span> 
                <span>{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full mt-8 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-semibold text-slate-800">
              Asset Manager FXRP Settings
            </CardTitle>
            <Button 
              onClick={fetchAssetManagerSettings}
              disabled={loading}
              variant="outline"
              size="sm"
              className="border-slate-300 hover:bg-slate-100 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Loading...' : 'Refresh Settings'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>
                <strong>Error:</strong> {error}
              </AlertDescription>
            </Alert>
          )}

          {loading && (
            <Alert className="bg-slate-50 border-slate-200 text-slate-700">
              <AlertDescription>
                Loading AssetManager settings...
              </AlertDescription>
            </Alert>
          )}

          {settings && (
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
          )}
        </CardContent>
      </Card>
    </div>
  );
} 