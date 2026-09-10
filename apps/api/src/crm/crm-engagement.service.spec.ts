import { NotFoundException } from '@nestjs/common';
import { CrmSegmentsService } from './crm-segments.service';
import { CrmBulkService } from './crm-bulk.service';
import { CrmOutreachService } from './crm-outreach.service';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    crmSegment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    crmTag: { findUnique: jest.fn() },
    crmLifecycleStage: { findUnique: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn() },
    crmContactTag: { createMany: jest.fn() },
    crmContactProfile: { upsert: jest.fn() },
    crmActivity: { createMany: jest.fn(), create: jest.fn() },
    crmMessageTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn((ops: unknown[]) => Promise.all(ops as Promise<unknown>[])),
    ...overrides,
  };
}

describe('CrmSegmentsService', () => {
  it('create trims name and normalises empty filters to null', async () => {
    const prisma = makePrisma();
    prisma.crmSegment.create.mockResolvedValue({ id: 's1' });
    const service = new CrmSegmentsService(prisma as never);

    await service.create({ name: '  VIP guests  ', type: 'guest', q: '', tagId: 't1' }, 'admin1');

    const data = prisma.crmSegment.create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      name: 'VIP guests',
      type: 'guest',
      q: null,
      tagId: 't1',
      ownerId: null,
      createdById: 'admin1',
    });
  });

  it('remove throws when the segment is missing', async () => {
    const prisma = makePrisma();
    prisma.crmSegment.findUnique.mockResolvedValue(null);
    const service = new CrmSegmentsService(prisma as never);
    await expect(service.remove('nope')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('CrmBulkService', () => {
  it('addTag filters to real users, skips duplicates, and logs one activity each', async () => {
    const prisma = makePrisma();
    prisma.crmTag.findUnique.mockResolvedValue({ name: 'VIP' });
    // requested 3 ids, only 2 are real users
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    const service = new CrmBulkService(prisma as never);

    const res = await service.addTag(['u1', 'u2', 'ghost'], 'tag1', 'admin1');

    expect(res).toEqual({ count: 2 });
    expect(prisma.crmContactTag.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ skipDuplicates: true }),
    );
    const activityRows = prisma.crmActivity.createMany.mock.calls[0][0].data;
    expect(activityRows).toHaveLength(2);
    expect(activityRows[0]).toMatchObject({ type: 'TAG_ADDED', actorId: 'admin1' });
  });

  it('addTag rejects an unknown tag', async () => {
    const prisma = makePrisma();
    prisma.crmTag.findUnique.mockResolvedValue(null);
    const service = new CrmBulkService(prisma as never);
    await expect(service.addTag(['u1'], 'bad', 'admin1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('moveStage validates the stage and upserts each contact', async () => {
    const prisma = makePrisma();
    prisma.crmLifecycleStage.findUnique.mockResolvedValue({ name: 'Negotiating' });
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
    const service = new CrmBulkService(prisma as never);

    const res = await service.moveStage(['u1'], 'stage1', 'admin1');

    expect(res).toEqual({ count: 1 });
    expect(prisma.crmContactProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });

  it('assignOwner clears the owner when null', async () => {
    const prisma = makePrisma();
    prisma.user.findMany.mockResolvedValue([{ id: 'u1' }]);
    const service = new CrmBulkService(prisma as never);

    await service.assignOwner(['u1'], null, 'admin1');

    const activityRows = prisma.crmActivity.createMany.mock.calls[0][0].data;
    expect(activityRows[0].summary).toBe('Owner cleared');
  });
});

describe('CrmOutreachService', () => {
  function makeOutbox() {
    return { enqueue: jest.fn().mockResolvedValue(undefined) };
  }

  it('skips do-not-contact and contacts missing the channel, enqueues + logs the rest', async () => {
    const prisma = makePrisma();
    const outbox = makeOutbox();
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', fullName: 'Asha Rao', email: 'asha@x.com', phone: null, crmProfile: { doNotContact: false } },
      { id: 'u2', fullName: 'Ben Lee', email: 'ben@x.com', phone: null, crmProfile: { doNotContact: true } },
      { id: 'u3', fullName: 'Cara Sen', email: null, phone: null, crmProfile: null },
    ]);
    const service = new CrmOutreachService(prisma as never, outbox as never);

    const res = await service.send(
      { userIds: ['u1', 'u2', 'u3'], channels: ['EMAIL'], body: 'Hi {{firstName}}' },
      'admin1',
    );

    expect(res).toEqual({ total: 3, sent: 1, skipped: { doNotContact: 1, noEmail: 1, noPhone: 0 } });
    // only the one deliverable, opted-in contact is enqueued
    expect(outbox.enqueue).toHaveBeenCalledTimes(1);
    const call = outbox.enqueue.mock.calls[0][0];
    expect(call).toMatchObject({ userId: 'u1', kind: 'crm.outreach', channels: ['EMAIL'] });
    expect(call.payload.to).toBe('asha@x.com');
    // {{firstName}} interpolated
    expect(call.payload.text).toBe('Hi Asha');
    // one OUTREACH_SENT activity + lastContactedAt bump for the sent contact
    expect(prisma.crmActivity.create).toHaveBeenCalledTimes(1);
    expect(prisma.crmActivity.create.mock.calls[0][0].data).toMatchObject({
      userId: 'u1',
      type: 'OUTREACH_SENT',
    });
    expect(prisma.crmContactProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' } }),
    );
  });

  it('resolves a segment into its stored filter before sending', async () => {
    const prisma = makePrisma();
    const outbox = makeOutbox();
    prisma.crmSegment.findUnique.mockResolvedValue({
      id: 's1',
      type: 'host',
      q: null,
      tagId: 't1',
      ownerId: null,
    });
    prisma.user.findMany.mockResolvedValue([]);
    const service = new CrmOutreachService(prisma as never, outbox as never);

    await service.send({ segmentId: 's1', channels: ['SMS'], body: 'hi' }, 'admin1');

    const where = prisma.user.findMany.mock.calls[0][0].where;
    expect(where.role.in).toEqual(['HOST']);
    expect(where.crmTags).toEqual({ some: { tagId: 't1' } });
  });

  it('logInteraction writes a CALL_LOGGED activity and bumps lastContactedAt', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    const service = new CrmOutreachService(prisma as never, makeOutbox() as never);

    await service.logInteraction('u1', { channel: 'call', summary: 'Rang about payout' }, 'admin1');

    expect(prisma.crmActivity.create.mock.calls[0][0].data).toMatchObject({
      userId: 'u1',
      type: 'CALL_LOGGED',
      summary: 'Call: Rang about payout',
    });
    expect(prisma.crmContactProfile.upsert).toHaveBeenCalled();
  });

  it('logInteraction throws for an unknown contact', async () => {
    const prisma = makePrisma();
    prisma.user.findUnique.mockResolvedValue(null);
    const service = new CrmOutreachService(prisma as never, makeOutbox() as never);
    await expect(
      service.logInteraction('ghost', { channel: 'other', summary: 'x' }, 'admin1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
