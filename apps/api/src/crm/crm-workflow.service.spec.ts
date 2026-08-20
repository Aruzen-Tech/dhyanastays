import { CrmTasksService } from './crm-tasks.service';
import { CrmPipelineService } from './crm-pipeline.service';

function makePrisma(overrides: Record<string, unknown> = {}) {
  return {
    user: { findUnique: jest.fn().mockResolvedValue({ id: 'u1' }) },
    crmTask: { findMany: jest.fn(), create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), delete: jest.fn() },
    crmActivity: { create: jest.fn() },
    crmContactProfile: { upsert: jest.fn(), findMany: jest.fn() },
    crmLifecycleStage: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn().mockResolvedValue({ _max: { order: 0 } }),
    },
    ...overrides,
  };
}

describe('CrmTasksService', () => {
  it('create logs a TASK_CREATED activity when attached to a contact', async () => {
    const prisma = makePrisma();
    prisma.crmTask.create.mockResolvedValue({ id: 't1', userId: 'u1', title: 'Call guest' });
    const service = new CrmTasksService(prisma as never);

    await service.create({ title: 'Call guest', userId: 'u1' }, 'admin1');

    expect(prisma.crmTask.create).toHaveBeenCalled();
    expect(prisma.crmActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'TASK_CREATED', actorId: 'admin1' }) }),
    );
  });

  it('does not log an activity for a standalone task (no contact)', async () => {
    const prisma = makePrisma();
    prisma.crmTask.create.mockResolvedValue({ id: 't2', userId: null, title: 'Prep report' });
    const service = new CrmTasksService(prisma as never);

    await service.create({ title: 'Prep report' }, 'admin1');

    expect(prisma.crmActivity.create).not.toHaveBeenCalled();
  });

  it('complete marks DONE + logs TASK_COMPLETED', async () => {
    const prisma = makePrisma();
    prisma.crmTask.findUnique.mockResolvedValue({ id: 't1', status: 'OPEN', userId: 'u1', title: 'Call' });
    prisma.crmTask.update.mockResolvedValue({ id: 't1', userId: 'u1', title: 'Call', status: 'DONE' });
    const service = new CrmTasksService(prisma as never);

    await service.complete('t1', 'admin1');

    expect(prisma.crmTask.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'DONE' }) }),
    );
    expect(prisma.crmActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'TASK_COMPLETED' }) }),
    );
  });
});

describe('CrmPipelineService', () => {
  it('moveContact upserts the profile stage and logs STAGE_CHANGED', async () => {
    const prisma = makePrisma();
    prisma.crmLifecycleStage.findUnique.mockResolvedValue({ name: 'Active' });
    const service = new CrmPipelineService(prisma as never);

    await service.moveContact('u1', 'stage-2', 'admin1');

    expect(prisma.crmContactProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1' }, update: { stageId: 'stage-2' } }),
    );
    expect(prisma.crmActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: 'STAGE_CHANGED', summary: 'Moved to Active' }) }),
    );
  });

  it('board groups contacts by their stage', async () => {
    const prisma = makePrisma();
    prisma.crmLifecycleStage.findMany.mockResolvedValue([
      { id: 's1', name: 'New', kind: 'GUEST', order: 1, color: '#000' },
      { id: 's2', name: 'Active', kind: 'GUEST', order: 2, color: '#000' },
    ]);
    prisma.crmContactProfile.findMany.mockResolvedValue([
      { userId: 'u1', stageId: 's1', ownerId: null, user: { fullName: 'Asha', email: 'a@x.com', role: 'GUEST' } },
      { userId: 'u2', stageId: 's2', ownerId: null, user: { fullName: 'Bo', email: 'b@x.com', role: 'GUEST' } },
      { userId: 'u3', stageId: 's1', ownerId: null, user: { fullName: 'Cy', email: 'c@x.com', role: 'GUEST' } },
    ]);
    const service = new CrmPipelineService(prisma as never);

    const board = await service.board('GUEST' as never);

    expect(board.stages).toHaveLength(2);
    expect(board.cards['s1']).toHaveLength(2);
    expect(board.cards['s2']).toHaveLength(1);
    expect(board.cards['s1'][0].fullName).toBe('Asha');
  });
});
