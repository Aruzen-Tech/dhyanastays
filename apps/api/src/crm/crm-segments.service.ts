import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveSegmentDto, UpdateSegmentDto } from './dto/segment.dto';

/**
 * Saved contacts filters (Phase 3). A segment stores the same criteria the
 * contacts list accepts, so "apply" just re-runs the list with those params.
 */
@Injectable()
export class CrmSegmentsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.crmSegment.findMany({ orderBy: { name: 'asc' } });
  }

  create(dto: SaveSegmentDto, actorId: string) {
    return this.prisma.crmSegment.create({
      data: {
        name: dto.name.trim(),
        type: dto.type ?? null,
        q: dto.q?.trim() || null,
        tagId: dto.tagId || null,
        ownerId: dto.ownerId || null,
        sort: dto.sort ?? null,
        createdById: actorId,
      },
    });
  }

  async update(id: string, dto: UpdateSegmentDto) {
    await this.ensureExists(id);
    return this.prisma.crmSegment.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.type !== undefined ? { type: dto.type || null } : {}),
        ...(dto.q !== undefined ? { q: dto.q.trim() || null } : {}),
        ...(dto.tagId !== undefined ? { tagId: dto.tagId || null } : {}),
        ...(dto.ownerId !== undefined ? { ownerId: dto.ownerId || null } : {}),
        ...(dto.sort !== undefined ? { sort: dto.sort || null } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    await this.prisma.crmSegment.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureExists(id: string) {
    const s = await this.prisma.crmSegment.findUnique({ where: { id } });
    if (!s) throw new NotFoundException('Segment not found');
  }
}
