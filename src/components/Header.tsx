'use client';

import { useEffect, useState } from 'react';

import { useAccount } from 'wagmi';

import ConnectWallet from '@/components/ConnectWallet';
import { getChainName } from '@/lib/chainUtils';

export default function Header() {
  const { chain } = useAccount();
  const [mounted, setMounted] = useState(false);

  // Only render on client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className='w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm rounded-none'>
      <div className='container mx-auto px-4 py-3 md:py-4'>
        <div className='flex items-center justify-between gap-4'>
          <div className='flex items-center gap-2 md:gap-3 min-w-0 flex-1'>
            <div className='text-2xl md:text-3xl flex-shrink-0'>🔥</div>
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2 flex-wrap'>
                <h1
                  className='text-lg md:text-2xl font-bold truncate'
                  style={{ color: '#E62058' }}
                >
                  FAssets Demo
                </h1>
                {mounted && chain && (
                  <span className='text-xs md:text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md'>
                    {getChainName(chain.id)}
                  </span>
                )}
              </div>
              <p className='text-xs md:text-sm text-gray-600 truncate hidden sm:block'>
                Mint, Transfer, and Redeem FAssets
              </p>
            </div>
          </div>

          <div className='flex-shrink-0'>
            <ConnectWallet />
          </div>
        </div>
      </div>
    </header>
  );
}
