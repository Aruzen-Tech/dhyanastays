import { Injectable } from '@nestjs/common';
import { CrmActivityType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DAY = 24 * 60 * 60 * 1000;
const CONTACT_ROLES: UserRole[] = [UserRole.GUEST, UserRole.HOST];

export interface CrmAnalytics {
  contacts: {
    total: number;
    guests: number;
    hosts: number;
    owned: number;
    unowned: number;
    doNotContact: number;
    needAttention: number;
  };
  pipeline: Array<{ stageId: string; name: string; kind: string; color: string; count: number }>;
  tags: Array<{ id: string; name: string; color: string; count: number }>;
  owners: Array<{ ownerId: string; name: string; count: number }>;
  engagement: {
    outreachLast30: number;
    callsLast30: number;
    notesLast30: number;
    stageChangesLast30: number;
    trend: Array<{ date: string; outreach: number; calls: number }>;
  };
  tasks: {
    open: number;
    overdue: number;
    dueSoon: number;
    completedLast30: number;
    byPriority: { LOW: number; MEDIUM: number; HIGH: number };
  };
}

/**
 * CRM analytics (Phase 4). Pure read aggregation over the existing CRM overlay
 * tables — no new storage. Everything is computed on demand; volumes are small
 * (admin-scale), so a handful of parallel counts/groupBys is plenty.
 */
@Injectable()
export class CrmAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<CrmAnalytics> {
    const now = new Date();
    const since30 = new Date(now.getTime() - 30 * DAY);
    const since14 = new Date(now.getTime() - 14 * DAY);
    const soon = new Date(now.getTime() + 7 * DAY);

    const [
      total,
      guests,
      hosts,
      owned,
      doNotContact,
      needAttention,
      stageGroups,
      stages,
      tagRows,
      ownerGroups,
      outreachLast30,
      callsLast30,
      notesLast30,
      stageChangesLast30,
      trendRows,
      open,
      overdue,
      dueSoon,
      completedLast30,
      priorityGroups,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: { in: CONTACT_ROLES } } }),
      this.prisma.user.count({ where: { role: UserRole.GUEST } }),
      this.prisma.user.count({ where: { role: UserRole.HOST } }),
      this.prisma.crmContactProfile.count({
        where: { ownerId: { not: null }, user: { role: { in: CONTACT_ROLES } } },
      }),
      this.prisma.crmContactProfile.count({
        where: { doNotContact: true, user: { role: { in: CONTACT_ROLES } } },
      }),
      // In a pipeline stage but has gone quiet (no contact in 30 days, or never).
      this.prisma.crmContactProfile.count({
        where: {
          stageId: { not: null },
          OR: [{ lastContactedAt: null }, { lastContactedAt: { lt: since30 } }],
        },
      }),
      this.prisma.crmContactProfile.groupBy({
        by: ['stageId'],
        where: { stageId: { not: null } },
        _count: { stageId: true },
      }),
      this.prisma.crmLifecycleStage.findMany({
        orderBy: [{ kind: 'asc' }, { order: 'asc' }],
        select: { id: true, name: true, kind: true, color: true },
      }),
      this.prisma.crmTag.findMany({
        select: { id: true, name: true, color: true, _count: { select: { contacts: true } } },
      }),
      this.prisma.crmContactProfile.groupBy({
        by: ['ownerId'],
        where: { ownerId: { not: null } },
        _count: { ownerId: true },
      }),
      this.prisma.crmActivity.count({
        where: { type: CrmActivityType.OUTREACH_SENT, occurredAt: { gte: since30 } },
      }),
      this.prisma.crmActivity.count({
        where: { type: CrmActivityType.CALL_LOGGED, occurredAt: { gte: since30 } },
      }),
      this.prisma.crmActivity.count({
        where: { type: CrmActivityType.NOTE, occurredAt: { gte: since30 } },
      }),
      this.prisma.crmActivity.count({
        where: { type: CrmActivityType.STAGE_CHANGED, occurredAt: { gte: since30 } },
      }),
      this.prisma.crmActivity.findMany({
        where: {
          type: { in: [CrmActivityType.OUTREACH_SENT, CrmActivityType.CALL_LOGGED] },
          occurredAt: { gte: since14 },
        },
        select: { type: true, occurredAt: true },
      }),
      this.prisma.crmTask.count({ where: { status: 'OPEN' } }),
      this.prisma.crmTask.count({ where: { status: 'OPEN', dueAt: { lt: now } } }),
      this.prisma.crmTask.count({ where: { status: 'OPEN', dueAt: { gte: now, lte: soon } } }),
      this.prisma.crmTask.count({ where: { status: 'DONE', completedAt: { gte: since30 } } }),
      this.prisma.crmTask.groupBy({
        by: ['priority'],
        where: { status: 'OPEN' },
        _count: { priority: true },
      }),
    ]);

    // ── Pipeline: attach counts to stage metadata ──
    const stageCount = new Map(stageGroups.map((g) => [g.stageId as string, g._count.stageId]));
    const pipeline = stages
      .map((s) => ({
        stageId: s.id,
        name: s.name,
        kind: s.kind,
        color: s.color,
        count: stageCount.get(s.id) ?? 0,
      }))
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);

    // ── Tags: top 8 by contact count ──
    const tags = tagRows
      .map((t) => ({ id: t.id, name: t.name, color: t.color, count: t._count.contacts }))
      .filter((t) => t.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── Owners: resolve names ──
    const ownerIds = ownerGroups.map((g) => g.ownerId as string);
    const ownerUsers = ownerIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, fullName: true },
        })
      : [];
    const ownerName = new Map(ownerUsers.map((u) => [u.id, u.fullName]));
    const owners = ownerGroups
      .map((g) => ({
        ownerId: g.ownerId as string,
        name: ownerName.get(g.ownerId as string) ?? 'Unknown',
        count: g._count.ownerId,
      }))
      .sort((a, b) => b.count - a.count);

    // ── Engagement trend: bucket the last 14 days in JS ──
    const trend = this.buildTrend(trendRows, since14, now);

    const priorityOf = (p: 'LOW' | 'MEDIUM' | 'HIGH') =>
      priorityGroups.find((g) => g.priority === p)?._count.priority ?? 0;

    return {
      contacts: {
        total,
        guests,
        hosts,
        owned,
        unowned: Math.max(total - owned, 0),
        doNotContact,
        needAttention,
      },
      pipeline,
      tags,
      owners,
      engagement: {
        outreachLast30,
        callsLast30,
        notesLast30,
        stageChangesLast30,
        trend,
      },
      tasks: {
        open,
        overdue,
        dueSoon,
        completedLast30,
        byPriority: {
          LOW: priorityOf('LOW'),
          MEDIUM: priorityOf('MEDIUM'),
          HIGH: priorityOf('HIGH'),
        },
      },
    };
  }

  private buildTrend(
    rows: Array<{ type: CrmActivityType; occurredAt: Date }>,
    since: Date,
    now: Date,
  ): Array<{ date: string; outreach: number; calls: number }> {
    const key = (d: Date) => d.toISOString().slice(0, 10);
    const days = new Map<string, { outreach: number; calls: number }>();
    // Seed every day in the window so gaps render as zero.
    for (let t = new Date(since); t <= now; t = new Date(t.getTime() + DAY)) {
      days.set(key(t), { outreach: 0, calls: 0 });
    }
    for (const r of rows) {
      const bucket = days.get(key(r.occurredAt));
      if (!bucket) continue;
      if (r.type === CrmActivityType.OUTREACH_SENT) bucket.outreach += 1;
      else bucket.calls += 1;
    }
    return [...days.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));
  }
}
