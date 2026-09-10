import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CrmActivityType, NotificationChannel, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OutboxService } from '../notification/outbox.service';
import { SendOutreachDto } from './dto/outreach.dto';
import { SaveTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { LogInteractionDto } from './dto/log-interaction.dto';

/** Cap per send — larger campaigns should move to a background job (Phase 4). */
const MAX_RECIPIENTS = 500;

interface Recipient {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  doNotContact: boolean;
}

const INTERACTION_LABEL: Record<string, string> = {
  call: 'Call',
  meeting: 'Meeting',
  email: 'Email',
  whatsapp: 'WhatsApp',
  other: 'Note',
};

/**
 * CRM outreach (Phase 3). Sends email/SMS to a contact, a selection, or a
 * segment via the existing OutboxService (retries + opt-out handling), while
 * hard-skipping do-not-contact contacts. Also owns reusable templates and
 * manual interaction logging. Every touch writes OUTREACH_SENT / CALL_LOGGED
 * and bumps `lastContactedAt`.
 */
@Injectable()
export class CrmOutreachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxService,
  ) {}

  // ── Templates ──────────────────────────────────────────────────────────────
  listTemplates() {
    return this.prisma.crmMessageTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  createTemplate(dto: SaveTemplateDto, actorId: string) {
    return this.prisma.crmMessageTemplate.create({
      data: {
        name: dto.name.trim(),
        subject: dto.subject?.trim() || null,
        body: dto.body,
        createdById: actorId,
      },
    });
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto) {
    await this.ensureTemplate(id);
    return this.prisma.crmMessageTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.subject !== undefined ? { subject: dto.subject.trim() || null } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
      },
    });
  }

  async removeTemplate(id: string) {
    await this.ensureTemplate(id);
    await this.prisma.crmMessageTemplate.delete({ where: { id } });
    return { ok: true };
  }

  private async ensureTemplate(id: string) {
    const t = await this.prisma.crmMessageTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
  }

  // ── Log a manual interaction ───────────────────────────────────────────────
  async logInteraction(userId: string, dto: LogInteractionDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('Contact not found');

    await this.prisma.crmActivity.create({
      data: {
        userId,
        type: CrmActivityType.CALL_LOGGED,
        summary: `${INTERACTION_LABEL[dto.channel] ?? 'Note'}: ${dto.summary.trim()}`,
        actorId,
        metadata: { channel: dto.channel },
      },
    });
    await this.touchLastContacted(userId);
    return { ok: true };
  }

  // ── Send outreach ──────────────────────────────────────────────────────────
  async send(dto: SendOutreachDto, actorId: string) {
    const recipients = await this.resolveRecipients(dto);
    const wantsEmail = dto.channels.includes('EMAIL');
    const wantsSms = dto.channels.includes('SMS');

    let sent = 0;
    const skipped = { doNotContact: 0, noEmail: 0, noPhone: 0 };

    for (const c of recipients) {
      if (c.doNotContact) {
        skipped.doNotContact += 1;
        continue;
      }
      const body = this.interpolate(dto.body, c);
      const subject = dto.subject?.trim()
        ? this.interpolate(dto.subject, c)
        : 'A message from Dhyana Stays';
      let enqueuedAny = false;

      if (wantsEmail) {
        if (c.email) {
          await this.outbox.enqueue({
            userId: c.id,
            kind: 'crm.outreach',
            channels: [NotificationChannel.EMAIL],
            payload: { to: c.email, subject, html: this.toHtml(body), text: body },
          });
          enqueuedAny = true;
        } else {
          skipped.noEmail += 1;
        }
      }
      if (wantsSms) {
        if (c.phone) {
          await this.outbox.enqueue({
            userId: c.id,
            kind: 'crm.outreach',
            channels: [NotificationChannel.SMS],
            payload: { to: c.phone, body },
          });
          enqueuedAny = true;
        } else {
          skipped.noPhone += 1;
        }
      }

      if (enqueuedAny) {
        sent += 1;
        await this.prisma.crmActivity.create({
          data: {
            userId: c.id,
            type: CrmActivityType.OUTREACH_SENT,
            summary: `Outreach sent (${dto.channels.join(', ').toLowerCase()})${
              dto.subject?.trim() ? ` — ${subject}` : ''
            }`,
            actorId,
            metadata: { channels: dto.channels },
          },
        });
        await this.touchLastContacted(c.id);
      }
    }

    return { total: recipients.length, sent, skipped };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private async touchLastContacted(userId: string) {
    const now = new Date();
    await this.prisma.crmContactProfile.upsert({
      where: { userId },
      create: { userId, lastContactedAt: now },
      update: { lastContactedAt: now },
    });
  }

  private async resolveRecipients(dto: SendOutreachDto): Promise<Recipient[]> {
    let where: Prisma.UserWhereInput;
    if (dto.userIds && dto.userIds.length > 0) {
      where = { id: { in: [...new Set(dto.userIds)] } };
    } else if (dto.segmentId) {
      const seg = await this.prisma.crmSegment.findUnique({ where: { id: dto.segmentId } });
      if (!seg) throw new NotFoundException('Segment not found');
      where = this.segmentWhere(seg);
    } else if (dto.userId) {
      where = { id: dto.userId };
    } else {
      throw new BadRequestException('Choose a contact, a selection, or a segment');
    }

    const users = await this.prisma.user.findMany({
      where,
      take: MAX_RECIPIENTS,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        crmProfile: { select: { doNotContact: true } },
      },
    });
    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      doNotContact: u.crmProfile?.doNotContact ?? false,
    }));
  }

  /** Rebuild the contacts-list filter a segment stored (mirrors CrmService). */
  private segmentWhere(seg: {
    type: string | null;
    q: string | null;
    tagId: string | null;
    ownerId: string | null;
  }): Prisma.UserWhereInput {
    const roles =
      seg.type === 'guest'
        ? [UserRole.GUEST]
        : seg.type === 'host'
          ? [UserRole.HOST]
          : [UserRole.GUEST, UserRole.HOST];
    return {
      role: { in: roles },
      ...(seg.q
        ? {
            OR: [
              { fullName: { contains: seg.q, mode: 'insensitive' } },
              { email: { contains: seg.q, mode: 'insensitive' } },
              { phone: { contains: seg.q } },
            ],
          }
        : {}),
      ...(seg.tagId ? { crmTags: { some: { tagId: seg.tagId } } } : {}),
      ...(seg.ownerId ? { crmProfile: { is: { ownerId: seg.ownerId } } } : {}),
    };
  }

  private interpolate(text: string, c: Recipient): string {
    const first = c.fullName?.trim().split(/\s+/)[0] ?? '';
    return text
      .replace(/\{\{\s*firstName\s*\}\}/g, first)
      .replace(/\{\{\s*name\s*\}\}/g, c.fullName ?? '');
  }

  private toHtml(body: string): string {
    const esc = body
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    return `<div style="font-family:system-ui,-apple-system,sans-serif;font-size:15px;line-height:1.6;color:#111">${esc.replace(
      /\n/g,
      '<br>',
    )}</div>`;
  }
}
