// https://dev.flare.network/fassets/emergency-pause
// https://dev.flare.network/fassets/reference/IAssetManager#emergencypaused

export const EMERGENCY_PAUSE_DOCS_URL =
  'https://dev.flare.network/fassets/emergency-pause';

/** On-chain `EmergencyPause.Level` returned by `emergencyPauseLevel()`. */
export const EmergencyPauseLevel = {
  NONE: 0,
  START_OPERATIONS: 1,
  FULL: 2,
  FULL_AND_TRANSFER: 3,
} as const;

export function emergencyPauseLevelName(level: number): string {
  switch (level) {
    case EmergencyPauseLevel.NONE:
      return 'NONE';
    case EmergencyPauseLevel.START_OPERATIONS:
      return 'START_OPERATIONS';
    case EmergencyPauseLevel.FULL:
      return 'FULL';
    case EmergencyPauseLevel.FULL_AND_TRANSFER:
      return 'FULL_AND_TRANSFER';
    default:
      return `LEVEL_${level}`;
  }
}

export function formatEmergencyPauseLevel(level: number): string {
  return `${emergencyPauseLevelName(level)} (${level})`;
}

/** What the effective level blocks. Levels match the emergency pause docs. */
export function emergencyPauseEffect(level: number | undefined): string {
  switch (level) {
    case EmergencyPauseLevel.START_OPERATIONS:
      return 'New minting, redemption, and liquidation are paused. executeDirectMinting reverts with EmergencyPauseActive. FXRP transfers still work.';
    case EmergencyPauseLevel.FULL:
      return 'Minting, redemption, and finishing in-progress mints and redeems are paused. FXRP transfers still work.';
    case EmergencyPauseLevel.FULL_AND_TRANSFER:
      return 'The FAsset system is fully paused, including FXRP transfers. Affected calls revert with EmergencyPauseActive.';
    default:
      return 'Most mint, redeem, and liquidation calls revert with EmergencyPauseActive.';
  }
}

/** `emergencyPausedUntil()` is 0 when no pause is active. */
export function formatPausedUntil(timestamp: bigint | undefined): string {
  if (timestamp === undefined) {
    return 'Loading...';
  }
  if (timestamp === 0n) {
    return 'Not paused';
  }

  const date = new Date(Number(timestamp) * 1000);
  if (Number.isNaN(date.getTime())) {
    return timestamp.toString();
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function blocksTransfer(
  emergencyPaused: boolean | undefined,
  level: number | undefined
): boolean {
  return (
    emergencyPaused === true &&
    (level === undefined || level === EmergencyPauseLevel.FULL_AND_TRANSFER)
  );
}
