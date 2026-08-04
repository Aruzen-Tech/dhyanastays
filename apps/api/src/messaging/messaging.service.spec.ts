import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { MessagingService } from './messaging.service';

/**
 * Service-level tests for the messaging enhancements: contact-number blocking
 * on send, and the SENT → DELIVERED → READ delivery lifecycle. (The detector
 * itself is covered exhaustively in contact-filter.spec.ts.)
 */
function makeService(prisma: any) {
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  return {
    service: new MessagingService(
      prisma as any,
      { enqueue: jest.fn() } as any,
      { create: jest.fn() } as any,
      audit as any,
      { getSettings: jest.fn() } as any,
      { emit: jest.fn() } as any,
    ),
    audit,
  };
}

const OPEN_CONVO = {
  id: 'c1',
  userOneId: 'guest-1',
  userTwoId: 'host-1',
  status: 'OPEN',
  kind: 'STANDARD',
};

describe('MessagingService — contact blocking', () => {
  it('rejects a message containing a phone number and never creates it', async () => {
    const prisma = {
      conversation: { findUnique: jest.fn().mockResolvedValue(OPEN_CONVO) },
      message: { create: jest.fn() },
    };
    const { service, audit } = makeService(prisma);
    await expect(
      service.sendMessage('c1', 'guest-1', UserRole.GUEST, { body: 'call me 98765 43210' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(audit.log).toHaveBeenCalledWith(
      'guest-1',
      'MESSAGE_BLOCKED_CONTACT',
      'conversation',
      'c1',
      expect.any(Object),
    );
  });
});

describe('MessagingService — delivery lifecycle', () => {
  it('getConversationById marks the counterparty\'s SENT messages DELIVERED', async () => {
    const messages = [
      { id: 'm1', senderId: 'host-1', status: 'SENT', deliveredAt: null },
      { id: 'm2', senderId: 'guest-1', status: 'SENT', deliveredAt: null }, // own → untouched
    ];
    const prisma = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue({ ...OPEN_CONVO, messages }),
      },
      message: {
        // markDelivered selects the counterparty's SENT ids, then updates.
        findMany: jest.fn().mockResolvedValue([{ id: 'm1' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const { service } = makeService(prisma);
    const convo: any = await service.getConversationById('c1', 'guest-1');

    expect(prisma.message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['m1'] } },
        data: expect.objectContaining({ status: 'DELIVERED' }),
      }),
    );
    // Payload reflects the update without a re-fetch.
    expect(convo.messages.find((m: any) => m.id === 'm1').status).toBe('DELIVERED');
    expect(convo.messages.find((m: any) => m.id === 'm2').status).toBe('SENT');
  });

  it('markRead flips the counterparty\'s messages to READ', async () => {
    const prisma = {
      conversation: { findUnique: jest.fn().mockResolvedValue(OPEN_CONVO) },
      message: {
        findMany: jest.fn().mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    };
    const { service } = makeService(prisma);
    await service.markRead('c1', 'guest-1');

    expect(prisma.message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['m1', 'm2'] } },
        data: expect.objectContaining({ status: 'READ', isRead: true }),
      }),
    );
  });
});
