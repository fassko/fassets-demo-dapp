'use client';

import {
  ArrowRight,
  CheckCircle,
  Coins,
  Play,
  Send,
  Settings,
} from 'lucide-react';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navigation({
  activeTab,
  onTabChange,
}: NavigationProps) {
  const tabs = [
    { id: 'asset-manager', label: 'Settings', color: 'slate', icon: Settings },
    { id: 'mint-xrp', label: 'Mint', color: 'blue', icon: Coins },
    {
      id: 'xrp-attestation',
      label: 'Attestation',
      color: 'purple',
      icon: CheckCircle,
    },
    { id: 'execute', label: 'Execute', color: 'orange', icon: Play },
    { id: 'transfer', label: 'Transfer', color: 'cyan', icon: Send },
    { id: 'redeem-fxrp', label: 'Redeem', color: 'green', icon: ArrowRight },
  ];

  return (
    <nav className='px-4'>
      <Tabs value={activeTab} onValueChange={onTabChange} className='w-full'>
        <TabsList className='grid w-full grid-cols-6'>
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={`text-sm transition-colors cursor-pointer flex items-center gap-2 ${
                  tab.color === 'slate'
                    ? 'data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:border-slate-300'
                    : tab.color === 'blue'
                      ? 'data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 data-[state=active]:border-blue-300'
                      : tab.color === 'purple'
                        ? 'data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 data-[state=active]:border-purple-300'
                        : tab.color === 'orange'
                          ? 'data-[state=active]:bg-orange-100 data-[state=active]:text-orange-900 data-[state=active]:border-orange-300'
                          : tab.color === 'cyan'
                            ? 'data-[state=active]:bg-cyan-100 data-[state=active]:text-cyan-900 data-[state=active]:border-cyan-300'
                            : tab.color === 'green'
                              ? 'data-[state=active]:bg-green-100 data-[state=active]:text-green-900 data-[state=active]:border-green-300'
                              : 'data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 data-[state=active]:border-blue-300'
                }`}
              >
                <IconComponent className='h-4 w-4' />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </nav>
  );
}
