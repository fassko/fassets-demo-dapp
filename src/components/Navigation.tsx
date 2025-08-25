'use client';

import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Coins, CheckCircle, Send, ArrowRight, Play, ChevronDown, ChevronRight } from "lucide-react";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const [mintingExpanded, setMintingExpanded] = useState(false);

  const mainTabs = [
    { id: 'asset-manager', label: 'Settings', color: 'slate', icon: Settings },
    { id: 'minting', label: 'Minting', color: 'blue', icon: Coins, hasSubItems: true },
    { id: 'transfer', label: 'Transfer', color: 'cyan', icon: Send },
    { id: 'redeem-fxrp', label: 'Redeem', color: 'green', icon: ArrowRight },
  ];

  const mintingSubTabs = [
    { id: 'mint-xrp', label: 'Mint', color: 'blue', icon: Coins },
    { id: 'xrp-attestation', label: 'Attestation', color: 'purple', icon: CheckCircle },
    { id: 'execute', label: 'Execute', color: 'amber', icon: Play },
  ];

  const isMintingActive = activeTab === 'mint-xrp' || activeTab === 'xrp-attestation' || activeTab === 'execute';
  const isMintingExpanded = mintingExpanded || isMintingActive;

  const handleTabClick = (tabId: string) => {
    if (tabId === 'minting') {
      setMintingExpanded(!mintingExpanded);
      // If minting is not expanded, expand it and select the first sub-item
      if (!mintingExpanded) {
        onTabChange('mint-xrp');
      }
    } else {
      onTabChange(tabId);
    }
  };

  return (
    <nav className="px-4">
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {mainTabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = tab.id === 'minting' ? isMintingActive : activeTab === tab.id;
            
            return (
              <TabsTrigger 
                key={tab.id} 
                value={tab.id} 
                onClick={() => handleTabClick(tab.id)}
                className={`text-sm transition-colors cursor-pointer flex items-center gap-2 ${
                  tab.color === 'slate' 
                    ? 'data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 data-[state=active]:border-slate-300'
                    : tab.color === 'blue'
                    ? 'data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 data-[state=active]:border-blue-300'
                    : tab.color === 'amber'
                    ? 'data-[state=active]:bg-amber-100 data-[state=active]:text-amber-900 data-[state=active]:border-amber-300'
                    : tab.color === 'cyan'
                    ? 'data-[state=active]:bg-cyan-100 data-[state=active]:text-cyan-900 data-[state=active]:border-cyan-300'
                    : tab.color === 'green'
                    ? 'data-[state=active]:bg-green-100 data-[state=active]:text-green-900 data-[state=active]:border-green-300'
                    : 'data-[state=active]:bg-purple-100 data-[state=active]:text-purple-900 data-[state=active]:border-purple-300'
                }`}
                data-state={isActive ? 'active' : 'inactive'}
              >
                <IconComponent className="h-4 w-4" />
                {tab.label}
                {tab.hasSubItems && (
                  isMintingExpanded ? 
                    <ChevronDown className="h-3 w-3 ml-1" /> : 
                    <ChevronRight className="h-3 w-3 ml-1" />
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {/* Minting Sub-navigation */}
      {isMintingExpanded && (
        <div className="mt-2 px-4">
          <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-blue-50 border border-blue-200">
              {mintingSubTabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <TabsTrigger 
                    key={tab.id} 
                    value={tab.id} 
                    className="text-sm transition-colors cursor-pointer flex items-center gap-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-900 data-[state=active]:border-blue-300"
                  >
                    <IconComponent className="h-4 w-4" />
                    {tab.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </Tabs>
        </div>
      )}
    </nav>
  );
} 