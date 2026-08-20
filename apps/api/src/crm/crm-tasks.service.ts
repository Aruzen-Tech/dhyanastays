import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmActivityType, CrmTaskStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

const TASK_ORDER: Prisma.CrmTaskOrderByWithRelationInput[] = [
  { status: 'asc' },
  { dueAt: 'asc' },
  { createdAt: 'desc' },
];

@Injectable()
export class CrmTasksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tasks attached to one contact. */
  listForContact(userId: string) {
    return this.prisma.crmTask.findMany({ where: { userId }, orderBy: TASK_ORDER });
  }

  /** Task inbox with light filters (status, assignee). */
  list(query: { status?: CrmTaskStatus; assigneeId?: string }) {
    const where: Prisma.CrmTaskWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.assigneeId) where.assigneeId = query.assigneeId;
    return this.prisma.crmTask.findMany({
      where,
      orderBy: TASK_ORDER,
      take: 200,
      include: { user: { select: { id: true, fullName: true, email: true } } },
    });
  }

  async create(dto: CreateTaskDto, createdById: string) {
    if (dto.userId) {
      const u = await this.prisma.user.findUnique({ where: { id: dto.userId }, select: { id: true } });
      if (!u) throw new NotFoundException('Contact not found');
    }
    const task = await this.prisma.crmTask.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        userId: dto.userId ?? null,
        assigneeId: dto.assigneeId || null,
        priority: dto.priority ?? undefined,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        createdById,
      },
    });
    if (task.userId) {
      await this.prisma.crmActivity.create({
        data: {
          userId: task.userId,
          type: CrmActivityType.TASK_CREATED,
          summary: `Task added: ${task.title}`,
          actorId: createdById,
          metadata: { taskId: task.id },
        },
      });
    }
    return task;
  }

  async update(id: string, dto: UpdateTaskDto, actorId: string) {
    const existing = await this.prisma.crmTask.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Task not found');

    const nowDone = dto.status === CrmTaskStatus.DONE && existing.status !== CrmTaskStatus.DONE;

    const task = await this.prisma.crmTask.update({
      where: { id },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        assigneeId: dto.assigneeId === undefined ? undefined : dto.assigneeId || null,
        priority: dto.priority ?? undefined,
        status: dto.status ?? undefined,
        dueAt:
          dto.dueAt !== undefined ? (dto.dueAt ? new Date(dto.dueAt) : null) : undefined,
        completedAt: nowDone
          ? new Date()
          : dto.status && dto.status !== CrmTaskStatus.DONE
            ? null
            : undefined,
      },
    });

    if (nowDone && task.userId) {
      await this.prisma.crmActivity.create({
        data: {
          userId: task.userId,
          type: CrmActivityType.TASK_COMPLETED,
          summary: `Completed: ${task.title}`,
          actorId,
          metadata: { taskId: task.id },
        },
      });
    }
    return task;
  }

  complete(id: string, actorId: string) {
    return this.update(id, { status: CrmTaskStatus.DONE }, actorId);
  }

  async remove(id: string) {
    const t = await this.prisma.crmTask.findUnique({ where: { id }, select: { id: true } });
    if (!t) throw new NotFoundException('Task not found');
    await this.prisma.crmTask.delete({ where: { id } });
    return { ok: true };
  }
}
