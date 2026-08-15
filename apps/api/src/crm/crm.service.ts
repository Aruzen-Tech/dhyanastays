import { Injectable, NotFoundException } from '@nestjs/common';
import {
  CrmActivityType,
  IssueStatus,
  PaymentStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListContactsDto } from './dto/list-contacts.dto';
import { UpdateContactProfileDto } from './dto/update-contact-profile.dto';

/** A unified timeline entry (CRM-native or derived from existing tables). */
export interface TimelineItem {
  id: string;
  kind: 'crm' | 'booking' | 'message' | 'issue' | 'review';
  type: string;
  summary: string;
  occurredAt: Date;
  meta?: Record<string, unknown>;
}

/**
 * CRM read/aggregation service. Treats `User` as the contact and overlays CRM
 * data (profile, tags, notes, activity). LTV is computed from CAPTURED payments
 * (money actually collected); the timeline MERGES CRM activity with events
 * derived live from bookings/messages/issues/reviews — nothing is duplicated.
 */
@Injectable()
export class CrmService {
  constructor(private readonly prisma: PrismaService) {}

  private contactRoles(type?: string): UserRole[] {
    if (type === 'guest') return [UserRole.GUEST];
    if (type === 'host') return [UserRole.HOST];
    return [UserRole.GUEST, UserRole.HOST];
  }

  /** Paginated, filterable contacts list with per-row bookings + spend. */
  async listContacts(query: ListContactsDto) {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 25, 1), 100);

    const where: Prisma.UserWhereInput = {
      role: { in: this.contactRoles(query.type) },
      ...(query.q
        ? {
            OR: [
              { fullName: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
              { phone: { contains: query.q } },
            ],
          }
        : {}),
      ...(query.tagId ? { crmTags: { some: { tagId: query.tagId } } } : {}),
      ...(query.ownerId ? { crmProfile: { is: { ownerId: query.ownerId } } } : {}),
    };

    const orderBy: Prisma.UserOrderByWithRelationInput =
      query.sort === 'name' ? { fullName: 'asc' } : { createdAt: 'desc' };

    const [total, users] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          fullName: true,
          email: true,
          phone: true,
          avatarUrl: true,
          role: true,
          createdAt: true,
          crmProfile: {
            select: { ownerId: true, doNotContact: true, source: true, leadScore: true },
          },
          crmTags: { select: { tag: { select: { id: true, name: true, color: true } } } },
        },
      }),
    ]);

    const ids = users.map((u) => u.id);
    const [bookingAgg, payments] = await Promise.all([
      this.prisma.booking.groupBy({
        by: ['guestId'],
        where: { guestId: { in: ids } },
        _count: { _all: true },
        _max: { createdAt: true },
      }),
      this.prisma.payment.findMany({
        where: { status: PaymentStatus.CAPTURED, booking: { guestId: { in: ids } } },
        select: { amount: true, booking: { select: { guestId: true } } },
      }),
    ]);

    const bookingMap = new Map(bookingAgg.map((b) => [b.guestId, b]));
    const spendMap = new Map<string, number>();
    for (const p of payments) {
      const g = p.booking.guestId;
      spendMap.set(g, (spendMap.get(g) ?? 0) + p.amount);
    }

    const data = users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      type: u.role,
      createdAt: u.createdAt,
      ownerId: u.crmProfile?.ownerId ?? null,
      source: u.crmProfile?.source ?? null,
      leadScore: u.crmProfile?.leadScore ?? null,
      doNotContact: u.crmProfile?.doNotContact ?? false,
      tags: u.crmTags.map((t) => t.tag),
      bookingsCount: bookingMap.get(u.id)?._count._all ?? 0,
      lastBookingAt: bookingMap.get(u.id)?._max.createdAt ?? null,
      totalSpentPaise: spendMap.get(u.id) ?? 0,
    }));

    return { data, total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
  }

  /** 360° view: identity, CRM profile, tags, and computed KPIs. */
  async getContact360(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        role: true,
        createdAt: true,
        crmProfile: true,
        crmTags: { select: { createdAt: true, tag: true } },
      },
    });
    if (!user) throw new NotFoundException('Contact not found');

    const [bookingsCount, lastBooking, spend, reviewAgg, openIssues, messagesSent] =
      await Promise.all([
        this.prisma.booking.count({ where: { guestId: userId } }),
        this.prisma.booking.findFirst({
          where: { guestId: userId },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true, startsAt: true },
        }),
        this.prisma.payment.aggregate({
          where: { status: PaymentStatus.CAPTURED, booking: { guestId: userId } },
          _sum: { amount: true },
        }),
        this.prisma.review.aggregate({
          where: { userId },
          _count: { _all: true },
          _avg: { rating: true },
        }),
        this.prisma.guestIssue.count({
          where: { guestId: userId, status: { notIn: [IssueStatus.RESOLVED, IssueStatus.CLOSED] } },
        }),
        this.prisma.message.count({ where: { senderId: userId, isSystem: false } }),
      ]);

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      type: user.role,
      createdAt: user.createdAt,
      profile: user.crmProfile,
      tags: user.crmTags.map((t) => ({ ...t.tag, addedAt: t.createdAt })),
      kpis: {
        bookingsCount,
        totalSpentPaise: spend._sum.amount ?? 0,
        lastBookingAt: lastBooking?.createdAt ?? null,
        reviewsCount: reviewAgg._count._all,
        avgRating: reviewAgg._avg.rating ?? null,
        openIssues,
        messagesSent,
      },
    };
  }

  /** Merged activity timeline (CRM-native + derived), newest first. */
  async getTimeline(userId: string, limit = 40): Promise<TimelineItem[]> {
    const take = Math.min(Math.max(limit, 1), 100);
    const [activities, bookings, messages, issues, reviews] = await Promise.all([
      this.prisma.crmActivity.findMany({
        where: { userId },
        orderBy: { occurredAt: 'desc' },
        take,
      }),
      this.prisma.booking.findMany({
        where: { guestId: userId },
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          status: true,
          startsAt: true,
          endsAt: true,
          createdAt: true,
          listing: { select: { title: true } },
        },
      }),
      this.prisma.message.findMany({
        where: { senderId: userId, isSystem: false },
        orderBy: { createdAt: 'desc' },
        take,
        select: { id: true, body: true, createdAt: true, conversationId: true },
      }),
      this.prisma.guestIssue.findMany({
        where: { guestId: userId },
        orderBy: { createdAt: 'desc' },
        take,
        select: { id: true, category: true, status: true, createdAt: true },
      }),
      this.prisma.review.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        select: { id: true, rating: true, createdAt: true, listing: { select: { title: true } } },
      }),
    ]);

    const items: TimelineItem[] = [
      ...activities.map((a) => ({
        id: `crm:${a.id}`,
        kind: 'crm' as const,
        type: a.type,
        summary: a.summary,
        occurredAt: a.occurredAt,
        meta: (a.metadata as Record<string, unknown>) ?? undefined,
      })),
      ...bookings.map((b) => ({
        id: `booking:${b.id}`,
        kind: 'booking' as const,
        type: b.status,
        summary: `Booking ${b.status.toLowerCase().replace(/_/g, ' ')} — ${b.listing.title}`,
        occurredAt: b.createdAt,
        meta: { bookingId: b.id, startsAt: b.startsAt, endsAt: b.endsAt },
      })),
      ...messages.map((m) => ({
        id: `message:${m.id}`,
        kind: 'message' as const,
        type: 'MESSAGE_SENT',
        summary: m.body.length > 120 ? `${m.body.slice(0, 120)}…` : m.body,
        occurredAt: m.createdAt,
        meta: { conversationId: m.conversationId },
      })),
      ...issues.map((i) => ({
        id: `issue:${i.id}`,
        kind: 'issue' as const,
        type: i.status,
        summary: `Reported issue: ${i.category.toLowerCase().replace(/_/g, ' ')}`,
        occurredAt: i.createdAt,
        meta: { issueId: i.id },
      })),
      ...reviews.map((r) => ({
        id: `review:${r.id}`,
        kind: 'review' as const,
        type: 'REVIEW',
        summary: `Left a ${r.rating}★ review — ${r.listing.title}`,
        occurredAt: r.createdAt,
        meta: { rating: r.rating },
      })),
    ];

    return items
      .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
      .slice(0, take);
  }

  /** Upsert the CRM profile overlay + log the change. */
  async updateProfile(userId: string, dto: UpdateContactProfileDto, actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!user) throw new NotFoundException('Contact not found');

    const data = {
      // empty string clears the owner; undefined leaves it unchanged
      ownerId: dto.ownerId === undefined ? undefined : dto.ownerId || null,
      source: dto.source ?? undefined,
      doNotContact: dto.doNotContact ?? undefined,
      leadScore: dto.leadScore ?? undefined,
    };

    const profile = await this.prisma.crmContactProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });

    await this.prisma.crmActivity.create({
      data: {
        userId,
        type: CrmActivityType.CONTACT_UPDATED,
        summary: 'Contact profile updated',
        actorId,
      },
    });

    return profile;
  }
}
