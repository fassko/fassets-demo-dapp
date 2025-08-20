'use client';

import { useState } from 'react';
import AssetManagerSettings from '@/components/AssetManagerSettings';
import Mint from '@/components/Mint';
import Transfer from '@/components/Transfer';
import Redeem from '@/components/Redeem';
import Attestation from '@/components/Attestation';
import Navigation from '@/components/Navigation';

export default function Home() {
  const [activeTab, setActiveTab] = useState('asset-manager');
  return (
    <div className="font-sans p-8">
      <main className="flex flex-col gap-2">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'asset-manager' && <AssetManagerSettings />}
        {activeTab === 'mint-xrp' && <Mint />}
        {activeTab === 'transfer' && <Transfer />}
        {activeTab === 'redeem-fxrp' && <Redeem />}
        {activeTab === 'xrp-attestation' && <Attestation />}
      </main>
    </div>
  );
}
