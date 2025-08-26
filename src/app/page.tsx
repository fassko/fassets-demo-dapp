'use client';

import { useState, useEffect } from 'react';
import Settings from '@/components/Settings';
import Mint from '@/components/Mint';
import Transfer from '@/components/Transfer';
import Redeem from '@/components/Redeem';
import Attestation from '@/components/Attestation';
import Execute from '@/components/Execute';
import Navigation from '@/components/Navigation';

export default function Home() {
  const [activeTab, setActiveTab] = useState('asset-manager');

  // Handle navigation state changes
  useEffect(() => {
    // If a minting sub-tab is selected, ensure the minting section is properly handled
    if (['mint-xrp', 'xrp-attestation', 'execute'].includes(activeTab)) {
      // The navigation component will handle the sub-navigation display
    }
  }, [activeTab]);

  return (
    <div className='font-sans p-8'>
      <main className='flex flex-col gap-2'>
        <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
        {activeTab === 'asset-manager' && <Settings />}
        {activeTab === 'mint-xrp' && <Mint />}
        {activeTab === 'xrp-attestation' && <Attestation />}
        {activeTab === 'execute' && <Execute />}
        {activeTab === 'transfer' && <Transfer />}
        {activeTab === 'redeem-fxrp' && <Redeem />}
      </main>
    </div>
  );
}
