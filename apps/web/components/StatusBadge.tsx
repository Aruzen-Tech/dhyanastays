import type { BookingStatus, ListingStatus, PaymentStatus, PayoutStatus } from '../lib/types';

type AnyStatus = ListingStatus | BookingStatus | PayoutStatus | PaymentStatus;

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  // Listing
  DRAFT:             { label: 'Draft',            classes: 'bg-gray-100 text-gray-600' },
  PENDING_APPROVAL:  { label: 'Pending Review',   classes: 'bg-amber-100 text-amber-700' },
  APPROVED:          { label: 'Approved',         classes: 'bg-green-100 text-green-700' },
  REJECTED:          { label: 'Rejected',         classes: 'bg-red-100 text-red-700' },
  CHANGES_REQUESTED: { label: 'Changes Needed',   classes: 'bg-orange-100 text-orange-700' },
  // Booking
  HOLD:              { label: 'Hold',             classes: 'bg-blue-100 text-blue-700' },
  PAYMENT_PENDING:   { label: 'Payment Pending',  classes: 'bg-amber-100 text-amber-700' },
  CONFIRMED_DEPOSIT: { label: 'Deposit Paid',     classes: 'bg-teal-100 text-teal-700' },
  BALANCE_DUE:       { label: 'Balance Due',      classes: 'bg-orange-100 text-orange-700' },
  CONFIRMED_PAID:    { label: 'Confirmed',        classes: 'bg-green-100 text-green-700' },
  CANCELLED:         { label: 'Cancelled',        classes: 'bg-red-100 text-red-700' },
  REFUNDED:          { label: 'Refunded',         classes: 'bg-purple-100 text-purple-700' },
  COMPLETED:         { label: 'Completed',        classes: 'bg-brand-100 text-brand-700' },
  // Payment
  INITIATED:         { label: 'Initiated',        classes: 'bg-blue-100 text-blue-700' },
  CAPTURED:          { label: 'Captured',         classes: 'bg-green-100 text-green-700' },
  FAILED:            { label: 'Failed',           classes: 'bg-red-100 text-red-700' },
  // Payout
  NOT_ELIGIBLE:      { label: 'Not Eligible',     classes: 'bg-gray-100 text-gray-500' },
  ELIGIBLE:          { label: 'Eligible',         classes: 'bg-teal-100 text-teal-700' },
  SCHEDULED:         { label: 'Scheduled',        classes: 'bg-blue-100 text-blue-700' },
  PAID:              { label: 'Paid',             classes: 'bg-green-100 text-green-700' },
  ON_HOLD:           { label: 'On Hold',          classes: 'bg-amber-100 text-amber-700' },
  REVERSED:          { label: 'Reversed',         classes: 'bg-red-100 text-red-700' },
};

interface Props {
  status: AnyStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const config = STATUS_CONFIG[status] ?? { label: status, classes: 'bg-gray-100 text-gray-600' };
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.classes}`}>
      {config.label}
    </span>
  );
}
