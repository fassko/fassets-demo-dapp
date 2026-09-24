import { useEffect, useState } from 'react';

import {
  Check,
  CheckCircle,
  Clock,
  Copy,
  Loader2,
  Shield,
  XCircle,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { formatXrpFromDrops } from '@/lib/directMintFeeBreakdown';

interface RedemptionEvent {
  requestId: string;
  paymentReference: string;
  agentVault: string;
  redeemer: string;
  paymentAddress: string;
  valueUBA: string;
  /** Agent fee in UBA (`underlyingFeeUBA`). */
  feeUBA: string;
  /** System fee in UBA. Zero when the request did not charge one. */
  systemFeeUBA?: string;
  executor: string;
  executorFeeNatWei: string;
  firstUnderlyingBlock: string;
  lastUnderlyingBlock: string;
  lastUnderlyingTimestamp: string;
}

interface RedemptionEventCardProps {
  redemptionEvent: RedemptionEvent;
  deadlineBlockNumber?: string | null;
  deadlineTimestamp?: string | null;
  isAttestationLoading?: boolean;
  currentAttestationStep?: string;
  isConnected?: boolean;
  isLoadingAddresses?: boolean;
  addressError?: string | null;
  attestationError?: string | null;
  attestationSuccess?: string | null;
  attestationData?: {
    abiEncodedRequest: string;
    roundId: number | null;
  } | null;
  verificationResult?: boolean | null;
  proofData?: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    response: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    proof: any;
  } | null;
  copiedText?: string | null;
  onExecuteAttestation: () => void;
  onCopyToClipboard: (
    text: string,
    setCopiedText: (text: string | null) => void
  ) => void;
  setCopiedText: (text: string | null) => void;
  underlyingSecondsForPayment?: number;
}

// Payment Waiting Countdown Timer Component
function PaymentWaitingCountdownTimer({
  underlyingSecondsForPayment,
  onPaymentWaitingComplete,
}: {
  underlyingSecondsForPayment: number;
  onPaymentWaitingComplete: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState<number>(underlyingSecondsForPayment);
  const [isActive, setIsActive] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          setIsActive(false);
          setIsCompleted(true);
          onPaymentWaitingComplete();
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, onPaymentWaitingComplete]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;
  const progress =
    ((underlyingSecondsForPayment - timeLeft) / underlyingSecondsForPayment) *
    100;

  if (isCompleted) {
    return (
      <div className='bg-green-50 border border-green-200 rounded-lg p-4 space-y-3'>
        <div className='flex items-center gap-2'>
          <CheckCircle className='h-4 w-4 text-green-600' />
          <span className='text-green-800 font-medium'>
            Payment Waiting Period Complete
          </span>
        </div>

        <div className='text-sm text-green-700 space-y-1'>
          <p>✅ The payment waiting period has completed.</p>
          <p>
            🔍 Agent had {Math.floor(underlyingSecondsForPayment / 60)} minutes
            to make the underlying XRP payment.
          </p>
          <p>📋 You can now create a Payment Nonexistence Attestation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='bg-orange-50 border border-orange-200 rounded-lg p-4 space-y-3'>
      <div className='flex items-center gap-2'>
        <Clock className='h-4 w-4 text-orange-600' />
        <span className='text-orange-800 font-medium'>
          Payment Waiting Period
        </span>
      </div>

      <div className='space-y-2'>
        <div className='flex justify-between text-sm text-orange-700'>
          <span>Time remaining for agent payment:</span>
          <span className='font-mono font-medium'>
            {hours.toString().padStart(2, '0')}:
            {minutes.toString().padStart(2, '0')}:
            {seconds.toString().padStart(2, '0')}
          </span>
        </div>

        <div className='w-full bg-orange-200 rounded-full h-2'>
          <div
            className='bg-orange-600 h-2 rounded-full transition-all duration-1000 ease-linear'
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className='text-xs text-orange-600'>
          Progress: {Math.round(progress)}% complete
        </div>
      </div>

      <div className='text-sm text-orange-700 space-y-1'>
        <p>
          ⏱️ The agent has {Math.floor(underlyingSecondsForPayment / 60)}{' '}
          minutes to make the underlying XRP payment.
        </p>
        <p>🔄 Waiting for payment or time expiration...</p>
        <p>
          ⏳ Payment waiting period ends in: {hours}h {minutes}m {seconds}s
        </p>
        <p>📋 Attestation will be available after this period ends.</p>
      </div>
    </div>
  );
}

export default function RedemptionEventCard({
  redemptionEvent,
  deadlineBlockNumber,
  deadlineTimestamp,
  isAttestationLoading = false,
  currentAttestationStep,
  isConnected = false,
  isLoadingAddresses = false,
  addressError = null,
  attestationError = null,
  attestationSuccess = null,
  attestationData = null,
  verificationResult = null,
  proofData = null,
  copiedText = null,
  onExecuteAttestation,
  onCopyToClipboard,
  setCopiedText,
  underlyingSecondsForPayment,
}: RedemptionEventCardProps) {
  const [isPaymentWaitingComplete, setIsPaymentWaitingComplete] =
    useState(false);
  const [isPaymentWaitingActive, setIsPaymentWaitingActive] = useState(false);

  // Start payment waiting period when redemption event is available
  useEffect(() => {
    if (
      redemptionEvent &&
      !isPaymentWaitingComplete &&
      !isPaymentWaitingActive
    ) {
      setIsPaymentWaitingActive(true);
    }
  }, [redemptionEvent, isPaymentWaitingComplete, isPaymentWaitingActive]);

  // Handle payment waiting completion
  const handlePaymentWaitingComplete = () => {
    setIsPaymentWaitingComplete(true);
    setIsPaymentWaitingActive(false);
  };

  const isButtonDisabled =
    isAttestationLoading ||
    !deadlineBlockNumber ||
    !deadlineTimestamp ||
    !isConnected ||
    isLoadingAddresses ||
    !!addressError ||
    !isPaymentWaitingComplete;

  return (
    <div className='space-y-4'>
      <h3 className='text-lg font-semibold text-green-900'>Redemption Event</h3>

      <div className='space-y-3'>
        <h4 className='text-md font-semibold text-green-800'>
          RedemptionRequested Event
        </h4>
        <div className='bg-green-50 border border-green-200 rounded p-4 space-y-2'>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>Request ID:</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.requestId}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Payment Reference:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.paymentReference}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>Agent Vault:</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.agentVault}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>Redeemer:</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.redeemer}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>Payment Address:</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.paymentAddress}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>Value UBA:</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.valueUBA}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>Agent fee UBA:</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.feeUBA}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>Executor:</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.executor}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Executor Fee Nat Wei:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.executorFeeNatWei}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              First Underlying Block:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.firstUnderlyingBlock}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Last Underlying Block:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.lastUnderlyingBlock}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Last Underlying Timestamp:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.lastUnderlyingTimestamp}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Deadline Block Number:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {deadlineBlockNumber || 'Calculating...'}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Deadline Timestamp:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {deadlineTimestamp || 'Calculating...'}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Destination Address:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {redemptionEvent.paymentAddress}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>Value UBA:</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {redemptionEvent.valueUBA}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>Agent fee UBA:</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {redemptionEvent.feeUBA}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>System fee UBA:</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {redemptionEvent.systemFeeUBA ?? '0'}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              XRPL payout (UBA):
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {(
                BigInt(redemptionEvent.valueUBA) -
                BigInt(redemptionEvent.feeUBA)
              ).toString()}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              XRPL payout (XRP):
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {formatXrpFromDrops(
                BigInt(redemptionEvent.valueUBA) -
                  BigInt(redemptionEvent.feeUBA)
              )}
            </code>
          </div>
          <p className='text-xs text-green-600'>
            The system fee was taken from the burned amount first and minted as
            FXRP to the system redemption fee receiver. Value UBA is what
            remains. The agent fee is taken from that remainder; the agent pays
            the rest on XRPL. When the payment is confirmed, the agent&apos;s
            redemption pool fee share of the agent fee is minted as FXRP into
            that agent&apos;s collateral pool.
          </p>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Payment Reference:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {redemptionEvent.paymentReference}
            </code>
          </div>
        </div>
      </div>

      {/* FDC Attestation Section */}
      <div className='space-y-4'>
        <h4 className='text-md font-semibold text-green-800'>
          FDC Payment Nonexistence Attestation
        </h4>

        <div className='bg-green-50 border border-green-200 rounded p-4 space-y-3'>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Minimal Block Number:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {redemptionEvent.firstUnderlyingBlock}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Deadline Block Number:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {deadlineBlockNumber || 'Calculating...'}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Deadline Timestamp:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {deadlineTimestamp || 'Calculating...'}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Destination Address Hash:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.paymentAddress}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>Amount (UBA):</span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono'>
              {(
                BigInt(redemptionEvent.valueUBA) -
                BigInt(redemptionEvent.feeUBA)
              ).toString()}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <span className='font-medium text-green-900'>
              Standard Payment Reference:
            </span>
            <code className='px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1'>
              {redemptionEvent.paymentReference}
            </code>
          </div>
        </div>

        <Button
          onClick={onExecuteAttestation}
          disabled={isButtonDisabled}
          className='w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400'
        >
          {isAttestationLoading ? (
            <>
              <Loader2 className='mr-2 h-4 w-4 animate-spin' />
              {currentAttestationStep || 'Executing Attestation...'}
            </>
          ) : !isPaymentWaitingComplete ? (
            <>
              <Clock className='mr-2 h-4 w-4' />
              Payment Waiting Period - Attestation Unavailable
            </>
          ) : (
            <>
              <Shield className='mr-2 h-4 w-4' />
              Execute Payment Nonexistence Attestation
            </>
          )}
        </Button>

        {/* Payment Waiting Countdown */}
        {isPaymentWaitingActive && underlyingSecondsForPayment && (
          <PaymentWaitingCountdownTimer
            underlyingSecondsForPayment={underlyingSecondsForPayment}
            onPaymentWaitingComplete={handlePaymentWaitingComplete}
          />
        )}

        {isAttestationLoading && currentAttestationStep && (
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4'>
            <div className='flex items-center gap-2'>
              <Loader2 className='h-4 w-4 animate-spin text-blue-600' />
              <span className='text-blue-800 font-medium'>
                {currentAttestationStep}
              </span>
            </div>
            <p className='text-blue-600 text-sm mt-2'>
              Please wait while the attestation process completes. This may take
              several minutes.
            </p>
          </div>
        )}

        {attestationError && (
          <Alert variant='destructive'>
            <XCircle className='h-4 w-4' />
            <AlertDescription>{attestationError}</AlertDescription>
          </Alert>
        )}

        {attestationSuccess && (
          <Alert className='bg-green-50 border-green-200 text-green-800'>
            <CheckCircle className='h-4 w-4' />
            <AlertDescription>{attestationSuccess}</AlertDescription>
          </Alert>
        )}

        {attestationData && (
          <div className='space-y-4'>
            <h5 className='text-md font-semibold text-green-800'>
              Attestation Data
            </h5>
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <span className='font-medium'>ABI Encoded Request:</span>
                <code className='px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1'>
                  {attestationData.abiEncodedRequest.length > 20
                    ? `${attestationData.abiEncodedRequest.slice(0, 10)}...${attestationData.abiEncodedRequest.slice(-10)}`
                    : attestationData.abiEncodedRequest}
                </code>
                <button
                  type='button'
                  onClick={() =>
                    onCopyToClipboard(
                      attestationData.abiEncodedRequest,
                      setCopiedText
                    )
                  }
                  className='h-6 w-6 p-0 hover:bg-gray-200 rounded'
                >
                  {copiedText === attestationData.abiEncodedRequest ? (
                    <Check className='h-3 w-3 text-green-600' />
                  ) : (
                    <Copy className='h-3 w-3 text-gray-500' />
                  )}
                </button>
              </div>
              <div className='flex items-center gap-2'>
                <span className='font-medium'>Round ID:</span>
                <code className='px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1'>
                  {attestationData.roundId ?? 'Calculating...'}
                </code>
                {attestationData.roundId !== null && (
                  <button
                    type='button'
                    onClick={() =>
                      onCopyToClipboard(
                        attestationData.roundId!.toString(),
                        setCopiedText
                      )
                    }
                    className='h-6 w-6 p-0 hover:bg-gray-200 rounded'
                  >
                    {copiedText === attestationData.roundId!.toString() ? (
                      <Check className='h-3 w-3 text-green-600' />
                    ) : (
                      <Copy className='h-3 w-3 text-gray-500' />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {verificationResult !== null && (
          <div className='space-y-4'>
            <h5 className='text-md font-semibold text-green-800'>
              Payment Nonexistence Verification Result
            </h5>
            <div className='flex items-center gap-2'>
              <span className='font-medium'>Verification Status:</span>
              <div
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  verificationResult
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {verificationResult
                  ? '✅ Payment Nonexistence Verified'
                  : '❌ Payment Found or Verification Failed'}
              </div>
            </div>
          </div>
        )}

        {proofData && (
          <div className='space-y-4'>
            <h5 className='text-md font-semibold text-green-800'>Proof Data</h5>
            <div className='space-y-2'>
              <div className='flex items-center gap-2'>
                <span className='font-medium'>Voting Round:</span>
                <code className='px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1'>
                  {proofData.response?.votingRound ?? 'Not available'}
                </code>
                {proofData.response?.votingRound && (
                  <button
                    type='button'
                    onClick={() =>
                      onCopyToClipboard(
                        proofData.response.votingRound.toString(),
                        setCopiedText
                      )
                    }
                    className='h-6 w-6 p-0 hover:bg-gray-200 rounded'
                  >
                    {copiedText ===
                    proofData.response.votingRound.toString() ? (
                      <Check className='h-3 w-3 text-green-600' />
                    ) : (
                      <Copy className='h-3 w-3 text-gray-500' />
                    )}
                  </button>
                )}
              </div>

              <div className='space-y-2'>
                <span className='font-medium'>Proof Array:</span>
                <div className='space-y-1'>
                  {proofData.proof &&
                    Array.isArray(proofData.proof) &&
                    proofData.proof.map((proofItem: string, index: number) => (
                      <div key={index} className='flex items-center gap-2'>
                        <span className='text-sm text-gray-600 w-8'>
                          [{index}]:
                        </span>
                        <code className='px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1'>
                          {proofItem.length > 20
                            ? `${proofItem.slice(0, 10)}...${proofItem.slice(-10)}`
                            : proofItem}
                        </code>
                        <button
                          type='button'
                          onClick={() =>
                            onCopyToClipboard(proofItem, setCopiedText)
                          }
                          className='h-6 w-6 p-0 hover:bg-gray-200 rounded'
                        >
                          {copiedText === proofItem ? (
                            <Check className='h-3 w-3 text-green-600' />
                          ) : (
                            <Copy className='h-3 w-3 text-gray-500' />
                          )}
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              <div className='space-y-2'>
                <span className='font-medium'>Response Body:</span>
                <div className='bg-gray-100 rounded p-3 text-sm font-mono'>
                  <div>
                    <strong>Minimal Block Timestamp:</strong>{' '}
                    {proofData.response?.responseBody?.minimalBlockTimestamp}
                  </div>
                  <div>
                    <strong>First Overflow Block Number:</strong>{' '}
                    {proofData.response?.responseBody?.firstOverflowBlockNumber}
                  </div>
                  <div>
                    <strong>First Overflow Block Timestamp:</strong>{' '}
                    {
                      proofData.response?.responseBody
                        ?.firstOverflowBlockTimestamp
                    }
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
