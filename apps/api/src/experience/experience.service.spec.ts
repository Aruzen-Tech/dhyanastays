import { ExperienceService } from './experience.service';

/**
 * Unit tests for ExperienceService — capacity-locking, idempotency
 * authorization, booking audit logging, and active-booking-count behaviour.
 * All dependencies are mocked — no DB or external services required.
 *
 * Mocking note: withSerializableRetry() just calls prisma.$transaction(fn, opts)
 * under the hood. The prismaMock.$transaction stub below ignores the extra
 * `opts` argument and invokes `fn(txMock)` directly, so no separate mock of
 * the serializable-retry module is needed — this mirrors how
 * booking.service.spec.ts exercises the same utility.
 */


type AnyMock = jest.MockedFunction<(...args: any[]) => any>;

function makeNotificationMock() {
  return {};
}

function makeAuditLogMock() {
  return { create: jest.fn().mockResolvedValue({}) };
}

const NOW = Date.now();
const FUTURE = new Date(NOW + 24 * 60 * 60 * 1000);
const PAST = new Date(NOW - 24 * 60 * 60 * 1000);

const ACTIVE_STATUSES = ['HELD', 'CONFIRMED', 'COMPLETED'];

function makeExperience(overrides: Record<string, unknown> = {}) {
  return {
    id: 'exp-1',
    hostId: 'host-1',
    status: 'APPROVED',
    startsAt: FUTURE,
    endsAt: new Date(FUTURE.getTime() + 60 * 60 * 1000),
    capacity: 10,
    priceMinor: 5000,
    currency: 'INR',
    ...overrides,
  };
}

function makeTxMock(overrides: Record<string, unknown> = {}) {
  return {
    $executeRaw: jest.fn().mockResolvedValue(1),
    experience: {
      findUnique: jest.fn().mockResolvedValue(makeExperience()),
      update: jest.fn().mockImplementation(async (args: any) => ({
        ...makeExperience(),
        ...args.data,
      })),
    },
    experienceBooking: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { seats: 0 } }),
      create: jest.fn().mockImplementation(async (args: any) => ({
        id: 'booking-new',
        ...args.data,
      })),
    },
    ...overrides,
  };
}

describe('ExperienceService', () => {
  describe('bookExperience()', () => {
    it('books successfully when seats requested fit within remaining capacity', async () => {
      const txMock = makeTxMock({
        experienceBooking: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { seats: 3 } }), // 3 sold
          create: jest.fn().mockImplementation(async (args: any) => ({
            id: 'booking-new',
            ...args.data,
          })),
        },
      });
      const prismaMock = {
        experienceBooking: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
        auditLog: makeAuditLogMock(),
      };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

      const result = await service.bookExperience('guest-1', 'exp-1', {
        seats: 5,
        idempotencyKey: 'idem-1',
      } as any);

      expect(result.status).toBe('CONFIRMED');
      expect(result.seats).toBe(5);
      expect(txMock.experienceBooking.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            experienceId: 'exp-1',
            guestId: 'guest-1',
            seats: 5,
            totalMinor: 5000 * 5,
          }),
        }),
      );
    });

    it('rejects when requested seats would exceed capacity', async () => {
      const txMock = makeTxMock({
        experienceBooking: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { seats: 8 } }), // 8 sold of 10
          create: jest.fn(),
        },
      });
      const prismaMock = {
        experienceBooking: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
        auditLog: makeAuditLogMock(),
      };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

      await expect(
        service.bookExperience('guest-1', 'exp-1', { seats: 5, idempotencyKey: 'idem-2' } as any),
      ).rejects.toThrow('Not enough seats available');
      expect(txMock.experienceBooking.create).not.toHaveBeenCalled();
    });

    it('allows a booking that exactly fills remaining capacity (boundary)', async () => {
      const txMock = makeTxMock({
        experienceBooking: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { seats: 8 } }), // 8 sold of 10
          create: jest.fn().mockImplementation(async (args: any) => ({
            id: 'booking-new',
            ...args.data,
          })),
        },
      });
      const prismaMock = {
        experienceBooking: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
        auditLog: makeAuditLogMock(),
      };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

      const result = await service.bookExperience('guest-1', 'exp-1', {
        seats: 2, // exactly fills 8 + 2 = 10
        idempotencyKey: 'idem-3',
      } as any);

      expect(result.seats).toBe(2);
      expect(txMock.experienceBooking.create).toHaveBeenCalled();
    });

    it('takes the row lock before reading experience state', async () => {
      const callOrder: string[] = [];
      const txMock = makeTxMock();
      txMock.$executeRaw = jest.fn().mockImplementation(async () => {
        callOrder.push('lock');
        return 1;
      });
      txMock.experience.findUnique = jest.fn().mockImplementation(async () => {
        callOrder.push('read');
        return makeExperience();
      });

      const prismaMock = {
        experienceBooking: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
        auditLog: makeAuditLogMock(),
      };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);
      await service.bookExperience('guest-1', 'exp-1', { seats: 1, idempotencyKey: 'idem-4' } as any);

      expect(callOrder).toEqual(['lock', 'read']);
    });

    it('throws NotFoundException if experience is not APPROVED at lock time', async () => {
      const txMock = makeTxMock();
      txMock.experience.findUnique = jest
        .fn()
        .mockResolvedValue(makeExperience({ status: 'REJECTED' }));

      const prismaMock = {
        experienceBooking: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
        auditLog: makeAuditLogMock(),
      };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

      await expect(
        service.bookExperience('guest-1', 'exp-1', { seats: 1, idempotencyKey: 'idem-5' } as any),
      ).rejects.toThrow('Experience not found');
    });

    it('throws BadRequestException if experience has already started at lock time', async () => {
      const txMock = makeTxMock();
      txMock.experience.findUnique = jest
        .fn()
        .mockResolvedValue(makeExperience({ startsAt: PAST }));

      const prismaMock = {
        experienceBooking: { findUnique: jest.fn().mockResolvedValue(null) },
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
        auditLog: makeAuditLogMock(),
      };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

      await expect(
        service.bookExperience('guest-1', 'exp-1', { seats: 1, idempotencyKey: 'idem-6' } as any),
      ).rejects.toThrow('Experience has already started');
    });

    it('returns the existing booking idempotently without opening a transaction when the key belongs to the same guest', async () => {
      const existingBooking = {
        id: 'booking-existing',
        guestId: 'guest-1',
        experienceId: 'exp-1',
        status: 'CONFIRMED',
      };
      const $transaction = jest.fn();
      const auditLog = makeAuditLogMock();
      const prismaMock = {
        experienceBooking: { findUnique: jest.fn().mockResolvedValue(existingBooking) },
        $transaction,
        auditLog,
      };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

      const result = await service.bookExperience('guest-1', 'exp-1', {
        seats: 1,
        idempotencyKey: 'idem-7',
      } as any);

      expect(result).toBe(existingBooking);
      expect($transaction).not.toHaveBeenCalled();
      // A replay of an already-audited action must not write a second entry.
      expect(auditLog.create).not.toHaveBeenCalled();
    });

    describe('idempotency-key authorization', () => {
      it('throws ConflictException when the idempotencyKey belongs to another guest', async () => {
        const otherGuestBooking = {
          id: 'booking-existing',
          guestId: 'other-guest',
          experienceId: 'exp-1',
          status: 'CONFIRMED',
        };
        const $transaction = jest.fn();
        const prismaMock = {
          experienceBooking: { findUnique: jest.fn().mockResolvedValue(otherGuestBooking) },
          $transaction,
          auditLog: makeAuditLogMock(),
        };

        const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

        await expect(
          service.bookExperience('guest-1', 'exp-1', {
            seats: 1,
            idempotencyKey: 'shared-key',
          } as any),
        ).rejects.toThrow('Idempotency key belongs to another user');

        // Must reject before ever opening a booking transaction.
        expect($transaction).not.toHaveBeenCalled();
      });
    });

    describe('booking audit logging', () => {
      it('writes an audit log entry after a successful booking', async () => {
        const txMock = makeTxMock({
          experienceBooking: {
            aggregate: jest.fn().mockResolvedValue({ _sum: { seats: 0 } }),
            create: jest.fn().mockResolvedValue({
              id: 'booking-new',
              experienceId: 'exp-1',
              guestId: 'guest-1',
              seats: 4,
              totalMinor: 20000,
              status: 'CONFIRMED',
            }),
          },
        });
        const auditLog = makeAuditLogMock();
        const prismaMock = {
          experienceBooking: { findUnique: jest.fn().mockResolvedValue(null) },
          $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
          auditLog,
        };

        const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

        const result = await service.bookExperience('guest-1', 'exp-1', {
          seats: 4,
          idempotencyKey: 'idem-audit-1',
        } as any);

        expect(auditLog.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              actorUserId: 'guest-1',
              action: 'EXPERIENCE_BOOK',
              resourceType: 'experience_booking',
              resourceId: result.id,
              metadata: expect.objectContaining({
                experienceId: 'exp-1',
                seats: 4,
                totalMinor: 20000,
              }),
            }),
          }),
        );
      });

      it('does not write an audit log entry when the booking is rejected for insufficient capacity', async () => {
        const txMock = makeTxMock({
          experienceBooking: {
            aggregate: jest.fn().mockResolvedValue({ _sum: { seats: 10 } }), // fully sold
            create: jest.fn(),
          },
        });
        const auditLog = makeAuditLogMock();
        const prismaMock = {
          experienceBooking: { findUnique: jest.fn().mockResolvedValue(null) },
          $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
          auditLog,
        };

        const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

        await expect(
          service.bookExperience('guest-1', 'exp-1', {
            seats: 1,
            idempotencyKey: 'idem-audit-2',
          } as any),
        ).rejects.toThrow('Not enough seats available');

        expect(auditLog.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('updateHostExperience() — capacity guard', () => {
    function makeOwnedPrismaMock(experienceOverrides: Record<string, unknown> = {}) {
      return {
        host: { findUnique: jest.fn().mockResolvedValue({ id: 'host-1' }) },
        experience: {
          findUnique: jest
            .fn()
            .mockResolvedValue(makeExperience({ hostId: 'host-1', ...experienceOverrides })),
          update: jest.fn().mockImplementation(async (args: any) => ({
            ...makeExperience(),
            ...args.data,
          })),
        },
        auditLog: makeAuditLogMock(),
      };
    }

    it('rejects reducing capacity below seats already sold', async () => {
      const txMock = makeTxMock({
        experienceBooking: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { seats: 8 } }), // 8 sold
          create: jest.fn(),
        },
      });
      const prismaMock = {
        ...makeOwnedPrismaMock(),
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
      };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

      await expect(
        service.updateHostExperience('host-user-1', 'exp-1', { capacity: 5 } as any),
      ).rejects.toThrow('Capacity cannot be reduced below 8 seat(s) already booked');
      expect(txMock.experience.update).not.toHaveBeenCalled();
    });

    it('allows reducing capacity down to exactly the seats-sold count (boundary)', async () => {
      const txMock = makeTxMock({
        experienceBooking: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { seats: 8 } }), // 8 sold
          create: jest.fn(),
        },
      });
      const prismaMock = {
        ...makeOwnedPrismaMock(),
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
      };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

      const result = await service.updateHostExperience('host-user-1', 'exp-1', {
        capacity: 8,
      } as any);

      expect(result.capacity).toBe(8);
      expect(txMock.experience.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ capacity: 8 }) }),
      );
    });

    it('allows increasing capacity via the locked path', async () => {
      const txMock = makeTxMock({
        experienceBooking: {
          aggregate: jest.fn().mockResolvedValue({ _sum: { seats: 8 } }),
          create: jest.fn(),
        },
      });
      const prismaMock = {
        ...makeOwnedPrismaMock(),
        $transaction: jest.fn().mockImplementation(async (fn: AnyMock) => fn(txMock)),
      };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

      const result = await service.updateHostExperience('host-user-1', 'exp-1', {
        capacity: 20,
      } as any);

      expect(result.capacity).toBe(20);
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });

    it('does not open a transaction when capacity is not part of the patch', async () => {
      const prismaMock = {
        ...makeOwnedPrismaMock(),
        $transaction: jest.fn(),
      };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);

      const result = await service.updateHostExperience('host-user-1', 'exp-1', {
        title: 'New title',
      } as any);

      expect(result.title).toBe('New title');
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.experience.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ title: 'New title' }) }),
      );
    });
  });

  describe('active booking counts', () => {
    it('listHostExperiences() filters the booking count to active statuses only', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prismaMock = {
        host: { findUnique: jest.fn().mockResolvedValue({ id: 'host-1' }) },
        experience: { findMany },
      };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);
      await service.listHostExperiences('host-user-1');

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: {
              select: {
                bookings: { where: { status: { in: ACTIVE_STATUSES } } },
              },
            },
          }),
        }),
      );
    });

    it('listPublicExperiences() filters the booking count to active statuses only', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prismaMock = { experience: { findMany } };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);
      await service.listPublicExperiences({});

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: {
              select: {
                bookings: { where: { status: { in: ACTIVE_STATUSES } } },
              },
            },
          }),
        }),
      );
    });

    it('adminListExperiences() filters the booking count to active statuses only', async () => {
      const findMany = jest.fn().mockResolvedValue([]);
      const prismaMock = { experience: { findMany } };

      const service = new ExperienceService(prismaMock as any, makeNotificationMock() as any);
      await service.adminListExperiences();

      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            _count: {
              select: {
                bookings: { where: { status: { in: ACTIVE_STATUSES } } },
              },
            },
          }),
        }),
      );
    });
  });
});
