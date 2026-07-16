import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminNotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async create(type: string, title: string, message: string, metadata: Record<string, unknown> = {}) {
    return this.prisma.adminNotification.create({
      data: { type, title, message, metadata: metadata as Prisma.InputJsonValue },
    });
  }

  async getNotifications(unreadOnly: boolean) {
    return this.prisma.adminNotification.findMany({
      where: unreadOnly ? { isRead: false } : {},
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markRead(id: string) {
    return this.prisma.adminNotification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead() {
    const result = await this.prisma.adminNotification.updateMany({
      where: { isRead: false },
      data: { isRead: true },
    });
    return { count: result.count };
  }
}
