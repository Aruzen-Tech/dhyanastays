/**
 * The single definition of "may this host be paid?".
 *
 * Every payout guard funnels through here so the rule can't drift between the
 * batch runner, the mark-paid check and the host-facing status page. Kept as a
 * pure function (no Prisma, no DI) so it is trivially testable and safe to call
 * in a loop over hundreds of hosts.
 */

export type PayoutBlockCode =
  | 'HOST_NOT_VERIFIED'
  | 'PAYOUTS_DISABLED'
  | 'NO_PAYOUT_ACCOUNT'
  | 'ACCOUNT_NOT_VERIFIED'
  | 'ADMIN_HOLD';

export const PAYOUT_BLOCK_MESSAGE: Record<PayoutBlockCode, string> = {
  HOST_NOT_VERIFIED: 'Host verification is not approved',
  PAYOUTS_DISABLED: 'Payouts are not enabled for this host',
  NO_PAYOUT_ACCOUNT: 'No payout account has been submitted',
  ACCOUNT_NOT_VERIFIED: 'Payout account KYC is not verified',
  ADMIN_HOLD: 'Payouts are administratively held',
};

export interface HostPayoutState {
  verificationStatus: string;
  payoutEnabled: boolean;
  payoutsBlockedReason: string | null;
  payoutAccount: { status: string } | null;
}

export interface PayoutReadiness {
  ready: boolean;
  blocks: PayoutBlockCode[];
  /** One-line, human-readable summary — used as `PayoutLine.holdReason`. */
  summary: string;
}

export function evaluatePayoutReadiness(host: HostPayoutState): PayoutReadiness {
  const blocks: PayoutBlockCode[] = [];

  if (host.verificationStatus !== 'APPROVED') blocks.push('HOST_NOT_VERIFIED');
  if (!host.payoutEnabled) blocks.push('PAYOUTS_DISABLED');
  if (!host.payoutAccount) blocks.push('NO_PAYOUT_ACCOUNT');
  else if (host.payoutAccount.status !== 'VERIFIED') blocks.push('ACCOUNT_NOT_VERIFIED');
  if (host.payoutsBlockedReason) blocks.push('ADMIN_HOLD');

  const summary = blocks
    .map((b) =>
      b === 'ADMIN_HOLD'
        ? `${PAYOUT_BLOCK_MESSAGE.ADMIN_HOLD}: ${host.payoutsBlockedReason}`
        : PAYOUT_BLOCK_MESSAGE[b],
    )
    .join('; ');

  return { ready: blocks.length === 0, blocks, summary };
}

/** Prisma `select` that yields exactly a {@link HostPayoutState}. */
export const HOST_PAYOUT_STATE_SELECT = {
  verificationStatus: true,
  payoutEnabled: true,
  payoutsBlockedReason: true,
  payoutAccount: { select: { status: true } },
} as const;
