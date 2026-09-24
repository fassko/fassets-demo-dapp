import { NextRequest, NextResponse } from 'next/server';

import {
  REDEMPTION_REQUESTED_TOPIC,
  REDEMPTION_WITH_TAG_REQUESTED_TOPIC,
  SYSTEM_REDEMPTION_FEE_PAID_TOPIC,
  addressToTopic,
  attachSystemRedemptionFees,
  requestIdToTopic,
  explorerGetLogToBlockscoutLog,
  mergeRedemptionLogs,
  type BlockscoutLog,
  type ExplorerGetLog,
  type FxrpRedemptionRaw,
} from '@/lib/fxrpRedemptions';
import { EVM_ADDRESS_REGEX } from '@/lib/fxrpTransfers';
import { getExplorerBaseUrl } from '@/lib/utils';

type LogsModuleResponse = {
  status?: string;
  message?: string;
  result?: ExplorerGetLog[] | string;
};

function logsFromModuleResponse(data: LogsModuleResponse): ExplorerGetLog[] {
  if (Array.isArray(data.result)) return data.result;
  const detail = typeof data.result === 'string' ? data.result : '';
  const message = `${data.message ?? ''} ${detail}`;
  if (/no (records|logs|data)/i.test(message)) return [];
  if (data.status === '0') {
    throw new Error(
      typeof data.result === 'string'
        ? data.result
        : data.message || 'Failed to fetch redemptions from explorer'
    );
  }
  return [];
}

async function fetchTopicLogs(
  explorerBaseUrl: string,
  assetManager: string,
  topic0: string,
  options?: { topic2?: string; fromBlock?: number; toBlock?: number }
): Promise<BlockscoutLog[]> {
  const url = new URL(`${explorerBaseUrl}/api`);
  url.searchParams.set('module', 'logs');
  url.searchParams.set('action', 'getLogs');
  url.searchParams.set('fromBlock', String(options?.fromBlock ?? 0));
  url.searchParams.set('toBlock', String(options?.toBlock ?? 'latest'));
  url.searchParams.set('address', assetManager);
  url.searchParams.set('topic0', topic0);
  if (options?.topic2) {
    url.searchParams.set('topic2', options.topic2);
    url.searchParams.set('topic0_2_opr', 'and');
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      cache: 'no-store',
    });

    if (response.ok) {
      const data = (await response.json()) as LogsModuleResponse;
      return logsFromModuleResponse(data).flatMap(item => {
        const log = explorerGetLogToBlockscoutLog(item);
        return log ? [log] : [];
      });
    }

    const errorText = await response.text();
    console.error('Blockscout redemption logs error:', errorText);
    lastError = new Error('Failed to fetch redemptions from explorer');
    if (response.status < 500) {
      throw lastError;
    }
  }

  throw lastError ?? new Error('Failed to fetch redemptions from explorer');
}

export async function GET(request: NextRequest) {
  const chainId = Number(request.nextUrl.searchParams.get('chainId'));
  const assetManager = request.nextUrl.searchParams.get('assetManager');
  const redeemer = request.nextUrl.searchParams.get('redeemer');

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

  if (!redeemer || !EVM_ADDRESS_REGEX.test(redeemer)) {
    return NextResponse.json({ error: 'Invalid redeemer' }, { status: 400 });
  }

  const redeemerTopic = addressToTopic(redeemer);
  const requestedLogsPromise = fetchTopicLogs(
    explorerBaseUrl,
    assetManager,
    REDEMPTION_REQUESTED_TOPIC,
    { topic2: redeemerTopic }
  );
  const taggedLogsPromise = fetchTopicLogs(
    explorerBaseUrl,
    assetManager,
    REDEMPTION_WITH_TAG_REQUESTED_TOPIC,
    { topic2: redeemerTopic }
  );

  try {
    const [requestedResult, taggedResult] = await Promise.allSettled([
      requestedLogsPromise,
      taggedLogsPromise,
    ]);

    if (
      requestedResult.status === 'rejected' &&
      taggedResult.status === 'rejected'
    ) {
      throw requestedResult.reason;
    }

    const requestedLogs =
      requestedResult.status === 'fulfilled' ? requestedResult.value : [];
    const taggedLogs =
      taggedResult.status === 'fulfilled' ? taggedResult.value : [];
    const redemptionsWithoutFees = mergeRedemptionLogs(
      requestedLogs,
      taggedLogs
    );
    const systemFeeResults = await Promise.all(
      redemptionsWithoutFees.map(item =>
        fetchTopicLogs(
          explorerBaseUrl,
          assetManager,
          SYSTEM_REDEMPTION_FEE_PAID_TOPIC,
          { topic2: requestIdToTopic(item.requestId) }
        ).catch(error => {
          console.error('System redemption fee logs error:', error);
          return [] as BlockscoutLog[];
        })
      )
    );
    const systemFeeLogs = systemFeeResults.flat();

    const redemptions: FxrpRedemptionRaw[] = attachSystemRedemptionFees(
      redemptionsWithoutFees,
      systemFeeLogs
    );

    return NextResponse.json({ redemptions });
  } catch (error) {
    console.error('FXRP redemptions proxy error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
