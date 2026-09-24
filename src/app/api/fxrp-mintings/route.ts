import { NextRequest, NextResponse } from 'next/server';

import {
  FXRP_MINTING_LIMIT,
  parseDirectMintingLog,
  type BlockscoutLog,
  type FxrpMintingRaw,
} from '@/lib/fxrpMintings';
import { EVM_ADDRESS_REGEX } from '@/lib/fxrpTransfers';
import { isZeroAddress } from '@/lib/mintingTagUtils';
import { getExplorerBaseUrl } from '@/lib/utils';

const MAX_TRANSFER_PAGES = 4;
const LOG_FETCH_CONCURRENCY = 6;

type BlockscoutAddress = string | { hash?: string } | null;

type BlockscoutTokenTransfer = {
  transaction_hash?: string;
  tx_hash?: string;
  from?: BlockscoutAddress;
};

type TokenTransferPage = {
  items?: BlockscoutTokenTransfer[];
  next_page_params?: Record<string, string | number | boolean | null> | null;
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

async function fetchJson(url: URL): Promise<unknown> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    if (response.ok) {
      return response.json();
    }

    const errorText = await response.text();
    console.error('Blockscout minting logs error:', errorText);
    lastError = new Error('Failed to fetch mintings from explorer');
    if (response.status < 500) {
      throw lastError;
    }
  }

  throw lastError ?? new Error('Failed to fetch mintings from explorer');
}

function asLogItems(data: unknown): BlockscoutLog[] {
  if (Array.isArray(data)) return data as BlockscoutLog[];
  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { items?: unknown }).items)
  ) {
    return (data as { items: BlockscoutLog[] }).items;
  }
  return [];
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;

  async function worker() {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]);
    }
  }

  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return results;
}

function mintingsFromLogs(
  logs: BlockscoutLog[],
  hash: string,
  assetManager: string,
  recipient: string
): FxrpMintingRaw[] {
  const mintings: FxrpMintingRaw[] = [];

  for (const item of logs) {
    const logAddress = parseAddress(item.address);
    if (
      !logAddress ||
      logAddress.toLowerCase() !== assetManager.toLowerCase()
    ) {
      continue;
    }

    const parsed = parseDirectMintingLog({
      ...item,
      transaction_hash: item.transaction_hash ?? item.tx_hash ?? hash,
    });
    if (!parsed) continue;
    if (parsed.targetAddress.toLowerCase() !== recipient.toLowerCase())
      continue;
    mintings.push(parsed);
  }

  return mintings;
}

export async function GET(request: NextRequest) {
  const chainId = Number(request.nextUrl.searchParams.get('chainId'));
  const assetManager = request.nextUrl.searchParams.get('assetManager');
  const recipient = request.nextUrl.searchParams.get('recipient');
  const token = request.nextUrl.searchParams.get('token');

  if (!Number.isInteger(chainId)) {
    return NextResponse.json({ error: 'Invalid chainId' }, { status: 400 });
  }

  const explorerBaseUrl = getExplorerBaseUrl(chainId);
  if (!explorerBaseUrl) {
    return NextResponse.json({ error: 'Unsupported chainId' }, { status: 400 });
  }

  if (!assetManager || !EVM_ADDRESS_REGEX.test(assetManager)) {
    return NextResponse.json(
      { error: 'Invalid assetManager' },
      { status: 400 }
    );
  }

  if (!recipient || !EVM_ADDRESS_REGEX.test(recipient)) {
    return NextResponse.json({ error: 'Invalid recipient' }, { status: 400 });
  }

  if (!token || !EVM_ADDRESS_REGEX.test(token)) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }

  try {
    const mintings: FxrpMintingRaw[] = [];
    const seenHashes = new Set<string>();
    let nextPageParams: TokenTransferPage['next_page_params'] = null;
    let candidateCount = 0;
    let failedLogFetches = 0;

    for (let page = 0; page < MAX_TRANSFER_PAGES; page++) {
      if (mintings.length >= FXRP_MINTING_LIMIT) break;

      const url = new URL(
        `${explorerBaseUrl}/api/v2/addresses/${recipient}/token-transfers`
      );
      url.searchParams.set('type', 'ERC-20');
      url.searchParams.set('token', token);
      url.searchParams.set('filter', 'to');
      if (nextPageParams) {
        for (const [key, value] of Object.entries(nextPageParams)) {
          if (value != null) url.searchParams.set(key, String(value));
        }
      }

      const data = (await fetchJson(url)) as TokenTransferPage;
      const hashes: string[] = [];

      for (const item of data.items ?? []) {
        const hash = item.transaction_hash ?? item.tx_hash;
        const from = parseAddress(item.from);
        if (!hash || !from || !isZeroAddress(from) || seenHashes.has(hash)) {
          continue;
        }
        seenHashes.add(hash);
        hashes.push(hash);
      }

      candidateCount += hashes.length;

      const logsByHash = await mapLimit(
        hashes,
        LOG_FETCH_CONCURRENCY,
        async hash => {
          try {
            const logsUrl = new URL(
              `${explorerBaseUrl}/api/v2/transactions/${hash}/logs`
            );
            return asLogItems(await fetchJson(logsUrl));
          } catch (error) {
            console.error('Blockscout minting tx logs error:', hash, error);
            failedLogFetches += 1;
            return [] as BlockscoutLog[];
          }
        }
      );

      hashes.forEach((hash, index) => {
        if (mintings.length >= FXRP_MINTING_LIMIT) return;
        mintings.push(
          ...mintingsFromLogs(
            logsByHash[index] ?? [],
            hash,
            assetManager,
            recipient
          ).slice(0, FXRP_MINTING_LIMIT - mintings.length)
        );
      });

      nextPageParams = data.next_page_params;
      if (!nextPageParams || (data.items ?? []).length === 0) break;
    }

    if (
      mintings.length === 0 &&
      candidateCount > 0 &&
      failedLogFetches === candidateCount
    ) {
      return NextResponse.json(
        { error: 'Failed to fetch mintings from explorer' },
        { status: 502 }
      );
    }

    return NextResponse.json({ mintings });
  } catch (error) {
    console.error('FXRP mintings proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
