import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PayoutAccountStatus, PayoutMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { PayoutCryptoService } from '../common/services/payout-crypto.service';
import {
  SetPayoutHoldDto,
  SubmitPayoutAccountDto,
  VerifyPayoutAccountDto,
} from './dto/payout-account.dto';
import {
  evaluatePayoutReadiness,
  HOST_PAYOUT_STATE_SELECT,
  type PayoutReadiness,
} from './payout-readiness';

/** Shape returned to clients — never includes ciphertext or full identifiers. */
export interface MaskedPayoutAccount {
  method: PayoutMethod;
  legalName: string;
  bankName: string | null;
  ifsc: string | null;
  accountLast4: string | null;
  upiVpa: string | null;
  panLast4: string | null;
  status: PayoutAccountStatus;
  rejectionReason: string | null;
  verifiedAt: Date | null;
  updatedAt: Date;
}

/**
 * Host payout account + KYC capture (RBI PA/PG readiness).
 *
 * Hosts submit a bank account or UPI VPA plus their PAN; staff verify it; only
 * a VERIFIED account unlocks payouts. Sensitive identifiers are encrypted on
 * the way in and only ever read back masked — see {@link PayoutCryptoService}.
 *
 * Re-submitting always drops the account back to SUBMITTED and re-holds the
 * host's queued money: a changed destination must be re-verified before another
 * rupee leaves the platform.
 */
@Injectable()
export class PayoutAccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly crypto: PayoutCryptoService,
  ) {}

  // ── Host-facing ──────────────────────────────────────────────────────────
  /** The host's own account (masked) + why they can or cannot be paid. */
  async getMine(hostUserId: string): Promise<{
    account: MaskedPayoutAccount | null;
    readiness: PayoutReadiness;
  }> {
    const host = await this.requireHostByUserId(hostUserId);
    return {
      account: host.payoutAccount ? this.mask(host.payoutAccount) : null,
      readiness: evaluatePayoutReadiness(host),
    };
  }

  /** Submit or replace the payout destination. Always requires re-verification. */
  async submit(hostUserId: string, dto: SubmitPayoutAccountDto) {
    const host = await this.requireHostByUserId(hostUserId);
    const method = dto.method as PayoutMethod;

    // Belt-and-braces: the DTO's ValidateIf already enforces this, but the
    // service must never persist a half-specified destination.
    if (method === 'BANK_ACCOUNT' && (!dto.accountNumber || !dto.ifsc)) {
      throw new BadRequestException('Bank payouts need an account number and IFSC');
    }
    if (method === 'UPI' && !dto.upiVpa) {
      throw new BadRequestException('UPI payouts need a UPI ID');
    }

    const fingerprint =
      method === 'BANK_ACCOUNT'
        ? this.crypto.fingerprint('BANK', dto.accountNumber!, dto.ifsc!)
        : this.crypto.fingerprint('UPI', dto.upiVpa!);

    // Flag (don't block) a destination already in use by another host — a
    // genuine signal for fraud review, but families/co-hosts do share accounts.
    const duplicate = await this.prisma.hostPayoutAccount.findFirst({
      where: { fingerprint, hostId: { not: host.id } },
      select: { hostId: true },
    });

    const data = {
      method,
      legalName: dto.legalName.trim(),
      bankName: method === 'BANK_ACCOUNT' ? dto.bankName?.trim() || null : null,
      ifsc: method === 'BANK_ACCOUNT' ? dto.ifsc! : null,
      accountLast4: method === 'BANK_ACCOUNT' ? this.crypto.last4(dto.accountNumber!) : null,
      accountEnc: method === 'BANK_ACCOUNT' ? this.crypto.encrypt(dto.accountNumber!) : null,
      upiVpa: method === 'UPI' ? dto.upiVpa! : null,
      panLast4: this.crypto.last4(dto.pan),
      panEnc: this.crypto.encrypt(dto.pan),
      fingerprint,
      status: PayoutAccountStatus.SUBMITTED,
      rejectionReason: null,
      verifiedAt: null,
      verifiedById: null,
    };

    const account = await this.prisma.hostPayoutAccount.upsert({
      where: { hostId: host.id },
      create: { hostId: host.id, ...data },
      update: data,
    });

    // A new/changed destination must not be paid on the old approval.
    await this.prisma.host.update({
      where: { id: host.id },
      data: { payoutEnabled: false },
    });
    const held = await this.holdReadyLines(host.id, 'Payout account awaiting verification');

    await this.audit.log(hostUserId, 'PAYOUT_ACCOUNT_SUBMITTED', 'host_payout_account', account.id, {
      hostId: host.id,
      method,
      accountLast4: account.accountLast4,
      duplicateOf: duplicate?.hostId ?? null,
      linesHeld: held,
    });

    return { account: this.mask(account), duplicateDetected: !!duplicate, linesHeld: held };
  }

  // ── Admin-facing ─────────────────────────────────────────────────────────
  /** Queue of accounts for staff review (masked). */
  async adminList(status?: string) {
    const rows = await this.prisma.hostPayoutAccount.findMany({
      where: status ? { status: status as PayoutAccountStatus } : {},
      orderBy: { updatedAt: 'asc' },
      include: {
        host: { select: { id: true, user: { select: { fullName: true, email: true } } } },
      },
    });
    return rows.map((r) => ({
      hostId: r.hostId,
      hostName: r.host.user.fullName,
      hostEmail: r.host.user.email,
      ...this.mask(r),
      // Route onboarding state — an aggregator account id, not sensitive.
      linkedAccountId: r.linkedAccountId,
    }));
  }

  /**
   * Staff decision. VERIFIED unlocks payouts and releases the host's held
   * lines; REJECTED keeps them held with the reason attached.
   */
  async adminVerify(hostId: string, dto: VerifyPayoutAccountDto, actorId: string) {
    const account = await this.prisma.hostPayoutAccount.findUnique({ where: { hostId } });
    if (!account) throw new NotFoundException('Payout account not found');

    const approving = dto.status === 'VERIFIED';
    const updated = await this.prisma.hostPayoutAccount.update({
      where: { hostId },
      data: {
        status: approving ? PayoutAccountStatus.VERIFIED : PayoutAccountStatus.REJECTED,
        rejectionReason: approving ? null : dto.rejectionReason ?? null,
        verifiedAt: approving ? new Date() : null,
        verifiedById: actorId,
      },
    });
    await this.prisma.host.update({
      where: { id: hostId },
      data: { payoutEnabled: approving },
    });

    // Only release once the host is fully clear (e.g. an admin hold may remain).
    const released = approving ? await this.releaseHeldLines(hostId) : 0;

    await this.audit.log(actorId, 'PAYOUT_ACCOUNT_REVIEWED', 'host_payout_account', updated.id, {
      hostId,
      status: updated.status,
      rejectionReason: updated.rejectionReason,
      linesReleased: released,
    });

    return { ...this.mask(updated), linesReleased: released };
  }

  /** Place or lift an administrative payout hold (compliance, dispute, debt). */
  async adminSetHold(hostId: string, dto: SetPayoutHoldDto, actorId: string) {
    const host = await this.prisma.host.findUnique({ where: { id: hostId }, select: { id: true } });
    if (!host) throw new NotFoundException('Host not found');

    const reason = dto.reason?.trim() || null;
    await this.prisma.host.update({
      where: { id: hostId },
      data: { payoutsBlockedReason: reason },
    });

    const affected = reason
      ? await this.holdReadyLines(hostId, `Administrative hold: ${reason}`)
      : await this.releaseHeldLines(hostId);

    await this.audit.log(actorId, reason ? 'PAYOUT_HOLD_SET' : 'PAYOUT_HOLD_CLEARED', 'host', hostId, {
      reason,
      linesAffected: affected,
    });

    return { hostId, payoutsBlockedReason: reason, linesAffected: affected };
  }

  /** Readiness for one host, by host id (used by admin screens). */
  async readiness(hostId: string): Promise<PayoutReadiness> {
    const host = await this.prisma.host.findUnique({
      where: { id: hostId },
      select: HOST_PAYOUT_STATE_SELECT,
    });
    if (!host) throw new NotFoundException('Host not found');
    return evaluatePayoutReadiness(host);
  }

  // ── Internals ────────────────────────────────────────────────────────────
  /** Park anything payable so it can't be batched while unverified. */
  private async holdReadyLines(hostId: string, reason: string): Promise<number> {
    const res = await this.prisma.payoutLine.updateMany({
      where: { hostId, status: { in: ['NOT_ELIGIBLE', 'ELIGIBLE'] } },
      data: { status: 'ON_HOLD', holdReason: reason },
    });
    return res.count;
  }

  /**
   * Un-park held lines once the host is fully payout-ready. Returns them to
   * NOT_ELIGIBLE so the existing time-based `markEligible` job re-promotes only
   * those whose check-in + 24h has actually passed.
   */
  private async releaseHeldLines(hostId: string): Promise<number> {
    const host = await this.prisma.host.findUnique({
      where: { id: hostId },
      select: HOST_PAYOUT_STATE_SELECT,
    });
    if (!host || !evaluatePayoutReadiness(host).ready) return 0;

    const res = await this.prisma.payoutLine.updateMany({
      where: { hostId, status: 'ON_HOLD' },
      data: { status: 'NOT_ELIGIBLE', holdReason: null },
    });
    return res.count;
  }

  private async requireHostByUserId(userId: string) {
    const host = await this.prisma.host.findUnique({
      where: { userId },
      select: {
        id: true,
        verificationStatus: true,
        payoutEnabled: true,
        payoutsBlockedReason: true,
        payoutAccount: true, // full row — masked before it leaves the service
      },
    });
    if (!host) throw new NotFoundException('Host profile not found');
    return host;
  }

  /** Strip ciphertext + anything unmasked before it can reach a response. */
  private mask(a: {
    method: PayoutMethod;
    legalName: string;
    bankName: string | null;
    ifsc: string | null;
    accountLast4: string | null;
    upiVpa: string | null;
    panLast4: string | null;
    status: PayoutAccountStatus;
    rejectionReason: string | null;
    verifiedAt: Date | null;
    updatedAt: Date;
  }): MaskedPayoutAccount {
    return {
      method: a.method,
      legalName: a.legalName,
      bankName: a.bankName,
      ifsc: a.ifsc,
      accountLast4: a.accountLast4,
      upiVpa: a.upiVpa,
      panLast4: a.panLast4,
      status: a.status,
      rejectionReason: a.rejectionReason,
      verifiedAt: a.verifiedAt,
      updatedAt: a.updatedAt,
    };
  }
}
