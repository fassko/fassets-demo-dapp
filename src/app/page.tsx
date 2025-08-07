'use client';

import { useState } from 'react';
import AssetManagerSettings from '@/components/AssetManagerSettings';
import SendFXRP from '@/components/SendFXRP';
import RedeemXRP from '@/components/RedeemXRP';
import Navigation from '@/components/Navigation';

export default function Home() {
  const [activeTab, setActiveTab] = useState('asset-manager');
  return (
    <div className="font-sans p-8">
      <main className="flex flex-col gap-[32px]">
        <h1 className="text-4xl font-bold">Flare Network FAssets Demo App</h1>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'asset-manager' && <AssetManagerSettings />}
        {activeTab === 'send-fxrp' && <SendFXRP />}
        {activeTab === 'redeem-fxrp' && <RedeemXRP />}
      </main>
    </div>
  );
}
