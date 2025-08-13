'use client';

import { useState, useEffect } from 'react';
import { useReadContract } from 'wagmi';

// Contract functions
import { getAssetManagerAddress } from '@/lib/assetManager';
import { iAssetManagerAbi } from '../generated';

// UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw } from "lucide-react";


export default function AssetManagerSettings() {
  const [assetManagerAddress, setAssetManagerAddress] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get AssetManager address
  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const address = await getAssetManagerAddress();
        setAssetManagerAddress(address);
      } catch (error) {
        console.error('Error fetching AssetManager address:', error);
        setError('Failed to fetch AssetManager address');
      }
    };

    fetchAddress();
  }, []);

  // Read AssetManager settings using wagmi
  const { 
    data: settings, 
    isLoading: loading, 
    error: readError,
    refetch: refetchSettings 
  } = useReadContract({
    address: assetManagerAddress!,
    abi: iAssetManagerAbi,
    functionName: 'getSettings',
    query: {
      enabled: !!assetManagerAddress,
    },
  });

  // Handle read errors
  useEffect(() => {
    if (readError) {
      setError(readError.message);
    } else {
      setError(null);
    }
  }, [readError]);

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
              onClick={() => refetchSettings()}
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
                  value: settings.assetDecimals.toString()
                },
                {
                  title: "Asset Minting Decimals",
                  value: settings.assetMintingDecimals.toString()
                },
                {
                  title: "Asset Unit UBA",
                  value: settings.assetUnitUBA.toString()
                },
                {
                  title: "Asset Minting Granularity UBA",
                  value: settings.assetMintingGranularityUBA.toString()
                }
              ])}

              {settingsBox("Minting Settings", [
                {
                  title: "Lot Size AMG",
                  value: settings.lotSizeAMG.toString()
                },
                {
                  title: "Collateral Reservation Fee (BIPS)",
                  value: settings.collateralReservationFeeBIPS.toString()
                }
              ])}

              {settingsBox("Redemption Settings", [
                {
                  title: "Redemption Fee (BIPS)",
                  value: settings.redemptionFeeBIPS.toString()
                }
              ])}

              {settingsBox("Registry Addresses", [
                {
                  title: "Agent Owner Registry",
                  value: createExplorerLink(settings.agentOwnerRegistry)
                }
              ])}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 