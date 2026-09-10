import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmActivityType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Bulk actions over a set of contacts (Phase 3). Each action validates the
 * ids against real users, applies the change idempotently, and logs one
 * CrmActivity per contact so the timeline reflects it.
 */
@Injectable()
export class CrmBulkService {
  constructor(private readonly prisma: PrismaService) {}

  /** Filter the requested ids down to ones that are real users. */
  private async realUserIds(userIds: string[]): Promise<string[]> {
    const unique = [...new Set(userIds)];
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }

  private logActivities(rows: Prisma.CrmActivityCreateManyInput[]) {
    if (rows.length === 0) return Promise.resolve({ count: 0 });
    return this.prisma.crmActivity.createMany({ data: rows });
  }

  async addTag(userIds: string[], tagId: string, actorId: string) {
    const tag = await this.prisma.crmTag.findUnique({ where: { id: tagId }, select: { name: true } });
    if (!tag) throw new NotFoundException('Tag not found');
    const ids = await this.realUserIds(userIds);

    await this.prisma.crmContactTag.createMany({
      data: ids.map((userId) => ({ userId, tagId })),
      skipDuplicates: true,
    });
    await this.logActivities(
      ids.map((userId) => ({
        userId,
        type: CrmActivityType.TAG_ADDED,
        summary: `Tagged "${tag.name}"`,
        actorId,
        metadata: { tagId },
      })),
    );
    return { count: ids.length };
  }

  async assignOwner(userIds: string[], ownerId: string | null, actorId: string) {
    const ids = await this.realUserIds(userIds);
    await this.prisma.$transaction(
      ids.map((userId) =>
        this.prisma.crmContactProfile.upsert({
          where: { userId },
          create: { userId, ownerId },
          update: { ownerId },
        }),
      ),
    );
    await this.logActivities(
      ids.map((userId) => ({
        userId,
        type: CrmActivityType.CONTACT_UPDATED,
        summary: ownerId ? 'Owner assigned' : 'Owner cleared',
        actorId,
      })),
    );
    return { count: ids.length };
  }

  async moveStage(userIds: string[], stageId: string | null, actorId: string) {
    let stageName = 'the backlog';
    if (stageId) {
      const stage = await this.prisma.crmLifecycleStage.findUnique({
        where: { id: stageId },
        select: { name: true },
      });
      if (!stage) throw new NotFoundException('Stage not found');
      stageName = stage.name;
    }
    const ids = await this.realUserIds(userIds);
    await this.prisma.$transaction(
      ids.map((userId) =>
        this.prisma.crmContactProfile.upsert({
          where: { userId },
          create: { userId, stageId },
          update: { stageId },
        }),
      ),
    );
    await this.logActivities(
      ids.map((userId) => ({
        userId,
        type: CrmActivityType.STAGE_CHANGED,
        summary: `Moved to ${stageName}`,
        actorId,
        metadata: { stageId },
      })),
    );
    return { count: ids.length };
  }
}
