import { decodeEventLog, toEventSelector, type Hex } from 'viem';

import { formatXrpFromDrops } from '@/lib/directMintFeeBreakdown';
import { EVM_ADDRESS_REGEX } from '@/lib/fxrpTransfers';

export const FXRP_MINTING_LIMIT = 20;

const DIRECT_MINTING_EXECUTED_EVENT = {
  type: 'event',
  name: 'DirectMintingExecuted',
  inputs: [
    { name: 'transactionId', type: 'bytes32', indexed: false },
    { name: 'targetAddress', type: 'address', indexed: false },
    { name: 'executor', type: 'address', indexed: false },
    { name: 'mintedAmountUBA', type: 'uint256', indexed: false },
    { name: 'mintingFeeUBA', type: 'uint256', indexed: false },
    { name: 'executorFeeUBA', type: 'uint256', indexed: false },
  ],
} as const;

export const DIRECT_MINTING_EXECUTED_TOPIC = toEventSelector(
  DIRECT_MINTING_EXECUTED_EVENT
);

export type FxrpMintingRaw = {
  hash: string;
  logIndex: number;
  timestamp: string | null;
  transactionId: string;
  targetAddress: string;
  executor: string;
  mintedAmountUBA: string;
  mintingFeeUBA: string;
  executorFeeUBA: string;
};

export type FxrpMinting = FxrpMintingRaw & {
  mintedAmount: string;
  mintingFee: string;
  executorFee: string;
};

type BlockscoutDecodedParam = {
  name?: string;
  value?: unknown;
};

type BlockscoutDecoded = {
  method_call?: string;
  parameters?: BlockscoutDecodedParam[];
};

export type BlockscoutLog = {
  transaction_hash?: string;
  tx_hash?: string;
  block_timestamp?: string | null;
  timestamp?: string | null;
  index?: number;
  log_index?: number;
  data?: string;
  topics?: Array<string | null>;
  decoded?: BlockscoutDecoded | null;
  address?: string | { hash?: string } | null;
};

function getDecodedParam(
  decoded: BlockscoutDecoded | null | undefined,
  name: string
): string | null {
  const param = decoded?.parameters?.find(item => item.name === name);
  if (param?.value == null) return null;
  return String(param.value);
}

function formatUba(value: string): string {
  try {
    return formatXrpFromDrops(BigInt(value));
  } catch {
    return value;
  }
}

function decodeFromLogData(item: BlockscoutLog): {
  transactionId: string;
  targetAddress: string;
  executor: string;
  mintedAmountUBA: string;
  mintingFeeUBA: string;
  executorFeeUBA: string;
} | null {
  if (!item.data) return null;
  const topics = (item.topics ?? []).filter(
    (topic): topic is string => typeof topic === 'string'
  );
  if (topics.length === 0) return null;

  try {
    const decoded = decodeEventLog({
      abi: [DIRECT_MINTING_EXECUTED_EVENT],
      data: item.data as Hex,
      topics: topics as [Hex, ...Hex[]],
    });
    const args = decoded.args;
    if (
      args.transactionId === undefined ||
      args.targetAddress === undefined ||
      args.executor === undefined ||
      args.mintedAmountUBA === undefined ||
      args.mintingFeeUBA === undefined ||
      args.executorFeeUBA === undefined
    ) {
      return null;
    }
    return {
      transactionId: args.transactionId,
      targetAddress: args.targetAddress,
      executor: args.executor,
      mintedAmountUBA: args.mintedAmountUBA.toString(),
      mintingFeeUBA: args.mintingFeeUBA.toString(),
      executorFeeUBA: args.executorFeeUBA.toString(),
    };
  } catch {
    return null;
  }
}

export function parseDirectMintingLog(
  item: BlockscoutLog
): FxrpMintingRaw | null {
  const hash = item.transaction_hash ?? item.tx_hash;
  if (!hash) return null;

  const fromDecoded = (() => {
    const transactionId = getDecodedParam(item.decoded, 'transactionId');
    const targetAddress = getDecodedParam(item.decoded, 'targetAddress');
    const executor = getDecodedParam(item.decoded, 'executor');
    const mintedAmountUBA = getDecodedParam(item.decoded, 'mintedAmountUBA');
    const mintingFeeUBA = getDecodedParam(item.decoded, 'mintingFeeUBA');
    const executorFeeUBA = getDecodedParam(item.decoded, 'executorFeeUBA');
    if (
      !transactionId ||
      !targetAddress ||
      !executor ||
      mintedAmountUBA == null ||
      mintingFeeUBA == null ||
      executorFeeUBA == null
    ) {
      return null;
    }
    return {
      transactionId,
      targetAddress,
      executor,
      mintedAmountUBA,
      mintingFeeUBA,
      executorFeeUBA,
    };
  })();

  const fields = fromDecoded ?? decodeFromLogData(item);
  if (!fields) return null;
  if (!EVM_ADDRESS_REGEX.test(fields.targetAddress)) return null;
  if (!EVM_ADDRESS_REGEX.test(fields.executor)) return null;

  return {
    hash,
    logIndex: item.index ?? item.log_index ?? 0,
    timestamp: item.block_timestamp ?? item.timestamp ?? null,
    ...fields,
  };
}

export function mapFxrpMintings(items: FxrpMintingRaw[]): FxrpMinting[] {
  return items.map(item => ({
    ...item,
    mintedAmount: formatUba(item.mintedAmountUBA),
    mintingFee: formatUba(item.mintingFeeUBA),
    executorFee: formatUba(item.executorFeeUBA),
  }));
}
