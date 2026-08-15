import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HostAnalyticsService } from './host-analytics.service';

describe('HostAnalyticsService markNotificationRead', () => {
  let service: HostAnalyticsService;
  let prisma: {
    host: {
      findUnique: jest.Mock;
    };
    hostNotification: {
      findFirst: jest.Mock;
      update: jest.Mock;
    };
  };

  beforeEach(() => {
    prisma = {
      host: {
        findUnique: jest.fn(),
      },
      hostNotification: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new HostAnalyticsService(prisma as unknown as PrismaService);
  });

  it('marks a host notification as read', async () => {
    prisma.host.findUnique.mockResolvedValue({
      id: 'host-1',
      userId: 'user-1',
    });
    prisma.hostNotification.findFirst.mockResolvedValue({
      id: 'notification-1',
      hostId: 'host-1',
      isRead: false,
      title: 'New booking',
    });
    prisma.hostNotification.update.mockResolvedValue({
      id: 'notification-1',
      hostId: 'host-1',
      isRead: true,
      title: 'New booking',
    });

    const result = await service.markNotificationRead(
      'user-1',
      'notification-1',
    );

    expect(prisma.hostNotification.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'notification-1',
        hostId: 'host-1',
      },
    });
    expect(prisma.hostNotification.update).toHaveBeenCalledWith({
      where: { id: 'notification-1' },
      data: { isRead: true },
    });
    expect(result.isRead).toBe(true);
  });

  it('rejects access to another host notification', async () => {
    prisma.host.findUnique.mockResolvedValue({
      id: 'host-1',
      userId: 'user-1',
    });
    prisma.hostNotification.findFirst.mockResolvedValue(null);

    await expect(
      service.markNotificationRead('user-1', 'notification-from-host-2'),
    ).rejects.toThrow(new NotFoundException('Notification not found'));

    expect(prisma.hostNotification.update).not.toHaveBeenCalled();
  });

  it('is idempotent when the notification is already read', async () => {
    prisma.host.findUnique.mockResolvedValue({
      id: 'host-1',
      userId: 'user-1',
    });
    prisma.hostNotification.findFirst.mockResolvedValue({
      id: 'notification-1',
      hostId: 'host-1',
      isRead: true,
      title: 'New booking',
    });

    const result = await service.markNotificationRead(
      'user-1',
      'notification-1',
    );

    expect(prisma.hostNotification.update).not.toHaveBeenCalled();
    expect(result.isRead).toBe(true);
  });

  it('rejects when the authenticated user is not a host', async () => {
    prisma.host.findUnique.mockResolvedValue(null);

    await expect(
      service.markNotificationRead('user-without-host', 'notification-1'),
    ).rejects.toThrow(new NotFoundException('Host not found'));

    expect(prisma.hostNotification.findFirst).not.toHaveBeenCalled();
    expect(prisma.hostNotification.update).not.toHaveBeenCalled();
  });
});
