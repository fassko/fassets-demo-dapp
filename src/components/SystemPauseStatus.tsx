'use client';

import { ExternalLink } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFAssetSystemPause } from '@/hooks/useFAssetSystemPause';
import {
  EMERGENCY_PAUSE_DOCS_URL,
  emergencyPauseEffect,
  formatEmergencyPauseLevel,
  formatPausedUntil,
} from '@/lib/fassetPause';

function statusValue(paused: boolean | undefined) {
  if (paused === undefined) {
    return 'Loading...';
  }
  if (paused) {
    return <span className='font-semibold text-red-700'>Paused</span>;
  }
  return <span className='font-semibold text-green-700'>Not paused</span>;
}

export function SystemPauseBadge() {
  const pause = useFAssetSystemPause();

  if (pause.isLoading) {
    return null;
  }

  if (pause.error || !pause.isReady) {
    return (
      <span className='text-xs md:text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded-md'>
        Pause unknown
      </span>
    );
  }

  if (pause.emergencyPaused) {
    const level =
      pause.emergencyPauseLevel !== undefined
        ? formatEmergencyPauseLevel(pause.emergencyPauseLevel)
        : 'emergency pause';
    const until = formatPausedUntil(pause.emergencyPausedUntil);

    return (
      <span
        className='text-xs md:text-sm font-medium text-red-800 bg-red-100 px-2 py-1 rounded-md'
        title={`FAsset system is paused at ${level}. Ends ${until}.`}
      >
        System paused
      </span>
    );
  }

  if (pause.mintingPaused) {
    return (
      <span
        className='text-xs md:text-sm font-medium text-amber-800 bg-amber-100 px-2 py-1 rounded-md'
        title='mintingPaused() is true. emergencyPaused() is false.'
      >
        Minting paused
      </span>
    );
  }

  return (
    <span
      className='text-xs md:text-sm font-medium text-green-800 bg-green-100 px-2 py-1 rounded-md'
      title='emergencyPaused() is false'
    >
      System active
    </span>
  );
}

export function SystemPauseBanner() {
  const pause = useFAssetSystemPause();

  if (!pause.isReady || pause.error) {
    return null;
  }

  if (pause.emergencyPaused) {
    const level =
      pause.emergencyPauseLevel !== undefined
        ? formatEmergencyPauseLevel(pause.emergencyPauseLevel)
        : 'unknown level';
    const untilLabel =
      pause.emergencyPausedUntil === 0n
        ? 'The end time is not set.'
        : `Pause ends ${formatPausedUntil(pause.emergencyPausedUntil)}.`;

    return (
      <div className='rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-950'>
        <p className='font-medium'>FAsset system is paused</p>
        <p className='mt-1 text-red-900'>
          Level {level}. {untilLabel}{' '}
          {emergencyPauseEffect(pause.emergencyPauseLevel)}
          {pause.mintingPaused
            ? ' Governance minting pause is also on.'
            : ''}{' '}
          <PauseDocsLink />
        </p>
      </div>
    );
  }

  if (pause.mintingPaused) {
    return (
      <div className='rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950'>
        <p className='font-medium'>Minting is paused</p>
        <p className='mt-1 text-amber-900'>
          Governance has paused minting on paths that check mintingPaused(),
          such as collateral reservation and self-mint. Redemptions and
          liquidation can still run. Core Vault direct minting checks
          emergencyPaused() and proceeds while that view returns false.{' '}
          <PauseDocsLink />
        </p>
      </div>
    );
  }

  return null;
}

export function SystemPauseCard() {
  const pause = useFAssetSystemPause();

  return (
    <Card
      className={
        pause.emergencyPaused
          ? 'border-red-200 bg-red-50'
          : pause.mintingPaused
            ? 'border-amber-200 bg-amber-50'
            : undefined
      }
    >
      <CardHeader>
        <CardTitle className='text-slate-900'>
          <a
            href={EMERGENCY_PAUSE_DOCS_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center gap-1 hover:text-blue-600 hover:underline'
          >
            System pause
            <ExternalLink className='h-3 w-3' />
          </a>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {pause.error && (
          <Alert variant='destructive' className='mb-3'>
            <AlertDescription>
              <strong>Error:</strong> {pause.error}
            </AlertDescription>
          </Alert>
        )}
        <div className='space-y-2 text-sm text-slate-700'>
          <StatusRow
            label='Emergency pause'
            value={statusValue(pause.emergencyPaused)}
          />
          <StatusRow
            label='Level'
            value={
              pause.emergencyPauseLevel === undefined
                ? 'Loading...'
                : formatEmergencyPauseLevel(pause.emergencyPauseLevel)
            }
          />
          <StatusRow
            label='Paused until'
            value={formatPausedUntil(pause.emergencyPausedUntil)}
          />
          <StatusRow
            label='Minting pause'
            value={statusValue(pause.mintingPaused)}
          />
        </div>
        {pause.isReady && pause.emergencyPaused && (
          <p className='mt-3 text-sm text-red-900'>
            {emergencyPauseEffect(pause.emergencyPauseLevel)}
          </p>
        )}
        {pause.isReady && pause.mintingPaused && !pause.emergencyPaused && (
          <p className='mt-3 text-sm text-amber-900'>
            Minting paths that check this flag are disabled. Other operations,
            including Core Vault direct minting, follow the emergency pause.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function PausedActionAlert({ children }: { children: React.ReactNode }) {
  return (
    <Alert className='border-red-200 bg-red-50 text-red-900'>
      <AlertDescription className='text-red-900'>{children}</AlertDescription>
    </Alert>
  );
}

function PauseDocsLink() {
  return (
    <a
      href={EMERGENCY_PAUSE_DOCS_URL}
      target='_blank'
      rel='noopener noreferrer'
      className='inline-flex items-center gap-1 underline'
    >
      Emergency pause
      <ExternalLink className='h-3 w-3' />
    </a>
  );
}

function StatusRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className='flex justify-between gap-4'>
      <span className='font-medium text-slate-900'>{label}:</span>
      <span className='text-right'>{value}</span>
    </div>
  );
}
