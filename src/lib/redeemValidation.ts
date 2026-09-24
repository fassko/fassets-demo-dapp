import type { Address } from 'viem';

import { getAssetManagerRedemptionAbi } from '@/lib/abiUtils';
import { createFlarePublicClient } from '@/lib/publicClient';

/** Sum of `ticketValueUBA` across all tickets in the redemption queue. */
export async function getRedemptionQueueTotalValueUBA(
  assetManagerAddress: Address,
  chainId: number,
  maxRedeemedTickets: bigint | number
): Promise<bigint> {
  const publicClient = createFlarePublicClient(chainId);
  const redemptionAbi = getAssetManagerRedemptionAbi(chainId);

  const pageSize = BigInt(maxRedeemedTickets);

  let totalValueUBA = BigInt(0);
  let firstRedemptionTicketId = BigInt(0);

  while (true) {
    const [queue, nextRedemptionTicketId] = await publicClient.readContract({
      address: assetManagerAddress,
      abi: redemptionAbi,
      functionName: 'redemptionQueue',
      args: [firstRedemptionTicketId, pageSize],
    });

    for (const ticket of queue) {
      totalValueUBA += ticket.ticketValueUBA;
    }

    if (nextRedemptionTicketId === BigInt(0)) {
      break;
    }
    firstRedemptionTicketId = nextRedemptionTicketId;
  }

  return totalValueUBA;
}

export async function validateRedeemAmountUBA(
  requestedAmountUBA: bigint,
  assetManagerAddress: Address,
  chainId: number,
  maxRedeemedTickets: bigint | number,
  minimumRedeemAmountUBA: bigint
): Promise<{
  minimumRedeemAmountUBA: bigint;
  redemptionQueueTotalValueUBA: bigint;
}> {
  const redemptionQueueTotalValueUBA = await getRedemptionQueueTotalValueUBA(
    assetManagerAddress,
    chainId,
    maxRedeemedTickets
  );

  if (requestedAmountUBA < minimumRedeemAmountUBA) {
    throw new Error(
      `Redeem amount (${requestedAmountUBA.toString()}) must be at least minimumRedeemAmountUBA (${minimumRedeemAmountUBA.toString()}).`
    );
  }

  if (requestedAmountUBA > redemptionQueueTotalValueUBA) {
    throw new Error(
      `Redeem amount (${requestedAmountUBA.toString()}) exceeds total redemption queue value (${redemptionQueueTotalValueUBA.toString()} UBA).`
    );
  }

  return { minimumRedeemAmountUBA, redemptionQueueTotalValueUBA };
}

export function formatUbaAsAsset(uba: bigint, assetDecimals: number): string {
  return (Number(uba) / Math.pow(10, assetDecimals)).toFixed(assetDecimals);
}

/** Compact FXRP/XRP string for input placeholders (drops trailing zeros). */
export function formatRedeemAmountPlaceholder(
  uba: bigint,
  assetDecimals: number
): string {
  const n = Number(uba) / Math.pow(10, assetDecimals);
  if (!Number.isFinite(n)) return '';
  return n.toFixed(assetDecimals).replace(/\.?0+$/, '');
}

/** Largest single redemption allowed: min(wallet, queue), if that meets the minimum. */
export function computeMaxRedeemableUBA(
  walletBalanceUBA: bigint,
  minimumRedeemAmountUBA: bigint,
  redemptionQueueTotalValueUBA: bigint
): bigint {
  const capped =
    walletBalanceUBA < redemptionQueueTotalValueUBA
      ? walletBalanceUBA
      : redemptionQueueTotalValueUBA;
  if (capped < minimumRedeemAmountUBA) {
    return BigInt(0);
  }
  return capped;
}
