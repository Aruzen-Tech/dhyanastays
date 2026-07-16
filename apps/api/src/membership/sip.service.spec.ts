import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SipService } from './sip.service';

/**
 * Phase 2 §5.13 exit criterion: every SIP contribution writes to CreditLedger
 * first and references that row from SipContribution. The user's spendable
 * balance therefore reflects SIP deposits without a separate accounting layer.
 */

type Mock = jest.Mock;

function makePrisma() {
  const ledgerCreate: Mock = jest.fn();
  const contributionCreate: Mock = jest.fn();
  const contributionFindFirst: Mock = jest.fn().mockResolvedValue(null);
  const sipFindUnique: Mock = jest.fn();

  const tx = {
    creditLedger: { create: ledgerCreate },
    sipContribution: { create: contributionCreate },
  };

  return {
    tripSip: { findUnique: sipFindUnique },
    sipContribution: { findFirst: contributionFindFirst },
    $transaction: jest
      .fn()
      .mockImplementation(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
    _ledgerCreate: ledgerCreate,
    _contributionCreate: contributionCreate,
    _contributionFindFirst: contributionFindFirst,
    _sipFindUnique: sipFindUnique,
  };
}

const audit = { log: jest.fn().mockResolvedValue(undefined) } as never;
const membership = { awardPoints: jest.fn().mockResolvedValue(undefined) } as never;

describe('SipService.recordContribution', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: SipService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SipService(prisma as never, audit, membership);
  });

  it('writes a CreditLedger row and references it from SipContribution (1:1)', async () => {
    prisma._sipFindUnique.mockResolvedValue({
      id: 'sip_1',
      userId: 'user_1',
      status: 'ACTIVE',
    });
    prisma._ledgerCreate.mockResolvedValue({ id: 'ledger_42' });
    prisma._contributionCreate.mockResolvedValue({ id: 'contrib_99' });

    const result = await service.recordContribution('user_1', 'sip_1', {
      amountMinor: 250000, // ₹2,500
    });

    expect(prisma._ledgerCreate).toHaveBeenCalledWith({
      data: {
        userId: 'user_1',
        amount: 250000,
        reason: 'sip_contribution',
        referenceId: 'sip_1',
      },
    });
    expect(prisma._contributionCreate).toHaveBeenCalledWith({
      data: {
        sipId: 'sip_1',
        amountMinor: 250000,
        ledgerEventId: 'ledger_42',
        paymentRef: undefined,
      },
    });
    expect(result.id).toBe('contrib_99');
  });

  it('is idempotent on paymentRef — replays return the existing contribution', async () => {
    prisma._sipFindUnique.mockResolvedValue({
      id: 'sip_1',
      userId: 'user_1',
      status: 'ACTIVE',
    });
    prisma._contributionFindFirst.mockResolvedValue({ id: 'contrib_old' });

    const result = await service.recordContribution('user_1', 'sip_1', {
      amountMinor: 250000,
      paymentRef: 'rzp_pay_abc',
    });

    expect(result).toEqual({ id: 'contrib_old' });
    expect(prisma._ledgerCreate).not.toHaveBeenCalled();
    expect(prisma._contributionCreate).not.toHaveBeenCalled();
  });

  it('rejects contributions to a paused or closed SIP', async () => {
    prisma._sipFindUnique.mockResolvedValue({
      id: 'sip_1',
      userId: 'user_1',
      status: 'PAUSED',
    });

    await expect(
      service.recordContribution('user_1', 'sip_1', { amountMinor: 100000 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('refuses to expose another user’s SIP', async () => {
    prisma._sipFindUnique.mockResolvedValue({
      id: 'sip_1',
      userId: 'someone_else',
      status: 'ACTIVE',
    });

    await expect(
      service.recordContribution('user_1', 'sip_1', { amountMinor: 100000 }),
    ).rejects.toThrow(NotFoundException);
  });
});
