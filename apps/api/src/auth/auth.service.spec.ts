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
    service = new AuthService(prismaMock as never, jwtService);
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
