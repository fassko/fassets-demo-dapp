import { XRP_CONFIG } from '@/lib/xrpUtils';

const BIPS_DENOM = BigInt(10_000);

/** Minting fee in drops for a given net mint amount (same rule as on-chain). */
export function directMintingFeeForNetUBA(
  netMintUBA: bigint,
  feeBIPS: bigint,
  minimumFeeUBA: bigint
): { proportionalFeeUBA: bigint; appliedMintingFeeUBA: bigint } {
  const proportionalFeeUBA = (netMintUBA * feeBIPS) / BIPS_DENOM;
  const appliedMintingFeeUBA =
    proportionalFeeUBA > minimumFeeUBA ? proportionalFeeUBA : minimumFeeUBA;
  return { proportionalFeeUBA, appliedMintingFeeUBA };
}

/**
 * Gross XRPL payment (drops) → estimated split using the same fee rules as
 * `computeDirectMintingPaymentAmountXrp` in flare-smart-accounts-viem: pick the
 * largest net mint N such that N + mintingFee(N) + executorFee ≤ gross (integer drops).
 */
export function computeDirectMintBreakdownFromGrossDrops(
  grossPaymentUBA: bigint,
  feeBIPS: bigint,
  minimumFeeUBA: bigint,
  executorFeeUBA: bigint
): DirectMintGrossBreakdown | null {
  const zero = BigInt(0);
  const one = BigInt(1);
  if (grossPaymentUBA <= zero) return null;
  if (grossPaymentUBA < executorFeeUBA) return null;

  const maxNet = grossPaymentUBA - executorFeeUBA;
  const minAtZero = directMintingFeeForNetUBA(zero, feeBIPS, minimumFeeUBA);
  if (minAtZero.appliedMintingFeeUBA + executorFeeUBA > grossPaymentUBA) {
    return null;
  }

  let lo = zero;
  let hi = maxNet;
  let bestNet = zero;

  while (lo <= hi) {
    const mid = (lo + hi) / BigInt(2);
    const { appliedMintingFeeUBA } = directMintingFeeForNetUBA(
      mid,
      feeBIPS,
      minimumFeeUBA
    );
    const total = mid + appliedMintingFeeUBA + executorFeeUBA;
    if (total <= grossPaymentUBA) {
      bestNet = mid;
      lo = mid + one;
    } else {
      hi = mid - one;
    }
  }

  const { proportionalFeeUBA, appliedMintingFeeUBA } = directMintingFeeForNetUBA(
    bestNet,
    feeBIPS,
    minimumFeeUBA
  );
  const accounted =
    bestNet + appliedMintingFeeUBA + executorFeeUBA;
  const unallocatedUBA = grossPaymentUBA - accounted;

  return {
    grossPaymentUBA,
    netMintUBA: bestNet,
    proportionalFeeUBA,
    minimumFeeUBA,
    appliedMintingFeeUBA,
    executorFeeUBA,
    totalProtocolFeesUBA: appliedMintingFeeUBA + executorFeeUBA,
    unallocatedUBA,
  };
}

export type DirectMintGrossBreakdown = {
  grossPaymentUBA: bigint;
  netMintUBA: bigint;
  proportionalFeeUBA: bigint;
  minimumFeeUBA: bigint;
  appliedMintingFeeUBA: bigint;
  executorFeeUBA: bigint;
  totalProtocolFeesUBA: bigint;
  unallocatedUBA: bigint;
};

/**
 * Smallest gross XRPL payment (drops) that yields a positive estimated net mint,
 * using the same fee rules as `computeDirectMintBreakdownFromGrossDrops`.
 */
export function computeMinimumDirectMintGrossDrops(
  feeBIPS: bigint,
  minimumFeeUBA: bigint,
  executorFeeUBA: bigint
): bigint | null {
  const zero = BigInt(0);
  const one = BigInt(1);

  const minAtZero = directMintingFeeForNetUBA(zero, feeBIPS, minimumFeeUBA);
  const floor = minAtZero.appliedMintingFeeUBA + executorFeeUBA;

  if (
    computeDirectMintBreakdownFromGrossDrops(
      floor,
      feeBIPS,
      minimumFeeUBA,
      executorFeeUBA
    ) === null
  ) {
    return null;
  }

  const floorBreakdown = computeDirectMintBreakdownFromGrossDrops(
    floor,
    feeBIPS,
    minimumFeeUBA,
    executorFeeUBA
  );
  if (floorBreakdown && floorBreakdown.netMintUBA > zero) {
    return floor;
  }

  // Search up to ~100k XRP in drops for the smallest gross with netMint > 0.
  let lo = floor + one;
  let hi = floor + BigInt(100_000_000_000);
  const atHi = computeDirectMintBreakdownFromGrossDrops(
    hi,
    feeBIPS,
    minimumFeeUBA,
    executorFeeUBA
  );
  if (!atHi || atHi.netMintUBA === zero) return null;

  while (lo < hi) {
    const mid = (lo + hi) / BigInt(2);
    const breakdown = computeDirectMintBreakdownFromGrossDrops(
      mid,
      feeBIPS,
      minimumFeeUBA,
      executorFeeUBA
    );
    if (breakdown && breakdown.netMintUBA > zero) {
      hi = mid;
    } else {
      lo = mid + one;
    }
  }

  return lo;
}

export function formatXrpFromDrops(drops: bigint, fractionDigits = 6): string {
  return (Number(drops) / XRP_CONFIG.DROPS_PER_XRP).toFixed(fractionDigits);
}

/** Compact XRP string for input placeholders (drops trailing zeros). */
export function formatXrpPlaceholder(drops: bigint): string {
  const n = Number(drops) / XRP_CONFIG.DROPS_PER_XRP;
  if (!Number.isFinite(n)) return '';
  return n
    .toFixed(6)
    .replace(/\.?0+$/, '');
}
