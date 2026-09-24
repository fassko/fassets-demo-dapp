import { decodeEventLog, toEventSelector, type Hex } from 'viem';

import { formatXrpFromDrops } from '@/lib/directMintFeeBreakdown';
import { EVM_ADDRESS_REGEX } from '@/lib/fxrpTransfers';

export const FXRP_REDEMPTION_LIMIT = 20;

export const REDEMPTION_REQUESTED_EVENT = {
  type: 'event',
  name: 'RedemptionRequested',
  inputs: [
    { name: 'agentVault', type: 'address', indexed: true },
    { name: 'redeemer', type: 'address', indexed: true },
    { name: 'requestId', type: 'uint256', indexed: true },
    { name: 'paymentAddress', type: 'string', indexed: false },
    { name: 'valueUBA', type: 'uint256', indexed: false },
    { name: 'feeUBA', type: 'uint256', indexed: false },
    { name: 'firstUnderlyingBlock', type: 'uint256', indexed: false },
    { name: 'lastUnderlyingBlock', type: 'uint256', indexed: false },
    { name: 'lastUnderlyingTimestamp', type: 'uint256', indexed: false },
    { name: 'paymentReference', type: 'bytes32', indexed: false },
    { name: 'executor', type: 'address', indexed: false },
    { name: 'executorFeeNatWei', type: 'uint256', indexed: false },
  ],
} as const;

export const REDEMPTION_WITH_TAG_REQUESTED_EVENT = {
  type: 'event',
  name: 'RedemptionWithTagRequested',
  inputs: [
    { name: 'agentVault', type: 'address', indexed: true },
    { name: 'redeemer', type: 'address', indexed: true },
    { name: 'requestId', type: 'uint256', indexed: true },
    { name: 'paymentAddress', type: 'string', indexed: false },
    { name: 'valueUBA', type: 'uint256', indexed: false },
    { name: 'feeUBA', type: 'uint256', indexed: false },
    { name: 'firstUnderlyingBlock', type: 'uint256', indexed: false },
    { name: 'lastUnderlyingBlock', type: 'uint256', indexed: false },
    { name: 'lastUnderlyingTimestamp', type: 'uint256', indexed: false },
    { name: 'paymentReference', type: 'bytes32', indexed: false },
    { name: 'executor', type: 'address', indexed: false },
    { name: 'executorFeeNatWei', type: 'uint256', indexed: false },
    { name: 'destinationTag', type: 'uint256', indexed: false },
  ],
} as const;

export const REDEMPTION_REQUESTED_TOPIC = toEventSelector(
  REDEMPTION_REQUESTED_EVENT
);
export const REDEMPTION_WITH_TAG_REQUESTED_TOPIC = toEventSelector(
  REDEMPTION_WITH_TAG_REQUESTED_EVENT
);

/** Emitted when the system fee is re-minted. Absent when that fee is zero. */
export const SYSTEM_REDEMPTION_FEE_PAID_EVENT = {
  type: 'event',
  name: 'SystemRedemptionFeePaid',
  inputs: [
    { name: 'agentVault', type: 'address', indexed: true },
    { name: 'requestId', type: 'uint256', indexed: true },
    { name: 'feeUBA', type: 'uint256', indexed: false },
  ],
} as const;

export const SYSTEM_REDEMPTION_FEE_PAID_TOPIC = toEventSelector(
  SYSTEM_REDEMPTION_FEE_PAID_EVENT
);

export type RedemptionKind = 'amount' | 'tag';

export type FxrpRedemptionRaw = {
  hash: string;
  logIndex: number;
  timestamp: string | null;
  kind: RedemptionKind;
  requestId: string;
  agentVault: string;
  redeemer: string;
  paymentAddress: string;
  valueUBA: string;
  /** Agent fee (`underlyingFeeUBA`) on the request value. */
  feeUBA: string;
  /** System fee for this request, when the explorer returned `SystemRedemptionFeePaid`. */
  systemFeeUBA: string | null;
  destinationTag: string | null;
};

export type FxrpRedemption = FxrpRedemptionRaw & {
  /** Request underlying value after the system fee. */
  amount: string;
  /** Agent fee, in asset units. */
  fee: string;
  /** System fee minted as FXRP, when known. */
  systemFee: string | null;
  /** Underlying the agent pays: value minus agent fee. */
  payout: string;
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
  block_number?: number;
  data?: string;
  topics?: Array<string | null>;
  decoded?: BlockscoutDecoded | null;
};

/** Blockscout `module=logs&action=getLogs` row. */
export type ExplorerGetLog = {
  transactionHash?: string;
  topics?: string[];
  data?: string;
  timeStamp?: string;
  logIndex?: string;
  blockNumber?: string;
};

/** `redeemer` is the second indexed field, so it is topic 2. */
export function addressToTopic(address: string): Hex {
  return `0x${address.slice(2).toLowerCase().padStart(64, '0')}`;
}

/** `requestId` is the second indexed field of `SystemRedemptionFeePaid`. */
export function requestIdToTopic(requestId: string): Hex {
  return `0x${BigInt(requestId).toString(16).padStart(64, '0')}`;
}

function parseQuantity(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = value.startsWith('0x')
    ? Number.parseInt(value, 16)
    : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function explorerGetLogToBlockscoutLog(
  item: ExplorerGetLog
): BlockscoutLog | null {
  if (!item.transactionHash || !item.data || !item.topics?.length) return null;
  const logIndex = parseQuantity(item.logIndex) ?? 0;
  const seconds = parseQuantity(item.timeStamp);
  const timestamp =
    seconds != null && seconds > 0
      ? new Date(seconds * 1000).toISOString()
      : null;
  return {
    transaction_hash: item.transactionHash,
    data: item.data,
    topics: item.topics,
    index: logIndex,
    log_index: logIndex,
    block_number: parseQuantity(item.blockNumber) ?? undefined,
    block_timestamp: timestamp,
    timestamp,
  };
}

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

function kindFromLog(item: BlockscoutLog): RedemptionKind | null {
  const method = item.decoded?.method_call ?? '';
  if (method.startsWith('RedemptionWithTagRequested')) return 'tag';
  if (method.startsWith('RedemptionRequested')) return 'amount';

  const topic0 = item.topics?.[0];
  if (topic0 === REDEMPTION_WITH_TAG_REQUESTED_TOPIC) return 'tag';
  if (topic0 === REDEMPTION_REQUESTED_TOPIC) return 'amount';
  return null;
}

function decodeFromLogData(
  item: BlockscoutLog,
  kind: RedemptionKind
): {
  requestId: string;
  agentVault: string;
  redeemer: string;
  paymentAddress: string;
  valueUBA: string;
  feeUBA: string;
  destinationTag: string | null;
} | null {
  if (!item.data) return null;
  const topics = (item.topics ?? []).filter(
    (topic): topic is string => typeof topic === 'string'
  );
  if (topics.length === 0) return null;

  try {
    const decoded = decodeEventLog({
      abi: [
        kind === 'tag'
          ? REDEMPTION_WITH_TAG_REQUESTED_EVENT
          : REDEMPTION_REQUESTED_EVENT,
      ],
      data: item.data as Hex,
      topics: topics as [Hex, ...Hex[]],
    });
    const args = decoded.args;
    return {
      requestId: args.requestId.toString(),
      agentVault: args.agentVault,
      redeemer: args.redeemer,
      paymentAddress: args.paymentAddress,
      valueUBA: args.valueUBA.toString(),
      feeUBA: args.feeUBA.toString(),
      destinationTag:
        kind === 'tag' && 'destinationTag' in args
          ? args.destinationTag.toString()
          : null,
    };
  } catch {
    return null;
  }
}

export function parseRedemptionLog(
  item: BlockscoutLog,
  fallbackKind?: RedemptionKind
): FxrpRedemptionRaw | null {
  const hash = item.transaction_hash ?? item.tx_hash;
  if (!hash) return null;

  const kind = kindFromLog(item) ?? fallbackKind;
  if (!kind) return null;

  const fromDecoded = (() => {
    const agentVault = getDecodedParam(item.decoded, 'agentVault');
    const redeemer = getDecodedParam(item.decoded, 'redeemer');
    const requestId = getDecodedParam(item.decoded, 'requestId');
    const paymentAddress = getDecodedParam(item.decoded, 'paymentAddress');
    const valueUBA = getDecodedParam(item.decoded, 'valueUBA');
    const feeUBA = getDecodedParam(item.decoded, 'feeUBA');
    const destinationTag = getDecodedParam(item.decoded, 'destinationTag');
    if (
      !agentVault ||
      !redeemer ||
      requestId == null ||
      paymentAddress == null ||
      valueUBA == null ||
      feeUBA == null
    ) {
      return null;
    }
    return {
      requestId,
      agentVault,
      redeemer,
      paymentAddress,
      valueUBA,
      feeUBA,
      destinationTag: kind === 'tag' ? destinationTag : null,
    };
  })();

  const fields = fromDecoded ?? decodeFromLogData(item, kind);
  if (!fields) return null;
  if (!EVM_ADDRESS_REGEX.test(fields.agentVault)) return null;
  if (!EVM_ADDRESS_REGEX.test(fields.redeemer)) return null;

  return {
    hash,
    logIndex: item.index ?? item.log_index ?? 0,
    timestamp: item.block_timestamp ?? item.timestamp ?? null,
    kind,
    systemFeeUBA: null,
    ...fields,
  };
}

export function parseSystemRedemptionFeeLog(
  item: BlockscoutLog
): { requestId: string; feeUBA: string } | null {
  const fromDecoded = (() => {
    const requestId = getDecodedParam(item.decoded, 'requestId');
    const feeUBA = getDecodedParam(item.decoded, 'feeUBA');
    if (requestId == null || feeUBA == null) return null;
    return { requestId, feeUBA };
  })();
  if (fromDecoded) return fromDecoded;
  if (!item.data) return null;

  const topics = (item.topics ?? []).filter(
    (topic): topic is string => typeof topic === 'string'
  );
  if (topics.length === 0) return null;

  try {
    const decoded = decodeEventLog({
      abi: [SYSTEM_REDEMPTION_FEE_PAID_EVENT],
      data: item.data as Hex,
      topics: topics as [Hex, ...Hex[]],
    });
    return {
      requestId: decoded.args.requestId.toString(),
      feeUBA: decoded.args.feeUBA.toString(),
    };
  } catch {
    return null;
  }
}

export function attachSystemRedemptionFees(
  redemptions: FxrpRedemptionRaw[],
  feeLogs: BlockscoutLog[]
): FxrpRedemptionRaw[] {
  const feeByRequestId = new Map<string, string>();
  for (const item of feeLogs) {
    const parsed = parseSystemRedemptionFeeLog(item);
    if (parsed) feeByRequestId.set(parsed.requestId, parsed.feeUBA);
  }

  return redemptions.map(item => ({
    ...item,
    systemFeeUBA: feeByRequestId.get(item.requestId) ?? null,
  }));
}

function timestampMs(value: string | null): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function mergeRedemptionLogs(
  requestedLogs: BlockscoutLog[],
  taggedLogs: BlockscoutLog[]
): FxrpRedemptionRaw[] {
  const redemptions: FxrpRedemptionRaw[] = [];

  for (const item of requestedLogs) {
    const parsed = parseRedemptionLog(item, 'amount');
    if (parsed) redemptions.push(parsed);
  }
  for (const item of taggedLogs) {
    const parsed = parseRedemptionLog(item, 'tag');
    if (parsed) redemptions.push(parsed);
  }

  redemptions.sort((a, b) => {
    const timeDiff = timestampMs(b.timestamp) - timestampMs(a.timestamp);
    if (timeDiff !== 0) return timeDiff;
    return b.logIndex - a.logIndex;
  });

  return redemptions.slice(0, FXRP_REDEMPTION_LIMIT);
}

export function mapFxrpRedemptions(
  items: FxrpRedemptionRaw[]
): FxrpRedemption[] {
  return items.map(item => {
    let payout = item.valueUBA;
    try {
      payout = (BigInt(item.valueUBA) - BigInt(item.feeUBA)).toString();
    } catch {
      payout = item.valueUBA;
    }
    return {
      ...item,
      amount: formatUba(item.valueUBA),
      fee: formatUba(item.feeUBA),
      systemFee: item.systemFeeUBA ? formatUba(item.systemFeeUBA) : null,
      payout: formatUba(payout),
    };
  });
}
