'use client';

import { useState } from 'react';

import Attestation from '@/components/Attestation';
import Execute from '@/components/Execute';
import Header from '@/components/Header';
import Mint from '@/components/Mint';
import MintingCap from '@/components/MintingCap';
import Navigation from '@/components/Navigation';
import Redeem from '@/components/Redeem';
import Settings from '@/components/Settings';
import Transfer from '@/components/Transfer';

export default function Home() {
  const [activeTab, setActiveTab] = useState('asset-manager');

  return (
    <div className='font-sans min-h-screen bg-gray-50'>
      <Header />
      <div className='p-8'>
        <main className='flex flex-col gap-2'>
          <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
          {activeTab === 'asset-manager' && (
            <Settings onNavigate={setActiveTab} />
          )}
          {activeTab === 'minting-cap' && <MintingCap />}
          {activeTab === 'mint-xrp' && <Mint />}
          {activeTab === 'xrp-attestation' && <Attestation />}
          {activeTab === 'execute' && <Execute />}
          {activeTab === 'transfer' && <Transfer />}
          {activeTab === 'redeem-fxrp' && <Redeem />}
        </main>
      </div>
    </div>
  );
}
