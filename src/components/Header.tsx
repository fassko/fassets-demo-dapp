'use client';

import ConnectWallet from '@/components/ConnectWallet';

export default function Header() {
  return (
    <header className='w-full border-b border-gray-200 bg-white shadow-sm'>
      <div className='container mx-auto px-4 py-4'>
        <div className='flex items-center justify-between'>
          {/* Logo/Title */}
          <div className='flex items-center gap-3'>
            <div className='text-3xl'>🔥</div>
            <div>
              <h1 className='text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
                FAssets Demo
              </h1>
              <p className='text-sm text-gray-600'>
                Mint, Transfer, and Redeem FAssets
              </p>
            </div>
          </div>

          {/* Wallet Connection */}
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
