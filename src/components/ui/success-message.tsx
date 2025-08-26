import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { copyToClipboardWithBooleanState } from '@/lib/clipboard';

interface SuccessMessageProps {
  reservationId: string;
  paymentAmount: string;
  paymentAddress: string;
  paymentReference: string;
}

export function SuccessMessage({
  reservationId,
  paymentAmount,
  paymentAddress,
  paymentReference,
}: SuccessMessageProps) {
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [copiedReservationId, setCopiedReservationId] =
    useState<boolean>(false);
  const [copiedPaymentAmount, setCopiedPaymentAmount] =
    useState<boolean>(false);
  const [copiedPaymentReference, setCopiedPaymentReference] =
    useState<boolean>(false);

  // Helper function to copy text to clipboard
  const copyToClipboard = async (
    text: string,
    setter: (value: boolean) => void
  ) => {
    await copyToClipboardWithBooleanState(text, setter);
  };

  // Extract just the number from payment amount (remove "XRP")
  const paymentAmountNumber = paymentAmount.replace(' XRP', '');

  return (
    <div className='space-y-3'>
      <p className='font-semibold text-blue-800'>
        Successfully reserved collateral!
      </p>
      <div className='bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4'>
        <p className='text-blue-800 text-sm'>
          <strong>Next step:</strong> Make an XRPL payment using the details
          below to complete your FXRP minting.
        </p>
      </div>
      <div className='space-y-2'>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>Reservation ID:</span>
          <code className='px-2 py-1 bg-gray-100 rounded text-sm font-mono'>
            {reservationId}
          </code>
          <button
            type='button'
            onClick={() =>
              copyToClipboard(reservationId, setCopiedReservationId)
            }
            className='h-6 w-6 p-0 hover:bg-gray-200 rounded'
          >
            {copiedReservationId ? (
              <Check className='h-3 w-3 text-green-600' />
            ) : (
              <Copy className='h-3 w-3 text-gray-500' />
            )}
          </button>
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>Payment Amount:</span>
          <code className='px-2 py-1 bg-gray-100 rounded text-sm font-mono'>
            {paymentAmount}
          </code>
          <button
            type='button'
            onClick={() =>
              copyToClipboard(paymentAmountNumber, setCopiedPaymentAmount)
            }
            className='h-6 w-6 p-0 hover:bg-gray-200 rounded'
          >
            {copiedPaymentAmount ? (
              <Check className='h-3 w-3 text-green-600' />
            ) : (
              <Copy className='h-3 w-3 text-gray-500' />
            )}
          </button>
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>Payment Address:</span>
          <code className='px-2 py-1 bg-gray-100 rounded text-sm font-mono'>
            {paymentAddress}
          </code>
          <button
            type='button'
            onClick={() =>
              copyToClipboard(paymentAddress, () =>
                setCopiedAddress(paymentAddress)
              )
            }
            className='h-6 w-6 p-0 hover:bg-gray-200 rounded'
          >
            {copiedAddress === paymentAddress ? (
              <Check className='h-3 w-3 text-green-600' />
            ) : (
              <Copy className='h-3 w-3 text-gray-500' />
            )}
          </button>
        </div>
        <div className='flex items-center gap-2'>
          <span className='font-medium'>Payment Reference:</span>
          <code className='px-2 py-1 bg-gray-100 rounded text-sm font-mono'>
            {paymentReference}
          </code>
          <button
            type='button'
            onClick={() =>
              copyToClipboard(paymentReference, setCopiedPaymentReference)
            }
            className='h-6 w-6 p-0 hover:bg-gray-200 rounded'
          >
            {copiedPaymentReference ? (
              <Check className='h-3 w-3 text-green-600' />
            ) : (
              <Copy className='h-3 w-3 text-gray-500' />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
