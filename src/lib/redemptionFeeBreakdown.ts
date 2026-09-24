/** Same denominator as `SafePct.MAX_BIPS` / `mulBips` in the Asset Manager. */
const MAX_BIPS = BigInt(10_000);

function asBigInt(value: bigint | number): bigint {
  return typeof value === 'bigint' ? value : BigInt(value);
}

/**
 * `floor(amount * bips / 10_000)`, matching `SafePct.mulBips`.
 * Accepts the JavaScript numbers viem returns for integers of 48 bits or less.
 */
export function mulBips(
  amount: bigint | number,
  bips: bigint | number
): bigint {
  return (asBigInt(amount) * asBigInt(bips)) / MAX_BIPS;
}

export function formatBipsPercent(bips: bigint | number): string {
  const valueIn = asBigInt(bips);
  const negative = valueIn < 0n;
  const value = negative ? -valueIn : valueIn;
  const whole = value / 100n;
  const fraction = (value % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole.toString()}.${fraction}%`;
}

/**
 * Parse a decimal asset amount into UBA, truncating digits past `decimals`.
 * Matches the integer units `redeemAmount` / `redeemWithTag` receive.
 */
export function parseAssetAmountToUBA(
  amount: string,
  decimals: number
): bigint | null {
  const trimmed = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(trimmed)) return null;
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 18) {
    return null;
  }

  const [whole, fraction = ''] = trimmed.split('.');
  const scale = 10n ** BigInt(decimals);
  const fracDigits = fraction.slice(0, decimals).padEnd(decimals, '0');
  const fracUBA = fracDigits.length === 0 ? 0n : BigInt(fracDigits);
  return BigInt(whole) * scale + fracUBA;
}

export type RedemptionFeeInput = {
  /** FXRP the redeemer asks to burn, in UBA. */
  amountUBA: bigint | number;
  assetMintingGranularityUBA: bigint | number;
  /**
   * Configured system rate when a receiver is set, otherwise 0.
   * Coston 2 does not expose `effectiveSystemRedemptionFeeBIPS()`.
   */
  effectiveSystemRedemptionFeeBIPS: bigint | number;
  redemptionFeeBIPS: bigint | number;
  /** Core-vault transfers skip both fees. User redemptions do not. */
  transferToCoreVault?: boolean;
};

export type RedemptionFeeBreakdown = {
  enteredUBA: bigint;
  /** Amount actually burned, after truncating to minting granularity. */
  burnedUBA: bigint;
  truncatedUBA: bigint;
  systemFeeUBA: bigint;
  /** Request underlying value after the system fee (`underlyingValueUBA`). */
  underlyingValueUBA: bigint;
  /** Agent fee stored as `underlyingFeeUBA`. */
  agentFeeUBA: bigint;
  /** Underlying the agent must pay: `underlyingValueUBA - underlyingFeeUBA`. */
  redeemerPayoutUBA: bigint;
};

/**
 * Fees on one redemption request, in the order `RedemptionRequests.createRedemptionRequest`
 * applies them:
 *
 * 1. System fee, in AMG, subtracted first and re-minted to `systemRedemptionFeeReceiver`.
 * 2. Agent fee, `redemptionFeeBIPS` of what remains, stored as `underlyingFeeUBA`.
 *
 * The redeemer is paid `underlyingValueUBA - underlyingFeeUBA`. A redemption split
 * across several agents rounds each request on its own, so this single-request
 * figure can differ by at most one granularity unit of system fee and one UBA of
 * agent fee per extra request.
 */
export function computeRedemptionFeeBreakdown(
  input: RedemptionFeeInput
): RedemptionFeeBreakdown | null {
  const {
    amountUBA,
    assetMintingGranularityUBA,
    effectiveSystemRedemptionFeeBIPS,
    redemptionFeeBIPS,
    transferToCoreVault = false,
  } = input;

  const amount = asBigInt(amountUBA);
  const granularity = asBigInt(assetMintingGranularityUBA);
  const systemBips = asBigInt(effectiveSystemRedemptionFeeBIPS);
  const agentBips = asBigInt(redemptionFeeBIPS);

  if (amount <= 0n || granularity <= 0n) return null;
  if (
    systemBips < 0n ||
    systemBips >= MAX_BIPS ||
    agentBips < 0n ||
    agentBips >= MAX_BIPS
  ) {
    return null;
  }

  const amountAMG = amount / granularity;
  const burnedUBA = amountAMG * granularity;
  const systemFeeAMG = transferToCoreVault
    ? 0n
    : mulBips(amountAMG, systemBips);
  const remainingAMG = amountAMG - systemFeeAMG;
  const underlyingValueUBA = remainingAMG * granularity;
  const agentFeeUBA = transferToCoreVault
    ? 0n
    : mulBips(underlyingValueUBA, agentBips);

  return {
    enteredUBA: amount,
    burnedUBA,
    truncatedUBA: amount - burnedUBA,
    systemFeeUBA: systemFeeAMG * granularity,
    underlyingValueUBA,
    agentFeeUBA,
    redeemerPayoutUBA: underlyingValueUBA - agentFeeUBA,
  };
}
