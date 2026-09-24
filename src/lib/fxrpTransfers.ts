import { isZeroAddress } from '@/lib/mintingTagUtils';
import { formatUbaAsAsset } from '@/lib/redeemValidation';

export const FXRP_TRANSFER_LIMIT = 20;

export const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

export type FxrpTransferRaw = {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: string | null;
  logIndex: number;
};

export type TransferDirection = 'sent' | 'received' | 'mint' | 'redeem';

export type FxrpTransfer = FxrpTransferRaw & {
  amount: string;
  direction: TransferDirection;
  counterparty: string;
};

function getTransferDirection(
  from: string,
  to: string,
  wallet: string
): TransferDirection {
  if (isZeroAddress(from)) return 'mint';
  if (isZeroAddress(to)) return 'redeem';
  return from.toLowerCase() === wallet.toLowerCase() ? 'sent' : 'received';
}

function getTransferCounterparty(
  from: string,
  to: string,
  wallet: string
): string {
  return from.toLowerCase() === wallet.toLowerCase() ? to : from;
}

export function mapFxrpTransfers(
  items: FxrpTransferRaw[],
  wallet: string,
  decimals: number
): FxrpTransfer[] {
  return items.map(item => {
    let amount = item.value;
    try {
      amount = formatUbaAsAsset(BigInt(item.value), decimals);
    } catch {
      amount = item.value;
    }

    return {
      ...item,
      amount,
      direction: getTransferDirection(item.from, item.to, wallet),
      counterparty: getTransferCounterparty(item.from, item.to, wallet),
    };
  });
}
