import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';

export function useFLRBalance() {
  const [flrBalance, setFlrBalance] = useState<string>('0');
  const { address: userAddress, isConnected } = useAccount();

  // Read FLR balance using wagmi
  const { 
    data: balanceData, 
    refetch: refetchBalance,
    isLoading: isLoadingBalance,
    error: balanceError 
  } = useBalance({
    address: userAddress,
    query: {
      enabled: !!userAddress && isConnected,
    },
  });

  // Update FLR balance when data changes
  useEffect(() => {
    if (balanceData) {
      const formattedBalance = (Number(balanceData.value) / Math.pow(10, 18)).toFixed(6);
      setFlrBalance(formattedBalance);
    } else {
      setFlrBalance('0');
    }
  }, [balanceData]);

  return {
    flrBalance,
    balanceData,
    refetchBalance,
    isLoadingBalance,
    balanceError,
    userAddress,
    isConnected
  };
}
