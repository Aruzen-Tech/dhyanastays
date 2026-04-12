import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagingService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Create or find conversation ──────────────────────────────────────────

  async startConversation(
    userId: string,
    userRole: UserRole,
    dto: CreateConversationDto,
  ) {
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
    });
    if (!recipient) throw new NotFoundException('Recipient not found');

    // Determine conversation type
    const type = this.resolveConversationType(userRole, recipient.role);

    // Order: userOne is always the "lower" role (GUEST < HOST < ADMIN)
    const [userOneId, userTwoId] = this.orderParticipants(
      userId,
      userRole,
      dto.recipientId,
      recipient.role,
    );

    // Check for existing conversation
    const existing = await this.prisma.conversation.findUnique({
      where: {
        userOneId_userTwoId_listingId: {
          userOneId,
          userTwoId,
          listingId: dto.listingId ?? '',
        },
      },
      include: this.conversationInclude(),
    });

    if (existing) {
      // Send the first message in this existing conversation
      await this.prisma.message.create({
        data: {
          conversationId: existing.id,
          senderId: userId,
          senderRole: userRole,
          body: dto.message,
        },
      });
      await this.prisma.conversation.update({
        where: { id: existing.id },
        data: { updatedAt: new Date() },
      });
      return this.getConversationById(existing.id, userId);
    }

    // Create new conversation + first message
    const conversation = await this.prisma.conversation.create({
      data: {
        type,
        userOneId,
        userTwoId,
        listingId: dto.listingId || null,
        bookingId: dto.bookingId || null,
        subject: dto.subject || null,
        messages: {
          create: {
            senderId: userId,
            senderRole: userRole,
            body: dto.message,
          },
        },
      },
      include: this.conversationInclude(),
    });

    return conversation;
  }

  // ─── List conversations for a user ────────────────────────────────────────

  async getConversations(userId: string) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ userOneId: userId }, { userTwoId: userId }],
      },
      include: {
        userOne: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
        userTwo: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
        listing: { select: { id: true, title: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true, createdAt: true, senderId: true, isRead: true },
        },
        _count: {
          select: {
            messages: { where: { isRead: false, senderId: { not: userId } } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return conversations.map((c) => ({
      id: c.id,
      type: c.type,
      subject: c.subject,
      otherUser:
        c.userOneId === userId
          ? c.userTwo
          : c.userOne,
      listing: c.listing,
      lastMessage: c.messages[0] ?? null,
      unreadCount: c._count.messages,
      updatedAt: c.updatedAt,
    }));
  }

  // ─── Get single conversation with messages ───────────────────────────────

  async getConversationById(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: this.conversationInclude(),
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
      throw new ForbiddenException('Not your conversation');
    }
    return conversation;
  }

  // ─── Send message ────────────────────────────────────────────────────────

  async sendMessage(
    conversationId: string,
    userId: string,
    userRole: UserRole,
    dto: SendMessageDto,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
      throw new ForbiddenException('Not your conversation');
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: userId,
        senderRole: userRole,
        body: dto.body,
      },
      include: {
        sender: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
      },
    });

    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return message;
  }

  // ─── Mark messages as read ───────────────────────────────────────────────

  async markRead(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException('Conversation not found');
    if (conversation.userOneId !== userId && conversation.userTwoId !== userId) {
      throw new ForbiddenException('Not your conversation');
    }

    await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId },
        isRead: false,
      },
      data: { isRead: true },
    });

    return { success: true };
  }

  // ─── Unread count ────────────────────────────────────────────────────────

  async getUnreadCount(userId: string) {
    const count = await this.prisma.message.count({
      where: {
        isRead: false,
        senderId: { not: userId },
        conversation: {
          OR: [{ userOneId: userId }, { userTwoId: userId }],
        },
      },
    });
    return { count };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private resolveConversationType(
    senderRole: UserRole,
    recipientRole: UserRole,
  ): string {
    const roles = new Set([senderRole, recipientRole]);
    if (roles.has('GUEST') && roles.has('HOST')) return 'GUEST_HOST';
    if (roles.has('HOST') && roles.has('ADMIN')) return 'HOST_ADMIN';
    if (roles.has('GUEST') && roles.has('ADMIN')) return 'GUEST_HOST'; // admin acts as host-side
    throw new BadRequestException(
      `Cannot create conversation between ${senderRole} and ${recipientRole}`,
    );
  }

  private orderParticipants(
    userAId: string,
    userARole: UserRole,
    userBId: string,
    userBRole: UserRole,
  ): [string, string] {
    const priority: Record<string, number> = { GUEST: 0, HOST: 1, ADMIN: 2 };
    return priority[userARole] <= priority[userBRole]
      ? [userAId, userBId]
      : [userBId, userAId];
  }

  private conversationInclude() {
    return {
      userOne: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
      userTwo: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
      listing: { select: { id: true, title: true } },
      booking: { select: { id: true, status: true, startsAt: true, endsAt: true } },
      messages: {
        orderBy: { createdAt: 'asc' as const },
        include: {
          sender: { select: { id: true, fullName: true, role: true, avatarUrl: true } },
        },
      },
    };
  }
}
