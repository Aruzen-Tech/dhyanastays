import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmActivityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTagDto } from './dto/tag.dto';

@Injectable()
export class CrmTagsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const tags = await this.prisma.crmTag.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        color: true,
        category: true,
        _count: { select: { contacts: true } },
      },
    });
    return tags.map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color,
      category: t.category,
      count: t._count.contacts,
    }));
  }

  create(dto: CreateTagDto) {
    return this.prisma.crmTag.create({
      data: { name: dto.name, color: dto.color ?? undefined, category: dto.category ?? null },
    });
  }

  /** Assign a tag to a contact (idempotent) + log the activity. */
  async assign(userId: string, tagId: string, actorId: string) {
    const [user, tag] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
      this.prisma.crmTag.findUnique({ where: { id: tagId }, select: { id: true, name: true } }),
    ]);
    if (!user) throw new NotFoundException('Contact not found');
    if (!tag) throw new NotFoundException('Tag not found');

    await this.prisma.crmContactTag.upsert({
      where: { userId_tagId: { userId, tagId } },
      create: { userId, tagId },
      update: {},
    });
    await this.prisma.crmActivity.create({
      data: {
        userId,
        type: CrmActivityType.TAG_ADDED,
        summary: `Tagged "${tag.name}"`,
        actorId,
        metadata: { tagId },
      },
    });
    return { ok: true };
  }

  async remove(userId: string, tagId: string, actorId: string) {
    const tag = await this.prisma.crmTag.findUnique({ where: { id: tagId }, select: { name: true } });
    await this.prisma.crmContactTag.deleteMany({ where: { userId, tagId } });
    await this.prisma.crmActivity.create({
      data: {
        userId,
        type: CrmActivityType.TAG_REMOVED,
        summary: `Removed tag "${tag?.name ?? tagId}"`,
        actorId,
        metadata: { tagId },
      },
    });
    return { ok: true };
  }
}
