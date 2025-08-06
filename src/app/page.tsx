'use client';

import { useState } from 'react';
import AssetManagerSettings from '@/components/AssetManagerSettings';
import CrossChainPaymentPortal from '@/components/CrossChainPaymentPortal';
import Navigation from '@/components/Navigation';

export default function Home() {
  const [activeTab, setActiveTab] = useState('asset-manager');

  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start w-full max-w-6xl">
        <h1 className="text-4xl font-bold text-gray-900">Flare Network Demo App</h1>
        
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        
        {activeTab === 'asset-manager' && <AssetManagerSettings />}
        {activeTab === 'payment-portal' && <CrossChainPaymentPortal />}
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        
      </footer>
    </div>
  );
}
