'use client';

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const tabs = [
    { id: 'asset-manager', label: 'Asset Manager Settings', color: 'slate' },
    { id: 'mint-xrp', label: 'Mint XRP', color: 'blue' },
    { id: 'send-fxrp', label: 'Send FXRP', color: 'amber' },
    { id: 'redeem-fxrp', label: 'Redeem to XRP', color: 'green' },
  ];

  return (
    <nav className="px-4">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {tabs.map((tab) => (
            <TabsTrigger 
              key={tab.id} 
              value={tab.id} 
              className={`text-sm transition-colors cursor-pointer ${
                tab.color === 'slate' 
                  ? 'data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:border-slate-300'
                  : tab.color === 'blue'
                  ? 'data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 data-[state=active]:border-blue-300'
                  : tab.color === 'amber'
                  ? 'data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900 data-[state=active]:border-amber-300'
                  : 'data-[state=active]:bg-green-100 data-[state=active]:text-green-900 data-[state=active]:border-green-300'
              }`}
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
    </nav>
  );
} 