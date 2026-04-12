import { UserRole } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

const prismaMock = {
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  host: {
    create: jest.fn(),
  },
  auditLog: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    const jwtService = {
      signAsync: jest.fn().mockResolvedValue('token'),
    } as unknown as JwtService;
    const rateLimiterMock = {
      check: jest.fn().mockResolvedValue({ blocked: false }),
      resetOnSuccess: jest.fn().mockResolvedValue(undefined),
    };
    const referralMock = { applyReferralCode: jest.fn().mockResolvedValue(undefined) };
    service = new AuthService(prismaMock as never, jwtService, rateLimiterMock as never, referralMock as never);
  });

  it('rejects admin self registration', async () => {
    await expect(
      service.register({
        email: 'admin@test.com',
        password: 'Password123',
        fullName: 'A',
        role: UserRole.ADMIN,
      }),
    ).rejects.toThrow('Admin registration is not self-service');
  });
});
