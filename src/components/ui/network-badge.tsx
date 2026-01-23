'use client';

import { useEffect, useState } from 'react';

import { useChainId } from 'wagmi';

import { Badge } from '@/components/ui/badge';
import { getChainName } from '@/lib/chainUtils';

interface NetworkBadgeProps {
  className?: string;
  style?: React.CSSProperties;
}

export function NetworkBadge({ className, style }: NetworkBadgeProps) {
  const chainId = useChainId();
  const [mounted, setMounted] = useState(false);

  // Only render on client side to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !chainId) {
    return null;
  }

  return (
    <Badge
      variant='outline'
      className={
        className || 'border-blue-400 bg-blue-50 text-blue-700 font-semibold'
      }
      style={style}
    >
      {getChainName(chainId)}
    </Badge>
  );
}
