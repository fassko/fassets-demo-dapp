'use client';

import { useState } from 'react';
import AssetManagerSettings from '@/components/AssetManagerSettings';
import MintXRP from '@/components/MintXRP';
import SendFXRP from '@/components/SendFXRP';
import RedeemXRP from '@/components/RedeemXRP';
import XRPPaymentAttestation from '@/components/XRPPaymentAttestation';
import Navigation from '@/components/Navigation';

export default function Home() {
  const [activeTab, setActiveTab] = useState('asset-manager');
  return (
    <div className="font-sans p-8">
      <main className="flex flex-col gap-2">
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'asset-manager' && <AssetManagerSettings />}
        {activeTab === 'mint-xrp' && <MintXRP />}
        {activeTab === 'send-fxrp' && <SendFXRP />}
        {activeTab === 'redeem-fxrp' && <RedeemXRP />}
        {activeTab === 'xrp-attestation' && <XRPPaymentAttestation />}
      </main>
    </div>
  );
}
