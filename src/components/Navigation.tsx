'use client';

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export default function Navigation({ activeTab, onTabChange }: NavigationProps) {
  const tabs = [
    { id: 'asset-manager', label: 'Asset Manager Settings' },
    { id: 'mint-xrp', label: 'Mint XRP' },
    { id: 'send-fxrp', label: 'Send FXRP' },
    { id: 'redeem-fxrp', label: 'Redeem to XRP' }
  ];

  return (
    <nav>
      <div className="px-4">
        <div className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`py-4 px-2 border-b-2 font-medium text-sm cursor-pointer ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent hover:border-gray-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
} 