interface XRPLedgerInfoCardProps {
  testXrpIndex?: string | null;
  closeTime?: string | null;
  deadlineBlockNumber?: string | null;
  deadlineTimestamp?: string | null;
}

export default function XRPLedgerInfoCard({
  testXrpIndex,
  closeTime,
  deadlineBlockNumber,
  deadlineTimestamp,
}: XRPLedgerInfoCardProps) {
  // Don't render if no data is available
  if (
    !testXrpIndex &&
    !closeTime &&
    !deadlineBlockNumber &&
    !deadlineTimestamp
  ) {
    return null;
  }

  return (
    <div className='space-y-4'>
      <h3 className='text-lg font-semibold text-green-900'>
        Latest XRPL Ledger Info
      </h3>
      <div className='bg-green-50 border border-green-200 rounded p-4 space-y-3'>
        {testXrpIndex && (
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>TestXRP Index:</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {testXrpIndex}
            </code>
          </div>
        )}

        {closeTime && (
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>Close Time:</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {closeTime}
            </code>
          </div>
        )}

        {closeTime && (
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>Readable Time:</span>
            <span className='text-sm text-green-800'>
              {new Date(
                (parseInt(closeTime) + 946684800) * 1000
              ).toLocaleString()}
            </span>
          </div>
        )}

        {/* FDC Deadline Values */}
        {(deadlineBlockNumber || deadlineTimestamp) && (
          <div className='pt-3 border-t border-green-300 space-y-2'>
            <h4 className='text-md font-semibold text-green-800'>
              FDC Deadline Values
            </h4>

            {deadlineBlockNumber && (
              <div className='flex items-center gap-2'>
                <span className='font-medium text-green-900'>
                  Deadline Block Number:
                </span>
                <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
                  {deadlineBlockNumber}
                </code>
              </div>
            )}

            {deadlineTimestamp && (
              <div className='flex items-center gap-2'>
                <span className='font-medium text-green-900'>
                  Deadline Timestamp:
                </span>
                <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
                  {deadlineTimestamp}
                </code>
              </div>
            )}

            {deadlineTimestamp && (
              <div className='flex items-center gap-2'>
                <span className='font-medium text-green-900'>
                  Deadline Readable:
                </span>
                <span className='text-sm text-green-800'>
                  {new Date(
                    parseInt(deadlineTimestamp) * 1000
                  ).toLocaleString()}
                </span>
              </div>
            )}

            <p className='text-xs text-green-600'>
              FDC deadline: ~15 minutes confirmation window
            </p>
          </div>
        )}

        <p className='text-xs text-green-600 mt-2'>
          Latest validated ledger information from XRPL testnet
        </p>
      </div>
    </div>
  );
}
