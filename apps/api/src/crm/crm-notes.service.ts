import { Injectable, NotFoundException } from '@nestjs/common';
import { CrmActivityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNoteDto, UpdateNoteDto } from './dto/note.dto';

@Injectable()
export class CrmNotesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Notes for a contact — pinned first, then newest. */
  list(userId: string) {
    return this.prisma.crmNote.findMany({
      where: { userId },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async add(userId: string, dto: CreateNoteDto, authorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('Contact not found');

    const note = await this.prisma.crmNote.create({
      data: { userId, authorId, body: dto.body, pinned: dto.pinned ?? false },
    });
    await this.prisma.crmActivity.create({
      data: {
        userId,
        type: CrmActivityType.NOTE,
        summary: 'Added a note',
        actorId: authorId,
        metadata: { noteId: note.id },
      },
    });
    return note;
  }

  async update(id: string, dto: UpdateNoteDto) {
    const note = await this.prisma.crmNote.findUnique({ where: { id }, select: { id: true } });
    if (!note) throw new NotFoundException('Note not found');
    return this.prisma.crmNote.update({
      where: { id },
      data: { body: dto.body ?? undefined, pinned: dto.pinned ?? undefined },
    });
  }

  async remove(id: string) {
    const note = await this.prisma.crmNote.findUnique({ where: { id }, select: { id: true } });
    if (!note) throw new NotFoundException('Note not found');
    await this.prisma.crmNote.delete({ where: { id } });
    return { ok: true };
  }
}
