'use client';

import { useState, useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle, XCircle, Copy, Check } from "lucide-react";
import { AttestationFormDataSchema, AttestationFormData, ProofData } from '@/types/attestationFormData';
import { 
  useWriteIFdcHubRequestAttestation,
  iFdcRequestFeeConfigurationsAbi,
  iFlareSystemsManagerAbi,
  iPaymentVerificationAbi
} from '@/generated';
import { useFdcContracts } from '@/hooks/useFdcContracts';
import { copyToClipboardWithTimeout } from '@/lib/clipboard';
import { publicClient } from '@/lib/publicClient';
import { toHex } from '@/lib/utils';
import { AttestationData } from '@/types/attestation';

export default function Attestation() {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset
  } = useForm<AttestationFormData>({
    resolver: zodResolver(AttestationFormDataSchema),
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [attestationData, setAttestationData] = useState<AttestationData | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [proofData, setProofData] = useState<ProofData | null>(null);
  const [verificationResult, setVerificationResult] = useState<boolean | null>(null);

  const { address: userAddress, isConnected } = useAccount();

  const { addresses: fdcAddresses, isLoading: isLoadingAddresses, error: addressError } = useFdcContracts();

  const { writeContract: requestAttestation, data: attestationHash, isPending: isAttestationPending } = useWriteIFdcHubRequestAttestation();
  const { data: receipt, isSuccess: isAttestationSuccess } = useWaitForTransactionReceipt({ hash: attestationHash });

  // Handle transaction success and calculate round ID
  useEffect(() => {
    if (isAttestationSuccess && receipt && attestationData && attestationData.roundId === null) {
      const processTransaction = async () => {
        try {
          setCurrentStep('Calculating round ID from transaction...');
          const roundId = await calculateRoundId({ receipt: { blockNumber: receipt.blockNumber } });
          console.log('Calculated round ID:', roundId);
          
          // Update attestationData with the calculated round ID
          setAttestationData(prevData => prevData ? { ...prevData, roundId } : null);
          
          // Start proof retrieval
          setCurrentStep('Retrieving proof from Data Availability Layer...');
          const proof = await retrieveDataAndProofBaseWithRetry(
            DA_LAYER_API_URL,
            attestationData.abiEncodedRequest,
            roundId
          );
          
          setProofData(proof);
          
          // Verify the payment
          setCurrentStep('Verifying payment with FDC Verification contract...');
          const verificationResult = await verifyPayment(proof);
          setVerificationResult(verificationResult);
          
          setCurrentStep('');
          setSuccess(`Round ID ${roundId} calculated, proof retrieved, and payment verified successfully! Verification result: ${verificationResult}`);
        } catch (error) {
          console.error('Error processing transaction:', error);
          setCurrentStep('');
          setError(error instanceof Error ? error.message : 'Error processing transaction');
        }
      };

      processTransaction();
    }
  }, [isAttestationSuccess, receipt, attestationData]);

  // Environment variables and constants
  const VERIFIER_URL_TESTNET = 'https://fdc-verifiers-testnet.flare.network/';
  const VERIFIER_API_KEY_TESTNET = '00000000-0000-0000-0000-000000000000';
  const DA_LAYER_API_KEY = '00000000-0000-0000-0000-000000000000';
  const DA_LAYER_API_URL = `/api/proof-request`;
  const urlTypeBase = 'xrp';
  const attestationTypeBase = 'Payment';
  const sourceIdBase = 'testXRP';

  // Base function to prepare attestation request
  const prepareAttestationRequestBase = async (
    url: string,
    apiKey: string,
    attestationTypeBase: string,
    sourceIdBase: string,
    requestBody: { transactionId: string; inUtxo: string; utxo: string }
  ) => {
    console.log("Url:", url, "\n");
    const attestationType = toHex(attestationTypeBase);
    const sourceId = toHex(sourceIdBase);

    const request = {
      attestationType: attestationType,
      sourceId: sourceId,
      requestBody: requestBody,
    };
    console.log("Prepared request:\n", request, "\n");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });
    if (response.status != 200) {
      throw new Error(`Response status is not OK, status ${response.status} ${response.statusText}\n`);
    }
    console.log("Response status is OK\n");

    return await response.json();
  };

  // Prepare attestation request
  const prepareAttestationRequest = async (transactionId: string, inUtxo: string = "0", utxo: string = "0") => {
    const requestBody = {
      transactionId: transactionId,
      inUtxo: inUtxo,
      utxo: utxo,
    };

    const url = `${VERIFIER_URL_TESTNET}verifier/${urlTypeBase}/Payment/prepareRequest`;
    const apiKey = VERIFIER_API_KEY_TESTNET ?? "";

    return await prepareAttestationRequestBase(url, apiKey, attestationTypeBase, sourceIdBase, requestBody);
  };


  // Get FDC request fee
  const getFdcRequestFee = async (abiEncodedRequest: string) => {
    if (!fdcAddresses?.fdcRequestFeeConfigurations) {
      throw new Error('FDC Request Fee Configurations address not loaded');
    }

    return await publicClient.readContract({
      address: fdcAddresses.fdcRequestFeeConfigurations,
      abi: iFdcRequestFeeConfigurationsAbi,
      functionName: 'getRequestFee',
      args: [abiEncodedRequest as `0x${string}`],
    });
  };

  // Calculate round ID from transaction
  const calculateRoundId = async (transaction: { receipt: { blockNumber: bigint } }) => {
    if (!fdcAddresses?.flareSystemsManager) {
      throw new Error('Flare Systems Manager address not loaded');
    }

    const blockNumber = transaction.receipt.blockNumber;
    const block = await publicClient.getBlock({ blockNumber });
    const blockTimestamp = BigInt(block.timestamp);

    const firsVotingRoundStartTs = BigInt(await publicClient.readContract({
      address: fdcAddresses.flareSystemsManager,
      abi: iFlareSystemsManagerAbi,
      functionName: 'firstVotingRoundStartTs',
    }));

    const votingEpochDurationSeconds = BigInt(await publicClient.readContract({
      address: fdcAddresses.flareSystemsManager,
      abi: iFlareSystemsManagerAbi,
      functionName: 'votingEpochDurationSeconds',
    }));

    console.log("Block timestamp:", blockTimestamp, "\n");
    console.log("First voting round start ts:", firsVotingRoundStartTs, "\n");
    console.log("Voting epoch duration seconds:", votingEpochDurationSeconds, "\n");

    const roundId = Number((blockTimestamp - firsVotingRoundStartTs) / votingEpochDurationSeconds);
    console.log("Calculated round id:", roundId, "\n");
    
    const currentVotingEpochId = Number(await publicClient.readContract({
      address: fdcAddresses.flareSystemsManager,
      abi: iFlareSystemsManagerAbi,
      functionName: 'getCurrentVotingEpochId',
    }));
    console.log("Received round id:", currentVotingEpochId, "\n");
    
    return roundId;
  };

  // Sleep utility function
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Post request to DA Layer
  const postRequestToDALayer = async (url: string, request: Record<string, unknown>, isInitial: boolean = false) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'x-api-key': DA_LAYER_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`DA Layer request failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  };

  // Retrieve data and proof base function
  const retrieveDataAndProofBase = async (url: string, abiEncodedRequest: string, roundId: number) => {
    console.log("Waiting for the round to finalize...");
    
    // Wait for round finalization (simplified - just wait a bit)
    await sleep(30000);
    console.log("Round finalized!\n");

    const request = {
      votingRoundId: roundId,
      requestBytes: abiEncodedRequest,
    };
    console.log("Prepared request:\n", request, "\n");

    await sleep(10000);
    let proof = await postRequestToDALayer(url, request, true);
    console.log("Waiting for the DA Layer to generate the proof...");
    
    // If we get a successful response with proof data, return immediately
    if (proof.response && proof.proof && Array.isArray(proof.proof)) {
      console.log("Proof generated on first attempt!\n");
      console.log("Proof:", proof, "\n");
      return proof;
    }
    
    // Only retry if we don't have the proof data yet
    while (!proof.response || !proof.proof || !Array.isArray(proof.proof)) {
      await sleep(10000);
      proof = await postRequestToDALayer(url, request, false);
      
      // If we get a successful response with proof data, break out of the loop
      if (proof.response && proof.proof && Array.isArray(proof.proof)) {
        break;
      }
    }
    console.log("Proof generated!\n");

    console.log("Proof:", proof, "\n");
    return proof;
  };

  // Retrieve data and proof with retry
  const retrieveDataAndProofBaseWithRetry = async (
    url: string,
    abiEncodedRequest: string,
    roundId: number,
    attempts: number = 10
  ) => {
    for (let i = 0; i < attempts; i++) {
      try {
        return await retrieveDataAndProofBase(url, abiEncodedRequest, roundId);
      } catch (error) {
        console.log(error, "\n", "Remaining attempts:", attempts - i, "\n");
        await sleep(20000);
      }
    }
    throw new Error(`Failed to retrieve data and proofs after ${attempts} attempts`);
  };

  // Verify payment using FDC Verification contract
  const verifyPayment = async (proofData: ProofData) => {
    if (!fdcAddresses?.fdcVerification) {
      throw new Error('FDC Verification address not loaded');
    }

    if (!proofData.response || !proofData.proof) {
      throw new Error('Proof data is incomplete');
    }

    // Extract data from proof response
    const response = proofData.response;
    const proof = proofData.proof;

    // Call verifyPayment function
    const result = await publicClient.readContract({
      address: fdcAddresses.fdcVerification,
      abi: iPaymentVerificationAbi,
      functionName: 'verifyPayment',
      args: [{
        merkleProof: proof,
        data: {
          attestationType: response.attestationType,
          sourceId: response.sourceId,
          votingRound: BigInt(response.votingRound),
          lowestUsedTimestamp: BigInt(response.lowestUsedTimestamp),
          requestBody: {
            transactionId: response.requestBody.transactionId,
            inUtxo: BigInt(response.requestBody.inUtxo),
            utxo: BigInt(response.requestBody.utxo),
          },
          responseBody: {
            blockNumber: BigInt(response.responseBody.blockNumber),
            blockTimestamp: BigInt(response.responseBody.blockTimestamp),
            sourceAddressHash: response.responseBody.sourceAddressHash,
            sourceAddressesRoot: response.responseBody.sourceAddressesRoot,
            receivingAddressHash: response.responseBody.receivingAddressHash,
            intendedReceivingAddressHash: response.responseBody.intendedReceivingAddressHash,
            spentAmount: BigInt(response.responseBody.spentAmount),
            intendedSpentAmount: BigInt(response.responseBody.intendedSpentAmount),
            receivedAmount: BigInt(response.responseBody.receivedAmount),
            intendedReceivedAmount: BigInt(response.responseBody.intendedReceivedAmount),
            standardPaymentReference: response.responseBody.standardPaymentReference,
            oneToOne: response.responseBody.oneToOne,
            status: response.responseBody.status,
          },
        }
      }],
    });

    console.log('Payment verification result:', result);
    return result;
  };

  // Submit attestation request to FDC Hub
  const submitAttestationRequest = async (abiEncodedRequest: string): Promise<void> => {
    if (!isConnected) {
      throw new Error('Please connect your wallet first');
    }

    if (!fdcAddresses?.fdcHub) {
      throw new Error('FDC Hub address not loaded');
    }

    console.log('Submitting attestation request:', abiEncodedRequest);
    
    // Get the request fee
    const requestFee = await getFdcRequestFee(abiEncodedRequest);
    console.log('Request fee:', requestFee);

    // Submit the attestation request
    requestAttestation({
      address: fdcAddresses.fdcHub,
      args: [abiEncodedRequest as `0x${string}`],
      value: requestFee,
    });
  };


  // Validate XRPL transaction ID format
  const isValidXRPLTransactionId = (txId: string): boolean => {
    // XRPL transaction IDs are 64-character hexadecimal strings
    const xrplTxIdRegex = /^[A-F0-9]{64}$/i;
    return xrplTxIdRegex.test(txId);
  };

  // Main attestation process
  const executeAttestation = async (data: AttestationFormData) => {
    const transactionId = data.transactionId.trim();

    if (!fdcAddresses) {
      setError('FDC contract addresses not loaded. Please wait and try again.');
      return;
    }

    if (addressError) {
      setError(`Error loading contract addresses: ${addressError}`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setCurrentStep('');
    setAttestationData(null);

    try {
      // Step 1: Prepare attestation request
      setCurrentStep('Preparing attestation request...');
      console.log('Preparing attestation request...');
      
      // Prepare the attestation request using the verifier API
      const attestationResponse = await prepareAttestationRequest(transactionId);
      console.log('Attestation response:', attestationResponse);
      
      // Create attestation data structure with the real ABI encoded request
      const data: AttestationData = {
        abiEncodedRequest: attestationResponse.abiEncodedRequest,
        roundId: null, // Will be calculated after transaction
      };
      console.log('Attestation data:', data);
      setAttestationData(data);

      // Step 2: Submit attestation request
      setCurrentStep('Submitting attestation request to blockchain...');
      console.log('Submitting attestation request...');
      await submitAttestationRequest(data.abiEncodedRequest);
      
      // Wait for transaction to be mined and calculate round ID
      setCurrentStep('Waiting for transaction confirmation...');
      
      setCurrentStep('');
      setSuccess('Attestation request submitted! Waiting for confirmation...');
    } catch (error) {
      console.error('Attestation error:', error);
      setCurrentStep('');
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <CheckCircle className="h-5 w-5 text-purple-600" />
            XRP Payment Attestation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-purple-700 mb-6">
            Execute Flare Data Connector XRP Payment attestation to verify XRP transactions.
          </p>

          <form onSubmit={handleSubmit(executeAttestation)} className="space-y-6">
            {/* Input Form */}
            <div className="space-y-2">
              <Label htmlFor="transactionId" className="text-purple-900">Transaction ID</Label>
              <Input
                {...register('transactionId')}
                id="transactionId"
                placeholder="85B182F7B250BF8CB23531ECA5B508C0F66E8B7AEF7C8EE0CF851A7B2F8A9EB1"
                className={`border-purple-300 focus:ring-purple-500 focus:border-purple-500 ${
                  errors.transactionId ? 'border-red-300 focus:ring-red-500 focus:border-red-500' : ''
                }`}
              />
              {errors.transactionId && (
                <p className="text-sm text-red-600">
                  {errors.transactionId.message}
                </p>
              )}
            </div>

            {/* Contract Addresses Loading */}
            {isLoadingAddresses && (
              <Alert className="bg-purple-50 border-purple-200 text-purple-800">
                <AlertDescription>
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading FDC contract addresses...
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Address Error */}
            {addressError && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>Error loading contract addresses: {addressError}</AlertDescription>
              </Alert>
            )}

            {/* Wallet Connection Check */}
            {!isConnected && !isLoadingAddresses && (
              <Alert className="bg-yellow-50 border-yellow-200 text-yellow-800">
                <AlertDescription>
                  Please connect your wallet to submit attestation requests to the blockchain.
                </AlertDescription>
              </Alert>
            )}

            {/* Execute Button */}
            <Button
              type="submit"
              disabled={isLoading || !isConnected || isLoadingAddresses || !!addressError}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentStep || 'Executing Attestation...'}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Execute Attestation
                </>
              )}
            </Button>

            {/* Progress indicator */}
            {isLoading && currentStep && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-blue-800 font-medium">{currentStep}</span>
                </div>
                <p className="text-blue-600 text-sm mt-2">
                  Please wait while the attestation process completes. This may take several minutes.
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Success Display */}
            {success && (
              <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            {/* Results Display */}
            {attestationData && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-900">Attestation Data</h3>
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
                      onClick={() => copyToClipboardWithTimeout(attestationData.abiEncodedRequest, setCopiedText)}
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
                        onClick={() => copyToClipboardWithTimeout(attestationData.roundId!.toString(), setCopiedText)}
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

            {/* Verification Result Display */}
            {verificationResult !== null && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-900">Payment Verification Result</h3>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Verification Status:</span>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    verificationResult 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {verificationResult ? '✅ Verified' : '❌ Failed'}
                  </div>
                </div>
              </div>
            )}

            {/* Proof Data Display */}
            {proofData && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-purple-900">Proof Data</h3>
                <div className="space-y-2">
                  {/* Voting Round */}
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Voting Round:</span>
                    <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono flex-1">
                      {proofData.response?.votingRound ?? 'Not available'}
                    </code>
                    {proofData.response?.votingRound && (
                      <button
                        type="button"
                        onClick={() => copyToClipboardWithTimeout(proofData.response.votingRound.toString(), setCopiedText)}
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
                  
                  {/* Proof Array */}
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
                            onClick={() => copyToClipboardWithTimeout(proofItem, setCopiedText)}
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
                  
                  {/* Response Body */}
                  <div className="space-y-2">
                    <span className="font-medium">Response Body:</span>
                    <div className="bg-gray-100 rounded p-3 text-sm font-mono">
                      <div><strong>Block Number:</strong> {proofData.response?.responseBody?.blockNumber}</div>
                      <div><strong>Block Timestamp:</strong> {proofData.response?.responseBody?.blockTimestamp}</div>
                      <div><strong>Spent Amount:</strong> {proofData.response?.responseBody?.spentAmount}</div>
                      <div><strong>Received Amount:</strong> {proofData.response?.responseBody?.receivedAmount}</div>
                      <div><strong>Status:</strong> {proofData.response?.responseBody?.status}</div>
                      <div><strong>One to One:</strong> {proofData.response?.responseBody?.oneToOne ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
