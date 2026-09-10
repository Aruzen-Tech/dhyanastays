import { BadRequestException } from '@nestjs/common';
import { CrmAutomationService } from './crm-automation.service';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    crmAutomationRule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn(),
    },
    crmTask: { create: jest.fn().mockResolvedValue({}) },
    crmContactTag: { upsert: jest.fn().mockResolvedValue({}) },
    crmContactProfile: { upsert: jest.fn().mockResolvedValue({}) },
    crmTag: { findUnique: jest.fn().mockResolvedValue({ name: 'VIP' }) },
    crmActivity: { create: jest.fn().mockResolvedValue({}) },
    ...overrides,
  };
}

function makeOutreach() {
  return { send: jest.fn().mockResolvedValue({ total: 1, sent: 1, skipped: {} }) };
}

describe('CrmAutomationService', () => {
  it('rejects a task rule with no title', () => {
    const service = new CrmAutomationService(makePrisma() as never, makeOutreach() as never);
    expect(() =>
      service.create(
        { name: 'x', trigger: 'STAGE_CHANGED', action: 'CREATE_TASK', config: {} } as never,
        'admin1',
      ),
    ).toThrow(BadRequestException);
  });

  it('create clears the tag filter for a stage trigger', async () => {
    const prisma = makePrisma();
    prisma.crmAutomationRule.create.mockResolvedValue({ id: 'r1' });
    const service = new CrmAutomationService(prisma as never, makeOutreach() as never);

    await service.create(
      {
        name: 'Welcome task',
        trigger: 'STAGE_CHANGED',
        stageId: 's1',
        tagId: 't-should-be-dropped',
        action: 'CREATE_TASK',
        config: { title: 'Call them' },
      } as never,
      'admin1',
    );

    const data = prisma.crmAutomationRule.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ stageId: 's1', tagId: null, trigger: 'STAGE_CHANGED' });
  });

  it('fires only rules whose stage filter matches, and creates the task', async () => {
    const prisma = makePrisma();
    prisma.crmAutomationRule.findMany.mockResolvedValue([
      { id: 'r1', name: 'Any stage', trigger: 'STAGE_CHANGED', stageId: null, action: 'CREATE_TASK', config: { title: 'Follow up', dueInDays: 3 }, createdById: 'a1' },
      { id: 'r2', name: 'Only s2', trigger: 'STAGE_CHANGED', stageId: 's2', action: 'CREATE_TASK', config: { title: 'Nope' }, createdById: 'a1' },
    ]);
    const service = new CrmAutomationService(prisma as never, makeOutreach() as never);

    await service.fire('STAGE_CHANGED', { userId: 'u1', stageId: 's1', actorId: 'admin1' });

    // r1 (any stage) fires; r2 (s2) is filtered out.
    expect(prisma.crmTask.create).toHaveBeenCalledTimes(1);
    expect(prisma.crmTask.create.mock.calls[0][0].data).toMatchObject({
      userId: 'u1',
      title: 'Follow up',
    });
    expect(prisma.crmAutomationRule.update).toHaveBeenCalledTimes(1);
  });

  it('routes SEND_OUTREACH through the outreach service (opt-outs handled there)', async () => {
    const prisma = makePrisma();
    const outreach = makeOutreach();
    prisma.crmAutomationRule.findMany.mockResolvedValue([
      { id: 'r1', name: 'Welcome email', trigger: 'TAG_ADDED', tagId: 't1', action: 'SEND_OUTREACH', config: { channels: ['EMAIL'], subject: 'Hi', body: 'Welcome' }, createdById: 'a1' },
    ]);
    const service = new CrmAutomationService(prisma as never, outreach as never);

    await service.fire('TAG_ADDED', { userId: 'u1', tagId: 't1', actorId: 'admin1' });

    expect(outreach.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', channels: ['EMAIL'], body: 'Welcome' }),
      'a1',
    );
  });

  it('does not re-add the tag that triggered the rule (no cascade)', async () => {
    const prisma = makePrisma();
    prisma.crmAutomationRule.findMany.mockResolvedValue([
      { id: 'r1', name: 'Loop', trigger: 'TAG_ADDED', tagId: null, action: 'ADD_TAG', config: { tagId: 't1' }, createdById: 'a1' },
    ]);
    const service = new CrmAutomationService(prisma as never, makeOutreach() as never);

    await service.fire('TAG_ADDED', { userId: 'u1', tagId: 't1', actorId: 'admin1' });

    expect(prisma.crmContactTag.upsert).not.toHaveBeenCalled();
  });

  it('swallows a failing rule so the triggering action still succeeds', async () => {
    const prisma = makePrisma();
    prisma.crmAutomationRule.findMany.mockResolvedValue([
      { id: 'r1', name: 'Boom', trigger: 'STAGE_CHANGED', stageId: null, action: 'CREATE_TASK', config: { title: 'x' }, createdById: 'a1' },
    ]);
    prisma.crmTask.create.mockRejectedValue(new Error('db down'));
    const service = new CrmAutomationService(prisma as never, makeOutreach() as never);

    await expect(
      service.fire('STAGE_CHANGED', { userId: 'u1', stageId: 's1', actorId: 'admin1' }),
    ).resolves.toBeUndefined();
    // counter not bumped because the action threw
    expect(prisma.crmAutomationRule.update).not.toHaveBeenCalled();
  });
});
