import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertQuickReplyDto } from './dto/quick-reply.dto';

/**
 * Host-scoped quick-reply templates for the concierge chat. Cap at 25
 * per host to keep the picker UI usable and to bound the write surface.
 */
const MAX_QUICK_REPLIES_PER_HOST = 25;

@Injectable()
export class HostQuickReplyService {
  constructor(private readonly prisma: PrismaService) {}

  async list(hostUserId: string) {
    const host = await this.resolveHost(hostUserId);
    return this.prisma.hostQuickReply.findMany({
      where: { hostId: host.id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(hostUserId: string, dto: UpsertQuickReplyDto) {
    const host = await this.resolveHost(hostUserId);
    const count = await this.prisma.hostQuickReply.count({
      where: { hostId: host.id },
    });
    if (count >= MAX_QUICK_REPLIES_PER_HOST) {
      throw new ForbiddenException(
        `Limit reached: hosts may have at most ${MAX_QUICK_REPLIES_PER_HOST} quick replies.`,
      );
    }
    return this.prisma.hostQuickReply.create({
      data: {
        hostId: host.id,
        label: dto.label.trim(),
        body: dto.body.trim(),
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async update(hostUserId: string, id: string, dto: UpsertQuickReplyDto) {
    const host = await this.resolveHost(hostUserId);
    const existing = await this.prisma.hostQuickReply.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Quick reply not found');
    if (existing.hostId !== host.id) throw new ForbiddenException();
    return this.prisma.hostQuickReply.update({
      where: { id },
      data: {
        label: dto.label.trim(),
        body: dto.body.trim(),
        sortOrder: dto.sortOrder ?? existing.sortOrder,
      },
    });
  }

  async remove(hostUserId: string, id: string) {
    const host = await this.resolveHost(hostUserId);
    const existing = await this.prisma.hostQuickReply.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Quick reply not found');
    if (existing.hostId !== host.id) throw new ForbiddenException();
    await this.prisma.hostQuickReply.delete({ where: { id } });
    return { success: true };
  }

  private async resolveHost(hostUserId: string) {
    const host = await this.prisma.host.findUnique({
      where: { userId: hostUserId },
    });
    if (!host) {
      throw new ForbiddenException('User is not a registered host');
    }
    return host;
  }
}
