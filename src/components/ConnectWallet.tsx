'use client';

import { useEffect, useState } from 'react';

import { ChevronDown, Copy, ExternalLink, LogOut, Wallet } from 'lucide-react';

import { useAccount, useConnect, useDisconnect } from 'wagmi';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { getChainName } from '@/lib/chainUtils';
import { copyToClipboard } from '@/lib/clipboard';

export default function ConnectWallet() {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, error } = useConnect();
  const { disconnect } = useDisconnect();
  const [showMenu, setShowMenu] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Only render on client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleCopyAddress = async () => {
    if (address) {
      await copyToClipboard(address);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setShowMenu(false);
  };

  const handleConnect = (connector: (typeof connectors)[number]) => {
    connect({ connector });
    setShowConnectDialog(false);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const getExplorerUrl = (chainId: number, address: string) => {
    const explorers: Record<number, string> = {
      14: 'https://flare-explorer.flare.network',
      114: 'https://coston2-explorer.flare.network',
      19: 'https://songbird-explorer.flare.network',
      16: 'https://coston-explorer.flare.network',
    };
    const baseUrl = explorers[chainId] || explorers[14];
    return `${baseUrl}/address/${address}`;
  };

  if (!mounted) {
    return null;
  }

  if (!isConnected) {
    return (
      <>
        <Button
          onClick={() => setShowConnectDialog(true)}
          className='bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg'
          size='lg'
        >
          <Wallet className='h-5 w-5 mr-2' />
          Connect Wallet
        </Button>

        <AlertDialog
          open={showConnectDialog}
          onOpenChange={setShowConnectDialog}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className='text-2xl font-bold'>
                Connect Your Wallet
              </AlertDialogTitle>
              <AlertDialogDescription>
                Choose a wallet to connect to the FAssets dApp
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className='space-y-3 py-4'>
              {connectors.map(connector => (
                <Button
                  key={connector.id}
                  onClick={() => handleConnect(connector)}
                  className='w-full justify-start text-lg h-14'
                  variant='outline'
                >
                  <Wallet className='h-5 w-5 mr-3' />
                  {connector.name}
                </Button>
              ))}
            </div>
            {error && (
              <p className='text-sm text-red-600 mt-2'>
                Error: {error.message}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  }

  return (
    <div className='relative'>
      <Button
        onClick={() => setShowMenu(!showMenu)}
        className='bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold shadow-lg'
        size='lg'
      >
        <div className='flex items-center gap-2'>
          <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse' />
          <span>{formatAddress(address!)}</span>
          <ChevronDown className='h-4 w-4' />
        </div>
      </Button>

      {showMenu && (
        <>
          <div
            className='fixed inset-0 z-40'
            onClick={() => setShowMenu(false)}
          />
          <div className='absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 z-50'>
            <div className='p-4 space-y-3'>
              {/* Network Info */}
              {chain && (
                <div className='bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200'>
                  <p className='text-xs text-gray-600 mb-1'>Network</p>
                  <p className='font-semibold text-blue-900'>
                    {getChainName(chain.id)}
                  </p>
                </div>
              )}

              {/* Address Info */}
              <div className='bg-gray-50 rounded-lg p-3 border border-gray-200'>
                <p className='text-xs text-gray-600 mb-2'>Your Address</p>
                <div className='flex items-center justify-between'>
                  <code className='text-sm font-mono text-gray-900'>
                    {formatAddress(address!)}
                  </code>
                  <div className='flex gap-2'>
                    <button
                      onClick={handleCopyAddress}
                      className='p-2 hover:bg-gray-200 rounded-md transition-colors'
                      title='Copy address'
                    >
                      <Copy className='h-4 w-4 text-gray-600' />
                    </button>
                    {chain && (
                      <a
                        href={getExplorerUrl(chain.id, address!)}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='p-2 hover:bg-gray-200 rounded-md transition-colors'
                        title='View on explorer'
                      >
                        <ExternalLink className='h-4 w-4 text-gray-600' />
                      </a>
                    )}
                  </div>
                </div>
                {copySuccess && (
                  <p className='text-xs text-green-600 mt-2'>
                    ✓ Address copied to clipboard
                  </p>
                )}
              </div>

              {/* Disconnect Button */}
              <Button
                onClick={handleDisconnect}
                variant='destructive'
                className='w-full'
              >
                <LogOut className='h-4 w-4 mr-2' />
                Disconnect Wallet
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
