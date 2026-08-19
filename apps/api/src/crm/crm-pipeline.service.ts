import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmActivityType, CrmStageKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStageDto, UpdateStageDto } from './dto/stage.dto';

@Injectable()
export class CrmPipelineService {
  constructor(private readonly prisma: PrismaService) {}

  listStages(kind?: CrmStageKind) {
    return this.prisma.crmLifecycleStage.findMany({
      where: kind ? { kind } : {},
      orderBy: [{ kind: 'asc' }, { order: 'asc' }],
    });
  }

  async createStage(dto: CreateStageDto) {
    const max = await this.prisma.crmLifecycleStage.aggregate({
      where: { kind: dto.kind },
      _max: { order: true },
    });
    return this.prisma.crmLifecycleStage.create({
      data: {
        name: dto.name,
        kind: dto.kind,
        color: dto.color ?? undefined,
        order: dto.order ?? (max._max.order ?? 0) + 1,
      },
    });
  }

  async updateStage(id: string, dto: UpdateStageDto) {
    const s = await this.prisma.crmLifecycleStage.findUnique({ where: { id }, select: { id: true } });
    if (!s) throw new NotFoundException('Stage not found');
    return this.prisma.crmLifecycleStage.update({
      where: { id },
      data: { name: dto.name ?? undefined, color: dto.color ?? undefined, order: dto.order ?? undefined },
    });
  }

  async deleteStage(id: string) {
    const s = await this.prisma.crmLifecycleStage.findUnique({ where: { id }, select: { id: true } });
    if (!s) throw new NotFoundException('Stage not found');
    // Contacts' stageId is set to NULL by the FK (onDelete: SetNull).
    await this.prisma.crmLifecycleStage.delete({ where: { id } });
    return { ok: true };
  }

  /** Move a contact into a stage (or out of the pipeline when stageId is null). */
  async moveContact(userId: string, stageId: string | null, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('Contact not found');

    let stageName = 'the backlog';
    if (stageId) {
      const stage = await this.prisma.crmLifecycleStage.findUnique({
        where: { id: stageId },
        select: { name: true },
      });
      if (!stage) throw new NotFoundException('Stage not found');
      stageName = stage.name;
    }

    await this.prisma.crmContactProfile.upsert({
      where: { userId },
      create: { userId, stageId },
      update: { stageId },
    });
    await this.prisma.crmActivity.create({
      data: {
        userId,
        type: CrmActivityType.STAGE_CHANGED,
        summary: `Moved to ${stageName}`,
        actorId,
        metadata: { stageId },
      },
    });
    return { ok: true };
  }

  /** Kanban board for a kind: its stages + the contacts currently in each. */
  async board(kind: CrmStageKind) {
    const [stages, profiles] = await Promise.all([
      this.prisma.crmLifecycleStage.findMany({ where: { kind }, orderBy: { order: 'asc' } }),
      this.prisma.crmContactProfile.findMany({
        where: { stage: { kind } },
        take: 300,
        select: {
          userId: true,
          stageId: true,
          ownerId: true,
          user: { select: { fullName: true, email: true, role: true } },
        },
      }),
    ]);

    const cards: Record<
      string,
      Array<{ userId: string; fullName: string; email: string; role: string; ownerId: string | null }>
    > = {};
    for (const p of profiles) {
      if (!p.stageId) continue;
      (cards[p.stageId] ??= []).push({
        userId: p.userId,
        fullName: p.user.fullName,
        email: p.user.email,
        role: p.user.role,
        ownerId: p.ownerId,
      });
    }
    return { kind, stages, cards };
  }
}
