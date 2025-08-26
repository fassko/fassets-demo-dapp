import { Wallet, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface XRPLBalanceCardProps {
  balance: string;
  onRefresh: () => void;
  isLoading?: boolean;
}

export default function XRPLBalanceCard({
  balance,
  onRefresh,
  isLoading = false,
}: XRPLBalanceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className='flex items-center gap-2 text-green-900'>
          <Wallet className='h-5 w-5 text-green-600' />
          XRPL Balance
        </CardTitle>
      </CardHeader>
      <CardContent className='pt-6'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Wallet className='h-5 w-5 text-green-600' />
            <Badge
              variant='secondary'
              className='text-lg bg-green-100 text-green-800'
            >
              {balance} XRP
            </Badge>
          </div>
          <Button
            onClick={onRefresh}
            variant='outline'
            size='sm'
            className='border-green-300 hover:bg-green-100 cursor-pointer'
            disabled={isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
        </div>
        <p className='text-xs text-green-600 mt-2'>XRPL Balance</p>
      </CardContent>
    </Card>
  );
}
