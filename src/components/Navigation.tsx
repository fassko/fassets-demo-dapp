'use client';

import {
  ArrowRight,
  CheckCircle,
  Coins,
  Play,
  Send,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Color mapping for active states
const getActiveClasses = (color: string, isActive: boolean): string => {
  if (!isActive) return '';

  const colorMap = {
    slate: 'bg-slate-100 text-slate-900 border-b-2 border-slate-300',
    red: 'bg-red-100 text-red-900 border-b-2 border-red-300',
    blue: 'bg-blue-100 text-blue-900 border-b-2 border-blue-300',
    purple: 'bg-purple-100 text-purple-900 border-b-2 border-purple-300',
    orange: 'bg-orange-100 text-orange-900 border-b-2 border-orange-300',
    cyan: 'bg-cyan-100 text-cyan-900 border-b-2 border-cyan-300',
    green: 'bg-green-100 text-green-900 border-b-2 border-green-300',
  };

  return colorMap[color as keyof typeof colorMap] || colorMap.blue;
};

export default function Navigation() {
  const pathname = usePathname();

  const tabs = [
    { path: '/', label: 'Settings', color: 'slate', icon: Settings },
    { path: '/minting-cap', label: '🧢 Cap', color: 'red', icon: null },
    { path: '/mint', label: 'Mint', color: 'blue', icon: Coins },
    {
      path: '/attestation',
      label: 'Attestation',
      color: 'purple',
      icon: CheckCircle,
    },
    { path: '/execute', label: 'Execute', color: 'orange', icon: Play },
    { path: '/transfer', label: 'Transfer', color: 'cyan', icon: Send },
    { path: '/redeem', label: 'Redeem', color: 'green', icon: ArrowRight },
  ];

  return (
    <nav className='px-2 md:px-4'>
      <div className='flex w-full overflow-x-auto overflow-y-hidden scrollbar-hide'>
        {tabs.map(tab => {
          const IconComponent = tab.icon;
          const isActive = pathname === tab.path;

          return (
            <Link
              key={tab.path}
              href={tab.path}
              className={`text-xs md:text-sm transition-colors cursor-pointer flex items-center justify-center gap-1 md:gap-2 whitespace-nowrap flex-1 min-w-0 px-1 md:px-3 py-2 hover:bg-gray-100 ${getActiveClasses(tab.color, isActive)}`}
            >
              {IconComponent && (
                <IconComponent className='h-3 w-3 md:h-4 md:w-4 flex-shrink-0' />
              )}
              <span className='hidden sm:inline'>{tab.label}</span>
              <span className='sm:hidden'>
                {tab.label === '🧢 Cap'
                  ? '🧢'
                  : tab.label === 'Settings'
                    ? '⚙️'
                    : tab.label === 'Mint'
                      ? '🪙'
                      : tab.label === 'Attestation'
                        ? '✓'
                        : tab.label === 'Execute'
                          ? '▶️'
                          : tab.label === 'Transfer'
                            ? '↗️'
                            : tab.label === 'Redeem'
                              ? '↪️'
                              : tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
