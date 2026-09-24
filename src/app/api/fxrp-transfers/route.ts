import { NextRequest, NextResponse } from 'next/server';

import {
  EVM_ADDRESS_REGEX,
  FXRP_TRANSFER_LIMIT,
  type FxrpTransferRaw,
} from '@/lib/fxrpTransfers';
import { getExplorerBaseUrl } from '@/lib/utils';

type BlockscoutAddress = string | { hash?: string } | null;

type BlockscoutTokenTransfer = {
  transaction_hash?: string;
  tx_hash?: string;
  from?: BlockscoutAddress;
  to?: BlockscoutAddress;
  total?: { value?: string | null } | null;
  timestamp?: string | null;
  log_index?: number;
};

function parseAddress(value: BlockscoutAddress | undefined): string | null {
  if (typeof value === 'string' && EVM_ADDRESS_REGEX.test(value)) {
    return value;
  }
  if (
    value &&
    typeof value === 'object' &&
    typeof value.hash === 'string' &&
    EVM_ADDRESS_REGEX.test(value.hash)
  ) {
    return value.hash;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const chainId = Number(request.nextUrl.searchParams.get('chainId'));
  const address = request.nextUrl.searchParams.get('address');
  const token = request.nextUrl.searchParams.get('token');

  if (!Number.isInteger(chainId)) {
    return NextResponse.json({ error: 'Invalid chainId' }, { status: 400 });
  }

  const explorerBaseUrl = getExplorerBaseUrl(chainId);
  if (!explorerBaseUrl) {
    return NextResponse.json({ error: 'Unsupported chainId' }, { status: 400 });
  }

  if (!address || !EVM_ADDRESS_REGEX.test(address)) {
    return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
  }

  if (!token || !EVM_ADDRESS_REGEX.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  const url = new URL(
    `${explorerBaseUrl}/api/v2/addresses/${address}/token-transfers`
  );
  url.searchParams.set('type', 'ERC-20');
  url.searchParams.set('token', token);

  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Blockscout token-transfers error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch transfers from explorer' },
        { status: 502 }
      );
    }

    const data = (await response.json()) as {
      items?: BlockscoutTokenTransfer[];
    };

    const transfers: FxrpTransferRaw[] = [];
    for (const item of data.items ?? []) {
      const hash = item.transaction_hash ?? item.tx_hash;
      const from = parseAddress(item.from);
      const to = parseAddress(item.to);
      const value = item.total?.value;
      if (!hash || !from || !to || value == null) continue;

      transfers.push({
        hash,
        from,
        to,
        value,
        timestamp: item.timestamp ?? null,
        logIndex: item.log_index ?? 0,
      });

      if (transfers.length >= FXRP_TRANSFER_LIMIT) break;
    }

    return NextResponse.json({ transfers });
  } catch (error) {
    console.error('FXRP transfers proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
