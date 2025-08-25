import { Shield, Loader2, XCircle, CheckCircle, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RedemptionEvent {
  requestId: string;
  paymentReference: string;
  agentVault: string;
  redeemer: string;
  paymentAddress: string;
  valueUBA: string;
  feeUBA: string;
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
  onCopyToClipboard: (text: string, setCopiedText: (text: string | null) => void) => void;
  setCopiedText: (text: string | null) => void;
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
  setCopiedText
}: RedemptionEventCardProps) {
  const isButtonDisabled = isAttestationLoading || 
    !deadlineBlockNumber || 
    !deadlineTimestamp || 
    !isConnected || 
    isLoadingAddresses || 
    !!addressError;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-green-900">Redemption Event</h3>
      
      <div className="space-y-3">
        <h4 className="text-md font-semibold text-green-800">RedemptionRequested Event</h4>
        <div className="bg-green-50 border border-green-200 rounded p-4 space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Request ID:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
              {redemptionEvent.requestId}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Payment Reference:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
              {redemptionEvent.paymentReference}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Agent Vault:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
              {redemptionEvent.agentVault}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Redeemer:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
              {redemptionEvent.redeemer}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Payment Address:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
              {redemptionEvent.paymentAddress}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Value UBA:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
              {redemptionEvent.valueUBA}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Fee UBA:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
              {redemptionEvent.feeUBA}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Executor:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
              {redemptionEvent.executor}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Executor Fee Nat Wei:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
              {redemptionEvent.executorFeeNatWei}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">First Underlying Block:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
              {redemptionEvent.firstUnderlyingBlock}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Last Underlying Block:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
              {redemptionEvent.lastUnderlyingBlock}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Last Underlying Timestamp:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono flex-1">
              {redemptionEvent.lastUnderlyingTimestamp}
            </code>
          </div>
        </div>
      </div>

      {/* FDC Attestation Section */}
      <div className="space-y-4">
        <h4 className="text-md font-semibold text-green-800">FDC Payment Nonexistence Attestation</h4>
        
        <div className="bg-green-50 border border-green-200 rounded p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Minimal Block Number:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
              {redemptionEvent.firstUnderlyingBlock}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Deadline Block Number:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
              {deadlineBlockNumber || 'Calculating...'}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Deadline Timestamp:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
              {deadlineTimestamp || 'Calculating...'}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Destination Address:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
              {redemptionEvent.paymentAddress}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Value UBA:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
              {redemptionEvent.valueUBA}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Fee UBA:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
              {redemptionEvent.feeUBA}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Net Amount (UBA):</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
              {(BigInt(redemptionEvent.valueUBA) - BigInt(redemptionEvent.feeUBA)).toString()}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Net Amount (XRP):</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
              {((BigInt(redemptionEvent.valueUBA) - BigInt(redemptionEvent.feeUBA)) / BigInt(1000000)).toString()}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-900">Payment Reference:</span>
            <code className="px-2 py-1 bg-green-100 rounded text-sm font-mono">
              {redemptionEvent.paymentReference}
            </code>
          </div>
        </div>

        <Button
          onClick={onExecuteAttestation}
          disabled={isButtonDisabled}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400"
        >
          {isAttestationLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {currentAttestationStep || 'Executing Attestation...'}
            </>
          ) : (
            <>
              <Shield className="mr-2 h-4 w-4" />
              Execute Payment Nonexistence Attestation
            </>
          )}
        </Button>

        {isAttestationLoading && currentAttestationStep && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-blue-800 font-medium">{currentAttestationStep}</span>
            </div>
            <p className="text-blue-600 text-sm mt-2">
              Please wait while the attestation process completes. This may take several minutes.
            </p>
          </div>
        )}

        {attestationError && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{attestationError}</AlertDescription>
          </Alert>
        )}

        {attestationSuccess && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{attestationSuccess}</AlertDescription>
          </Alert>
        )}

        {attestationData && (
          <div className="space-y-4">
            <h5 className="text-md font-semibold text-green-800">Attestation Data</h5>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">ABI Encoded Request:</span>
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1">
                  {attestationData.abiEncodedRequest.length > 20 
                    ? `${attestationData.abiEncodedRequest.slice(0, 10)}...${attestationData.abiEncodedRequest.slice(-10)}`
                    : attestationData.abiEncodedRequest
                  }
                </code>
                <button
                  type="button"
                  onClick={() => onCopyToClipboard(attestationData.abiEncodedRequest, setCopiedText)}
                  className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                >
                  {copiedText === attestationData.abiEncodedRequest ? (
                    <Check className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3 text-gray-500" />
                  )}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Round ID:</span>
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1">
                  {attestationData.roundId ?? 'Calculating...'}
                </code>
                {attestationData.roundId !== null && (
                  <button
                    type="button"
                    onClick={() => onCopyToClipboard(attestationData.roundId!.toString(), setCopiedText)}
                    className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                  >
                    {copiedText === attestationData.roundId!.toString() ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-gray-500" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {verificationResult !== null && (
          <div className="space-y-4">
            <h5 className="text-md font-semibold text-green-800">Payment Nonexistence Verification Result</h5>
            <div className="flex items-center gap-2">
              <span className="font-medium">Verification Status:</span>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                verificationResult 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {verificationResult ? '✅ Payment Nonexistence Verified' : '❌ Payment Found or Verification Failed'}
              </div>
            </div>
          </div>
        )}

        {proofData && (
          <div className="space-y-4">
            <h5 className="text-md font-semibold text-green-800">Proof Data</h5>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium">Voting Round:</span>
                <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1">
                  {proofData.response?.votingRound ?? 'Not available'}
                </code>
                {proofData.response?.votingRound && (
                  <button
                    type="button"
                    onClick={() => onCopyToClipboard(proofData.response.votingRound.toString(), setCopiedText)}
                    className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                  >
                    {copiedText === proofData.response.votingRound.toString() ? (
                      <Check className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3 text-gray-500" />
                    )}
                  </button>
                )}
              </div>
              
              <div className="space-y-2">
                <span className="font-medium">Proof Array:</span>
                <div className="space-y-1">
                  {proofData.proof && Array.isArray(proofData.proof) && proofData.proof.map((proofItem: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 w-8">[{index}]:</span>
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1">
                        {proofItem.length > 20 
                          ? `${proofItem.slice(0, 10)}...${proofItem.slice(-10)}`
                          : proofItem
                        }
                      </code>
                      <button
                        type="button"
                        onClick={() => onCopyToClipboard(proofItem, setCopiedText)}
                        className="h-6 w-6 p-0 hover:bg-gray-200 rounded"
                      >
                        {copiedText === proofItem ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3 text-gray-500" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <span className="font-medium">Response Body:</span>
                <div className="bg-gray-100 rounded p-3 text-sm font-mono">
                  <div><strong>Minimal Block Timestamp:</strong> {proofData.response?.responseBody?.minimalBlockTimestamp}</div>
                  <div><strong>First Overflow Block Number:</strong> {proofData.response?.responseBody?.firstOverflowBlockNumber}</div>
                  <div><strong>First Overflow Block Timestamp:</strong> {proofData.response?.responseBody?.firstOverflowBlockTimestamp}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
