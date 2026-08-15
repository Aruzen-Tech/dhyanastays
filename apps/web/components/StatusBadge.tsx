import type { BookingStatus, ListingStatus, PaymentStatus, PayoutStatus } from '../lib/types';

type AnyStatus = ListingStatus | BookingStatus | PayoutStatus | PaymentStatus;

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  // Listing
  DRAFT:             { label: 'Draft',            classes: 'badge-neutral' },
  PENDING_APPROVAL:  { label: 'Pending Review',   classes: 'badge-warning' },
  APPROVED:          { label: 'Approved',         classes: 'badge-success' },
  REJECTED:          { label: 'Rejected',         classes: 'badge-error' },
  CHANGES_REQUESTED: { label: 'Changes Needed',   classes: 'badge-orange' },
  // Booking
  HOLD:              { label: 'Hold',             classes: 'badge-info' },
  PAYMENT_PENDING:   { label: 'Payment Pending',  classes: 'badge-warning' },
  CONFIRMED_DEPOSIT: { label: 'Deposit Paid',     classes: 'badge-teal' },
  BALANCE_DUE:       { label: 'Balance Due',      classes: 'badge-orange' },
  CONFIRMED_PAID:    { label: 'Confirmed',        classes: 'badge-success' },
  CANCELLED:         { label: 'Cancelled',        classes: 'badge-error' },
  REFUNDED:          { label: 'Refunded',         classes: 'badge-purple' },
  COMPLETED:         { label: 'Completed',        classes: 'bg-brand-100 text-brand-700' },
  // Payment
  INITIATED:         { label: 'Initiated',        classes: 'badge-info' },
  CAPTURED:          { label: 'Captured',         classes: 'badge-success' },
  FAILED:            { label: 'Failed',           classes: 'badge-error' },
  // Payout
  NOT_ELIGIBLE:      { label: 'Not Eligible',     classes: 'badge-neutral' },
  ELIGIBLE:          { label: 'Eligible',         classes: 'badge-teal' },
  SCHEDULED:         { label: 'Scheduled',        classes: 'badge-info' },
  PAID:              { label: 'Paid',             classes: 'badge-success' },
  ON_HOLD:           { label: 'On Hold',          classes: 'badge-warning' },
  REVERSED:          { label: 'Reversed',         classes: 'badge-error' },
};

interface Props {
  status: AnyStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const config = STATUS_CONFIG[status] ?? { label: status, classes: 'badge-neutral' };
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.classes}`}>
      {config.label}
    </span>
  );
}
