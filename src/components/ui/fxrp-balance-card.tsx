import { Coins, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFXRPPrice } from '@/hooks/useFXRPPrice';
import { formatPrice } from '@/lib/ftsoUtils';

interface FXRPBalanceCardProps {
  balance: string;
  onRefresh: () => void;
  colorScheme: {
    title: string;
    icon: string;
    badge: string;
    button: string;
    description: string;
  };
}

export function FXRPBalanceCard({
  balance,
  onRefresh,
  colorScheme,
}: FXRPBalanceCardProps) {
  const { priceData } = useFXRPPrice();

  return (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${colorScheme.title}`}>
          <Coins className={`h-5 w-5 ${colorScheme.icon}`} />
          FXRP Balance
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Coins className={`h-5 w-5 ${colorScheme.icon}`} />
            <div className='flex flex-col gap-1'>
              <Badge
                variant='secondary'
                className={`text-lg ${colorScheme.badge}`}
              >
                {balance} FXRP
              </Badge>
              {priceData && (
                <span className='text-xs text-gray-600 font-semibold'>
                  ≈ {formatPrice(parseFloat(balance) * priceData.price)}
                </span>
              )}
            </div>
          </div>
          <Button
            onClick={onRefresh}
            variant='outline'
            size='sm'
            className={`${colorScheme.button} cursor-pointer`}
          >
            <RefreshCw className='h-4 w-4 mr-2' />
            Refresh
          </Button>
        </div>
        <p className={`text-xs ${colorScheme.description} mt-2`}>
          FXRP Token Balance
        </p>
      </CardContent>
    </Card>
  );
}
